#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  WORLD VERIFIER — proves the kingdom has no softlocks.
//
//  Loads the real game modules (world, rooms, physics) and explores every
//  standing spot the kitten can reach, by simulating a large family of
//  button sequences (walks, hops, full jumps, run-ups, mid-air steering,
//  double jumps, wall kicks, glides, swims, bubble bounces, star-wing
//  flaps) with the exact movement code the game uses.
//
//  For each story stage (no powers → +Double Jump → … → +Star Wings) it
//  checks:
//    1. the next elder (or, at the end, the Starfall float home) is reachable, and
//    2. from EVERY spot you can reach in that stage, the goal is still
//       reachable (zero softlocks — falling in water or mist always floats
//       you back to safety, and that rescue is modelled too), and
//    3. every boss and puzzle gate you can walk up to opens (the boss can
//       be bubbled where it sniffles, every paw pad stepped on, every lost
//       baby walked home, the key carried to its keyhole, every bell rung).
//  With every power it also checks you can always travel home to the start
//  (for backtracking to secrets), that every gate can be opened, and that
//  every collectible, critter, boss, puzzle piece, snack, cat trick and
//  hidden glasses and family member is reachable. (A too-sad pop-back only returns the kitten to a spot it
//  already stood on, so it can't create a softlock.)
//
//  Stages start at the previous elder, so they're independent and run in
//  parallel worker threads (one per CPU core).
//
//  Usage: node tools/verify-world.js [--easy] [--replay] [--jobs N] [--map ID] [--stage N]
//  Default: Medium / Hard's original movement. --easy uses Easy's assists.
//  --replay starts with all powers at home and every gate still closed.
//  Exit code 0 = every check passed.
// ════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const ROOT = path.join(__dirname, '..');

// ──── Load game modules (they attach to window.BB) ────
// runInThisContext rather than a vm sandbox: sandboxed global lookups are
// ~10× slower, and this search runs hundreds of millions of physics ticks.
global.window = global;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
['js/core/bb.js', 'js/core/config.js', 'js/world/zones.js', 'js/world/world.js'].forEach(load);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const roomFiles = [...html.matchAll(/src="(js\/world\/rooms\/[^"]+)"/g)].map(m => m[1]);
roomFiles.forEach(load);
load('js/engine/physics.js');
load('js/entities/links.js');

const BB = global.BB;
const W = BB.World.build();
const C = BB.CFG, T = C.TILE;
const P = BB.Physics, FX = BB.FX;
const EASY = isMainThread ? process.argv.includes('--easy') : !!workerData.easy;
const REPLAY = isMainThread ? process.argv.includes('--replay') : !!workerData.replay;

// The order elders give their gifts in
const POWERS = ['doubleJump', 'wallClimb', 'glow', 'float', 'swim', 'dig', 'spring', 'rings', 'bubbleBounce', 'wings'];
const NAMES = {
  doubleJump: 'Butterfly Elder (Double Jump)', wallClimb: 'Snail Elder (Sticky Paws)', glow: 'Firefly Elder (Glow)',
  float: 'Dandelion Elder (Float)', swim: 'Sea Turtle Elder (Swim)', dig: 'Tortoise Elder (Mighty Paws)',
  spring: 'Snow Hare Elder (Spring Paws)', rings: 'Badger Elder (Fairy Rings)', bubbleBounce: 'Otter Elder (Bubble Bounce)',
  wings: 'Star Whale (Star Wings)', finale: 'the Starfall float home',
};
const STAGES = POWERS.map((goal, i) => ({ i, goal, have: POWERS.slice(0, i) }))
  .concat([{ i: POWERS.length, goal: 'finale', have: POWERS.slice() }]);
