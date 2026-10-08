'use strict';
const { bootGame } = require('../test-neighbourhood');

function virtualClock() {
  let now = 0, next = 0;
  const timers = new Map();
  return {
    performance: { now: () => now },
    setTimeout(fn, delay = 0, ...args) {
      const id = ++next;
      timers.set(id, { at: now + Math.max(0, Number(delay) || 0), fn, args });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      now += ms;
      // Timers created during callbacks run on the following tick.
      const ready = [...timers].filter(([, job]) => job.at <= now);
      for (const [id, job] of ready) if (timers.delete(id)) job.fn(...job.args);
    },
    get now() { return now; },
  };
}

function modeOf(B) {
  const p = B.Play;
  if (B.Main.name !== 'play') return B.Main.name;
  for (const name of ['intro', 'gift', 'traveling', 'starfall', 'wardrobe', 'gardenChoice', 'portalChoice', 'cloud', 'mini', 'maze', 'replayStarting']) {
    if (p[name]) return name;
  }
  return p.pl?.state || 'play';
}

function runtimeState(B) {
  const p = B.Play, b = p.pl?.body;
  return {
    scene: B.Main.name, mode: modeOf(B), room: p.room?.id,
    body: b ? Object.fromEntries(['x', 'y', 'vx', 'vy', 'grounded', 'inWater', 'climbing', 'djUsed', 'bbUsed'].map(k => [k, b[k]])) : null,
    checkpoint: p.checkpoint && { ...p.checkpoint }, mood: p.mood,
    maze: p.maze ? { x: p.maze.x, y: p.maze.y } : null,
    mini: p.mini ? { id: p.mini.id, x: p.mini.x, y: p.mini.y, mask: p.mini.mask } : null,
    cloud: p.cloud ? { x: p.cloud.x, y: p.cloud.y, mask: p.save.cloudMask } : null,
  };
}

function createGame({ mode = 'medium', seed = 1, maxTicks = 1000000, onStep, storage } = {}) {
  if (!['easy', 'medium', 'hard'].includes(mode)) throw new Error('Unknown difficulty: ' + mode);
  if (!Number.isInteger(maxTicks) || maxTicks < 1) throw new Error('maxTicks must be positive');
  const clock = virtualClock();
  const game = bootGame(null, { seed, clock, storage: [...(storage || []), ['bubblepaws_difficulty', mode]] });
  const trace = [], jumpEvents = [], B = game.BB;
  let ticks = 0, pendingEvents = [];
  if (storage) {
    if (!B.Save.load()) throw new Error('Cannot Continue the earned saved adventure');
  } else B.Save.data = B.Save.fresh();
  B.Main.set('play', storage ? {} : { cat: 'phoebe' });
  const originalTick = game.tick;
  const originalKeys = game.keys;
  game.keys = keys => { pendingEvents.push([...keys]); originalKeys(keys); };
  game.tick = (n = 1, keys = []) => {
    if (!Number.isInteger(n) || n < 0) throw new Error('Invalid tick count');
    const signature = [...new Set(keys)].sort();
    for (let i = 0; i < n; i++) {
      if (ticks >= maxTicks) {
        const error = new Error('Simulation tick budget exhausted at ' + ticks);
        error.code = 'TICK_BUDGET'; throw error;
      }
      const previousMode = modeOf(B);
      originalTick(1, signature); ticks++;
      const b = B.Play.pl?.body;
      if (b && ['x', 'y', 'vx', 'vy'].some(k => !Number.isFinite(b[k]))) {
        const error = new Error('Non-finite physics state at tick ' + ticks);
        error.code = 'INVALID_PHYSICS'; throw error;
      }
      const last = trace[trace.length - 1];
      if (last && !last.eventsBefore && !pendingEvents.length && last.keys.join('|') === signature.join('|')) last.ticks++;
      else trace.push({ ticks: 1, keys: signature, ...(pendingEvents.length ? { eventsBefore: pendingEvents } : {}) });
      pendingEvents = [];
      const jumpMask = B.FX.JUMP | B.FX.DJUMP | B.FX.WALLJUMP | B.FX.BBOUNCE | B.FX.FLAP;
      if ((previousMode === 'play' || previousMode === 'bench') && b && (b.fx & jumpMask)) {
        jumpEvents.push({ tick: ticks - 1, fx: b.fx & jumpMask, room: B.Play.room?.id,
          traceIndex: trace.length - 1, checkpoint: B.Play.checkpoint && { ...B.Play.checkpoint } });
      }
      if (onStep) onStep(game, ticks);
    }
  };
  // Completion tests must earn movement/progress and may not use placement.
  delete game.place;
  Object.defineProperties(game, {
    ticks: { get: () => ticks },
    trace: { get: () => trace },
    jumpEvents: { get: () => jumpEvents },
    clock: { value: clock },
  });
  return game;
}

function resumeSmoke(game, { mode = game.BB.Settings.difficulty, seed = 1 } = {}) {
  const resumed = createGame({ mode, seed, storage: [...game.storage], maxTicks: 1000 });
  const start = runtimeState(resumed.BB);
  const response = probeResponse(resumed);
  const end = runtimeState(resumed.BB);
  return { game: resumed, start, end, ...response,
    scene: resumed.BB.Main.name, mode: modeOf(resumed.BB) };
}

function probeResponse(game) {
  const b = game.BB.Play.pl.body;
  const initial = { x: b.x, y: b.y };
  let movement = 0;
  const run = (n, keys) => {
    for (let i = 0; i < n; i++) {
      game.tick(1, keys);
      movement = Math.max(movement, Math.hypot(b.x - initial.x, b.y - initial.y));
    }
  };
  run(12, ['Space']); run(18, []);
  // A low ceiling can block jumping while ordinary walking remains playable.
  // FX.JUMP alone is insufficient: a blocked jump can report JUMP | BONK.
  if (movement <= 4) { run(12, ['ArrowLeft']); run(3, []); run(24, ['ArrowRight']); run(5, []); }
  return { responsive: movement > 4 && game.BB.Main.name === 'play', movement };
}

function replay(game, trace, { onChunk } = {}) {
  for (const chunk of trace) {
    if (!Array.isArray(chunk.keys)) throw new Error('Invalid input trace');
    for (const keys of chunk.eventsBefore || []) game.keys(keys);
    game.tick(chunk.ticks, chunk.keys);
    if (onChunk) onChunk(game);
  }
  game.keys([]);
  return runtimeState(game.BB);
}

module.exports = { createGame, virtualClock, modeOf, runtimeState, replay, resumeSmoke, probeResponse };
