'use strict';
// Exercise real player/physics updates, rather than just input mappings.
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const g = bootGame(), B = g.BB;
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' });
const tile = B.World.tile;
B.World.tile = (x, y) => y >= 100 ? '#' : '.';
const input = extra => ({ physicsInput: () => ({ left: false, right: false, jump: false,
  jumpPressed: false, bubblePressed: false, ...extra }), pressed: { bubble: !!extra.bubblePressed } });
const powers = { doubleJump: true, bubbleBounce: true, wings: true, float: true };
let shots = 0;
const env = { bubbleCount: 0, blow: () => shots++ };
const step = (p, extra = {}, ab = powers) => B.Player.update(p, input(extra), ab, env);
const tap = p => step(p, { jump: true, jumpPressed: true });
const player = () => { const p = B.Player.create(0, 3200 - B.CFG.PH, 'phoebe'); p.body.grounded = true; return p; };
for (const easy of [false, true]) {
  B.Settings.setDifficulty(easy ? 'easy' : 'hard');
  const p = player();
  assert.ok(tap(p) & B.FX.JUMP);
  for (let i = 0; i < 5; i++) step(p, { jump: true });
  assert.ok(tap(p) & B.FX.DJUMP);
  const fx = step(p, { jump: true, jumpPressed: true, bubblePressed: true });
  assert.ok(fx & B.FX.BBOUNCE); assert.equal(fx & B.FX.FLAP, 0);
  assert.equal(p.body.bbUsed, true); assert.equal(p.body.jumpBuf, 0);
  assert.equal(p.body.vy, B.CFG.BUBBLE_BOUNCE + B.CFG.G_UP);
  assert.equal(shots, easy ? 2 : 1, 'simultaneous third Jump and Bubble still shoots');
  for (let i = 0; i < 4; i++) assert.equal(step(p, { jump: true }) & B.FX.BBOUNCE, 0);
  assert.ok(tap(p) & B.FX.FLAP);
  assert.ok(tap(p) & B.FX.FLAP);
  p.body.y = 3200 - p.body.h - 2; p.body.vy = 3;
  step(p, {}, { doubleJump: true, bubbleBounce: true });
  assert.equal(p.body.grounded, true); assert.equal(p.body.bbUsed, false); assert.equal(p.body.djUsed, false);
  assert.ok(tap(p) & B.FX.JUMP);
}
console.log('Jump -> Double Jump -> Bubble Bounce -> repeated Wings; holding never retriggers; landing resets; simultaneous shooting works in Easy/Hard.');
for (const ab of [{}, { doubleJump: true }, { doubleJump: true, bubbleBounce: true }]) {
  const p = player(); step(p, { jump: true, jumpPressed: true }, ab);
  for (let i = 0; i < 5; i++) step(p, {}, ab);
  p.bubbleCd = 0;
  const before = shots, fx = step(p, { bubblePressed: true }, ab);
  assert.equal(fx & B.FX.BBOUNCE, 0); assert.equal(p.body.bbUsed, false); assert.equal(shots, before + 1);
  const jumpFx = step(p, { jump: true, jumpPressed: true }, ab);
  assert.equal(!!(jumpFx & B.FX.DJUMP), !!ab.doubleJump);
  assert.equal(jumpFx & (B.FX.BBOUNCE | B.FX.FLAP), 0, 'locked skills never fire');
}
const p = player(); tap(p); for (let i = 0; i < 5; i++) step(p);
assert.ok(tap(p) & B.FX.DJUMP); assert.ok(step(p, { jump: true, jumpPressed: true }, { doubleJump: true, bubbleBounce: true }) & B.FX.BBOUNCE);
assert.equal(step(p, { jump: true, jumpPressed: true }, { doubleJump: true, bubbleBounce: true }) & (B.FX.DJUMP | B.FX.BBOUNCE | B.FX.FLAP), 0);
p.body.vy = 6; step(p, { jump: true }, { float: true }); assert.equal(p.body.floating, true);
B.World.tile = () => '~'; p.body.grounded = false;
const waterFx = step(p, { jump: true, jumpPressed: true, bubblePressed: true }, { ...powers, swim: true });
assert.equal(waterFx & (B.FX.DJUMP | B.FX.BBOUNCE | B.FX.FLAP), 0); assert.equal(p.body.inWater, true);
B.World.tile = tile;
const r = B.World.byId.h4, row = r.grid.findIndex(row => row.includes(':')), col = r.grid[row].indexOf(':');
for (const glow of [false, true]) {
  const body = B.Physics.newBody((r.x + col) * 32 + 6, (r.y + row) * 32 - B.CFG.PH - 10); body.vy = 2;
  for (let i = 0; i < 10; i++) B.Physics.step(body, input({}).physicsInput(), { glow });
  assert.equal(body.grounded, glow);
  if (glow) assert.equal(body.y + body.h, (r.y + row) * 32);
}
console.log('Air Bubble always shoots without consuming a bounce; locked powers, float, swim, and actual Glow bridge collision verified.');
