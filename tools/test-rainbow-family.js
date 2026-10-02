#!/usr/bin/env node
// Rainbow's family: only lost in Rainbow adventures, found by walking up,
// ridden home on a rainbow to the Rainbow Nest, saved and reloaded, Mama in
// the replay maze, rainbow bubbles for the whole family, and replays reset.
'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');

const g = bootGame(), B = g.BB, P = B.Play;
const heard = [];
B.Voice.play = id => { heard.push(id); return true; };
const kinThings = () => B.World.rooms.flatMap(r => P.ents[r.id].things.filter(th => th.type === 'kin'));

// 1. The first adventure has no rainbow relatives anywhere.
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'marshmallow' });
assert.equal(B.World.findThings('@').length, 6, 'six relatives are placed in the world (Mama waits in the maze)');
assert.equal(kinThings().length, 0, 'nobody is lost in the first adventure');
assert.equal(B.RainbowFamily.prize(P.save), 'rainbow');
assert.deepEqual([...B.RAINBOW_KIN].sort(), [...B.RainbowFamily.SEATS].sort());
for (const id of B.RAINBOW_KIN) {
  assert.ok(B.CATS[id] && B.CATS[id].magical, id);
  assert.ok(B.VOICE_CLIPS['kin_' + id], 'voice line for ' + id);
  const grey = B.CATS[B.Kittens.fadedId(id, 1)];
  assert.notEqual(grey.fur, B.CATS[id].fur, 'a lost relative is drawn grey: ' + id);
}
const placed = new Set(B.World.findThings('@').map(t => t.kin));
assert.equal(placed.size, 6); assert.ok(!placed.has('rbMama'));
const zones = new Set(B.World.findThings('@').map(t => B.World.roomAtTile(t.tx, t.ty).zone));
assert.ok(zones.size >= 6, 'relatives are spread across the kingdom');

// 2. A Rainbow adventure: all six are lost, grey, and found by walking up.
const fixture = Object.assign(B.Save.fresh(), { replayCount: 1, rainbowUnlocked: true, cat: 'rainbow', introDone: 1, leftHome: 1 });
Object.keys(fixture.abilities).forEach(k => { fixture.abilities[k] = true; });
B.Save.data = fixture; B.Main.set('play', { cat: 'rainbow' });
assert.equal(kinThings().length, 6);
assert.equal(B.RainbowFamily.prize(P.save), 'rbMama');
const grandpa = kinThings().find(th => th.kin === 'rbGrandpa');
const np = B.World.byId.np;
g.place('np', grandpa.x / 32 - np.x - 4, Math.round(grandpa.y / 32) - np.y);
for (let i = 0; i < 90 && !P.save.kin.rbGrandpa; i++) g.tick(1, ['ArrowRight']);
g.tick(1);
assert.equal(P.save.kin.rbGrandpa, 1, 'walking up to Grandpa finds him');
assert.ok(heard.includes('kin_rbGrandpa'));
assert.equal(B.RainbowFamily.count(P.save), 1);
// He waves, hops on a cloud and rides the rainbow home (the entity leaves).
g.tick(400);
assert.ok(!P.ents.np.things.some(th => th.type === 'kin'), 'Grandpa rode home');
// Found relatives sit on their cloud in the Cat House nest.
const seat = B.RainbowFamily.seat(B.World.byId.hm, 'rbGrandpa');
assert.ok(B.World.roomAtPx(seat.x, seat.y).id === 'hm');

// 3. Saved and reloaded: still home, not lost again.
P.writeSave(); B.Save.load(); B.Main.set('play', {});
assert.equal(P.save.kin.rbGrandpa, 1);
assert.equal(kinThings().length, 5);

// 4. Each relative found in its own room; then Mama in the maze completes the rainbow.
for (const th of kinThings()) P.ctx().onKin(th);
assert.equal(B.RainbowFamily.count(P.save), 6); assert.ok(!B.RainbowFamily.complete(P.save));
assert.ok(!(P.save.purchases || {})['bubble-rainbow']);
B.Home.familyOrder().forEach(id => { P.save.family[id] = 1; });
assert.equal(P.openJourneyChoice('rainbow'), true);
assert.ok(heard.includes('kin_mama_call'), "Mama calls from the maze in Rainbow's adventures");
assert.ok(!heard.includes('story_rainbow_call'));
P.closeJourneyChoice();
assert.equal(P.openMaze(), true);
for (const p of B.GardenMaze.PADS) P.save.pads[p.key] = 1;
Object.assign(P.maze, B.GardenMaze.PRIZE); P.mazeCell();
assert.equal(P.save.mazeSolved, true);
assert.equal(P.save.kin.rbMama, 1);
assert.ok(heard.includes('kin_rbMama')); assert.ok(!heard.includes('story_rainbow_rescue'));
assert.ok(B.RainbowFamily.complete(P.save));
assert.equal(heard.filter(id => id === 'kin_complete').length, 1);
assert.equal(P.save.purchases['bubble-rainbow'], 1, 'the whole family earns rainbow bubbles');
assert.equal(P.save.cosmetics.bubble, 'rainbow');
P.ctx().onKin({ kin: 'rbGrandpa', x: 0, y: 0 }); assert.equal(heard.filter(id => id === 'kin_complete').length, 1);
P.closeMaze(true);

// 5. Homecoming: the rainbow family dances with the cats.
const sk = B.Links.skylightTile(); g.place('hm', sk.tx - B.World.byId.hm.x, sk.ty - B.World.byId.hm.y + 1);
P.startParty();
const dancers = P.party.guests.filter(q => q.ring).map(q => q.cat);
for (const id of B.RAINBOW_KIN) assert.ok(dancers.includes(id), id + ' dances');
P.party = null;

// 6. A further replay: the family is lost again, rainbow bubbles are kept.
P.save.rainbowUnlocked = true; P.writeSave();
assert.equal(B.Save.rainbowReplay(), true);
assert.deepEqual(JSON.parse(JSON.stringify(B.Save.data.kin)), {});
assert.equal(B.Save.data.purchases['bubble-rainbow'], 1);
B.Main.set('play', { cat: 'rainbow' });
assert.equal(kinThings().length, 6);
// Mama is never a loose world entity; a missing save field is harmless.
delete P.save.kin; B.Save.write(); B.Save.load(); assert.deepEqual(JSON.parse(JSON.stringify(B.Save.data.kin)), {});
console.log("✓ Rainbow's family: absent in the first adventure, six lost relatives found and sent home, saved, Mama in the maze, rainbow bubbles, party and replay reset");
