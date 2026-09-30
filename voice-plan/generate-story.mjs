// Review recordings only. Reads the saved environment key; never adds speech to the game.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
const story = JSON.parse(await readFile(new URL('./story-voices.json', import.meta.url), 'utf8'));
await mkdir(new URL('./samples/story/', import.meta.url), { recursive: true });
for (const line of story) {
  const url = new URL('./samples/story/' + line.id + '.mp3', import.meta.url);
  let exists = false;
  try { await access(url); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (exists) { console.log('Keeping existing story recording: ' + line.id); continue; }
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: line.voice, input: line.text, instructions: line.direction, response_format: 'mp3' }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    let body = {};
    try { body = await response.json(); } catch { /* never display raw responses */ }
    const code = String(body.error?.code || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    console.error('Speech failed for ' + line.id + ': HTTP ' + response.status + '; code=' + code);
    process.exitCode = 1; break;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Non-audio response for ' + line.id);
  await writeFile(url, bytes, { flag: 'wx' });
  await writeFile(new URL('./samples/story/' + line.id + '.json', import.meta.url), JSON.stringify({ model: 'gpt-4o-mini-tts', ...line, instructions: line.direction, generatedAt: new Date().toISOString(), bytes: bytes.length }, null, 2) + '\n');
  console.log('Created story recording: ' + line.id + ' (' + bytes.length + ' bytes)');
}
