// Auditions only. Uses the saved environment key; never adds speech to the game.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
const cast = JSON.parse(await readFile(new URL('./family-prompts.json', import.meta.url), 'utf8'));
const wanted = process.argv.find(x => x.startsWith('--id='))?.slice(5);
const selected = wanted ? cast.filter(x => x.id === wanted) : cast;
if (!selected.length) throw new Error('Unknown family cat ID.');
const common = 'Speak only the supplied dialogue in clear English to a four-year-old. This is a lovable fictional kitten in a gentle storybook game. Keep the delivery concise and natural, with small expressive pauses. No additional words, introductions, music, meowing, sound effects or exaggerated baby talk.';
await mkdir(new URL('./samples/family/', import.meta.url), { recursive: true });
let failed = false;
for (const cat of selected) {
  if (cat.source === 'original-game') {
    console.log('Preserving original baby recording: ' + cat.id);
    continue;
  }
  const instructions = cat.direction + ' ' + (cat.performance === 'baby-babble'
    ? 'This is a lovable fictional baby kitten. Perform only the supplied baby syllables and soft mews, with no intelligible words or additional sounds. Keep it brief, sweet and playful.'
    : common);
  const fileId = cat.auditionId || cat.id;
  const url = new URL('./samples/family/' + fileId + '.mp3', import.meta.url);
  let exists = false;
  try { await access(url); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (exists) { console.log('Keeping existing audition: ' + cat.id); continue; }
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: cat.voice, input: cat.text, instructions, response_format: 'mp3' }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    let body = {};
    try { body = await response.json(); } catch { /* do not display raw responses */ }
    const code = String(body.error?.code || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    console.error('Speech failed for ' + cat.id + ': HTTP ' + response.status + '; code=' + code);
    failed = true; break;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Non-audio response for ' + cat.id);
  await writeFile(url, bytes, { flag: 'wx' });
  await writeFile(new URL('./samples/family/' + fileId + '.json', import.meta.url), JSON.stringify({ model: 'gpt-4o-mini-tts', ...cat, instructions, generatedAt: new Date().toISOString(), bytes: bytes.length }, null, 2) + '\n');
  console.log('Created family audition: ' + cat.id + ' (' + bytes.length + ' bytes)');
}
if (failed) process.exitCode = 1;
