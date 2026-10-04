#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  LAYOUT CHECK — a quick, search-free look at how the rooms fit together.
//
//  Prints the world's bounding box, how much of that box is covered by
//  rooms, any overlapping rooms, and every border opening that leads
//  nowhere: an open tile on a room's edge with no room on the other side
//  (a doorway into the invisible wall, or a pit out of the world).
//  Openings that run into a neighbour's solid wall are listed too, since
//  they usually mean two rooms that should meet don't line up.
//
//  Usage: node tools/layout-check.js [--all] [--room ID] [--strict]
//                                    [--layout FILE] [--picture]
//    --all      list every room's openings, not just the problems
//    --room     list one room's openings
//    --strict   exit 1 on any dead end or blocked opening (not just overlaps)
//    --layout   try out new spots first: a JSON file of { id: { x, y, flip } }
//    --picture  draw the world in cells (15 × 17 tiles), one letter per zone
//  Sky above an outdoor room (its top row open to nothing) is fine and is
//  only counted, never reported as a problem.
// ════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
global.window = global;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
['js/core/bb.js', 'js/core/config.js', 'js/world/zones.js', 'js/world/world.js'].forEach(load);
// keep our own copy of every room definition, to list all overlaps at once
const DEFS = [];
const register = global.BB.room;
const argv = process.argv.slice(2);
const TRY = argv.includes('--layout') ? JSON.parse(fs.readFileSync(argv[argv.indexOf('--layout') + 1], 'utf8')) : {};
global.BB.room = def => {
  const t = TRY[def.id];
  if (t) { def = Object.assign({}, def, t); if (!t.flip) delete def.flip; }
  DEFS.push(def); register(def);
};
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/src="(js\/world\/rooms\/[^"]+)"/g)].forEach(m => load(m[1]));
// a trial layout may also sketch rooms that don't exist yet ({ x, y, w, h, zone })
for (const [id, t] of Object.entries(TRY)) {
  if (DEFS.some(d => d.id === id) || !t.w) continue;
  const row = '.'.repeat(t.w);
  global.BB.room({ id, zone: t.zone == null ? 12 : t.zone, x: t.x, y: t.y, link: true, sketch: true, map: Array.from({ length: t.h }, () => row) });
}
load('js/engine/physics.js');

const args = argv;
const ALL = args.includes('--all');
const STRICT = args.includes('--strict');
const ONLY = args.includes('--room') ? args[args.indexOf('--room') + 1] : null;

const BB = global.BB;
const rect = d => ({ id: d.id, x: d.x, y: d.y, w: d.map[0].length, h: d.map.length });
const rects = DEFS.map(rect);
const overlaps = [];
for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
  const a = rects[i], b = rects[j];
  if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(`${a.id} and ${b.id}`);
}
if (overlaps.length) {
  console.log(`✗ ${overlaps.length} pair(s) of rooms overlap:`);
  overlaps.forEach(o => console.log('    ' + o));
  process.exit(1);
}
let W;
try { W = BB.World.build(); } catch (e) { console.log('✗ ' + e.message); process.exit(1); }
const P = BB.Physics;
// vine gates and sandstone are doorways that open later, not walls
const solid = ch => P.solidSide(ch) && ch !== 'G' && ch !== 'X';

// ──── Coverage ────
const B = W.bounds;
const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
let area = 0;
for (const r of W.rooms) area += r.w * r.h;
const cover = area / (bw * bh);

