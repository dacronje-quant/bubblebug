#!/usr/bin/env node
'use strict';
// Optional Chromium replay of a successful earned route. The isolated
// context uses real game keyboard listeners/updates and never places the
// player, grants progress, or changes invulnerability. Audio and wall-clock
// scheduling are absent exactly as in the deterministic Node harness.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { sourceFingerprint } = require('./lib/playability-runner.cjs');
const { createGame, modeOf, runtimeState } = require('./lib/playability-harness.cjs');
const { readRoute, validateRoute } = require('./lib/recorded-route.cjs');
const { withRenderRandom } = require('./lib/render-random.cjs');
const ROOT = path.join(__dirname, '..');
const KEY_CODES = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS',
  'Space', 'KeyK', 'KeyC', 'KeyX', 'KeyZ', 'KeyJ', 'KeyE', 'ShiftLeft', 'ShiftRight', 'Enter', 'NumpadEnter',
  'Escape', 'KeyP', 'Backspace', 'KeyM', 'Tab']);

function parseArgs(args) {
  const options = { batchTicks: 300, timeoutMs: 180000, out: path.join(ROOT, 'test-output/playability/browser'),
    allowPartial: false, smoke: false };
  let positionalOutput = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help' || flag === '-h') options.help = true;
    else if (flag === '--allow-partial') options.allowPartial = true;
    else if (flag === '--smoke') options.smoke = options.allowPartial = true;
    else if (['--trace', '--out', '--batch-ticks', '--timeout-ms'].includes(flag)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + flag);
      const value = args[++i];
      if (flag === '--trace') options.tracePath = path.resolve(value);
      else if (flag === '--out') options.out = path.resolve(value);
      else if (flag === '--batch-ticks') options.batchTicks = Number(value);
      else options.timeoutMs = Number(value);
    } else if (!flag.startsWith('-') && !positionalOutput) {
      // audit-game's existing browser convention passes a screenshot
      // directory. Preserve it as an explicitly partial smoke invocation.
      positionalOutput = true; options.compatibilitySmoke = true;
      options.out = path.resolve(flag); options.smoke = options.allowPartial = true;
    } else throw new Error('Unknown option: ' + flag);
  }
  if (!Number.isInteger(options.batchTicks) || options.batchTicks < 1 || options.batchTicks > 2000) throw new Error('--batch-ticks must be 1..2000');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000 || options.timeoutMs > 0x7FFFFFFF) throw new Error('--timeout-ms must be 1000..2147483647');
  if (options.smoke && options.tracePath) throw new Error('--smoke and --trace are separate replay modes');
  return options;
}

function validateTrace(route, fingerprint, { allowPartial = false } = {}) {
  assert.ok(route && typeof route === 'object', 'Trace must be a JSON object');
  assert.equal(route.schema, 1, 'Unsupported input trace schema');
  if (route.recordType === 'golden-inputs') validateRoute(route, { mode:route.mode, seed:route.seed, fingerprint, fixture:true });
  else assert.equal(route.fingerprint, fingerprint, 'Trace source fingerprint is stale; regenerate it with check-playability');
  assert.ok(['easy', 'medium', 'hard'].includes(route.mode), 'Trace needs an explicit easy/medium/hard mode');
  assert.ok(Number.isInteger(route.seed) && route.seed >= 0 && route.seed <= 0xFFFFFFFF, 'Trace needs a uint32 seed');
  assert.equal(typeof route.complete, 'boolean', 'Trace needs an explicit complete marker');
  assert.ok(route.complete || allowPartial, 'Trace is incomplete; --allow-partial confirms only a prefix, never full playability');
  assert.ok(route.expected?.save && typeof route.expected.save === 'object', 'Trace needs the expected earned save');
  assert.ok(Array.isArray(route.trace), 'Trace needs input chunks');
  let ticks = 0;
  const keys = codes => assert.ok(Array.isArray(codes) && codes.every(code => KEY_CODES.has(code)), 'Trace contains an invalid keyboard code');
  for (const chunk of route.trace) {
    assert.ok(Number.isInteger(chunk.ticks) && chunk.ticks > 0, 'Each trace chunk needs a positive tick count');
    keys(chunk.keys);
    assert.ok(chunk.eventsBefore == null || Array.isArray(chunk.eventsBefore), 'eventsBefore must contain key-state arrays');
    for (const event of chunk.eventsBefore || []) keys(event);
    assert.ok(chunk.tap == null || typeof chunk.tap === 'boolean', 'Legacy tap marker must be boolean');
    ticks += chunk.ticks;
  }
  assert.ok(Number.isSafeInteger(ticks) && ticks <= 2000000, 'Trace exceeds the two-million-tick replay bound');
  if (route.complete) assert.ok(ticks > 0, 'A completed route cannot be empty');
  return ticks;
}

