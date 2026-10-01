// Generate every game voice. The API key stays in the process environment.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(await fs.readFile(path.join(dir, 'gemini-pack.json'), 'utf8'));
const output = path.resolve(dir, process.argv.find(arg => arg.startsWith('--cache-dir='))?.slice(12) || 'samples/gemini-pack');
const checkOnly = process.argv.includes('--check');
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key && !checkOnly) throw new Error('Configure GEMINI_API_KEY outside chat.');
if (!checkOnly) await fs.mkdir(output, { recursive: true });
const installedFile = path.join(dir, '../assets/voice/gemini-3.8/manifest.json');
const installed = JSON.parse(await fs.readFile(installedFile, 'utf8'));
let ready = 0, pending = 0;
const exists = file => fs.access(file).then(() => true, () => false);
let nextRequestAt = 0, requestGate = Promise.resolve();
async function post(route, body, attempt = 0) {
  const turn = requestGate.then(async () => {
    const delay = nextRequestAt - Date.now();
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 65000; // Conservative spacing for the free-tier quota.
  });
  requestGate = turn.catch(() => {});
  await turn;
  let response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/' + route, {
      method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
    });
  } catch { throw new Error('Gemini network request failed or timed out.'); }
  const result = await response.json();
  if (response.status === 429 && attempt < 3 && !/requests per day/i.test(String(result.error?.message || ''))) {
    console.log('Rate limited; waiting before retrying the same request.');
    const seconds = Number(String(result.error?.message || '').match(/retry in (\d+)s/i)?.[1] || 25);
    await new Promise(resolve => setTimeout(resolve, Math.min(60000, (seconds + 2) * 1000)));
    return post(route, body, attempt + 1);
  }
  if (!response.ok) {
    const reason = String(result.error?.message || '').split(key).join('[redacted]').replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 600);
    throw new Error('Gemini HTTP ' + response.status + ': ' + reason);
  }
  return result;
}
function wav(data) {
  const bytes = Buffer.from(data || '', 'base64');
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Gemini returned no complete WAV.');
  return bytes;
}
async function voice(speaker) {
  const spec = pack.voices[speaker];
  if (spec.prebuiltVoice) return spec.prebuiltVoice;
  const metadata = path.join(output, speaker + '-voice.json');
  if (await exists(metadata)) return JSON.parse(await fs.readFile(metadata, 'utf8')).voiceId;
  const selected = installed.clips.find(c => c.speaker === speaker && c.model === pack.model);
  if (selected) return selected.voiceId;
  if (checkOnly) return null;
  const created = await post('voices', { store: true, voice: {
    model: pack.model, type: 'prompted', display_name: 'Bubble Paws - ' + speaker,
    gender: spec.gender, language_code: spec.language, prompted: { input: spec.persona },
  } });
  if (!created.id?.startsWith('voice_')) throw new Error('Missing designed voice ID.');
  await fs.writeFile(metadata, JSON.stringify({ voiceId: created.id, model: pack.model, persona: spec.persona }, null, 2), { flag: 'wx' });
  console.log('Designed ' + speaker);
  return created.id;
}
async function render(clip, voiceId) {
  const file = path.join(output, clip.id + '.wav');
  if (await exists(file)) {
    const info = JSON.parse(await fs.readFile(file.replace(/\.wav$/, '.json'), 'utf8'));
    if (info.text !== clip.text || info.model !== pack.model || info.voiceId !== voiceId || info.style !== clip.style) throw new Error('Cached take differs from the current plan: ' + clip.id);
    ready++; console.log('Keeping ' + clip.id); return;
  }
  const selected = installed.clips.find(c => c.id === clip.id);
  if (selected) {
    if (selected.text !== clip.text || selected.model !== pack.model || selected.voiceId !== voiceId || selected.style !== clip.style) throw new Error('Installed take differs from the plan: ' + clip.id);
    const bytes = await fs.readFile(path.join(dir, '../assets/voice/gemini-3.8', clip.id + '.wav'));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== selected.sha256) throw new Error('Installed WAV checksum differs: ' + clip.id);
    ready++; console.log('Keeping installed ' + clip.id); return;
  }
  if (checkOnly) { pending++; console.log('Pending ' + clip.id); return; }
  const result = await post('interactions', {
    model: pack.model, input: [{ type: 'user_input', content: [{ type: 'text', text: clip.text, annotations: [{ type: 'speech_metadata', style: clip.style }] }] }],
    response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 24000 },
    generation_config: { speech_config: [{ voice: voiceId }] }, store: false,
  });
  const audio = result.steps?.filter(step => step.type === 'model_output').flatMap(step => step.content || []).filter(part => part.type === 'audio').at(-1);
  const bytes = wav(audio?.data || result.output_audio?.data);
  await fs.writeFile(file, bytes, { flag: 'wx' });
  await fs.writeFile(file.replace(/\.wav$/, '.json'), JSON.stringify({ ...clip, model: pack.model, voiceId, generatedAt: new Date().toISOString(), bytes: bytes.length }, null, 2));
  ready++; console.log('Generated ' + clip.id);
}
// Two independent speakers at a time; all lines for a speaker use one identity.
const speakers = Object.keys(pack.voices);
let next = 0, failed = false;
async function worker() {
  while (!failed && next < speakers.length) {
    const speaker = speakers[next++];
    try {
      const voiceId = await voice(speaker);
      for (const clip of pack.clips.filter(c => c.speaker === speaker)) await render(clip, voiceId);
    } catch (error) { failed = true; console.error(speaker + ': ' + error.message); process.exitCode = 1; }
  }
}
await Promise.all([worker(), worker()]);
console.log(checkOnly ? 'Checked: ' + ready + ' ready, ' + pending + ' pending.' : 'Generation ' + (failed ? 'incomplete; completed takes retained.' : 'complete: all 20 game lines ready.'));