// ──── Openings ────
// Every run of open tiles along each side of each room. For each tile we
// look one step outside the room: outside the world, a solid tile of the
// neighbour, or open space we can pass into.
const SIDES = {
  left: r => ({ n: r.h, at: i => [r.x, r.y + i], out: [-1, 0] }),
  right: r => ({ n: r.h, at: i => [r.x + r.w - 1, r.y + i], out: [1, 0] }),
  top: r => ({ n: r.w, at: i => [r.x + i, r.y], out: [0, -1] }),
  bottom: r => ({ n: r.w, at: i => [r.x + i, r.y + r.h - 1], out: [0, 1] }),
};
function openings(r) {
  const out = [];
  for (const [side, f] of Object.entries(SIDES)) {
    const s = f(r);
    let run = null;
    const flush = () => { if (run) out.push(run); run = null; };
    for (let i = 0; i < s.n; i++) {
      const [tx, ty] = s.at(i);
      const ch = W.tile(tx, ty);
      if (ch === null || solid(ch)) { flush(); continue; }
      const ox = tx + s.out[0], oy = ty + s.out[1];
      const other = W.tile(ox, oy);
      const kind = other === null ? 'nowhere' : solid(other) ? 'blocked' : 'open';
      const into = other === null ? null : W.roomAtTile(ox, oy).id;
      if (!run) run = { room: r.id, side, from: i, to: i, kinds: {}, into: new Set() };
      run.to = i;
      run.kinds[kind] = (run.kinds[kind] || 0) + 1;
      if (into) run.into.add(into);
    }
    flush();
  }
  return out;
}

const describe = o => {
  const k = Object.entries(o.kinds).map(([a, b]) => `${b} ${a}`).join(', ');
  const into = o.into.size ? ' → ' + [...o.into].join('/') : '';
  return `${o.room} ${o.side} ${o.from}–${o.to} (${k})${into}`;
};

const all = W.rooms.filter(r => !r.def.sketch).flatMap(openings);
// sky over a room is fine; a side doorway or pit into nothing is not
const sky = all.filter(o => o.side === 'top' && o.kinds.nowhere);
const dead = all.filter(o => o.side !== 'top' && o.kinds.nowhere);
const blocked = all.filter(o => (o.side === 'left' || o.side === 'right') && o.kinds.blocked && !o.kinds.open);

console.log(`World box: x ${B.x0}…${B.x1}, y ${B.y0}…${B.y1}  (${bw} × ${bh} tiles)`);
console.log(`Rooms: ${W.rooms.length}, covering ${(cover * 100).toFixed(1)}% of the box`);
console.log('✓ no overlapping rooms');
console.log(`  (${sky.length} room top edge(s) open to the sky)`);

if (ONLY) {
  console.log(`\nOpenings of ${ONLY}:`);
  all.filter(o => o.room === ONLY).forEach(o => console.log('  ' + describe(o)));
} else if (ALL) {
  console.log('\nEvery opening:');
  all.forEach(o => console.log('  ' + describe(o)));
}

if (dead.length) {
  console.log(`\n✗ ${dead.length} opening(s) lead nowhere:`);
  dead.forEach(o => console.log('    ' + describe(o)));
} else console.log('✓ no side or floor opening leads out of the world');
if (blocked.length) {
  console.log(`\n! ${blocked.length} opening(s) run straight into a neighbour's wall:`);
  blocked.forEach(o => console.log('    ' + describe(o)));
} else console.log('✓ no opening runs into a neighbour\'s wall');

if (args.includes('--picture')) {
  // two characters per 15 × 17 cell: a room's id in its top-left cell, its
  // zone letter elsewhere ('++' for link rooms), '··' where no room reaches
  const KEYS = 'GMCHRKLDFASTN';
  const cx0 = Math.floor(B.x0 / 15), cx1 = Math.ceil(B.x1 / 15), cy0 = Math.floor((B.y0 + 1) / 17), cy1 = Math.ceil((B.y1 + 1) / 17);
  console.log(`\nCells from x ${cx0 * 15}, y ${cy0 * 17 - 1} (15 × 17 tiles each):`);
  for (let cy = cy0; cy < cy1; cy++) {
    let line = '';
    for (let cx = cx0; cx < cx1; cx++) {
      const r = W.roomAtTile(cx * 15 + 7, cy * 17 - 1 + 8);
      if (!r) { line += '··'; continue; }
      const corner = Math.abs(r.x - cx * 15) < 8 && Math.abs(r.y - (cy * 17 - 1)) <= 8;
      line += corner ? r.id.padEnd(2).slice(0, 2) : r.def.link ? '++' : KEYS[r.zone].toLowerCase().repeat(2);
    }
    console.log(String(cy * 17 - 1).padStart(5) + ' ' + line);
  }
}
process.exit(STRICT && (dead.length || blocked.length) ? 1 : 0);
