// Room profiles: for each room on its own, which border segments (one per
// 15 x 17 cell side) can be reached from which, with the powers the kitten
// has on arriving in that zone. Used to pick where new doorways can go.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
global.window = global;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
['js/core/bb.js', 'js/core/config.js', 'js/world/zones.js', 'js/world/world.js'].forEach(load);
const ALLDEFS = [];
global.BB.room = d => ALLDEFS.push(d);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/src="(js\/world\/rooms\/[^"]+)"/g)].forEach(m => load(m[1]));
load('js/engine/physics.js');
const BB = global.BB, C = BB.CFG, T = C.TILE, P = BB.Physics, FX = BB.FX;
const EASY = false;
let W, B, GW, GH, cellIdx;
function isolate(def) {
  load('js/world/world.js');
  BB.room(Object.assign({}, def, { x: 0, y: 0, map: def.map.map(l => l.replace(/[1-9]/g, '.')) }));
  W = BB.World.build();
  for (const r of W.rooms) { for (const row of r.grid) for (let i = 0; i < row.length; i++) if (row[i] === 'G') row[i] = '.'; W._stamp(r); }
  B = W.bounds; GW = B.x1 - B.x0; GH = B.y1 - B.y0; cellIdx = (tx, ty) => (ty - B.y0) * GW + (tx - B.x0);
  return W.rooms[0];
}
// ──── Movement plans ────
function buildPlans(ab) {
  const plans = [];
  for (const d of [-1, 1]) {
    for (const k of [3, 8, 16]) {
      for (const keep of [true, false]) plans.push({ kind: 'walk', d, k, keep });
    }
  }
  const djs = ab.doubleJump || ab.wallClimb ? [null, 6, 12, 20, 30] : [null];
  for (const d of [0, -1, 1]) {
    for (const run of d ? [0, 10] : [0]) {
      for (const h of [1, 8, 999]) {
        for (const air of d ? ['hold', 'stop', 'rev', 'late'] : ['hold']) {
          for (const dj of djs) plans.push({ kind: 'jump', d, run, h, air, dj });
        }
      }
    }
  }
  // Bubble Bounce: press bubble in mid-air (with or without a double jump first)
  if (ab.bubbleBounce) {
    for (const d of [0, -1, 1]) for (const run of d ? [0, 10] : [0]) {
      for (const dj of [null, 16]) for (const bb of [14, 30]) plans.push({ kind: 'jump', d, run, h: 999, air: 'hold', dj, bb });
    }
  }
  // Star Wings: flap a few times (or many), steering now, later, or only
  // once the flapping stops — then drift down onto whatever's below
  if (ab.wings) {
    for (const d of [0, -1, 1]) for (const air of d ? ['hold', 'late', 'after'] : ['hold']) {
      for (const flaps of [2, 4, 7, 11, 16, 24]) plans.push({ kind: 'jump', d, run: 0, h: 999, air, dj: null, flap: 16, flaps, long: true });
    }
  }
  return plans;
}

// Swimming (only tried from spots under water): hold jump to paddle up,
// start steering after a while, and maybe let go to sink onto a ledge
function buildSwimPlans() {
  const plans = [];
  for (const d of [-1, 1]) for (const wait of [0, 30, 80, 150, 250, 380]) {
    for (const stop of [null, 60]) plans.push({ kind: 'swim', d, wait, stop: stop == null ? null : wait + stop, run: 0 });
  }
  for (const stop of [40, 120, 240]) plans.push({ kind: 'swim', d: 0, wait: 0, stop, run: 0 });
  return plans;
}

function planInput(pl, t, st) {
  const inp = { left: false, right: false, jump: false, jumpPressed: false, bubblePressed: false };
  const setDir = d => { inp.left = d < 0; inp.right = d > 0; };
  if (st.settling) return inp;
  if (pl.kind === 'swim') {
    inp.jump = pl.stop == null || t < pl.stop;
    if (t === 0) inp.jumpPressed = true;
    if (t >= pl.wait) setDir(pl.d);
    return inp;
  }
  if (pl.kind === 'walk') {
    if (t < pl.k || (pl.keep && st.airborne)) setDir(pl.d);
    return inp;
  }
  if (t < pl.run) { setDir(pl.d); return inp; }
  const tj = t - pl.run;
  let d = pl.d;
  if (pl.air === 'stop' && tj >= 12) d = 0;
  else if (pl.air === 'rev' && tj >= 14) d = -pl.d;
  else if (pl.air === 'late' && tj < 10) d = 0;
  else if (pl.air === 'after' && tj < 10 + pl.flap * pl.flaps) d = 0;
  setDir(d);
  if (tj === 0) inp.jumpPressed = true;
  if (pl.dj != null && tj === pl.dj) inp.jumpPressed = true;
  if (pl.flap && tj >= 10 && (tj - 10) % pl.flap === 0 && (tj - 10) / pl.flap < pl.flaps) inp.jumpPressed = true;
  if (pl.bb != null && tj === pl.bb) inp.bubblePressed = true;
  inp.jump = tj < pl.h || (pl.dj != null && tj >= pl.dj);
  return inp;
}

