#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { sourceFingerprint, runChild, runPool, matchingCache } = require('./lib/playability-runner.cjs');
const { jumpEdges, shiftJump } = require('./lib/input-variations.cjs');
const { readRoute } = require('./lib/recorded-route.cjs');
const ROOT = path.resolve(__dirname, '..');
const SUITES = ['test-playability-harness.js', 'test-playability-runner.js', 'test-recorded-route.js', 'test-planner-physics.js', 'test-maze-graph.js', 'test-world-search.js', 'test-skill-controls.js',
  'test-climbs.js', 'test-room-glides.js', 'test-render-motion.js', 'test-render-random.js', 'test-journey.js', 'test-reset.js', 'test-maze.js', 'test-rainbow-family.js',
  'test-finale.js', 'test-finds.js', 'test-wardrobe.js', 'test-rewards.js', 'test-interactions.js', 'test-difficulty.js',
  'test-garden.js', 'test-garden-route.js', 'test-playability-menus.js', 'test-room-boundaries.js', 'test-solid-terrain.js'];
const value = (args, name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };

function childEnvironment() {
  const env = { ...process.env };
  const paths = [env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, env.NODE_PATH,
    env.USERPROFILE && path.join(env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')].filter(Boolean);
  const bundled = paths.find(p => fs.existsSync(path.join(p, '@napi-rs/canvas')));
  if (bundled) env.NODE_PATH = [env.NODE_PATH, bundled].filter(Boolean).join(path.delimiter);
  if (!env.BUBBLEPAWS_BROWSER) {
    const programFiles = env.ProgramFiles || env.PROGRAMFILES;
    const programFilesX86 = env['ProgramFiles(x86)'] || env['PROGRAMFILES(X86)'];
    const candidates = [programFiles && path.join(programFiles, 'Google/Chrome/Application/chrome.exe'),
      programFilesX86 && path.join(programFilesX86, 'Microsoft/Edge/Application/msedge.exe'),
      programFiles && path.join(programFiles, 'Microsoft/Edge/Application/msedge.exe'),
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')].filter(Boolean);
    env.BUBBLEPAWS_BROWSER = candidates.find(file => fs.existsSync(file));
  }
  return env;
}

async function main(args = process.argv.slice(2)) {
  const booleanFlags = new Set(['--help', '--quick', '--deep', '--stress', '--browser', '--no-cache', '--all-collectibles', '--discover']);
  const valueFlags = new Set(['--mode', '--seed', '--jobs', '--timeout-ms', '--only', '--out']);
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (booleanFlags.has(flag)) continue;
    if (!valueFlags.has(flag)) throw new Error('Unknown option: ' + flag);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + flag);
    i++;
  }
  if (args.includes('--help')) {
    console.log('node tools/check-playability.cjs [--quick] [--deep] [--stress] [--browser] [--mode easy|medium|hard|all] [--seed N] [--jobs N] [--timeout-ms N] [--no-cache] [--all-collectibles] [--discover] [--only suite|adventure|world|ID] [--out DIR]\nDefault: focused regressions plus actual fresh-save adventures in all three difficulties, using verified golden inputs when available. --quick runs regressions/complete maze graphs only. --deep also runs the world movement/replay/shortcut matrix. --stress perturbs representative jump timing and requires recovery to completion. --browser confirms completed input routes in Chromium. --discover searches for routes again; new seeds without golden inputs also use the controller. Successful inputs are executed again, never accepted without execution.');
    return { complete: true, help: true };
  }
  const quick = args.includes('--quick'), deep = args.includes('--deep');
  if (quick && deep) throw new Error('--quick and --deep are mutually exclusive');
  if (quick && (args.includes('--stress') || args.includes('--browser'))) throw new Error('--stress/--browser require actual adventure runs, so cannot use --quick');
  const mode = value(args, '--mode', 'all');
  if (!['all', 'easy', 'medium', 'hard'].includes(mode)) throw new Error('--mode must be easy, medium, hard or all');
  const jobs = Number(value(args, '--jobs', Math.min(4, os.availableParallelism()))), timeoutMs = Number(value(args, '--timeout-ms', 300000));
  const seed = Number(value(args, '--seed', 1));
  if (!Number.isInteger(jobs) || jobs < 1 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 0x7FFFFFFF || !Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) throw new Error('Invalid jobs, timeout (1..2147483647 ms) or uint32 seed');
  const out = path.resolve(ROOT, value(args, '--out', 'test-output/playability'));
  fs.mkdirSync(out, { recursive: true });
  const cache = path.join(out, 'cache'); fs.mkdirSync(cache, { recursive: true });
  const fingerprint = sourceFingerprint(ROOT), env = childEnvironment();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ schema: 1, status: 'running', complete: false, fingerprint,
    quick, deep, startedAt: new Date().toISOString() }));
  let tasks = SUITES.map(file => ({ id: file.replace(/\.js$/, ''), kind: 'suite', file }));
  if (!quick) for (const difficulty of mode === 'all' ? ['easy', 'medium', 'hard'] : [mode]) tasks.push({ id: 'adventure-' + difficulty + '-' + seed, kind: 'adventure', mode: difficulty, seed });
  if (deep) for (const easy of [false, true]) for (const replay of [false, true]) for (const shortcuts of [false, true]) {
    tasks.push({ id: 'world-' + [easy ? 'easy' : 'normal', replay ? 'replay' : 'story', shortcuts ? 'open' : 'closed'].join('-'), kind: 'world', easy, replay, shortcuts });
  }
  const only = value(args, '--only', null);
  if (only) {
    const selected = only.split(',');
    for (const entry of selected) if (!tasks.some(t => t.id === entry || t.kind === entry || t.file === entry)) throw new Error('Unknown check selection: ' + entry);
    tasks = tasks.filter(t => selected.some(entry => t.id === entry || t.kind === entry || t.file === entry));
  }
  if ((args.includes('--stress') || args.includes('--browser')) && !tasks.some(t => t.kind === 'adventure')) throw new Error('--stress/--browser require selected adventure runs');
  const start = performance.now();
  console.log('Playability ' + (quick ? 'quick checks' : deep ? 'deep matrix' : 'fresh-save completion') + ': ' + tasks.length + ' jobs, concurrency ' + jobs);
  const results = await runPool(tasks, jobs, async task => {
    const runId = randomUUID();
    const resultPath = path.join(out, task.id + '.json'), cachedPath = path.join(cache, task.id + '.json');
    if (task.kind === 'suite' && !args.includes('--no-cache') && fs.existsSync(cachedPath)) {
      const saved = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
      if (matchingCache(saved, fingerprint)) { console.log('CACHED ' + task.id); return { ...saved, cached: true }; }
    }
    let cmd;
    fs.writeFileSync(resultPath, JSON.stringify({ ...task, fingerprint, status: 'running', complete: false }));
    if (task.kind === 'suite') cmd = [path.join(__dirname, task.file)];
    else if (task.kind === 'adventure') {
      const routeFile = path.join(cache, 'route-' + task.id + (args.includes('--all-collectibles') ? '-collectibles' : '') + '.json');
      let replayFile, fixture = false;
      if (!args.includes('--discover') && !args.includes('--no-cache') && fs.existsSync(routeFile)) {
        const route = readRoute(routeFile);
        if (route.schema === 1 && route.complete === true && route.fingerprint === fingerprint && route.mode === task.mode && route.seed === task.seed && Array.isArray(route.trace) && route.expected?.save) replayFile = routeFile;
      }
      const fixtureFile = path.join(__dirname, 'fixtures', 'playability', task.mode + '-' + task.seed + (args.includes('--all-collectibles') ? '-collectibles' : '') + '.json.gz');
      if (!args.includes('--discover') && !replayFile && fs.existsSync(fixtureFile)) { replayFile = fixtureFile; fixture = true; }
      cmd = [path.join(__dirname, 'playability-worker.cjs'), JSON.stringify({ ...task, runId, output: resultPath, fingerprint, routeFile, replayFile,
        fixture, allCollectibles: args.includes('--all-collectibles'), progressFile: path.join(out, task.id + '-progress.json') })];
    } else cmd = [path.join(__dirname, 'verify-world.js'), '--jobs', '1', '--timeout-ms', String(timeoutMs), '--json', resultPath,
      ...(task.easy ? ['--easy'] : []), ...(task.replay ? ['--replay'] : []), ...(task.shortcuts ? ['--shortcuts-open'] : [])];
    let lines = '';
    const result = { ...task, fingerprint, ...await runChild({ args: cmd, cwd: ROOT, env, timeoutMs, logFile: path.join(out, task.id + '.log'),
      onOutput: task.kind === 'adventure' ? text => {
        lines += text;
        while (lines.includes('\n')) {
          const end = lines.indexOf('\n'), line = lines.slice(0, end); lines = lines.slice(end + 1);
          if (!line.startsWith('PROGRESS ')) continue;
          try { const p = JSON.parse(line.slice(9)); if (p.kind === 'objective' || ['ability', 'bosses', 'kin', 'finale'].includes(p.kind)) console.log('  [' + task.mode + '] ' + p.kind + ' ' + p.id + ', tick ' + p.tick); } catch (_) { /* complete JSON remains in log */ }
        }
      } : undefined }) };
    result.complete = result.code === 0 && !result.timedOut;
    if (task.kind === 'adventure' && fs.existsSync(resultPath)) {
      const details = JSON.parse(fs.readFileSync(resultPath, 'utf8')); result.complete = result.complete && details.complete === true && details.runId === runId && details.fingerprint === fingerprint;
      result.coverage = details.coverage; result.ticks = details.ticks;
    }
    if (task.kind === 'suite') {
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      if (result.complete) fs.writeFileSync(cachedPath, JSON.stringify(result));
    }
    console.log((result.timedOut ? 'TIMEOUT ' : result.complete ? 'PASS ' : 'FAIL ') + task.id + ' ' + result.seconds.toFixed(2) + 's');
    if (!result.complete) console.error(result.tail.slice(-2000));
    return result;
  });
  if (args.includes('--stress')) {
    if (quick || !results.some(r => r.kind === 'adventure')) throw new Error('--stress requires actual adventure runs');
    const stress = [];
    for (const adventure of results.filter(r => r.kind === 'adventure')) {
      const routeFile = path.join(cache, 'route-' + adventure.id + (args.includes('--all-collectibles') ? '-collectibles' : '') + '.json');
      if (!adventure.complete || !fs.existsSync(routeFile)) {
        results.push({ id: 'stress-' + adventure.id, kind: 'stress', complete: false, code: 1, error: 'A verified complete input route is required before timing perturbations.' });
        continue;
      }
      const route = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
      const edges = jumpEdges(route.trace), viable = [];
      const actualJumpTicks = new Set((route.jumpEvents || []).map(event => event.tick));
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].tick < 500 || !actualJumpTicks.has(edges[i].tick)) continue;
        try { shiftJump(route.trace, i, -2); shiftJump(route.trace, i, 2); viable.push(i); } catch (_) { /* preserve all discrete edges */ }
      }
      const picks = [...new Set([viable[0], viable[Math.floor(viable.length / 2)], viable[viable.length - 1]].filter(n => n != null))];
      if (!picks.length) results.push({ id: 'stress-' + adventure.id, kind: 'stress', complete: false, code: 1, error: 'No safely perturbable jump edge was recorded.' });
      for (const edgeOrdinal of picks) for (const offset of [-2, 2]) stress.push({ id: 'stress-' + adventure.id + '-' + edgeOrdinal + '-' + (offset < 0 ? 'early' : 'late'),
        kind: 'stress', mode: adventure.mode, seed, replayFile: routeFile, variation: { edgeOrdinal, offset } });
    }
    results.push(...await runPool(stress, jobs, async task => {
      const runId = randomUUID();
      const output = path.join(out, task.id + '.json');
      const result = { ...task, fingerprint, ...await runChild({ cwd: ROOT, env, timeoutMs, logFile: path.join(out, task.id + '.log'),
        args: [path.join(__dirname, 'playability-worker.cjs'), JSON.stringify({ ...task, runId, fingerprint, output, allCollectibles: args.includes('--all-collectibles') })] }) };
      const details = fs.existsSync(output) && JSON.parse(fs.readFileSync(output, 'utf8'));
      result.complete = result.code === 0 && !result.timedOut && details.complete === true && details.runId === runId && details.fingerprint === fingerprint;
      console.log((result.complete ? 'PASS ' : 'FAIL ') + task.id + ' ' + result.seconds.toFixed(2) + 's');
      return result;
    }));
  }
  if (args.includes('--browser')) {
    if (!results.some(r => r.kind === 'adventure')) throw new Error('--browser requires actual adventure runs');
    for (const adventure of results.filter(r => r.kind === 'adventure')) {
      const id = 'browser-' + adventure.id, routeFile = path.join(cache, 'route-' + adventure.id + (args.includes('--all-collectibles') ? '-collectibles' : '') + '.json');
      if (!adventure.complete || !fs.existsSync(routeFile)) {
        results.push({ id, kind: 'browser', complete: false, code: 1, error: 'Browser completion replay requires a verified complete input route.' }); continue;
      }
      const result = { id, kind: 'browser', mode: adventure.mode, ...await runChild({ cwd: ROOT, env, timeoutMs, logFile: path.join(out, id + '.log'),
        args: [path.join(__dirname, 'test-playthrough-browser.js'), '--trace', routeFile, '--out', path.join(out, id), '--timeout-ms', String(timeoutMs)] }) };
      const browserReport = path.join(out, id, 'result.json');
      result.complete = result.code === 0 && !result.timedOut && fs.existsSync(browserReport) && JSON.parse(fs.readFileSync(browserReport, 'utf8')).complete === true;
      results.push(result); console.log((result.complete ? 'PASS ' : 'FAIL ') + id + ' ' + result.seconds.toFixed(2) + 's');
    }
  }
  const changed = fingerprint !== sourceFingerprint(ROOT);
  const completionRequested = results.some(r => r.kind === 'adventure');
  const report = { schema: 1, fingerprint, quick, deep, seconds: (performance.now() - start) / 1000,
    complete: results.every(r => r.complete) && !changed, sourceChangedDuringRun: changed, freshSaveCompletionChecked: completionRequested,
    coverage: { difficulties: results.filter(r => r.kind === 'adventure').map(r => r.mode), worldMatrix: results.filter(r => r.kind === 'world').length === 8,
      worldCases: results.filter(r => r.kind === 'world').map(r => r.id),
      allCollectiblesRequired: args.includes('--all-collectibles'), jumpTimingVariations: results.filter(r => r.kind === 'stress').length,
      browserReplays: results.filter(r => r.kind === 'browser').map(r => r.mode) }, results };
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  console.log(results.filter(r => r.complete).length + '/' + results.length + ' checks passed in ' + report.seconds.toFixed(2) + 's. ' + (!completionRequested ? 'Full adventure completion was not requested.' : 'Actual adventure completion and earned unlocks are required.'));
  if (changed) console.error('Source changed during this run; repeat on a stable checkout before accepting its combined result.');
  if (require.main === module) process.exitCode = report.complete ? 0 : 1;
  return report;
}

if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = { main, childEnvironment };
