// Local browser verification; exposes only the game and its public assets.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  const permitted = ['index.html', 'try-rewards.html', 'voice-plan/voice-test.html', 'voice-plan/voice-review.html'].includes(relative) || /^(js|assets)\//.test(relative);
  if (req.method !== 'GET' || !permitted || !file.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
  try {
    const body = await fs.readFile(file);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': body.length, 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(8767, '127.0.0.1', () => console.log('Game voice verification: http://127.0.0.1:8767/voice-plan/voice-test.html'));
