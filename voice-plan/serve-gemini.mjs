// Local-only preview; serves the comparison HTML and no other project files.
import http from 'node:http';
import fs from 'node:fs/promises';
const file = new URL('./gemini-comparison.html', import.meta.url);
const server = http.createServer(async (request, response) => {
  if (!['/', '/gemini-comparison.html'].includes(request.url) || request.method !== 'GET') {
    response.writeHead(404); response.end('Not found'); return;
  }
  try {
    const page = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': page.length });
    response.end(page);
  } catch { response.writeHead(503); response.end('Run generate-gemini.mjs --prepare first.'); }
});
server.listen(8766, '127.0.0.1', () => console.log('Gemini voice comparison: http://127.0.0.1:8766'));
