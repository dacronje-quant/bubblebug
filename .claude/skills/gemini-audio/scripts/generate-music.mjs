#!/usr/bin/env node
// Generate music with Lyria 3.5 via the Gemini Interactions API.
// Usage: node generate-music.mjs --prompt="..." --out=music/theme [--wav] [--model=lyria-3.5]
// Writes <out>.mp3 (or .wav) plus <out>.json (prompt, lyrics/structure text, metadata).
// Needs Node 20+ and GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment
// (or: node --env-file=.env generate-music.mjs ...). Never print or commit the key.
import fs from 'node:fs/promises';
import path from 'node:path';

const arg = n => process.argv.find(a => a.startsWith('--' + n + '='))?.slice(n.length + 3);
const prompt = arg('prompt') || (arg('prompt-file') && await fs.readFile(arg('prompt-file'), 'utf8'));
const out = arg('out');
const model = arg('model') || 'lyria-3.5';
if (!prompt || !out) { console.error('Usage: --prompt="..." (or --prompt-file=f.txt) --out=path/name [--wav]'); process.exit(2); }
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) { console.error('Set GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.'); process.exit(2); }

async function request(body, attempt = 0) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(300000),
  });
  const text = await res.text();
  if (res.status === 429 && attempt < 3) {
    const wait = Number(text.match(/retry in (\d+)s/i)?.[1] || 30);
    console.error(`Rate limited; retrying in ${wait + 2}s`);
    await new Promise(r => setTimeout(r, (wait + 2) * 1000));
    return request(body, attempt + 1);
  }
  if (!res.ok) { const e = new Error('HTTP ' + res.status + ': ' + text.replace(/AIza[\w-]+/g, '[redacted]').slice(0, 500)); e.status = res.status; throw e; }
  return JSON.parse(text);
}
function audioOf(json) {
  const parts = (json.steps || json.outputs || []).flatMap(s => s.content || [s]);
  const a = json.output_audio?.data ? json.output_audio : parts.find(p => p.type === 'audio' && p.data);
  const text = json.output_text || parts.filter(p => p.type === 'text').map(p => p.text).join('\n');
  return { data: a && Buffer.from(a.data, 'base64'), mime: a && (a.mime_type || a.mimeType), text };
}

let json;
try {
  json = await request(process.argv.includes('--wav')
    ? { model, input: prompt, response_format: { type: 'audio', mime_type: 'audio/wav' } }
    : { model, input: prompt });
} catch (e) {
  if (e.status !== 400 || !process.argv.includes('--wav')) throw e;
  console.error('WAV not accepted; using default format (mp3).');
  json = await request({ model, input: prompt });
}
const a = audioOf(json);
if (!a.data) throw new Error('No audio returned: ' + JSON.stringify(json).slice(0, 300));
const ext = a.data.toString('ascii', 0, 4) === 'RIFF' ? 'wav' : 'mp3';
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
await fs.writeFile(out + '.' + ext, a.data);
await fs.writeFile(out + '.json', JSON.stringify({ model, input: prompt, mime: a.mime, text: a.text, bytes: a.data.length, generatedAt: new Date().toISOString() }, null, 2));
console.log(`Saved ${out}.${ext} (${Math.round(a.data.length / 1024)} KB)`);
