#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const g = bootGame(), B = g.BB;
B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', { cat: 'phoebe' });
const r = B.World.byId.ng, floor = row => (r.y + row) * 32;
const ab = { ...B.Save.data.abilities, jump: true };
function jumpTo(body, x, y, assists) {
  let landed = false;
  for (let frame = 0; frame < 85; frame++) {
    const dx = x - body.x - body.w / 2;
    B.Physics.step(body, { left: dx < -5, right: dx > 5, jump: true, jumpPressed: frame === 0 }, ab, assists);
    if (frame > 4 && body.grounded && Math.abs(body.y + body.h - y) < 0.1) { landed = true; break; }
  }
  assert.ok(landed, 'ordinary jump reaches the next wide platform');
}
for (const assists of [false, true]) {
  let body = B.Physics.newBody((r.x + 9.5) * 32 - 10, floor(31) - 24); body.grounded = true;
  for (const [col, row] of [[9,28], [12,25], [9,22], [12,19], [12,16]]) jumpTo(body, (r.x + col + 0.5) * 32, floor(row), assists);
  body = B.Physics.newBody((r.x + 15.5) * 32 - 10, floor(19) - 24); body.grounded = true;
  jumpTo(body, (r.x + 18.5) * 32, floor(16), assists);
  for (const [id, start, target] of [['ng',13,17], ['ng',22,25], ['np',6,9], ['np',14,17], ['np',22,25]]) {
    const room = B.World.byId[id], y = (room.y + 16) * 32;
    body = B.Physics.newBody((room.x + start + 0.5) * 32 - 10, y - 24); body.grounded = true;
    jumpTo(body, (room.x + target + 0.5) * 32, y, assists);
  }
}
console.log('✓ wide climbing steps, open upper entrance and every high gap are reachable with ordinary and assisted jumps');
const trampoline = B.Physics.newBody((r.x + 17.5) * 32 - 10, floor(31) - 24);
trampoline.grounded = true; let height = trampoline.y;
for (let i = 0; i < 45; i++) { B.Physics.step(trampoline, { jump: false }, B.Save.data.abilities, false); height = Math.min(height, trampoline.y); }
assert.ok(floor(31) - 24 - height > 150, 'walking onto the flush trampoline gives a proper safe bounce without any gift');
assert.equal(B.World.tile(r.x + 17, r.y + 31), 'M');
console.log('✓ bottom trampoline works without jump skills and leaves the continuous lower path intact');

const playSpot = B.GardenFun.spot(r);
g.place('ng', (playSpot.x - r.px) / 32 - 0.5, 31); B.Play.pl.body.facing = 1; B.Play.startGardenFun();
const toy = B.Play.gardenBall, seen = new Set(), before = JSON.stringify({ family: B.Save.data.family, bosses: B.Save.data.bosses, hearts: B.Save.data.heartsSpent });
for (let frame = 0; frame < 830; frame++) {
  g.tick(1, ['ArrowRight']);
  const room = B.World.roomAtPx(toy.x, toy.y); if (room) seen.add(room.id);
  assert.ok(Number.isFinite(toy.x + toy.y + toy.vx + toy.vy));
  if (B.Play.room.id === 'g1') break;
}
for (const id of ['ng', 'np', 'nr']) assert.ok(seen.has(id), 'ball travels into ' + id);
assert.equal(B.Play.gardenBall, toy, 'the same ball survives play-station timeout and room changes');
assert.equal(B.Play.gardenFun, null, 'the critter gathering still ends safely when walking away');
assert.equal(JSON.stringify({ family: B.Save.data.family, bosses: B.Save.data.bosses, hearts: B.Save.data.heartsSpent }), before);
const bounds = B.GardenFun.ballBounds();
assert.ok(toy.x >= bounds.lo && toy.x <= bounds.hi);
console.log('✓ real walking kicks the same ball through all three garden rooms; no extra hearts or progress changes');

const settled = { x: B.World.byId.np.px + 16 * 32, y: bounds.floor - 14, vx: 2, vy: 0 };
for (let i = 0; i < 1000; i++) B.GardenFun.stepBall(settled);
assert.ok(Math.abs(settled.vx) < 0.1 && settled.vy === 0, 'ordinary ground dissipates bounce and rolling energy');
assert.ok(Math.abs(settled.y - (bounds.floor - 14)) < 0.1);
const upper = { x: (r.x + 19) * 32, y: floor(16) - 120, vx: 0, vy: 2 };
for (let i = 0; i < 250; i++) B.GardenFun.stepBall(upper);
assert.ok(Math.abs(upper.y - (floor(16) - 14)) < 0.1, 'ball lands on the high one-way platforms');
const edge = { x: bounds.hi - 1, y: bounds.floor - 14, vx: 8, vy: 0 };
B.GardenFun.stepBall(edge); assert.ok(edge.x <= bounds.hi && edge.vx < 0, 'outer edge bounces without getting trapped');
console.log('✓ ball rolls and settles naturally, lands on platforms and rebounds from the full garden boundary');