const abilitiesOf = have => Object.fromEntries(have.map(k => [k, true]));

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
  for (let i = 0; i < 40; i++) {
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

// ──── Links: cat flaps, the Cat House doors, the Rainbow Lift and Slide ────
// A flap takes you home (stand still in it); walking within 90px of a flap
// lights its door up at home, and a lit door takes you back to the furthest
// flap of that zone found so far (only there — the old target is dropped).
// The front door is walked through; the other doors remain links. The lift runs both
// ways; the Starfall float at the very end drifts home to the rainbow door.
function buildLinks() {
  const L = BB.Links, out = [];
  for (let z = 0; z < 12; z++) L.flapTiles(z).forEach((t, idx) => {
    const r = W.roomAtTile(t.tx, t.ty);
    // (a flap in a boss arena only opens once its boss is cheered up)
    out.push({ from: L.spot(t.tx, t.ty), to: L.doorSpot(z), flap: z, idx, bossRoom: r.def.arena ? r.id : null });
  });
  // a door opens at the furthest flap found so far (its target is set in the search)
  const h = L.home();
  for (const z of Object.keys((h && h.def.doors) || {}).map(Number)) {
    if (z === 0 && h.def.walkOut) continue;
    out.push({ from: L.doorSpot(z), to: z === 0 ? L.flapSpot(0) : null, door: z });
  }
  const u = W.findThings('u')[0], v = W.findThings('v')[0];
  if (u && v) {
    out.push({ from: L.spot(u.tx, u.ty), to: L.spot(v.tx, v.ty), lift: true });
    out.push({ from: L.spot(v.tx, v.ty), to: L.spot(u.tx, u.ty), lift: true });
  }
  const f = W.findThings('F')[0], sk = L.landingTile();
  if (f && sk) out.push({ from: { x: f.tx * T + 16, y: f.ty * T + 16 }, to: L.spot(sk.tx, sk.ty), slide: true });
  return out;
}
// standing in a doorway (a kid can always shuffle the last few pixels on flat floor)
function enters(n, lk) {
  const cx = n.x + C.PW / 2;
  if (lk.slide) return Math.abs(cx - lk.from.x) < 56 && Math.abs(n.y + C.PH / 2 - lk.from.y) < 56;
  return Math.abs(cx - lk.from.x) < 40 && Math.abs(n.y + C.PH - lk.from.y) < 6;
}
const flapSeen = (n, lk) => Math.hypot(n.x + C.PW / 2 - lk.from.x, n.y + C.PH - lk.from.y) < 90;
// the zones in ring order (the Cat House comes first)
const zoneOrder = z => z === BB.HOME_ZONE ? -1 : z;

// Open gates whose buds are bubbleable / whose King is reachable, then
// re-expand the spots in and around those rooms, until nothing changes.
// Gates stay open once opened (the save remembers), so a stage begins with
// every gate it had to pass to get there already open: all gates of the
// zones before it, and those of its own zone that lie wholly behind the
// start (the ring runs east along the bottom, then west along the top).
// The earlier stage proves each of those gates can be opened on the way
// ("every … gate along the way opens"). Cat House doors start shut and
// light up as their flaps are found in this stage's own search.
function exploreWithGates(starts, ab, startRoom = null) {
  W.build();
  P.setAbilities(ab);
  const st = newState();
  for (const s0 of starts) addNode(st, s0.x, s0.y, s0.x, s0.y);
  const opened = new Set();
  const behind = room => {
    if (!startRoom) return false;
    if (zoneOrder(room.zone) !== zoneOrder(startRoom.zone)) return zoneOrder(room.zone) < zoneOrder(startRoom.zone);
    return BB.storyIndex(room) < BB.storyIndex(startRoom);
  };
  for (const room of W.rooms) {
    if (behind(room) && room.grid.some(r => r.includes('G'))) { W.openGates(room); opened.add(room.id); }
  }
  const links = buildLinks();
  const doors = new Map([[0, 1]]); // zone → flaps reached (the front door always leads out)
  const open = lk => !lk.bossRoom || opened.has(lk.bossRoom);
  const isBoss = r => !!(r.def.boss || r.things.some(t => t.ch === 'K'));
  for (;;) {
    explore(st, ab);
    let linked = false;
    // a cheered-up boss opens the Cat House door to the next zone
    for (const id of opened) {
      const r = W.byId[id];
      if (isBoss(r) && r.zone < 11) doors.set(r.zone + 1, Math.max(doors.get(r.zone + 1) || 0, 1));
    }
    for (const lk of links) {
      if (lk.flap != null && open(lk) && (doors.get(lk.flap) || 0) < lk.idx + 1) {
        for (const n of st.nodes.values()) if (flapSeen(n, lk)) { doors.set(lk.flap, lk.idx + 1); break; }
      }
    }
    // point each door at its zone's furthest flap, dropping the old way out
    for (const lk of links) {
      if (lk.door == null || !doors.has(lk.door)) continue;
      let i = doors.get(lk.door) - 1;
      while (i > 0 && !links.some(f => f.flap === lk.door && f.idx === i && open(f))) i--;
      const to = BB.Links.flapSpot(lk.door, i);
      if (lk.to && lk.to.x === to.x && lk.to.y === to.y) continue;
      if (lk.to) {
        const old = keyOf(lk.to.x - C.PW / 2, lk.to.y - C.PH);
        for (const n of st.nodes.values()) if (enters(n, lk)) n.edges.delete(old);
      }
      lk.to = to;
    }
    for (const lk of links) {
      if (!lk.to || (lk.flap != null && !open(lk))) continue;
      const tx = lk.to.x - C.PW / 2, ty = lk.to.y - C.PH;
      for (const n of [...st.nodes.values()]) {
        if (!enters(n, lk)) continue;
        const d = addNode(st, tx, ty, tx, ty);
        if (!n.edges.has(d.k)) { n.edges.add(d.k); linked = true; }
      }
    }
    const now = [];
    for (const room of W.rooms) {
      if (opened.has(room.id) || !room.grid.some(r => r.includes('G'))) continue;
      if (gateReady(room, st)) { W.openGates(room); opened.add(room.id); now.push(room); }
    }
    if (!now.length && !linked) break;
    for (const n of st.nodes.values()) {
      const cx = n.x + C.PW / 2, cy = n.y + C.PH / 2;
      if (now.some(r => cx > r.px - 320 && cx < r.px + r.pw + 320 && cy > r.py - 320 && cy < r.py + r.ph + 320)) st.queue.push(n);
    }
  }
  return st;
}

// ──── Gate conditions (everything the gate's picture-sign asks for) ────
const zoneThings = (zone, ch) => {
  const out = [];
  for (const r of W.rooms) if (r.zone === zone) for (const t of r.things) if (t.ch === ch) out.push(t);
  return out;
};
// standing spots whose body touches the tile area (± r tiles)
function nodesNear(nodes, tx, ty, r) {
  const x0 = (tx - r) * T, x1 = (tx + r + 1) * T, y0 = (ty - r) * T, y1 = (ty + r + 1) * T;
  const out = [];
  for (const n of nodes.values()) if (n.x + C.PW > x0 && n.x < x1 && n.y + C.PH > y0 && n.y < y1) out.push(n);
  return out;
}
function forward(nodes, fromKeys) {
  const seen = new Set(fromKeys), q = [...fromKeys];
  while (q.length) {
    const n = nodes.get(q.pop());
    if (n) for (const e of n.edges) if (!seen.has(e)) { seen.add(e); q.push(e); }
  }
  return seen;
}
function floorRow(tx, ty) {
  for (let y = ty; y < ty + 30; y++) if (P.landKind(W.tile(tx, y + 1), { glow: true }) && P.landKind(W.tile(tx, y + 1), { glow: true }) !== 0) return y + 1;
  return ty + 1;
}
function gateReady(room, st) {
  const nodes = st.nodes;
  let any = false;
  for (const th of room.things) {
    if (th.ch === 'o') { any = true; if (!bubbleable(nodes, th.tx, th.ty)) return false; }
    else if (th.ch === 'P') { any = true; if (!touched(st.cover, th.tx, th.ty, 0)) return false; }
    else if (th.ch === 'K' || th.ch === 'Q') {
      // a sniffling boss rests on the floor under its spot
      any = true;
      const fy = W.tile(th.tx, th.ty + 1) === '~' ? th.ty + 1 : floorRow(th.tx, th.ty);
      if (!bubbleable(nodes, th.tx, fy - 1) && !touched(st.cover, th.tx, fy - 1, 2)) return false;
    } else if (th.ch === 'Z') {
      // the zone's key must be able to travel to this keyhole
      any = true;
      const key = zoneThings(room.zone, 'k')[0];
      if (!key) return false;
      const kn = nodesNear(nodes, key.tx, key.ty, 1), ln = nodesNear(nodes, th.tx, th.ty, 2);
      if (!kn.length || !ln.length) return false;
      const fw = forward(nodes, kn.map(n => n.k));
      if (!ln.some(n => fw.has(n.k))) return false;
    } else if (th.ch === 'A') {
      // Mama: every lost baby of her zone can be fetched and walked home
      any = true;
      const mn = nodesNear(nodes, th.tx, th.ty, 2);
      if (!mn.length) return false;
      const fromMama = forward(nodes, mn.map(n => n.k));
      for (const b of zoneThings(room.zone, 'd')) {
        const bn = nodesNear(nodes, b.tx, b.ty, 1);
        if (!bn.length || !bn.some(n => fromMama.has(n.k))) return false;
        const fw = forward(nodes, bn.map(n => n.k));
        if (!mn.some(n => fw.has(n.k))) return false;
      }
    }
  }
  if (room.things.some(t => t.ch === 'V')) {
    // song bells: hear the stone's tune, then bubble every bell
    any = true;
    const stone = room.things.find(t => t.ch === 'O');
    if (!stone || !touched(st.cover, stone.tx, stone.ty, 3)) return false;
    for (const b of room.things.filter(t => t.ch === 'V')) if (!bubbleable(nodes, b.tx, b.ty)) return false;
  }
  return any;
}

function goalThing(goal) {
  if (goal === 'finale') return W.findThings('F')[0] || null;
  const room = W.rooms.find(r => r.def.elder === goal);
  return room ? room.things.find(t => t.ch === 'E') : null;
}

function startFor(stage) {
  if (stage.i === 0 || REPLAY) { const s = W.findThings('S')[0]; return s ? spotFor(s.tx, s.ty) : null; }
  const prev = goalThing(POWERS[stage.i - 1]);
  return prev ? spotFor(prev.tx, prev.ty) : null;
}

const where = n => {
  const r = W.roomAtPx(n.x + 10, n.y + 12);
  return `room ${r ? r.id : '?'} tile (${Math.floor((n.x + 10) / T) - (r ? r.x : 0)}, ${Math.floor((n.y + 12) / T) - (r ? r.y : 0)})`;
};

function roomTouched(cover, r) {
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (cover[cellIdx(r.x + x, r.y + y)]) return true;
  return false;
}

// ──── One story stage (runs inside a worker) ────
function runStage(stage, mapRoom) {
  const out = [];
  let failures = 0;
  const fail = msg => { failures++; out.push('  ✗ ' + msg); };
  const pass = msg => out.push('  ✓ ' + msg);
  const t0 = Date.now();
  const ab = abilitiesOf(stage.have);
  const start = startFor(stage);
  const th = goalThing(stage.goal);
  if (!start) { fail('stage start is not placed in the world'); return { out, failures }; }
  if (!th) { fail(`goal "${stage.goal}" is not placed in the world`); return { out, failures }; }

  const startRoom = W.roomAtPx(start.x + 10, start.y + 12);
  const res = exploreWithGates([start], ab, stage.i === 0 || REPLAY ? null : startRoom);
  out.push(`  explored ${res.nodes.size} standing spots (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  const keys = [];
  for (const n of res.nodes.values()) {
    const cx = n.x + C.PW / 2, cy = n.y + C.PH / 2;
    if (Math.abs(cx - (th.tx * T + 16)) < 56 && Math.abs(cy - (th.ty * T + 16)) < 56) keys.push(n.k);
  }
  if (!keys.length) {
    fail(`${NAMES[stage.goal]} is NOT reachable`);
    const seen = new Set();
    for (const n of res.nodes.values()) { const r = W.roomAtPx(n.x + 10, n.y + 12); if (r) seen.add(r.id); }
    out.push('  rooms reached: ' + [...seen].join(' '));
    return { out, failures };
  }
  pass(`${NAMES[stage.goal]} is reachable`);
  const ok = canReach(res.nodes, keys);
  const stuck = [...res.nodes.values()].filter(n => !ok.has(n.k));
  if (stuck.length) {
    fail(`${stuck.length} softlock spot(s) — goal unreachable from:`);
    for (const n of stuck.slice(0, 12)) out.push('      ' + where(n));
  } else pass('no softlocks: every reachable spot can still reach the goal');

  // Every puzzle / boss gate the kitten can walk up to (in this stage's zones) must open
  const goalRoom = W.roomAtTile(th.tx, th.ty);
  const stuckGates = W.rooms.filter(r => r.grid.some(row => row.includes('G')) && roomTouched(res.cover, r) && r.zone <= goalRoom.zone && (!startRoom || zoneOrder(r.zone) >= zoneOrder(startRoom.zone)));
  if (stuckGates.length) fail('gate(s) reached but never opened: ' + stuckGates.map(r => r.id).join(', '));
  else pass('every boss and puzzle gate along the way opens');

  // Gates: rooms marked `needs: <power>` must stay out of reach without it
  const leaks = W.rooms.filter(r => r.def.needs && !stage.have.includes(r.def.needs) && roomTouched(res.cover, r));
  if (leaks.length) fail('gated room(s) reachable too early: ' + leaks.map(r => `${r.id} (needs ${r.def.needs})`).join(', '));
  else if (W.rooms.some(r => r.def.needs && !stage.have.includes(r.def.needs))) pass('every power gate holds (no sneaking ahead)');

  if (stage.i === 0) {
    const missing = W.rooms.filter(r => r.def.neighbourhood && !r.def.maze).flatMap(r => r.things
      .filter(t => t.ch === '*' && !touched(res.cover, t.tx, t.ty, 0))
      .map(t => `${r.id} (${t.tx - r.x},${t.ty - r.y})`));
    if (missing.length) fail('neighbourhood rewards unreachable without powers: ' + missing.join(', '));
    else pass('every adventure neighbourhood reward is reachable without powers (post-game maze checked separately)');
  }

  if (stage.goal === 'finale') {
    // Backtracking: with every power, can every spot get back to the start?
    const s = W.findThings('S')[0], sp = spotFor(s.tx, s.ty);
    const home = [...res.nodes.values()].filter(n => Math.abs(n.x - sp.x) < 40 && Math.abs(n.y - sp.y) < 4).map(n => n.k);
    const back = canReach(res.nodes, home);
    const lost = [...res.nodes.values()].filter(n => !back.has(n.k));
    if (lost.length) {
      fail(`${lost.length} spot(s) cannot travel back home:`);
      for (const n of lost.slice(0, 12)) out.push('      ' + where(n));
    } else pass('every spot can travel back to the start (free backtracking)');

    // Collectibles, critters and family members
    const missing = [];
    for (const room of W.rooms) {
      if (room.def.maze) continue; // post-game four-direction search: tools/test-maze.js
      for (const t of room.things) {
        const at = `in ${room.id} at (${t.tx - room.x},${t.ty - room.y})`;
        if ('*TBnfy&@eWjhuva'.includes(t.ch) && !touched(res.cover, t.tx, t.ty, t.ch === '*' || t.ch === 'T' || t.ch === 'a' ? 0 : 1)) missing.push(`${t.ch} ${at}`);
        if ('bc'.includes(t.ch) && !touched(res.cover, t.tx, t.ty, 4)) missing.push(`critter ${at}`);
        if ('PdAkZVO'.includes(t.ch) && !touched(res.cover, t.tx, t.ty, 1)) missing.push(`puzzle piece ${t.ch} ${at}`);
        if ('QK'.includes(t.ch) && !touched(res.cover, t.tx, t.ty, 3)) missing.push(`boss ${at}`);
        if (t.ch === 'o' && !bubbleable(res.nodes, t.tx, t.ty)) missing.push(`bud ${at} can't be bubbled`);
      }
    }
    const unvisited = W.rooms.filter(r => !r.def.maze && !roomTouched(res.cover, r));
    if (unvisited.length) fail('rooms never entered: ' + unvisited.map(r => r.id).join(', '));
    if (missing.length) { fail(`${missing.length} collectible(s)/landmark(s) out of reach:`); missing.forEach(m => out.push('      ' + m)); }
    else pass('every sparkle, toy, bench, flower, firefly, critter, family member, rainbow relative, boss, puzzle piece, snack, cat trick, cat flap and lift is reachable');
    const shut = W.rooms.filter(r => r.grid.some(row => row.includes('G')));
    if (shut.length) fail('gates that never opened: ' + shut.map(r => r.id).join(', '));
    else pass('every gate can be opened (all bosses cheered up, all puzzles solvable)');
    out.push(`  (${W.rooms.length} rooms · ${W.findThings('*').length} sparkles · ${W.findThings('b').length + W.findThings('c').length} gloomy critters · ` +
      `${W.findThings('T').length} toys · ${W.findThings('&').length} family members · ${W.findThings('@').length} of Rainbow's relatives · ${W.findThings('B').length} benches · ` +
      `${W.findThings('Q').length + W.findThings('K').length} bosses · ${W.rooms.filter(r => r.things.some(t => 'PAZV'.includes(t.ch))).length} puzzles · ` +
      `${W.findThings('e').length} treats · ${W.findThings('W').length} food bowls · ${W.findThings('j').length} cat tricks)`);

    if (mapRoom) {
      const r = W.byId[mapRoom];
      out.push(`\nRoom ${mapRoom} — '•' = air the kitten can reach (all powers)`);
      for (let y = 0; y < r.h; y++) {
        let row = '';
        for (let x = 0; x < r.w; x++) {
          const ch = r.grid[y][x];
          row += ch === '.' && res.cover[cellIdx(r.x + x, r.y + y)] ? '•' : ch;
        }
        out.push('  ' + row);
      }
    }
  }
  return { out, failures };
}

