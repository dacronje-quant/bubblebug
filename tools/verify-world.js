#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  WORLD VERIFIER — proves the kingdom has no softlocks.
//
//  Loads the real game modules (world, rooms, physics) into a sandbox and
//  explores every standing spot the kitten can reach, by simulating a
//  large family of button sequences (walks, hops, full jumps, run-ups,
//  mid-air steering, double jumps, wall kicks, glides) with the exact
//  movement code the game uses.
//
//  For each story stage (no powers → +Double Jump → +Wall Climb → +Glow
//  → +Float) it checks:
//    1. the next elder (or the Cloud King and finale) is reachable, and
//    2. from EVERY spot you can reach in that stage, the goal is still
//       reachable (zero softlocks — falling in water always floats you
//       back to safety, and that rescue is modelled too).
//  With every power it also checks you can always walk home to the start
//  (for backtracking to secrets) and lists any collectible out of reach.
//
//  Usage:  node tools/verify-world.js [--map ROOM_ID] [--quick]
//  Exit code 0 = every check passed.
// ════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const mapRoom = args.includes('--map') ? args[args.indexOf('--map') + 1] : null;

// ──── Load game modules (they attach to window.BB) ────
// runInThisContext rather than a vm sandbox: sandboxed global lookups are
// ~10× slower, and this search runs millions of physics ticks.
global.window = global;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
['js/core/bb.js', 'js/core/config.js', 'js/world/zones.js', 'js/world/world.js'].forEach(load);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const roomFiles = [...html.matchAll(/src="(js\/world\/rooms\/[^"]+)"/g)].map(m => m[1]);
roomFiles.forEach(load);
load('js/engine/physics.js');

const BB = global.BB;
const W = BB.World.build();
const C = BB.CFG, T = C.TILE;
const P = BB.Physics, FX = BB.FX;

// ──── Coverage grid (which tiles the kitten's body ever touched) ────
const B = W.bounds;
const GW = B.x1 - B.x0, GH = B.y1 - B.y0;
const cellIdx = (tx, ty) => (ty - B.y0) * GW + (tx - B.x0);

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
  // Pure climbing / updraft riding: hold a direction and jump every so often
  return plans;
}

function planInput(pl, t, st) {
  const inp = { left: false, right: false, jump: false, jumpPressed: false };
  const setDir = d => { inp.left = d < 0; inp.right = d > 0; };
  if (st.settling) return inp;
  if (pl.kind === 'walk') {
    if (t < pl.k || (pl.keep && st.airborne)) setDir(pl.d);
    return inp;
  }
  // jump plan
  if (t < pl.run) { setDir(pl.d); return inp; }
  const tj = t - pl.run;
  let d = pl.d;
  if (pl.air === 'stop' && tj >= 12) d = 0;
  else if (pl.air === 'rev' && tj >= 14) d = -pl.d;
  else if (pl.air === 'late' && tj < 10) d = 0;
  setDir(d);
  if (tj === 0) inp.jumpPressed = true;
  if (pl.dj != null && tj === pl.dj) inp.jumpPressed = true;
  inp.jump = tj < pl.h || (pl.dj != null && tj >= pl.dj);
  return inp;
}

const keyOf = (x, y) => Math.round(x / 8) + ',' + Math.round(y);

// Simulate one plan from a node. Returns { node } | { rescue } | null
function simulate(node, pl, ab, cover) {
  const p = P.newBody(node.x, node.y);
  p.grounded = true; p.coyote = C.COYOTE;
  p.lastSafe = { x: node.safeX, y: node.safeY };
  const st = { airborne: false, settling: false, settleT: 0 };
  for (let t = 0; t < 300; t++) {
    const inp = planInput(pl, t, st);
    const fx = P.step(p, inp, ab);
    if (cover) {
      const tx0 = Math.floor(p.x / T), tx1 = Math.floor((p.x + p.w - 1) / T);
      const ty0 = Math.floor(p.y / T), ty1 = Math.floor((p.y + p.h - 1) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (tx >= B.x0 && tx < B.x1 && ty >= B.y0 && ty < B.y1) cover[cellIdx(tx, ty)] = 1;
      }
    }
    if (fx & FX.HAZARD) return { rescue: { x: p.lastSafe.x, y: p.lastSafe.y } };
    if (!p.grounded) st.airborne = true;
    const planOver = pl.kind === 'walk' ? t >= pl.k : t >= pl.run + 2;
    if (p.grounded && planOver && (st.airborne || pl.kind === 'walk' || t > pl.run + 20)) {
      st.settling = true;
      if (Math.abs(p.vx) < 0.01) return { node: p };
    }
  }
  return null;
}

