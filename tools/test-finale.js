#!/usr/bin/env node
// The finale: from the Moon Garden the kitten takes the Starfall float —
// a dandelion drift over to the Starfall Shaft and all the way down it,
// the camera following room to room — and lands by the rainbow (Pawprint
// Maze) door at home, where the homecoming party starts. Replays still
// begin at home.
'use strict';
const assert = require('assert/strict');
const { bootGame } = require('./test-neighbourhood');

const g = bootGame(), B = g.BB, P = B.Play, W = B.World;
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' });
for (const k of Object.keys(P.save.abilities)) P.save.abilities[k] = true;
const pad = W.findThings('F')[0];
assert.ok(pad, 'the Starfall float pad is in the world');
const padRoom = W.roomAtTile(pad.tx, pad.ty);
assert.equal(padRoom.id, 't5', 'it waits past the Moon Rabbit');
// the shaft stands right above the Pawprint Maze room
const shaft = W.byId.t4, nm = W.byId.nm;
assert.ok(shaft.x < nm.x + nm.w && nm.x < shaft.x + shaft.w && shaft.y + shaft.h <= nm.y + 1, 'Starfall Shaft is above the maze room');

g.place('t5', pad.tx - padRoom.x, pad.ty - padRoom.y + 1);
P.startStarfall({ x: pad.tx * 32 + 16, y: (pad.ty + 1) * 32 });
assert.equal(P.pl.state, 'starfall');
const seen = new Set();
let drift = 0;
for (let i = 0; i < 3000 && !P.party; i++) {
  g.tick(1); seen.add(P.room.id);
  if (P.traveling && P.traveling.kind === 'starfall') drift++;
}
assert.ok(seen.has('t4'), 'the float passes down the Starfall Shaft');
assert.ok(drift > 120, 'the float is a drift, not a jump cut');
assert.equal(P.room.id, 'hm');
const land = B.Links.landingTile();
assert.ok(Math.abs(P.pl.body.x + 10 - (land.tx * 32 + 16)) < 40, 'lands by the rainbow door');
assert.equal(P.save.finale, true); assert.ok(P.party, 'the homecoming party starts');
console.log('✓ the Starfall float drifts down the shaft and lands by the rainbow door; the party starts');