function* traceBatches(trace, batchTicks) {
  let batch = [], size = 0;
  for (const chunk of trace) {
    let remaining = chunk.ticks, first = true;
    while (remaining) {
      const ticks = Math.min(remaining, batchTicks - size);
      batch.push({ keys: chunk.keys, ticks, ...(first && chunk.eventsBefore ? { eventsBefore: chunk.eventsBefore } : {}),
        ...(first && chunk.tap ? { tap: true } : {}) });
      remaining -= ticks; size += ticks; first = false;
      if (size === batchTicks) { yield batch; batch = []; size = 0; }
    }
  }
  if (batch.length) yield batch;
}

function smokeTrace(fingerprint) {
  const game = createGame({ mode: 'medium', seed: 1, maxTicks: 1000 });
  game.tick(420); game.tick(36, ['ArrowRight']); game.tick(30);
  game.tick(12, ['Space']); game.keys([]); game.tick(1, ['Space']); game.tick(45);
  game.BB.Play.writeSave();
  return { schema: 1, fingerprint, mode: 'medium', seed: 1, complete: false, trace: game.trace,
    expected: { save: JSON.parse(JSON.stringify(game.BB.Play.save)), runtime: runtimeState(game.BB) } };
}

async function run(options) {
  if (options.compatibilitySmoke) console.log('Screenshot-directory compatibility run: partial fresh-save smoke only; full playability remains unconfirmed.');
  const fingerprint = sourceFingerprint(ROOT);
  if (!options.smoke && !options.tracePath) throw new Error('Supply --trace with a completed earned route from check-playability, or use --smoke for a partial input replay');
  if (options.tracePath && !fs.existsSync(options.tracePath)) throw new Error('Trace file does not exist: ' + options.tracePath);
  const route = options.smoke ? smokeTrace(fingerprint) : readRoute(options.tracePath);
  const totalTicks = validateTrace(route, fingerprint, options);
  const { chromium } = require('playwright');
  fs.mkdirSync(options.out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors = [];
  let completedTicks = 0, batchIndex = 0, timedOut = false;
  const started = performance.now();
  const timeout = setTimeout(() => {
    timedOut = true;
    console.error('Browser replay timed out at batch ' + batchIndex + ', tick ' + completedTicks + '/' + totalTicks);
    browser.close().catch(() => {});
    setTimeout(() => process.exit(1), 2000).unref();
  }, options.timeoutMs);
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.addInitScript(({ mode, seed, renderHelper }) => {
      let now = 0, next = 0, random = seed >>> 0;
      const timers = new Map();
      Object.defineProperty(performance, 'now', { value: () => now });
      window.__replayPresentationFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = () => 0;
      window.cancelAnimationFrame = () => {};
      window.setTimeout = (fn, delay = 0, ...args) => {
        const id = ++next; timers.set(id, { at: now + Math.max(0, Number(delay) || 0), fn, args }); return id;
      };
      window.clearTimeout = id => timers.delete(id);
      window.__replayClock = { advance(ms) {
        now += ms;
        const ready = [...timers].filter(([, job]) => job.at <= now);
        for (const [id, job] of ready) if (timers.delete(id)) job.fn(...job.args);
      } };
      Math.random = () => {
        random = (random + 0x6D2B79F5) >>> 0;
        let n = Math.imul(random ^ random >>> 15, 1 | random);
        n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
        return ((n ^ n >>> 14) >>> 0) / 4294967296;
      };
      let visualSeed = (seed ^ 0x9E3779B9) >>> 0;
      const visualRandom = () => {
        visualSeed = (visualSeed + 0x6D2B79F5) >>> 0;
        let n = Math.imul(visualSeed ^ visualSeed >>> 15, 1 | visualSeed);
        n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
        return ((n ^ n >>> 14) >>> 0) / 4294967296;
      };
      const withRandom = new Function('return (' + renderHelper + ')')();
      window.__replayDraw = () => withRandom(Math, visualRandom, () => BB.Main.draw(1));
      for (const name of ['AudioContext', 'webkitAudioContext', 'Audio', 'speechSynthesis']) {
        Object.defineProperty(window, name, { configurable: true, value: undefined });
      }
      localStorage.clear(); localStorage.setItem('bubblepaws_difficulty', mode);
      window.__replayHeld = new Set();
      window.__replayKeys = keys => {
        const wanted = new Set(keys), held = window.__replayHeld;
        const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true, repeat: false }));
        for (const code of held) if (!wanted.has(code)) send('keyup', code);
        for (const code of wanted) if (!held.has(code)) send('keydown', code);
        window.__replayHeld = wanted;
      };
    }, { mode: route.mode, seed: route.seed, renderHelper:withRenderRandom.toString() });
    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href, { waitUntil: 'load' });
    const ledgerSource = fs.readFileSync(path.join(__dirname, 'lib/unlock-ledger.cjs'), 'utf8');
    await page.evaluate(({ source, mode }) => {
      const module = { exports: {} };
      new Function('module', 'exports', source)(module, module.exports);
      window.__replayLedger = module.exports;
      BB.Save.data = BB.Save.fresh(); BB.Main.set('play', { cat: 'phoebe' });
      window.__replayCatalog = window.__replayLedger.catalog(BB);
      window.__replayMode = new Function('BB', 'return (' + mode + ')(BB)');
      window.__replayRendered = { ticks:0, frames:0, states:new Set(), last:'' };
    }, { source:ledgerSource, mode:modeOf.toString() });
    for (const batch of traceBatches(route.trace, options.batchTicks)) {
      await page.evaluate(parts => {
        for (const chunk of parts) {
          for (const keys of chunk.eventsBefore || []) window.__replayKeys(keys);
          if (chunk.tap && window.__replayHeld.has('Space')) window.__replayKeys(chunk.keys.filter(k => k !== 'Space'));
          window.__replayKeys(chunk.keys);
          for (let i = 0; i < chunk.ticks; i++) {
            BB.Input.poll(); BB.Main.update(); window.__replayClock.advance(BB.CFG.STEP);
            const b = BB.Play.pl?.body;
            if (b && ['x', 'y', 'vx', 'vy'].some(k => !Number.isFinite(b[k]))) throw new Error('Non-finite browser physics');
            const rendered = window.__replayRendered;
            const boss = BB.Play.ents?.[BB.Play.room?.id]?.bosses?.find(boss => !BB.Play.save.bosses[boss.room]);
            const state = BB.Play.room?.id + '/' + window.__replayMode(BB) + '/' + (boss?.state || '');
            // Exercise every observed room/modal/boss transition and periodic
            // gameplay frames. Rendering exceptions in an earlier stage must
            // not be hidden by a successful final-state screenshot.
            if (++rendered.ticks % 60 === 0 || state !== rendered.last) {
              window.__replayDraw(); rendered.frames++; rendered.states.add(state); rendered.last = state;
            }
          }
        }
      }, batch);
      completedTicks += batch.reduce((n, chunk) => n + chunk.ticks, 0); batchIndex++;
      if (errors.length) throw new Error('Browser runtime error: ' + errors[0]);
      if (completedTicks % 25000 < options.batchTicks) console.log('Replayed ' + completedTicks + '/' + totalTicks + ' ticks');
    }
    const observed = await page.evaluate(({ runtime, mode, all }) => {
      window.__replayKeys([]);
      // The Node worker takes expected.save immediately after this same
      // ordinary save operation, without advancing the simulation.
      BB.Play.writeSave();
      const state = new Function('BB', 'const modeOf = ' + mode + '; return (' + runtime + ')(BB);')(BB);
      return { save: JSON.parse(JSON.stringify(BB.Play.save)), runtime: state,
        persisted: JSON.parse(localStorage.getItem('bubblebug_kingdom_v2')),
        ledger: window.__replayLedger.inspect(BB, window.__replayCatalog, { requireAllCollectibles: all }),
        rendering: { cosmeticRandomStream:'isolated', frames:window.__replayRendered.frames, states:[...window.__replayRendered.states] },
        preview: BB.Save.preview };
    }, { runtime: runtimeState.toString(), mode: modeOf.toString(), all: !!(route.requireAllCollectibles || route.expected.requireAllCollectibles) });
    assert.equal(observed.preview, false, 'Browser replay uses an ordinary fresh save');
    assert.deepEqual(observed.save, route.expected.save, 'Browser earned save diverges from the Node trace');
    assert.deepEqual(observed.persisted, observed.save, 'Browser localStorage preserves the earned save');
    if (route.expected.runtime) assert.deepEqual(observed.runtime, route.expected.runtime, 'Browser final runtime diverges from the Node trace');
    if (route.complete) {
      assert.equal(observed.ledger.complete, true, 'Browser is missing unlocks: ' + observed.ledger.missing.join(', '));
      assert.deepEqual(observed.ledger.errors, []);
    }
    for (const [name, viewport] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844 }]]) {
      await page.setViewportSize(viewport);
      if (name === 'phone') {
        // A harmless touch on the page activates the normal touch UI.
        // This screenshot checks rendering, not phone-input playthrough.
        await page.dispatchEvent('body', 'pointerdown', { pointerType: 'touch', pointerId: 77, clientX: 0, clientY: 0 });
        await page.dispatchEvent('body', 'pointerup', { pointerType: 'touch', pointerId: 77, clientX: 0, clientY: 0 });
      }
      await page.evaluate(() => new Promise(resolve => {
        // Let browser resize events settle without running any game ticks.
        // Otherwise a late resize can clear our manually drawn canvas.
        window.__replayPresenting = true;
        const draw = () => {
          if (!window.__replayPresenting) return;
          BB.Main.draw(1); window.__replayPresentationFrame(draw);
        };
        window.__replayPresentationFrame(() => {
          BB.G.resize(); draw();
          window.__replayPresentationFrame(resolve);
        });
      }));
      const painted = await page.evaluate(() => {
        const { canvas, ctx } = BB.G, pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < pixels.length; i += 64) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 30) return true;
        return false;
      });
      assert.equal(painted, true, name + ' renders visible canvas pixels');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + ' has no horizontal overflow');
      await page.screenshot({ path: path.join(options.out, name + '.png') });
      await page.evaluate(() => { window.__replayPresenting = false; });
    }
    assert.deepEqual(errors, [], 'Rendering has no browser runtime errors');
    assert.equal(sourceFingerprint(ROOT), fingerprint, 'Sources changed during browser replay; regenerate the route');
    const result = { complete: route.complete && observed.ledger.complete, replayMatched: true,
      scope: route.complete ? 'completed earned route replay' : 'partial input replay only',
      fingerprint, mode: route.mode, seed: route.seed, ticks: completedTicks, batches: batchIndex,
      seconds: (performance.now() - started) / 1000, ledger: observed.ledger, rendering:observed.rendering,
      screenshots: ['desktop.png', 'phone.png'] };
    fs.writeFileSync(path.join(options.out, 'result.json'), JSON.stringify(result, null, 2));
    console.log((result.complete ? '✓ Completed earned playthrough confirmed' : '✓ Partial replay matched; full playability remains unconfirmed')
      + ' in Chromium (' + completedTicks + ' ticks, ' + result.seconds.toFixed(2) + 's)');
    return result;
  } catch (error) {
    const failure = { complete: false, fingerprint, timedOut, mode: route.mode, seed: route.seed,
      tick: completedTicks, batch: batchIndex, error: error.message, browserErrors: errors };
    fs.writeFileSync(path.join(options.out, 'failure.json'), JSON.stringify(failure, null, 2));
    fs.writeFileSync(path.join(options.out, 'result.json'), JSON.stringify(failure, null, 2));
    throw error;
  } finally {
    clearTimeout(timeout); await context.close().catch(() => {}); await browser.close().catch(() => {});
  }
}

if (require.main === module) {
  Promise.resolve().then(() => {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node tools/test-playthrough-browser.js --trace PATH [--out DIR] [--batch-ticks 300] [--timeout-ms 180000]\n'
        + 'Use a current completed earned route from check-playability. BUBBLEPAWS_BROWSER selects Chrome/Edge.\n'
        + '--smoke checks a short fresh-save input trace; --allow-partial accepts an explicitly incomplete trace. Neither proves completion.\n'
        + 'A positional screenshot directory runs the same partial smoke for audit-game --browser compatibility.');
      return;
    }
    return run(options);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { parseArgs, validateTrace, traceBatches, smokeTrace, run };