const keyOf = (x, y) => Math.round(x / 8) + ',' + Math.round(y);

// Simulate one plan from a node. Returns { node } | { rescue } | null
function simulate(node, pl, ab, cover) {
  const p = P.newBody(node.x, node.y);
  p.grounded = true; p.coyote = C.COYOTE;
  p.lastSafe = { x: node.safeX, y: node.safeY };
  const st = { airborne: false, settling: false };
  const maxT = pl.long ? 600 : 320;
  // a long, slow swim through deep water may take a while longer
  for (let t = 0; t < maxT || (p.inWater && t < 1600); t++) {
    const inp = planInput(pl, t, st);
    const fx = P.step(p, inp, ab, EASY);
    if (cover) {
      const tx0 = Math.floor(p.x / T), tx1 = Math.floor((p.x + p.w - 1) / T);
      const ty0 = Math.floor(p.y / T), ty1 = Math.floor((p.y + p.h - 1) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (tx >= B.x0 && tx < B.x1 && ty >= B.y0 && ty < B.y1) cover[cellIdx(tx, ty)] = 1;
      }
    }
    if (fx & FX.HAZARD) return { rescue: { x: p.lastSafe.x, y: p.lastSafe.y } };
    if (!p.grounded) st.airborne = true;
    if (fx & FX.PORTAL) st.airborne = true; // a ring hop counts as a journey
    const planOver = pl.kind === 'walk' ? t >= pl.k : pl.kind === 'swim' ? t >= pl.wait + 2 : t >= pl.run + 2;
    if (p.grounded && planOver && (st.airborne || pl.kind === 'walk' || t > pl.run + 20)) {
      st.settling = true;
      if (Math.abs(p.vx) < 0.01) return { node: p };
    }
  }
  return null;
}

// ──── Graph exploration (resumable, so gates can open mid-search) ────
function newState() { return { nodes: new Map(), cover: new Uint8Array(GW * GH), queue: [] }; }

function addNode(st, x, y, sx, sy) {
  const k = keyOf(x, y);
  let n = st.nodes.get(k);
  if (!n) {
    n = { k, x, y, safeX: sx, safeY: sy, edges: new Set() };
    st.nodes.set(k, n);
    st.queue.push(n);
  }
  return n;
}

function explore(st, ab) {
  const plans = buildPlans(ab);
  const wetPlans = ab.swim ? plans.concat(buildSwimPlans()) : plans;
  while (st.queue.length) {
    const n = st.queue.pop();
    const wet = ab.swim && W.tile(Math.floor((n.x + C.PW / 2) / T), Math.floor((n.y + C.PH / 2) / T)) === '~';
    for (const pl of wet ? wetPlans : plans) {
      const r = simulate(n, pl, ab, st.cover);
      if (!r) continue;
      if (r.node) {
        const p = r.node;
        const safe = P.isSafeFooting(p, ab);
        n.edges.add(addNode(st, p.x, p.y, safe ? p.x : n.safeX, safe ? p.y : n.safeY).k);
      } else if (r.rescue) {
        n.edges.add(addNode(st, r.rescue.x, r.rescue.y, r.rescue.x, r.rescue.y).k);
      }
    }
  }
  return st;
}


