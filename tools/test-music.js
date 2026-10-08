#!/usr/bin/env node
// Recorded music preparation stays asynchronous and bounded, including file://.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

function harness() {
  let now = 0, work = 0, nextId = 0, automatic = true;
  const timers = new Map(), decoded = [], sources = [], slices = [], scriptLoads = [];
  const keys = ['gardens', 'meadow', 'caves', 'hive', 'ruins', 'clouds', 'lagoon', 'dunes', 'frost', 'autumn', 'springs', 'starlight', 'home'];
  const scores = Object.fromEntries(keys.map((key, n) => {
    const data = Buffer.alloc(90001 + n, n + 1);
    return [key, { mp3: data.toString('base64'), frames: 250, rate: 50, data }];
  }));
  const param = () => ({ value: 1, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), connect() {}, start(at, offset) { this.started = { at, offset }; }, stop(at) { this.stopped = at; } });
  const ctx = {
    get currentTime() { return now / 1000; },
    createGain: node, createBiquadFilter: node,
    createBufferSource() { const source = node(); sources.push(source); return source; },
    decodeAudioData(bytes, resolve) {
      const job = { bytes: Buffer.from(bytes), finish() { resolve({ duration: 10 }); } };
      decoded.push(job); if (automatic) job.finish();
    },
  };
  const context = {
    BB: { Audio: { ctx, musicBus: node(), muted: false } },
    BB_MUSIC: Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, { ...score }])),
    performance: { now: () => work },
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id), setInterval: () => ++nextId, clearInterval() {},
    atob(value) { slices.push(value.length); work++; return Buffer.from(value, 'base64').toString('binary'); },
    document: {
      createElement() { return { remove() {} }; },
      head: { appendChild(el) {
        const key = /\/([^/]+)\.js$/.exec(el.src)[1]; scriptLoads.push(key);
        context.BB_MUSIC[key] = { ...scores[key] }; el.onload();
      } },
    },
  };
  context.window = context; vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/core/music.js'), 'utf8'), context);
  const microtasks = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  async function until(predicate, maxTime = now + 500) {
    for (let i = 0; i < 1000; i++) {
      await microtasks(); if (predicate()) return;
      const next = [...timers].filter(([, t]) => t.at <= maxTime).sort((a, b) => a[1].at - b[1].at)[0];
      assert.ok(next, 'expected asynchronous preparation to make progress');
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    assert.fail('preparation did not complete');
  }
  return { M: context.BB.Music, context, scores, decoded, sources, slices, scriptLoads, microtasks, until,
    pending: timers, setAutomatic(value) { automatic = value; }, advance(ms) { now += ms; } };
}

(async () => {
  const h = harness(), { M } = h;
  M.play('gardens'); assert.equal(h.slices.length, 0, 'room tick must not unpack a score synchronously');
  let betweenSlices = false;
  h.context.setTimeout(() => { betweenSlices = true; assert.equal(h.decoded.length, 0); }, 0);
  await h.until(() => M.recording === 'gardens');
  assert.ok(betweenSlices, 'other browser work runs before score decoding completes');
  assert.ok(Math.max(...h.slices) <= 16384, 'base64 unpacking only handles small aligned chunks');
  assert.deepEqual(h.decoded[0].bytes, h.scores.gardens.data, 'chunk boundaries preserve all bytes and final base64 padding');
  assert.equal(h.sources[0].loopEnd, 5); assert.equal(h.context.BB_MUSIC.gardens, undefined);

  h.setAutomatic(false); M.play('meadow');
  assert.equal(M.recording, 'gardens', 'old score continues while the next region prepares');
  assert.equal(h.sources[0].stopped, undefined);
  await h.until(() => h.decoded.length === 2);
  assert.deepEqual(h.decoded[1].bytes, h.scores.meadow.data);
  h.advance(1000); h.decoded[1].finish(); await h.microtasks();
  assert.equal(M.recording, 'meadow'); assert.ok(h.sources[0].stopped > 1, 'old source fades out after the new score is ready');
  M.play('gardens'); await h.microtasks();
  assert.equal(M.recording, 'gardens'); assert.equal(h.decoded.length, 2, 'recent zones reuse decoded samples');
  assert.ok(h.sources.at(-1).started.offset >= 1, 'returning zone resumes at its previous position');

  // Stop followed immediately by restarting the same still-loading region
  // must not let the earlier completion create an extra playing source.
  M.play('caves'); await h.until(() => h.decoded.length === 3);
  M.stop(); M.play('caves'); h.decoded[2].finish(); await h.microtasks();
  assert.equal(M.recording, 'caves'); assert.equal(h.sources.length, 4, 'only the latest load generation starts music');

  // Preloads retain at most three cache entries even when the oldest is
  // the currently audible zone. Crossing to an evicted zone reloads it.
  h.setAutomatic(true);
  for (const key of ['hive', 'ruins', 'clouds']) {
    const count = h.decoded.length;
    M.preload(key); await h.until(() => h.decoded.length === count + 1, Infinity); await h.microtasks();
    assert.equal(M.recording, 'caves', 'preloading does not change the active music');
  }
  const before = h.decoded.length;
  M.play('caves'); await h.microtasks(); assert.equal(h.decoded.length, before);
  M.play('hive'); await h.until(() => M.recording === 'hive');
  assert.ok(h.scriptLoads.includes('hive'), 'cache eviction skips active music but still evicts other old zones');
  assert.equal(h.decoded.length, before + 1);
  M.stop(); assert.equal(M.recording, null);
  assert.equal(h.pending.size, 0, 'stop cancels procedural fades and speculative prewarm timers');
  console.log('Music checks passed: bounded asynchronous unpacking, exact bytes, uninterrupted loading, crossfade/resume, stale stop/load races and bounded prewarm cache.');
})().catch(error => { console.error(error); process.exitCode = 1; });
