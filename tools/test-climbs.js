'use strict';
// Preservation, real movement and Continue against the pre-refresh map.
// The full stage/replay graph search remains tools/verify-world.js.
const assert = require('node:assert/strict');
const fixture = require('./fixtures/climb-preservation.json');
const { bootGame } = require('./test-neighbourhood');
const game = bootGame(), B = game.BB;
B.World.build();
// Sign positions must survive; their painted directions may be corrected.
const landmarkKind = ch => 'RLUD'.includes(ch) ? 'sign' : ch;
const key = t => [landmarkKind(t.ch), t.tx, t.ty, t.item || ''].join(':');
const current = new Set(B.World.rooms.flatMap(r => r.things.map(key)));
assert.deepEqual(fixture.landmarks.filter(k => {
  const [ch, ...position] = k.split(':');
  return !current.has([landmarkKind(ch), ...position].join(':'));
}), [], 'every original collectible, puzzle, sign and family position survives');
const all = Object.fromEntries(Object.keys(B.Save.fresh().abilities).map(k => [k, true]));
B.Physics.setAbilities(all);
for (const easy of [false, true]) {
  for (const [id, col, row] of fixture.checkpoints) {
    const r = B.World.byId[id], p = B.Physics.newBody((r.x + col) * 32 + 6, (r.y + row) * 32 - 24);
    assert.ok(!B.Physics.rectSolid(p.x, p.y, p.w, p.h), id + ' old checkpoint is not embedded in new terrain');
    for (let tick = 0; tick < 120; tick++) {
      const fx = B.Physics.step(p, { jump: false }, all, easy);
      assert.equal(fx & B.FX.HAZARD, 0, id + ' old checkpoint settles without falling out of the world');
      if (p.grounded) break;
    }
  }
}
console.log('Original ' + fixture.landmarks.length + ' landmarks and ' + fixture.checkpoints.length + ' checkpoints preserved in both movement modes.');

// A whole older adventure survives the actual Continue path, including
// all old sparkle IDs. Rooms and outfits are unchanged; new stars are extra.
const older = B.Save.fresh(); older.introDone = older.leftHome = 1;
older.abilities = all; older.family.mamaMallow = 1; older.toys.yarn = 1;
older.outfits.partyhat = 1; older.glassesFound.googly = 1;
for (const k of fixture.landmarks) {
  const [ch, x, y] = k.split(':'); if (ch === '*') older.sparkles[x + ',' + y] = 1;
}
for (const id of B.World.rooms.filter(r => r.def.climb).map(r => r.id)) {
  const checkpoint = fixture.checkpoints.find(p => p[0] === id);
  if (!checkpoint) continue; // The old Golden Tower had no standing spot.
  const [, col, row] = checkpoint;
  const r = B.World.byId[id];
  const s = { ...older, room: id, x: (r.x + col) * 32 + 6, y: (r.y + row) * 32 - 24 };
  const resumed = bootGame(null, { storage: [['bubblebug_kingdom_v2', JSON.stringify(s)]] });
  const bb = resumed.BB; bb.Main.set('play', {});
  assert.equal(bb.Play.room.id, id, 'Continue stays in ' + id);
  assert.equal(Object.keys(bb.Play.save.sparkles).length, 756, 'old star total never decreases');
  assert.equal(bb.Play.save.family.mamaMallow, 1);
  assert.equal(bb.Play.save.toys.yarn, 1);
  assert.equal(bb.Play.save.outfits.partyhat, 1);
  assert.equal(bb.Play.save.glassesFound.googly, 1);
}
console.log('Continue preserves room, 756 collected stars, cats, toys and outfits in all refreshed rooms.');

// Exercise the optional Pond Walk route with ordinary jumps, using the
// same physics as keyboard, touch and gamepad. No elder gift is required.
const pond = B.World.byId.np;
for (const easy of [false, true]) {
  const body = B.Physics.newBody((pond.x + 14) * 32 + 6, (pond.y + 31) * 32 - 24);
  body.grounded = true;
  for (const [col, row] of [[14, 28], [14, 25], [18, 22], [14, 19], [20, 16]]) {
    // The first platform is reached via an ordinary intermediate jump,
    // never by granting powers to the test.
    let landed = false;
    for (let t = 0; t < 160; t++) {
      const dx = (pond.x + col + 0.5) * 32 - (body.x + 10);
      B.Physics.step(body, { left: dx < -5, right: dx > 5, jump: true, jumpPressed: t === 0 }, {}, easy);
      if (body.grounded && Math.abs(body.y + 24 - (pond.y + row) * 32) < 2) { landed = true; break; }
    }
    assert.ok(landed, 'ordinary jump reaches Pond Walk row ' + row);
  }
}
console.log('Pond Walk reward loop joins the upper path with ordinary and assisted jumps.');

