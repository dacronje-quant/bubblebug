'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const activeChildren = new Set();
function stopChildren() { for (const child of activeChildren) { try { child.kill(); } catch (_) { /* already exited */ } } }
process.once('exit', stopChildren);
process.once('SIGINT', () => { stopChildren(); process.exit(130); });
process.once('SIGTERM', () => { stopChildren(); process.exit(143); });

function sourceFingerprint(root) {
  const files = ['index.html'];
  const visit = dir => {
    if (!fs.existsSync(path.join(root, dir))) return;
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) visit(rel);
      else if (/\.(?:js|cjs|json|css)$/.test(e.name) || e.name.endsWith('.json.gz')) files.push(rel);
    }
  };
  for (const dir of ['js', 'css', 'tools/lib', 'tools/fixtures']) visit(dir);
  for (const name of fs.readdirSync(path.join(root, 'tools')).sort()) if (/\.(js|cjs)$/.test(name)) files.push('tools/' + name);
  const hash = crypto.createHash('sha256'); hash.update(process.version);
  hash.update(process.platform + ':' + process.arch);
  const moduleLocations = [...(process.env.NODE_PATH || '').split(path.delimiter), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')].filter(Boolean);
  for (const name of ['@napi-rs/canvas', 'playwright', 'playwright-core']) {
    const metadata = moduleLocations.map(dir => path.join(dir, name, 'package.json')).find(file => fs.existsSync(file));
    hash.update(name).update(metadata ? fs.readFileSync(metadata) : 'unavailable');
  }
  for (const file of files) hash.update(file).update('\0').update(fs.readFileSync(path.join(root, file))).update('\0');
  return hash.digest('hex');
}

function runChild({ executable = process.execPath, args, cwd, env = process.env, timeoutMs = 300000, logFile, onOutput }) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 0x7FFFFFFF) throw new Error('timeoutMs must be an integer between 1 and 2147483647');
  return new Promise(resolve => {
    const start = performance.now();
    let tail = '', settled = false, timedOut = false;
    const log = logFile && fs.createWriteStream(logFile);
    const child = spawn(executable, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    activeChildren.add(child);
    const finish = extra => {
      if (settled) return; settled = true; clearTimeout(timer);
      activeChildren.delete(child);
      if (log) log.end();
      resolve({ ...extra, timedOut, seconds: (performance.now() - start) / 1000, tail });
    };
    const read = data => {
      const str = data.toString(); tail = (tail + str).slice(-12000);
      if (log) log.write(str); if (onOutput) onOutput(str);
    };
    child.stdout.on('data', read); child.stderr.on('data', read);
    // The timeout is in the supervising process, independent of a frozen game.
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.on('error', error => finish({ code: -1, error: error.message }));
    child.on('close', (code, signal) => finish({ code, signal }));
  });
}

function matchingCache(result, fingerprint) {
  return !!result && result.code === 0 && result.complete === true && !result.timedOut && result.fingerprint === fingerprint;
}

async function runPool(jobs, concurrency, execute) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('jobs must be a positive integer');
  const results = new Array(jobs.length); let next = 0;
  async function work() { while (next < jobs.length) { const i = next++; results[i] = await execute(jobs[i], i); } }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, work));
  return results;
}

module.exports = { sourceFingerprint, runChild, matchingCache, runPool };
