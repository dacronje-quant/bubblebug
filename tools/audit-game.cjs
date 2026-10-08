'use strict';
// Run the existing regression suites and retain evidence for release review.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-output', 'release-audit');
fs.mkdirSync(out, { recursive: true });
const browser = process.argv.includes('--browser');
const requested = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const suites = fs.readdirSync(__dirname).filter(f => /^(test-.*|check-audio|check-mix-browser)\.js$/.test(f))
  .filter(f => /browser|test-camera|test-rainbow-beams|test-wayfinder|test-game-visuals/.test(f) === browser)
  .filter(f => !requested || requested.includes(f)).sort();
const results = [];
let next = 0;
async function worker() {
  while (next < suites.length) {
    const file = suites[next++], started = Date.now();
    const args = [path.join(__dirname, file)];
    if (browser) args.push(path.join(out, file.replace('.js', '')));
    const log = fs.createWriteStream(path.join(out, file + '.log'));
    const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
    const result = await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill(); }, 300000);
      child.on('error', error => { clearTimeout(timer); resolve({ file, code: -1, error: error.message }); });
      child.on('close', code => { clearTimeout(timer); log.end(); resolve({ file, code, seconds: Math.round((Date.now() - started) / 1000) }); });
    });
    results.push(result);
    console.log((result.code === 0 ? 'PASS ' : 'FAIL ') + file + ' ' + result.seconds + 's');
  }
}
Promise.all(Array.from({ length: browser ? 1 : 3 }, worker)).then(() => {
  const resultPath = path.join(out, browser ? 'browser-results.json' : 'game-results.json');
  const old = requested && fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')).filter(r => !requested.includes(r.file)) : [];
  fs.writeFileSync(resultPath, JSON.stringify([...old, ...results].sort((a,b) => a.file.localeCompare(b.file)), null, 2));
  console.log(`${results.filter(r => r.code === 0).length}/${results.length} suites passed`);
  process.exitCode = results.some(r => r.code !== 0) ? 1 : 0;
});
