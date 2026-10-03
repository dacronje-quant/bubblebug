#!/usr/bin/env node
// Generates region music takes with Lyria 3.5 (Gemini API). Run from the
// game checkout with a local .env:  node --env-file=/path/.env music-plan/generate-lyria.mjs [--only=home,caves] [--samples] [--take=2]
// Takes land in ignored music-plan/takes/<id>-<take>.(wav|mp3) with a .json beside each.
// Existing takes are kept; one request at a time with a pause between them.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(await fs.readFile(path.join(dir, 'lyria-plan.json'), 'utf8'));
const arg = name => process.argv.find(a => a.startsWith('--' + name + '='))?.split('=')[1];
const only = arg('only')?.split(',');
const take = arg('take') || '1';
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY (or use --env-file).');
const out = path.join(dir, 'takes');
await fs.mkdir(out, { recursive: true });
const exists = f => fs.access(f).then(() => true, () => false);
let tracks = plan.tracks.filter(t => (!only || only.includes(t.id)) && (!process.argv.includes('--samples') || t.sample));
async function request(body) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { const e = new Error('HTTP ' + res.status + ': ' + text.slice(0, 400)); e.status = res.status; throw e; }
  return JSON.parse(text);
}
function audioOf(json) {
  const parts = (json.steps || json.outputs || []).flatMap(s => s.content || [s]);
  const a = parts.find(p => p.type === 'audio' && p.data);
  const t = parts.filter(p => p.type === 'text').map(p => p.text).join('\n');
  return { data: a && Buffer.from(a.data, 'base64'), mime: a && (a.mime_type || a.mimeType), text: t };
}
for (const t of tracks) {
  const base = path.join(out, t.id + '-' + take);
  if (await exists(base + '.json')) { console.log('Keeping ' + t.id + '-' + take); continue; }
  const input = t.prompt + ' ' + plan.common;
  let json;
  try { json = await request({ model: plan.model, input, response_format: { type: 'audio', mime_type: 'audio/wav' } }); }
  catch (e) {
    if (e.status !== 400) throw e;
    console.log('(WAV not accepted, using the default format)');
    json = await request({ model: plan.model, input });
  }
  const a = audioOf(json);
  if (!a.data) throw new Error('No audio for ' + t.id + ': ' + JSON.stringify(json).slice(0, 300));
  const ext = a.data.toString('ascii', 0, 4) === 'RIFF' ? 'wav' : 'mp3';
  await fs.writeFile(base + '.' + ext, a.data);
  await fs.writeFile(base + '.json', JSON.stringify({ id: t.id, zone: t.zone, model: plan.model, input, mime: a.mime, text: a.text, bytes: a.data.length, generatedAt: new Date().toISOString() }, null, 2));
  console.log('Generated ' + t.id + '-' + take + '.' + ext + ' (' + Math.round(a.data.length / 1024) + ' KB)');
  await new Promise(r => setTimeout(r, 8000));
}
console.log('Done.');