// ──── Main thread: fan the stages out over the CPU cores ────
if (isMainThread) {
  const args = process.argv.slice(2);
  const mapRoom = args.includes('--map') ? args[args.indexOf('--map') + 1] : null;
    const only = args.includes('--stage') ? +args[args.indexOf('--stage') + 1] : REPLAY ? POWERS.length : null;
  const todo = STAGES.filter(s => only == null || s.i === only);
  const t0 = Date.now();
  const results = new Array(STAGES.length);
  let next = 0, running = 0;
  const jobs = args.includes('--jobs') ? Number(args[args.indexOf('--jobs') + 1]) : os.cpus().length;
  if (!Number.isInteger(jobs) || jobs < 1 || (only != null && !STAGES[only])) throw new Error('Use --jobs N (N > 0) and --stage 0…10');
  const cores = Math.max(1, Math.min(jobs, todo.length));
  console.log(`Verifying ${W.rooms.length} rooms in ${EASY ? 'Easy (assists)' : 'Medium / Hard (original movement)'} across ${todo.length} story stage(s) on ${cores} thread(s)…`);
  const launch = () => {
    while (running < cores && next < todo.length) {
      const stage = todo[next++];
      running++;
      const w = new Worker(__filename, { workerData: { stage: stage.i, mapRoom, easy: EASY, replay: REPLAY } });
      w.on('message', r => {
        results[stage.i] = r;
        console.log(`  · ${r.failures ? 'FAILED' : 'passed'}: ${NAMES[stage.goal]} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
        if (r.failures) console.log(r.out.filter(line => line.includes('✗')).join('\n'));
      });
      w.on('error', e => { results[stage.i] = { out: ['  ✗ worker crashed: ' + e.stack], failures: 1 }; });
      w.on('exit', () => { running--; if (next < todo.length) launch(); else if (running === 0) finish(); });
    }
  };
  // Map checks that need no search: once you can swim, water must be safe
  // everywhere, so no pool may have mist or the edge of the world under or
  // beside it (sinking or paddling into that would float you away)
  const lint = [];
  for (const r of W.rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    if (W.tile(x, y) !== '~') continue;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0]]) {
      const t = W.tile(x + dx, y + dy);
      if (t === null || t === '%') lint.push(`${r.id} (${x - r.x},${y - r.y}) has ${t === null ? 'the edge of the world' : 'mist'} ${dy ? 'under' : 'beside'} it`);
    }
  }
  const finish = () => {
    let failures = 0;
    console.log('\n▶ Map checks');
    if (lint.length) { failures += 1; console.log(`  ✗ ${lint.length} water tile(s) a swimmer could float away from:`); lint.slice(0, 12).forEach(l => console.log('      ' + l)); }
    else console.log('  ✓ every pool has a floor and walls (swimming is always safe)');
    for (const s of todo) {
      const r = results[s.i];
      const have = s.have.length ? '+' + s.have[s.have.length - 1] : 'no powers';
      console.log(`\n▶ Stage ${s.i + 1}: ${have} → ${NAMES[s.goal]}`);
      console.log(r.out.join('\n'));
      failures += r.failures;
    }
    console.log(`\n${failures ? '✗ ' + failures + ' problem(s) found' : '✓ World verified — zero softlocks'}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    process.exit(failures ? 1 : 0);
  };
  launch();
} else {
  const stage = STAGES[workerData.stage];
  parentPort.postMessage(runStage(stage, workerData.mapRoom));
}
