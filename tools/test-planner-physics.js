'use strict';
const assert = require('node:assert/strict');
const { createGame } = require('./lib/playability-harness.cjs');
const { plannerPhysics } = require('./lib/planner-physics.cjs');
const clone = p => ({ ...p, lastSafe: { ...p.lastSafe } });
const B = createGame().BB, fast = plannerPhysics(B);
const starts = [];
for (const ch of ['S', 'E', 'F', 'P', 'k', 'o']) for (const at of B.World.findThings(ch).slice(0, 4)) starts.push({ x: at.tx * 32 + 6, y: at.ty * 32 - 24 });
for (const room of B.World.rooms) for (let y = 0; y < room.h; y++) {
  const x = room.grid[y].findIndex(ch => '~^:X123456789'.includes(ch));
  if (x >= 0) { starts.push({ x: (room.x + x) * 32 + 6, y: (room.y + y) * 32 - 24 }); break; }
}
let compared = 0;
for (const easy of [false, true]) for (const abilities of [{}, { doubleJump: true, wallClimb: true }, Object.fromEntries(Object.keys(B.Save.fresh().abilities).map(k => [k, true]))]) {
  for (const at of starts) {
    let actual = B.Physics.newBody(at.x, at.y), predicted = clone(actual);
    for (let t = 0; t < 160; t++) {
      const input = { left: t % 90 > 60, right: t % 90 < 40, jump: t % 35 < 20, jumpPressed: t % 13 === 0, bubblePressed: false };
      const expectedFlags = B.Physics.step(actual, input, abilities, easy);
      assert.equal(fast.physics.step(predicted, input, abilities, easy), expectedFlags);
      assert.equal(JSON.stringify(predicted), JSON.stringify(actual), 'unchanged physics must agree at every tick');
      compared++;
    }
  }
}
const unchanged = Buffer.from(B.World.flat);
const gated = B.World.rooms.find(r => r.grid.some(row => row.includes('G')));
B.World.openGates(gated); fast.sync();
const point = gated.things[0];
const actual = B.Physics.newBody(point.tx * 32, point.ty * 32), predicted = clone(actual);
assert.equal(B.Physics.step(actual, {}, {}, false), fast.physics.step(predicted, {}, {}, false));
assert.equal(JSON.stringify(predicted), JSON.stringify(actual), 'live collision revisions remain identical');
assert.notEqual(Buffer.compare(unchanged, Buffer.from(B.World.flat)), 0, 'gate revision fixture changed collision');
const before = Buffer.from(B.World.flat);
for (let i = 0; i < 1000; i++) fast.physics.step(predicted, {}, {}, false);
assert.equal(Buffer.compare(before, Buffer.from(B.World.flat)), 0, 'lookahead never mutates live collision');
console.log('Planner and runtime production physics agree over ' + compared + ' ticks across movement modes, powers, terrain and live gates.');