// Defeating Armadillo may discover the Hive door, but it must not bypass
// the Snail Elder. The scene, the guide and the verifier use doorOpen.
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' });
const P = B.Play, hiveDoor = P.ents.hm.things.find(th => th.type === 'door' && th.zone === 3);
P.save.doors[3] = 1; P.save.bosses.c7 = 1;
const standAtDoor = () => {
  P.pl.body = B.Physics.newBody(hiveDoor.x - 10, hiveDoor.y - 24);
  P.pl.body.grounded = true; P.pl.state = 'play'; P.intro = P.iris = null;
};
standAtDoor(); game.tick(100);
assert.equal(B.Links.doorOpen(3, P.save), false);
assert.equal(P.traveling, null, 'waiting at the discovered Hive door cannot skip Sticky Paws');
assert.equal(P.room.id, 'hm');
P.save.abilities.wallClimb = true; standAtDoor(); game.tick(160);
assert.equal(B.Links.doorOpen(3, P.save), true);
assert.equal(P.room.id, 'h1', 'the same door works after Sticky Paws is earned');
console.log('The real Hive door respects Sticky Paws before and after discovery.');

// A legacy save could already be inside the Hive through the old boss
// shortcut. Closing that shortcut must leave a way out and back to Snail.
const legacy = B.Save.fresh(), hive = B.World.byId.h1;
Object.assign(legacy, { introDone: 1, leftHome: 1, room: 'h1', x: (hive.x + 4) * 32 + 6, y: (hive.y + 15) * 32 - 24 });
legacy.abilities.doubleJump = true; legacy.doors = { 2: 1, 3: 1 };
legacy.bosses = { g6: 1, m7: 1, c7: 1 };
const oldHive = bootGame(null, { storage: [['bubblebug_kingdom_v2', JSON.stringify(legacy)]] });
const H = oldHive.BB; H.Main.set('play', {}); H.Play.intro = H.Play.iris = null;
oldHive.tick(160);
assert.equal(H.Play.room.id, 'hm', 'an old Hive save can still take its cat flap home without Sticky Paws');
assert.equal(H.Links.doorOpen(2, H.Play.save), true, 'the cave door remains available to learn Sticky Paws');
assert.equal(H.Wayfinder.goal(H.Play.save, H.Play.room), 'c4', 'the guide sends the legacy kitten to the Snail Elder');
console.log('Older Hive saves without Sticky Paws can leave safely and return to the Snail Elder.');

