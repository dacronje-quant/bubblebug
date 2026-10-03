// Validate the complete pack before selecting any new recording in the game.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(dir);
const pack = JSON.parse(await fs.readFile(path.join(dir, 'gemini-pack.json'), 'utf8'));
const context = vm.createContext({ window: { BB: {} } });
vm.runInContext(await fs.readFile(path.join(root, 'js/core/voice-clips.js'), 'utf8'), context);
const old = context.window.BB.VOICE_CLIPS;
if (new Set(pack.clips.map(c => c.id)).size !== pack.clips.length || Object.keys(old).some(id => !pack.clips.some(c => c.id === id))) throw new Error('Pack must cover every game voice exactly once.');
const prepared = [], retained = [];
const allowPartial = process.argv.includes('--allow-partial');
const checkOnly = process.argv.includes('--check');
const cache = path.resolve(dir, process.argv.find(arg => arg.startsWith('--cache-dir='))?.slice(12) || 'samples/gemini-pack');
const installed = JSON.parse(await fs.readFile(path.join(root, 'assets/voice/gemini-3.8/manifest.json'), 'utf8'));
function normalize(original) {
  const bytes = Buffer.from(original);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Invalid WAV.');
  let format, data;
  for (let pos = 12; pos + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', pos, pos + 4), length = bytes.readUInt32LE(pos + 4), start = pos + 8;
    if (start + length > bytes.length) throw new Error('Truncated WAV chunk.');
    if (type === 'fmt ') format = { encoding: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2), rate: bytes.readUInt32LE(start + 4), bits: bytes.readUInt16LE(start + 14) };
    if (type === 'data') data = { start, length };
    pos = start + length + (length % 2);
  }
  if (!format || !data || format.encoding !== 1 || format.bits !== 16 || format.channels !== 1 || format.rate !== 24000 || data.length % 2) throw new Error('Expected 24 kHz mono PCM16 WAV.');
  const seconds = data.length / 2 / format.rate;
  if (seconds < 1 || seconds > 25) throw new Error('Unexpected speech duration: ' + seconds);
  let peak = 0, sum = 0, count = 0;
  for (let pos = data.start; pos < data.start + data.length; pos += 2) {
    const value = bytes.readInt16LE(pos) / 32768;
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) > .008) { sum += value * value; count++; }
  }
  if (!count || peak < .01) throw new Error('Recording contains no audible speech.');
  const rms = Math.sqrt(sum / count), gain = Math.min(4, .12 / rms, .891 / peak);
  for (let pos = data.start; pos < data.start + data.length; pos += 2) bytes.writeInt16LE(Math.round(bytes.readInt16LE(pos) * gain), pos);
  return { bytes, stats: { seconds, sampleRate: format.rate, channels: format.channels, gain, inputPeak: peak, inputSpeechRms: rms, outputPeak: peak * gain, outputSpeechRms: rms * gain } };
}
for (const clip of pack.clips) {
  const source = path.join(cache, clip.id);
  try { await fs.access(source + '.wav'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const selected = installed.clips.find(c => c.id === clip.id);
    if (selected) {
      if (selected.model !== pack.model || selected.text !== clip.text || selected.style !== clip.style || selected.speaker !== clip.speaker) throw new Error('Installed take differs from the plan: ' + clip.id);
      const bytes = await fs.readFile(path.join(root, old[clip.id].file));
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== selected.sha256) throw new Error('Installed WAV checksum differs: ' + clip.id);
      prepared.push({ clip, metadata: selected, bytes, stats: selected.normalization, sha256: selected.sha256 });
      continue;
    }
    if (!allowPartial) throw new Error('No generated Gemini take for ' + clip.id);
    await fs.access(path.join(root, old[clip.id].file));
    retained.push({ id: clip.id, ...old[clip.id], reason: 'Retained with user approval after Gemini daily quota was reached.' });
    continue;
  }
  const metadata = JSON.parse(await fs.readFile(source + '.json', 'utf8'));
  if (metadata.model !== pack.model || metadata.text !== clip.text || metadata.style !== clip.style || metadata.speaker !== clip.speaker) throw new Error('Take does not match the plan: ' + clip.id);
  const { bytes, stats } = normalize(await fs.readFile(source + '.wav'));
  prepared.push({ clip, metadata, bytes, stats, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
const dest = path.join(root, 'assets/voice/gemini-3.8');
if (checkOnly) {
  console.log('Validated ' + prepared.length + ' Gemini recordings and ' + retained.length + ' retained lines; no files changed.');
} else {
  await fs.mkdir(dest, { recursive: true });
  const manifest = Object.fromEntries(retained.map(({ id }) => [id, old[id]])), provenance = [];
  for (const { clip, metadata, bytes, stats, sha256 } of prepared) {
    await fs.writeFile(path.join(dest, clip.id + '.wav'), bytes);
    manifest[clip.id] = { file: 'assets/voice/gemini-3.8/' + clip.id + '.wav', text: clip.text, source: pack.model, speaker: clip.speaker, voice: metadata.voiceId };
    if (['cat_babySnowflake', 'cat_babyPatches', 'kin_rbTwinkle', 'poke_babySnowflake', 'poke_babyPatches'].includes(clip.id)) manifest[clip.id].fallback = false;
    provenance.push({ ...metadata, normalization: stats, sha256 });
  }
  await fs.writeFile(path.join(dest, 'manifest.json'), JSON.stringify({ model: pack.model, installedAt: new Date().toISOString(), normalization: 'Fixed gain; gated speech RMS target 0.12, peak limit 0.891, no pitch or speed change.', clips: provenance, retainedClips: retained }, null, 2) + '\n');
  await fs.writeFile(path.join(root, 'js/core/voice-clips.js'), '// Gemini family and story voices, bundled for offline play.' + (retained.length ? ' ' + retained.length + ' existing story lines are retained until Gemini quota is available.' : '') + '\nwindow.BB.VOICE_CLIPS = ' + JSON.stringify(manifest, null, 2) + ';\n');
  const selected = new Set(Object.values(manifest).map(c => c.file));
  const voiceRoot = path.join(root, 'assets/voice') + path.sep;
  for (const clip of Object.values(old)) if (clip.file && !selected.has(clip.file)) {
    const obsolete = path.resolve(root, clip.file);
    if (!obsolete.startsWith(voiceRoot) || !/\.(mp3|wav)$/.test(obsolete)) throw new Error('Unsafe obsolete voice path.');
    await fs.unlink(obsolete).catch(e => { if (e.code !== 'ENOENT') throw e; });
  }
  console.log('Installed ' + prepared.length + ' Gemini recordings; retained ' + retained.length + ' existing lines.');
}
