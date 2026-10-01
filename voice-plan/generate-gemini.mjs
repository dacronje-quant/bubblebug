// Auditions only; no game audio or voice mappings are changed.
// Node 20+: node voice-plan/generate-gemini.mjs [--prepare] [--id=babyPatches]
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildComparison } from './gemini-player.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const cast = JSON.parse(await fs.readFile(path.join(dir, 'gemini-cast.json'), 'utf8'));
const context = vm.createContext({ window: { BB: {} } });
vm.runInContext(await fs.readFile(path.join(dir, '../js/core/voice-clips.js'), 'utf8'), context);
const clips = context.window.BB.VOICE_CLIPS;
const model = 'gemini-3.8-flash-tts', endpoint = 'https://generativelanguage.googleapis.com/v1beta/';
const output = path.join(dir, 'samples/gemini-3.8');
const requested = process.argv.find(x => x.startsWith('--id='))?.slice(5);
const selected = requested ? cast.filter(cat => cat.id === requested) : cast;
if (!selected.length) throw new Error('Unknown family member.');
await fs.mkdir(output, { recursive: true });
const exists = file => fs.access(file).then(() => true, () => false);
const audioFile = (cat, babble = false) => path.join(output, cat.id + (babble ? '-babble' : '') + '.wav');
async function post(route, body, key) {
  let response;
  try {
    response = await fetch(endpoint + route, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  } catch (error) {
    // No request headers or keys in output, including on network failure.
    throw new Error('Gemini request failed: ' + (error.name === 'TimeoutError' ? 'timeout' : 'network unavailable'));
  }
  if (!response.ok) {
    let details = {}; try { details = await response.json(); } catch {}
    const status = String(details.error?.status || 'UNKNOWN').replace(/[^A-Z0-9_]/g, '');
    const reason = String(details.error?.message || '').split(key).join('[redacted]').replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 700);
    throw new Error('Gemini HTTP ' + response.status + ' (' + status + '): ' + reason + '; no substitute model was used.');
  }
  return response.json();
}
function decodeWav(data) {
  if (typeof data !== 'string' || !data.length) throw new Error('Gemini returned no audio.');
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected a complete WAV from Gemini 3.8.');
  return bytes;
}
async function render(cat, voiceId, babble, key) {
  const file = audioFile(cat, babble);
  if (await exists(file)) { console.log('Keeping existing ' + path.basename(file)); return; }
  const text = babble ? cat.babble : clips['cat_' + cat.id].text;
  const style = babble ? cat.babbleStyle : cat.style;
  const result = await post('interactions', {
    model, input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }],
    response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 24000 },
    generation_config: { speech_config: [{ voice: voiceId }] }, store: false,
  }, key);
  const audio = result.steps?.filter(step => step.type === 'model_output').flatMap(step => step.content || []).filter(part => part.type === 'audio').at(-1);
  const bytes = decodeWav(audio?.data || result.output_audio?.data);
  await fs.writeFile(file, bytes, { flag: 'wx' });
  await fs.writeFile(file.replace(/\.wav$/, '.json'), JSON.stringify({ model, voiceId, text, style, persona: cat.persona, sameDialogue: !babble, generatedAt: new Date().toISOString(), bytes: bytes.length }, null, 2));
  console.log('Generated ' + path.basename(file) + ' (' + bytes.length + ' bytes)');
}
if (!process.argv.includes('--prepare')) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    await buildComparison(dir, cast, clips);
    console.error('Gemini key is missing. Comparison prepared, but no Gemini samples were generated. Configure GEMINI_API_KEY outside chat, then rerun.');
    process.exitCode = 2;
  } else {
    let activeCat;
    try {
      for (const cat of selected) {
        activeCat = cat;
        const needsMain = !(await exists(audioFile(cat))), needsBabble = !!cat.babble && !cat.skipBabble && !(await exists(audioFile(cat, true)));
        if (!needsMain && !needsBabble) { console.log('Keeping auditions for ' + cat.label); continue; }
        const metadataFile = path.join(output, cat.id + '-voice.json');
        let voiceId;
        if (cat.prebuiltVoice) voiceId = cat.prebuiltVoice;
        else if (await exists(metadataFile)) voiceId = JSON.parse(await fs.readFile(metadataFile, 'utf8')).voiceId;
        else {
          const created = await post('voices', { store: true, voice: { model, type: 'prompted', display_name: 'Bubble Paws audition - ' + cat.id, gender: cat.gender, language_code: cat.language, prompted: { input: cat.persona } } }, key);
          voiceId = created.id;
          if (typeof voiceId !== 'string' || !voiceId.startsWith('voice_')) throw new Error('Gemini returned no designed voice ID.');
          await fs.writeFile(metadataFile, JSON.stringify({ model, voiceId, persona: cat.persona, createdAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
          if (created.sample_audio?.data) await fs.writeFile(path.join(output, cat.id + '-design-preview.wav'), decodeWav(created.sample_audio.data), { flag: 'wx' });
          console.log('Designed persona for ' + cat.label);
        }
        await render(cat, voiceId, false, key);
        if (cat.babble && !cat.skipBabble) await render(cat, voiceId, true, key);
        if (!cat.skipBabble) await fs.rm(path.join(output, cat.id + '-error.json'), { force: true });
      }
    } catch (error) {
      console.error(error.message); process.exitCode = 1;
      if (activeCat) await fs.writeFile(path.join(output, activeCat.id + '-error.json'), JSON.stringify({ model, status: error.message.includes('blocked by safety policies') ? 'blocked' : 'failed', reason: error.message, testedAt: new Date().toISOString() }, null, 2));
    }
    await buildComparison(dir, cast, clips);
  }
} else await buildComparison(dir, cast, clips);