// ──── Graph exploration ────
// Resumable: `st` keeps nodes, coverage and the work queue so that when a
// gate opens we only re-expand the spots near it instead of starting over.
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
  while (st.queue.length) {
    const n = st.queue.pop();
    for (const pl of plans) {
      const r = simulate(n, pl, ab, st.cover);
      if (!r) continue;
      if (r.node) {
        const p = r.node;
        const safe = P.isSafeFooting(p, ab);
        const m = addNode(st, p.x, p.y, safe ? p.x : n.safeX, safe ? p.y : n.safeY);
        n.edges.add(m.k);
      } else if (r.rescue) {
        const m = addNode(st, r.rescue.x, r.rescue.y, r.rescue.x, r.rescue.y);
        n.edges.add(m.k);
      }
    }
    if (st.nodes.size % 500 === 0 && st.queue.length) process.stdout.write(`\r  … ${st.nodes.size} spots`);
  }
  process.stdout.write('\r');
  return st;
}

// Which nodes can reach any node in `goalKeys`?
function canReach(nodes, goalKeys) {
  const rev = new Map();
  for (const n of nodes.values()) for (const e of n.edges) {
    if (!rev.has(e)) rev.set(e, []);
    rev.get(e).push(n.k);
  }
  const ok = new Set(goalKeys);
  const q = [...goalKeys];
  while (q.length) {
    const k = q.pop();
    for (const src of rev.get(k) || []) if (!ok.has(src)) { ok.add(src); q.push(src); }
  }
  return ok;
}

// Standing spot for a thing's tile (kitten centred on the tile, feet on the floor below)
function spotFor(tx, ty) {
  const x = tx * T + (T - C.PW) / 2;
  let y = (ty + 1) * T - C.PH;
  for (let i = 0; i < 40; i++) { // drop onto the floor
    const k = P.landKind(W.tile(tx, Math.floor((y + C.PH + 1) / T)), {});
    if (k === 1 || k === 2) break;
    y += T;
  }
  return { x, y };
}

const touched = (cover, tx, ty, r = 1) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tx + dx, y = ty + dy;
    if (x >= B.x0 && x < B.x1 && y >= B.y0 && y < B.y1 && cover[cellIdx(x, y)]) return true;
  }
  return false;
};

// Can a bubble be blown at (tx,ty) from some standing node?
function bubbleable(nodes, tx, ty) {
  const bx = tx * T + T / 2, by = ty * T + T / 2;
  for (const n of nodes.values()) {
    const my = n.y + 8;
    if (Math.abs(by - my) > 22) continue;
    const mx = n.x + C.PW / 2;
    if (Math.abs(bx - mx) > 300) continue;
    const row = Math.floor(my / T);
    let clear = true;
    const a = Math.floor(Math.min(mx, bx) / T), b = Math.floor(Math.max(mx, bx) / T);
    for (let x = a + 1; x < b; x++) if (P.solidSide(W.tile(x, row))) { clear = false; break; }
    if (clear) return true;
  }
  return false;
}