// ──── profile ────
const POWERS = ['doubleJump', 'wallClimb', 'glow', 'float', 'swim', 'dig', 'spring', 'rings', 'bubbleBounce', 'wings'];
const CW = 15, CH = 17;
function segments(room) {
  const segs = [], wc = room.w / CW, hc = room.h / CH;
  for (let j = 0; j < hc; j++) { segs.push({ side: 'L', i: j }); segs.push({ side: 'R', i: j }); }
  for (let i = 0; i < wc; i++) { segs.push({ side: 'T', i }); segs.push({ side: 'B', i }); }
  return segs.map(s => Object.assign(s, { name: s.side + s.i }));
}
const air = ch => ch !== null && !P.solidSide(ch) && ch !== '-';
// let the kitten fall from a spot until it stands (or is rescued)
function drop(x, y, ab) {
  const p = P.newBody(x, y);
  for (let t = 0; t < 600; t++) {
    const fx = P.step(p, { left: false, right: false, jump: false, jumpPressed: false, bubblePressed: false }, ab, EASY);
    if (fx & FX.HAZARD) return null;
    if (p.grounded && Math.abs(p.vx) < 0.01 && t > 2) return p;
  }
  return null;
}
// tiles a kitten could step in from, for each segment
function entryTiles(room, s) {
  const out = [];
  if (s.side === 'L' || s.side === 'R') {
    const xs = s.side === 'L' ? [0, 1] : [room.w - 1, room.w - 2];
    for (let ty = s.i * CH; ty < (s.i + 1) * CH - 1; ty++) for (const tx of xs) out.push([tx, ty]);
  } else if (s.side === 'T') {
    for (let tx = s.i * CW; tx < (s.i + 1) * CW; tx++) out.push([tx, 0], [tx, 1]);
  }
  return out;
}
function profile(def, have) {
  const room = isolate(def);
  const ab = Object.fromEntries(have.map(k => [k, true]));
  P.setAbilities(ab);
  const segs = segments(room);
  const st = newState();
  const startsOf = {};
  for (const s of segs) {
    const keys = new Set();
    for (const [tx, ty] of entryTiles(room, s)) {
      if (!air(W.tile(tx, ty)) || !air(W.tile(tx, ty - 1))) continue;
      const p = drop(tx * T + (T - C.PW) / 2, ty * T + T - C.PH, ab);
      if (!p) continue;
      keys.add(addNode(st, p.x, p.y, p.x, p.y).k);
    }
    startsOf[s.name] = [...keys];
  }
  explore(st, ab);
  // where each node could leave: standing beside a side wall, on the floor, or up at the top
  const exitsOf = n => {
    const out = [];
    const fx0 = Math.floor(n.x / T), fx1 = Math.floor((n.x + C.PW - 1) / T), fy = Math.round((n.y + C.PH) / T);
    const cell = Math.min(Math.floor((fy - 1) / CH), room.h / CH - 1);
    // a doorway can be cut through a wall up to 3 tiles thick
    const solidRun = (tx0, tx1) => { for (let tx = tx0; tx <= tx1; tx++) for (let ty = fy - 2; ty < fy; ty++) if (!P.solidSide(W.tile(tx, ty))) return false; return true; };
    if (fx0 <= 3 && (fx0 === 0 || solidRun(0, fx0 - 1))) out.push('L' + cell);
    if (fx1 >= room.w - 4 && (fx1 === room.w - 1 || solidRun(fx1 + 1, room.w - 1))) out.push('R' + cell);
    // a hole can be cut down through the ground to the bottom edge
    const solidDown = tx => { for (let ty = fy; ty < room.h; ty++) if (!P.solidSide(W.tile(tx, ty))) return false; return true; };
    if (room.h - fy <= 4) for (let tx = fx0; tx <= fx1; tx++) if (fy === room.h || solidDown(tx)) out.push('B' + Math.floor(tx / CW));
    if (n.y < 2.5 * T) for (let tx = fx0; tx <= fx1; tx++) out.push('T' + Math.floor(tx / CW));
    return out;
  };
  // a door can also be cut wherever the kitten already stands by that edge
  for (const n of st.nodes.values()) for (const e of exitsOf(n)) if (startsOf[e] && !startsOf[e].includes(n.k)) startsOf[e].push(n.k);
  const reach = {};
  for (const s of segs) {
    const seen = new Set(startsOf[s.name]), q = [...seen], ex = new Set();
    while (q.length) {
      const n = st.nodes.get(q.pop());
      for (const e of exitsOf(n)) ex.add(e);
      // a jump that touches the top row also counts as reaching the top
      for (const k of n.edges) if (!seen.has(k)) { seen.add(k); q.push(k); }
    }
    // top touches from the coverage grid
    reach[s.name] = [...ex].filter(e => e !== s.name).sort();
  }
  // top reached at all (body touched row 0/1)
  const tops = new Set();
  for (let tx = 0; tx < room.w; tx++) if (st.cover[cellIdx(tx, 0)] || st.cover[cellIdx(tx, 1)]) tops.add('T' + Math.floor(tx / CW));
  return { id: def.id, zone: def.zone, w: room.w / CW, h: room.h / CH, starts: Object.fromEntries(segs.map(s => [s.name, startsOf[s.name].length])), reach, tops: [...tops] };
}
const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
const plus = process.argv.includes('--plus');
const out = {};
for (const def of ALLDEFS) {
  if (want.length && !want.includes(def.id)) continue;
  if (def.zone === BB.HOME_ZONE || def.zone == null) continue;
  const t0 = Date.now();
  const r = profile(def, POWERS.slice(0, def.zone + (plus ? 1 : 0)));
  out[def.id] = r;
  console.error(def.id, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(r.reach));
}
console.log(JSON.stringify(out));
