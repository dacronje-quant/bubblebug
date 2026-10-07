#!/usr/bin/env node
// Text-to-speech with Gemini 3.8 Flash TTS via the Gemini Interactions API.
//
// Speak:   node generate-speech.mjs --text="Hello!" --voice=Kore --style="warm, gentle" --out=voice/hello
// Design:  node generate-speech.mjs --design="Warm elderly grandmother, soft British accent" --gender=female --language=en-GB --name="Granny"
//          -> prints a voice_... id to reuse with --voice=voice_...
// Needs Node 20+ and GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment. Never print or commit the key.
// Output is a 24 kHz mono WAV (<out>.wav) plus <out>.json metadata.
import fs from 'node:fs/promises';
import path from 'node:path';

const arg = n => process.argv.find(a => a.startsWith('--' + n + '='))?.slice(n.length + 3);
const model = arg('model') || 'gemini-3.8-flash-tts';
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) { console.error('Set GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.'); process.exit(2); }

async function post(route, body, attempt = 0) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/' + route, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  const result = await res.json();
  const msg = String(result.error?.message || '');
  if (res.status === 429 && attempt < 3 && !/requests per day/i.test(msg)) {
    const wait = Number(msg.match(/retry in (\d+)s/i)?.[1] || 25);
    console.error(`Rate limited; retrying in ${Math.min(60, wait + 2)}s`);
    await new Promise(r => setTimeout(r, Math.min(60000, (wait + 2) * 1000)));
    return post(route, body, attempt + 1);
  }
  if (!res.ok) throw new Error('Gemini HTTP ' + res.status + ': ' + msg.replace(/AIza[\w-]+/g, '[redacted]').slice(0, 600));
  return result;
}

if (arg('design')) {
  const created = await post('voices', { store: true, voice: {
    model, type: 'prompted', display_name: arg('name') || 'Designed voice',
    gender: arg('gender') || 'female', language_code: arg('language') || 'en-US',
    prompted: { input: arg('design') },
  } });
  if (!created.id?.startsWith('voice_')) throw new Error('No voice id returned: ' + JSON.stringify(created).slice(0, 300));
  console.log('Designed voice id: ' + created.id);
  process.exit(0);
}

const text = arg('text') || (arg('text-file') && await fs.readFile(arg('text-file'), 'utf8'));
const out = arg('out');
const voice = arg('voice') || 'Kore';
if (!text || !out) { console.error('Usage: --text="..." (or --text-file=f.txt) --out=path/name [--voice=Kore|voice_xxx] [--style="..."]'); process.exit(2); }

const item = { type: 'text', text };
if (arg('style')) item.annotations = [{ type: 'speech_metadata', style: arg('style') }];
const result = await post('interactions', {
  model, input: [{ type: 'user_input', content: [item] }],
  response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: Number(arg('rate') || 24000) },
  generation_config: { speech_config: [{ voice }] }, store: false,
});
const audio = result.steps?.filter(s => s.type === 'model_output').flatMap(s => s.content || []).filter(p => p.type === 'audio').at(-1);
const bytes = Buffer.from(audio?.data || result.output_audio?.data || '', 'base64');
if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF') throw new Error('No complete WAV returned: ' + JSON.stringify(result).slice(0, 300));
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
await fs.writeFile(out + '.wav', bytes);
await fs.writeFile(out + '.json', JSON.stringify({ model, text, voice, style: arg('style') || null, bytes: bytes.length, generatedAt: new Date().toISOString() }, null, 2));
console.log(`Saved ${out}.wav (${Math.round(bytes.length / 1024)} KB)`);