// A locked garden hatch must remain a walking floor until a successful
// climb from below. The adjacent landing stays intact after it opens.
for (const mode of ['medium', 'easy']) {
  const g = bootGame(), b = g.BB;
  b.Settings.setDifficulty(mode); b.Save.data = b.Save.fresh();
  b.Save.data.introDone = b.Save.data.leftHome = 1;
  b.Save.data.toys.yarn = 1; b.Main.set('play', { cat: 'phoebe' });
  const p = b.Play;
  g.place('tw', 13, 15); g.tick(100);
  assert.equal(p.pl.body.y + 24, 14 * 32, 'closed hatch supports garden walking');
  assert.equal(p.save.shortcuts.gardenMushroom, undefined, 'arrival from above cannot unlock the hatch');
  g.tick(70, ['Space']); g.tick(80);
  assert.equal(p.save.shortcuts.gardenMushroom, undefined, 'jumping off the hatch from the garden cannot unlock it');
  g.place('tx', 16, 2); g.tick(16, ['Space']); g.tick(130);
  assert.ok(b.Camera.y <= 14 * 32 - 48, 'camera reveals the actual garden hatch above the mushroom ceiling');
  for (const col of [11, 18]) assert.equal(b.World.tile(col, 16), '#', 'soil beside the shaft stays blocked');
  for (let col = 12; col <= 17; col++) assert.equal(b.World.tile(col, 16), '.', 'marked shaft is genuinely pass-through');
  assert.equal(p.save.shortcuts.gardenMushroom, undefined, 'a short jump only touching the ceiling does not unlock it');
  p.save.abilities.doubleJump = true;
  g.place('tx', 16, 2); g.tick(1, ['Space']);
  for (let t = 0; t < 180; t++) {
    g.tick(1, ['Space']);
    if (!b.Camera.sliding && p.pl.body.vy >= -1) break;
  }
  g.tick(1); g.tick(1, ['Space']); g.tick(180, ['Space']);
  assert.equal(p.save.shortcuts.gardenMushroom, 1, mode + ' actual ascent opens the shortcut');
  assert.equal(p.room.id, 'tw');
  assert.equal(p.pl.body.y + 24, 14 * 32, 'kitten lands beside the new gap rather than dropping straight back');
  for (let col = 12; col <= 14; col++) assert.equal(b.World.tile(col, 14), '.');
  for (let col = 15; col <= 17; col++) assert.equal(b.World.tile(col, 14), '-', 'landing ledge remains');
  g.tick(19, ['ArrowLeft']); g.tick(180);
  assert.equal(p.room.id, 'tx', 'walking into the shortcut returns to the mushroom trail');
  assert.equal(p.pl.body.y + 24, 19 * 32, 'catch shelf stops the descent safely');
  assert.equal(p.pl.state, 'play');
  const saved = g.storage.get('bubblebug_kingdom_v2');
  assert.equal(JSON.parse(saved).shortcuts.gardenMushroom, 1, 'opening is saved immediately');
  const reload = bootGame(null, { storage: [['bubblebug_kingdom_v2', saved]] });
  reload.BB.Main.set('play', {});
  assert.equal(reload.BB.World.tile(13, 14), '.', 'Continue restores shortcut collision');
  assert.equal(reload.BB.Play.save.toys.yarn, 1, 'unlock preserves existing progress');
  reload.BB.Save.data.mazeSolved = reload.BB.Save.data.rainbowUnlocked = true;
  assert.equal(reload.BB.Save.resetRainbowFamily(), true);
  reload.BB.Main.set('play', {});
  assert.equal(reload.BB.World.tile(13, 14), '.', 'family-only reset retains the earned shortcut');
  assert.equal(reload.BB.Save.rainbowReplay(), true);
  reload.BB.Main.set('play', {});
  assert.equal(reload.BB.World.tile(13, 14), '-', 'full Rainbow replay closes the shortcut');
  reload.BB.Save.reset(); reload.BB.Main.set('play', {});
  assert.equal(reload.BB.World.tile(13, 14), '-', 'a new adventure starts with the hatch shut');
}
console.log('Garden hatch: real ascent, stable landing, safe return drop, immediate save, reload and fresh reset pass in both modes.');

// One-way shelves must not seal a narrow underwater treasure pocket.
B.World.build();
for (const easy of [false, true]) {
  const r = B.World.byId.l5;
  const body = B.Physics.newBody((r.x + 8) * 32 + 6, (r.y + 23) * 32);
  let reached = false;
  for (let t = 0; t < 240; t++) {
    B.Physics.step(body, { jump: false }, all, easy);
    if (body.y + 24 >= (r.y + 26) * 32) reached = true;
  }
  assert.ok(reached, 'Coral Garden sparkle pocket is open for sinking');
  for (let t = 0; t < 240; t++) B.Physics.step(body, { jump: true }, all, easy);
  assert.ok(body.y < (r.y + 23) * 32, 'the kitten can swim back out of the pocket');
}
console.log('Coral Garden narrow pocket can be entered and exited by swimming in both modes.');

// Navigation must work for children who cannot read. Record the actual
// hatch renderer in both states and reject any text drawn by its cues.
const pictureCanvas = new Proxy({}, {
  get(target, key) {
    if (key === 'fillText' || key === 'strokeText') return () => assert.fail('shortcut cues must use pictures, never words');
    return key in target ? target[key] : () => {};
  },
});
B.World.build();
const hatchRoom = B.World.byId.tw;
B.ClimbArt.hatch(pictureCanvas, hatchRoom, { x: 0, y: 384 });
B.World.openHatch(hatchRoom);
B.ClimbArt.hatch(pictureCanvas, hatchRoom, { x: 0, y: 0 });
console.log('Closed and open shortcut cues render entirely without words.');