// Open gates whose buds are bubbleable / whose King is reachable, then
// re-expand the spots in and around those rooms, until nothing changes.
function exploreWithGates(starts, ab) {
  W.build();
  const st = newState();
  for (const s0 of starts) addNode(st, s0.x, s0.y, s0.x, s0.y);
  const opened = new Set();
  for (;;) {
    explore(st, ab);
    const now = [];
    for (const room of W.rooms) {
      if (opened.has(room.id) || !room.grid.some(r => r.includes('G'))) continue;
      const buds = room.things.filter(t => t.ch === 'o');
      const king = room.things.find(t => t.ch === 'K');
      let ok;
      if (king) ok = touched(st.cover, king.tx, king.ty, 6);
      else ok = buds.length > 0 && buds.every(b => bubbleable(st.nodes, b.tx, b.ty));
      if (ok) { W.openGates(room); opened.add(room.id); now.push(room); }
    }
    if (!now.length) break;
    for (const n of st.nodes.values()) {
      const cx = n.x + C.PW / 2, cy = n.y + C.PH / 2;
      if (now.some(r => cx > r.px - 320 && cx < r.px + r.pw + 320 && cy > r.py - 320 && cy < r.py + r.ph + 320)) st.queue.push(n);
    }
  }
  return st;
}

// ──── Story stages ────
const elderOf = ab => W.rooms.find(r => r.def.elder === ab);
function elderThing(ability) {
  const room = elderOf(ability);
  if (!room) return null;
  return room.things.find(t => t.ch === 'E');
}

const STAGES = [
  { name: 'Start → Butterfly Elder (Double Jump)', ab: {}, goal: 'doubleJump' },
  { name: 'Double Jump → Snail Elder (Wall Climb)', ab: { doubleJump: true }, goal: 'wallClimb' },
  { name: 'Wall Climb → Firefly Elder (Glow)', ab: { doubleJump: true, wallClimb: true }, goal: 'glow' },
  { name: 'Glow → Dandelion Elder (Float)', ab: { doubleJump: true, wallClimb: true, glow: true }, goal: 'float' },
  { name: 'Float → Cloud King & Finale', ab: { doubleJump: true, wallClimb: true, glow: true, float: true }, goal: 'finale' },
];

let failures = 0;
const fail = msg => { failures++; console.log('  ✗ ' + msg); };
const pass = msg => console.log('  ✓ ' + msg);

const startThing = W.findThings('S')[0];
if (!startThing) { console.log('No start spot (S) found'); process.exit(1); }
let starts = [spotFor(startThing.tx, startThing.ty)];
const t0 = Date.now();

function goalKeysFor(stage, res) {
  let things;
  if (stage.goal === 'finale') things = W.findThings('F');
  else { const e = elderThing(stage.goal); things = e ? [e] : []; }
  if (!things.length) return { keys: [], thing: null };
  const th = things[0];
  // goal nodes: any standing node whose body is within reach of the thing
  const keys = [];
  for (const n of res.nodes.values()) {
    const cx = n.x + C.PW / 2, cy = n.y + C.PH / 2;
    if (Math.abs(cx - (th.tx * T + 16)) < 56 && Math.abs(cy - (th.ty * T + 16)) < 56) keys.push(n.k);
  }
  return { keys, thing: th };
}

