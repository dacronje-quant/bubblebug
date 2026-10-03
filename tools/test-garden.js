#!/usr/bin/env node
// Outdoor invitations, all rescued visitors and repeated free play,
// using the real scene updates, bubble collisions, music and save data.
'use strict';
const assert = require('assert/strict');
const { bootGame } = require('./test-neighbourhood');
const plain = value => JSON.parse(JSON.stringify(value));

function check(g) {
  const { BB: B, tick, place } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  let P = B.Play, save = P.save;
  const original = B.World.rooms.flatMap(r => P.ents[r.id].bugs);
  const first = original.find(b => original.filter(other => other.kind === b.kind).length > 1);
  save.friends[first.key] = 1;
  place('ng', 24, 31); tick(B.Links.HOLD + 15); tick(1, ['Enter']); tick();
  assert.equal(save.residents[first.kind], 1); assert.equal(save.heartsSpent, 1); assert.equal(P.homeVisitors.length, 1);
  P.closeGardenChoice();
  const next = original.find(b => b.kind === first.kind && b.key !== first.key);
  for (let i = 0; i < next.need; i++) B.Bugs.hit(next, P.ctx());
  for (let i = 0; i < 55; i++) B.Bugs.update(next, P.ctx());
  assert.equal(save.friends[next.key], next.kind); assert.equal(P.homeVisitors.length, 2);
  assert.equal(save.heartsSpent, 1, 'later rescues of an invited species join without a second charge');
  assert.equal(new Set(P.homeVisitors.map(v => v.sourceKey)).size, 2);
  const kept = P.homeVisitors.slice(); P.refreshHomeVisitors();
  assert.ok(kept.every(v => P.homeVisitors.includes(v)), 'refresh keeps existing roaming visitors');
  console.log('✓ outdoor invitation brings every rescued critter of its kind, including later rescues, once');

  for (const bug of original) save.friends[bug.key] = bug.kind;
  for (const kind of P.earnedFriendKinds()) save.residents[kind] = 1;
  P.refreshHomeVisitors(); assert.equal(P.homeVisitors.length, 65);
  const progress = plain({ friends: save.friends, family: save.family, bosses: save.bosses, purchases: save.purchases, heartsSpent: save.heartsSpent });
  for (const id of ['ng', 'np', 'nr']) {
    const q = B.GardenFun.spot(B.World.byId[id]);
    for (let repeat = 0; repeat < 2; repeat++) {
      place(id, 27, 31); tick();
      place(id, (q.x - B.World.byId[id].px) / 32 - 0.5, 31); tick(1, ['Enter']); tick();
      assert.equal(P.gardenFun.kind, q.kind); assert.equal(P.gardenFun.friends.length, 6);
      const f = P.gardenFun, selected = f.friends.slice();
      assert.ok(selected.every(v => Math.abs(v.gardenFloor - q.y) < 1), 'upstairs friends keep their own floor');
      assert.ok(f.slots.every((slot, i) => !i || slot.x - f.slots[i - 1].x >= 64), 'spaced places around the game');
      const lastFlip = new Map();
      for (let frame = 0; frame < 150; frame++) {
        const before = selected.map(v => ({ x: v.x, y: v.y, facing: v.facing })); tick();
        selected.forEach((v, i) => {
          assert.ok(Math.hypot(v.x - before[i].x, v.y - before[i].y) <= 1.151, 'one calm movement update per frame');
          assert.equal(v.hopV, 0); assert.ok(v.hop <= 0 && v.hop >= -7.1);
          if (v.facing !== before[i].facing) {
            assert.ok(!lastFlip.has(v) || frame - lastFlip.get(v) >= 20, 'no twitching direction changes'); lastFlip.set(v, frame);
          }
        });
      }
      assert.ok(selected.every(v => q.kind === 'dance' ? v.danceT > 0 : v.danceT === 0));
      if (q.kind === 'dance') assert.equal(B.Music.wanted, 'party');
      for (let frame = 0; frame < 400; frame++) {
        const before = selected.map(v => ({ x: v.x, y: v.y })); const active = !!P.gardenFun; tick();
        if (active) selected.forEach((v, i) => assert.ok(Math.hypot(v.x - before[i].x, v.y - before[i].y) <= 1.151, 'ending never snaps visitors home'));
      }
      assert.equal(P.gardenFun, null); assert.equal(B.Music.wanted, B.ZONES[P.room.zone].key);
      tick(90, ['Enter']); tick(); assert.equal(P.gardenFun, null, 'staying on the ring never repeats automatically');
      assert.deepEqual(plain({ friends: save.friends, family: save.family, bosses: save.bosses, purchases: save.purchases, heartsSpent: save.heartsSpent }), progress);
      for (const v of P.homeVisitors.filter(v => v.room === id)) {
        assert.ok(v.x >= v.roamLo && v.x <= v.roamHi);
        if (['walk', 'hop'].includes(v.behavior)) assert.ok(B.Physics.landKind(B.World.tile(Math.floor(v.x / 32), Math.floor((v.y + v.footOffset) / 32)), { glow: true }) > 0, 'visitor stays on its garden floor');
      }
    }
  }
  // A real friendship bubble makes a visitor giggle and passes through;
  // visitors cannot block the garden's collectible buds/music flowers.
  place('ng', 27, 31); tick();
  const v = P.homeVisitors.find(v => v.room === 'ng' && v.behavior !== 'dangle');
  v.petCd = 0;
  B.Bubbles.clear(); B.Bubbles.blow(v.x - 3, v.y + v.hop, 1, 0, save.cat);
  tick(); assert.equal(B.Bubbles.list.length, 1); assert.ok(v.petCd > 0);
  B.Bubbles.clear(); place('nr', 6, 16);
  const bud = P.ents.nr.things.find(th => th.type === 'bud');
  const overlapping = P.homeVisitors.find(visitor => visitor.room === 'nr' && visitor.behavior === 'walk');
  Object.assign(overlapping, { x: bud.x, y: bud.y, homeX: bud.x, homeY: bud.y, hop: 0, hopV: 0 });
  B.Bubbles.blow(bud.x - 3, bud.y, 1, 0, save.cat); tick();
  assert.ok(overlapping.petCd > 0); assert.equal(save.buds[bud.key], 1); assert.equal(B.Bubbles.list.length, 0);
  assert.equal(Object.keys(save.friends).length, 65); assert.equal(save.heartsSpent, 1);
  P.writeSave(); B.Save.load(); B.Main.set('play', {}); P = B.Play; save = P.save;
  assert.equal(P.homeVisitors.length, 65); assert.equal(P.gardenFun, null);
  assert.equal(save.heartsSpent, 1); assert.equal(Object.keys(save.friends).length, 65);
  console.log('✓ all 65 visitors play every game twice; safe floors/reload, no added cost/hearts, and bubbles still reach buds');
  // Visibility is separate from invitations and collected hearts.
  // There is just one switch, for the currently selected critter type.
  place('ng', 24, 31); tick(B.Links.HOLD + 15);
  const firstKind = P.gardenChoice.kinds[0], count = P.homeVisitors.filter(v => v.kind === firstKind).length;
  tick(1, ['Enter']); tick(); assert.equal(save.hiddenResidents[firstKind], 1);
  assert.equal(P.homeVisitors.length, 65 - count); assert.equal(save.residents[firstKind], 1);
  assert.equal(save.heartsSpent, 1); assert.equal(Object.keys(save.friends).length, 65);
  P.closeGardenChoice(); P.writeSave(); B.Save.load(); B.Main.set('play', {}); P = B.Play; save = P.save;
  assert.equal(save.hiddenResidents[firstKind], 1); assert.equal(P.homeVisitors.length, 65 - count);
  place('ng', 24, 31); tick(B.Links.HOLD + 15); tick(1, ['Enter']); tick(); assert.equal(P.homeVisitors.length, 65);
  tick(1, ['ArrowUp']); tick(); assert.equal(P.homeVisitors.length, 65);
  B.Input.pointers.push({ x: 610, y: 390 }); tick(); assert.equal(P.homeVisitors.length, 65, 'old All location has no action');
  tick(1, ['Enter']); tick(); assert.equal(P.homeVisitors.length, 65 - count);
  B.Input.pointers.push({ x: 500, y: 390 }); tick(); assert.equal(P.homeVisitors.length, 65, 'the whole visible slider is tappable');
  assert.equal(save.heartsSpent, 1); P.closeGardenChoice();
  console.log('✓ individual garden switches persist; no All action, extra costs or lost rescued progress');
  // Leaving in the middle restores the adventure music and visitor homes.
  place('nr', 10, 31); tick(B.Links.HOLD + 15); assert.equal(P.gardenFun.kind, 'dance');
  place('hm', 40, 32); tick(); assert.equal(P.gardenFun, null); assert.equal(B.Music.wanted, B.ZONES[P.room.zone].key);
  console.log('✓ walking away from outdoor play ends it safely and restores the current room music');
}
if (require.main === module) check(bootGame());
module.exports = { check };