let finalRes = null;
for (const stage of STAGES) {
  console.log(`\n▶ ${stage.name}`);
  const ts = Date.now();
  const res = exploreWithGates(starts, stage.ab);
  console.log(`  (${((Date.now() - ts) / 1000).toFixed(1)}s)`);
  const { keys, thing } = goalKeysFor(stage, res);
  console.log(`  explored ${res.nodes.size} standing spots`);
  if (!thing) { fail(`goal for "${stage.goal}" is not placed in the world`); break; }
  if (!keys.length) {
    fail(`goal "${stage.goal}" is NOT reachable`);
    reportRooms(res);
    break;
  }
  pass(`goal "${stage.goal}" reachable`);
  const ok = canReach(res.nodes, keys);
  const stuck = [...res.nodes.values()].filter(n => !ok.has(n.k));
  if (stuck.length) {
    fail(`${stuck.length} softlock spot(s) — goal unreachable from:`);
    for (const n of stuck.slice(0, 12)) {
      const r = W.roomAtPx(n.x + 10, n.y + 12);
      console.log(`      room ${r ? r.id : '?'} tile (${Math.floor((n.x + 10) / T) - (r ? r.x : 0)}, ${Math.floor((n.y + 12) / T) - (r ? r.y : 0)})`);
    }
  } else pass('no softlocks: every reachable spot can still reach the goal');
  // next stage starts at the goal
  starts = keys.slice(0, 1).map(k => { const n = res.nodes.get(k); return { x: n.x, y: n.y }; });
  finalRes = res;
  if (stage.goal === 'finale') {
    // Backtracking: with every power, can every spot get back to the start?
    const home = [...res.nodes.values()].filter(n => {
      const s = spotFor(startThing.tx, startThing.ty);
      return Math.abs(n.x - s.x) < 40 && Math.abs(n.y - s.y) < 4;
    }).map(n => n.k);
    const back = canReach(res.nodes, home);
    const lost = [...res.nodes.values()].filter(n => !back.has(n.k));
    if (lost.length) {
      fail(`${lost.length} spot(s) cannot walk back home:`);
      for (const n of lost.slice(0, 12)) {
        const r = W.roomAtPx(n.x + 10, n.y + 12);
        console.log(`      room ${r ? r.id : '?'} tile (${Math.floor((n.x + 10) / T) - (r ? r.x : 0)}, ${Math.floor((n.y + 12) / T) - (r ? r.y : 0)})`);
      }
    } else pass('every spot can travel back to the start (free backtracking)');
  }
}

function reportRooms(res) {
  const seen = new Set();
  for (const n of res.nodes.values()) { const r = W.roomAtPx(n.x + 10, n.y + 12); if (r) seen.add(r.id); }
  console.log('  rooms reached: ' + [...seen].join(' '));
}

// ──── Collectibles with every power ────
if (finalRes) {
  console.log('\n▶ Collectibles & landmarks (all powers)');
  const missing = [];
  for (const room of W.rooms) {
    for (const t of room.things) {
      if ('*TBnfy'.includes(t.ch) && !touched(finalRes.cover, t.tx, t.ty, t.ch === '*' || t.ch === 'T' ? 0 : 1)) {
        missing.push(`${t.ch} in ${room.id} at (${t.tx - room.x},${t.ty - room.y})`);
      }
      if ('bc'.includes(t.ch) && !touched(finalRes.cover, t.tx, t.ty, 4)) missing.push(`bug in ${room.id} at (${t.tx - room.x},${t.ty - room.y})`);
      if (t.ch === 'o' && !bubbleable(finalRes.nodes, t.tx, t.ty)) missing.push(`bud in ${room.id} at (${t.tx - room.x},${t.ty - room.y}) can't be bubbled`);
    }
  }
  const unvisited = W.rooms.filter(r => {
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (finalRes.cover[cellIdx(r.x + x, r.y + y)]) return false;
    return true;
  });
  if (unvisited.length) fail('rooms never entered: ' + unvisited.map(r => r.id).join(', '));
  if (missing.length) { fail(`${missing.length} collectible(s)/landmark(s) out of reach:`); missing.forEach(m => console.log('      ' + m)); }
  else pass('every sparkle, toy, bench, flower, firefly and bug is reachable');
  const total = W.findThings('*').length;
  console.log(`  (${total} sparkles, ${W.findThings('b').length + W.findThings('c').length} gloomy bugs, ${W.findThings('T').length} toys, ${W.rooms.length} rooms)`);
}

// ──── Optional ASCII map of a room with coverage overlay ────
if (mapRoom && finalRes) {
  const r = W.byId[mapRoom];
  console.log(`\nRoom ${mapRoom} — '•' = air the kitten can reach (all powers)`);
  for (let y = 0; y < r.h; y++) {
    let s = '';
    for (let x = 0; x < r.w; x++) {
      const ch = r.grid[y][x];
      s += ch === '.' && finalRes.cover[cellIdx(r.x + x, r.y + y)] ? '•' : ch;
    }
    console.log('  ' + s);
  }
}

console.log(`\n${failures ? '✗ ' + failures + ' problem(s) found' : '✓ World verified — zero softlocks'}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(failures ? 1 : 0);
