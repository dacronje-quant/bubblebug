#!/usr/bin/env node
// Regression checks for star milestones, real scene inputs and save/reload.
// Uses the same game boot harness as the neighbourhood checks.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');

function checks(g) {
  const { BB: B, tick, keys, place, storage } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  let save = B.Play.save;
  const tap = (x, y) => { B.Input.pointers.push({ x, y }); tick(); };
  for (const th of B.World.findThings('*').slice(0, 250)) save.sparkles[th.tx + ',' + th.ty] = 1;
  for (const bug of B.World.rooms.flatMap(r => B.Play.ents[r.id].bugs).slice(0, 8)) save.friends[bug.key] = 1;
  const stars = JSON.stringify(save.sparkles), hearts = JSON.stringify(save.friends);

  // The mirror opens through its actual paw ring; entry never spends.
  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(50);
  assert.ok(B.Play.wardrobe); assert.equal(save.starsSpent, 0);
  tick(45, ['KeyX']); assert.equal(save.starsSpent, 0); assert.equal(save.wear.head, 'partyhat');
  tick(); tick(1, ['KeyX']); assert.equal(save.starsSpent, 0); assert.equal(save.wear.head, null);
  tick();
  tap(621, 88); assert.equal(B.Play.wardrobe.tab, 1);
  tap(593, 246); assert.equal(save.starsSpent, 0); // preview a milestone item
  tap(593, 246); assert.equal(save.starsSpent, 0); assert.equal(save.cosmetics.trail, 'rainbow');
  tap(593, 246); assert.equal(save.starsSpent, 0);
  tap(769, 150); tap(769, 150); assert.equal(save.starsSpent, 0); assert.equal(save.cosmetics.bubble, 'flower');
  tap(505, 88); tap(681, 150); tap(681, 150);
  assert.equal(save.starsSpent, 0); assert.equal(save.outfits.wizard, 1);
  assert.equal(B.Economy.balance(save, 'stars'), 250);
  assert.equal(JSON.stringify(save.sparkles), stars); assert.equal(JSON.stringify(save.friends), hearts);
  // Up focuses categories and must never equip, despite its jump binding.
  const headBefore = save.wear.head;
  tick(1, ['ArrowUp']); assert.equal(B.Play.wardrobe.focus, 'tabs'); assert.equal(save.wear.head, headBefore); tick();
  tick(1, ['ArrowRight']); assert.equal(B.Play.wardrobe.tab, 1); tick();
  tick(1, ['ArrowRight']); assert.equal(B.Play.wardrobe.tab, 2); tick();
  tick(1, ['ArrowLeft']); assert.equal(B.Play.wardrobe.tab, 1); tick();
  tick(1, ['ArrowDown']); assert.equal(B.Play.wardrobe.focus, 'items'); tick();
  tap(505, 88); tap(769, 246); tap(769, 246); assert.equal(save.wear.face, 'scuba');
  tap(776, 438); assert.equal(B.Play.wardrobe, null);
  tick(150); assert.equal(B.Play.wardrobe, null); // no automatic reopen while standing still
  B.Save.load(); B.Main.set('play', {}); save = B.Play.save;
  assert.equal(save.starsSpent, 0); assert.equal(save.cosmetics.bubble, 'flower');
  assert.equal(save.cosmetics.trail, 'rainbow'); assert.equal(save.outfits.partyhat, 1);
  assert.equal(B.Economy.balance(save, 'stars'), 250); assert.equal(save.wear.face, 'scuba');
  console.log('✓ star milestones, free reuse, keyboard category focus, scuba mask and reload');

  // Invitations require an earned species and one heart, exactly once.
  const visitorCount = () => B.World.rooms.flatMap(r => B.Play.ents[r.id].bugs).filter(b => save.friends[b.key] && save.residents[b.kind]).length;
  place('ng', 16, 31); tick(50); assert.equal(B.Play.gardenChoice.kind, 'friends');
  assert.equal(save.heartsSpent, 0); assert.equal(B.Play.homeVisitors.length, 0);
  tick(50, ['KeyX']); assert.equal(save.heartsSpent, 1); assert.equal(B.Play.homeVisitors.length, visitorCount());
  tick(); tick(1, ['KeyX']); assert.equal(save.heartsSpent, 1); tick();
  tick(1, ['ArrowRight']); tick(); tick(1, ['KeyX']); tick();
  assert.equal(save.heartsSpent, 2); assert.equal(B.Play.homeVisitors.length, visitorCount());
  tick(1, ['Escape']); tick(); assert.equal(B.Play.gardenChoice, null); assert.equal(B.Main.scene, B.Play);
  place('ng', 4, 31); tick(240); assert.equal(save.heartsSpent, 2);
  assert.equal(JSON.stringify(save.friends), hearts);
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', {}); save = B.Play.save;
  assert.equal(B.Play.homeVisitors.length, visitorCount()); assert.equal(save.heartsSpent, 2);
  console.log('✓ heart invitations charge once; petting and reloading never duplicate hearts');

  // A held button is one toss. The first costs one heart; repeats are free,
  // visible in the world, and never reopen a choice until you step away.
  place('hm', 24, 32); tick(50); assert.equal(B.Play.gardenChoice.kind, 'fountain');
  assert.equal(save.heartsSpent, 2); tick(240, ['KeyX']);
  assert.equal(save.heartsSpent, 3); assert.equal(save.fountainUses, 1); assert.equal(save.gestures.twirl, 1);
  assert.equal(B.Play.gardenChoice, null);
  for (let i = 0; i < 5; i++) {
    place('hm', 21, 32); tick(); place('hm', 24, 32); tick(50); assert.ok(B.Play.gardenChoice);
    tick(130, ['KeyX']); assert.equal(B.Play.gardenChoice, null);
  }
  assert.equal(save.heartsSpent, 3); assert.equal(save.fountainUses, 6);
  // An exhausted wallet can still use an owned fountain.
  save.heartsSpent = 8;
  place('hm', 21, 32); tick(); place('hm', 24, 32); tick(50); tick(130, ['KeyX']);
  assert.equal(save.heartsSpent, 8); assert.equal(save.fountainUses, 7);
  assert.equal(B.Economy.balance(save, 'hearts'), 0); assert.equal(JSON.stringify(save.friends), hearts);
  B.Save.load(); assert.equal(B.Save.data.fountainUses, 7); assert.equal(B.Save.data.gestures.twirl, 1);
  B.Main.set('play', {}); save = B.Play.save; place('ng', 10, 31);
  tick(1, ['ArrowDown']); assert.equal(B.Play.pl.gesture.id, 'twirl');
  tick(130); assert.equal(B.Play.pl.gesture, null);
  console.log('✓ fountain unlocks once, repeats freely, shows its party, and saves its extra trick');

  // A new sparkle still increases both collection progress and spending balance.
  const prize = B.Play.ents.ng.things.find(th => th.type === 'sparkle' && !save.sparkles[th.key]);
  assert.ok(prize); const previous = B.Economy.balance(save, 'stars');
  B.Play.pl.body.x = prize.x - 10; B.Play.pl.body.y = prize.y - 12; tick();
  assert.equal(save.sparkles[prize.key], 1); assert.equal(B.Economy.balance(save, 'stars'), previous + 1);
  // Mixed keyboard bindings must stay held until their last key is released.
  keys(['ArrowRight', 'KeyD']); B.Input.poll(); assert.equal(B.Input.held.right, true);
  keys(['ArrowRight']); B.Input.poll(); assert.equal(B.Input.held.right, true);
  keys([]); B.Input.poll(); assert.equal(B.Input.held.right, false);
  B.Save.reset(); assert.equal(B.Save.data.starsSpent, 0); assert.deepEqual(Object.keys(B.Save.data.residents), []);
  assert.equal(storage.has('bubblebug_kingdom_v2'), false);
  console.log('✓ new rewards increase the balance; mixed keyboard bindings and New Game work');
}

function movement(g) {
  const B = g.BB, W = B.World, P = B.Physics;
  const oldTile = W.tile, oldRoom = W.roomAtPx;
  const input = extra => Object.assign({ left: false, right: false, jump: false, jumpPressed: false, bubblePressed: false }, extra);
  W.roomAtPx = () => ({ id: 'fixture', zone: 0 });
  try {
    W.tile = (x, y) => y >= 10 ? '#' : '.';
    function arc(easy) {
      const p = P.newBody(0, 320 - 24); p.grounded = true;
      let peak = p.y, land = 0;
      for (let i = 0; i < 100; i++) { const fx = P.step(p, input({ jump: true, jumpPressed: i === 0 }), {}, easy); peak = Math.min(peak, p.y); if (fx & B.FX.LAND) { land = i; break; } }
      return { peak, land };
    }
    const hard = arc(false), easy = arc(true);
    assert.equal(easy.peak, hard.peak); assert.ok(easy.land > hard.land);
    W.tile = (x, y) => y >= 4 && x <= 0 ? '#' : '.';
    function lateJump(easyMode) {
      const p = P.newBody(6, 128 - 24); p.grounded = true;
      for (let i = 0; i < 30; i++) { P.step(p, input({ right: true }), {}, easyMode); if (!p.grounded) break; }
      for (let i = 0; i < 8; i++) P.step(p, input({ right: true }), {}, easyMode);
      return P.step(p, input({ right: true, jump: true, jumpPressed: true }), {}, easyMode);
    }
    assert.equal(!!(lateJump(false) & B.FX.JUMP), false); assert.equal(!!(lateJump(true) & B.FX.JUMP), true);
    W.tile = (x, y) => y >= 4 ? '#' : '.';
    function buffered(easyMode) {
      const p = P.newBody(0, 16); p.vy = 6;
      for (let i = 0; i < 20; i++) if (P.step(p, input({ jump: true, jumpPressed: i === 0 }), {}, easyMode) & B.FX.JUMP) return true;
      return false;
    }
    assert.equal(buffered(false), false); assert.equal(buffered(true), true);
    W.tile = (x, y) => y >= 4 && x === 0 ? '#' : '.';
    const edge = easyMode => { const p = P.newBody(33, 104); P.step(p, input(), {}, easyMode); return p.grounded; };
    assert.equal(edge(false), false); assert.equal(edge(true), true);
    // Edge assistance must not invent platforms along an unbroken wall.
    W.tile = (x, y) => x === 0 || y >= 10 ? '#' : '.';
    for (const mode of [false, true]) {
      const p = P.newBody(33, 296); p.grounded = true;
      for (let i = 0; i < 100; i++) if (P.step(p, input({ jump: true, jumpPressed: i === 0 }), {}, mode) & B.FX.LAND) break;
      assert.ok(Math.abs(p.y - 296) <= 1.5, 'wall sides never become Easy landing surfaces');
    }
    W.tile = (x, y) => y >= (x >= 1 ? 3 : 4) ? '#' : '.';
    const ledge = easyMode => { const p = P.newBody(12, 92); p.vx = 3.6; return P.step(p, input({ right: true }), {}, easyMode); };
    assert.equal(!!(ledge(false) & B.FX.LEDGE), false); assert.equal(!!(ledge(true) & B.FX.LEDGE), true);
    console.log('✓ Easy allows late / buffered jumps and edge / ledge grace without a higher jump');
  } finally { W.tile = oldTile; W.roomAtPx = oldRoom; }
}

function residents(g) {
  const { BB: B, place, tick } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  for (const r of B.World.rooms) for (const b of B.Play.ents[r.id].bugs) B.Play.save.friends[b.key] = 1;
  B.Play.openGardenChoice('friends');
  const kinds = B.Play.gardenChoice.kinds;
  assert.equal(kinds.length, 39);
  for (let i = 0; i < kinds.length; i++) { B.Play.gardenChoice.sel = i; assert.equal(B.Play.chooseGarden(), true); }
  B.Play.closeGardenChoice();
  B.Play.openGardenChoice('fountain'); assert.equal(B.Play.chooseGarden(), true);
  assert.equal(B.Play.save.heartsSpent, 40); assert.equal(B.Economy.balance(B.Play.save, 'hearts'), 25);
  assert.equal(B.Play.homeVisitors.length, 65);
  assert.equal(new Set(B.Play.homeVisitors.map(v => v.sourceKey)).size, 65);
  for (const id of ['ng', 'np', 'nr']) {
    place(id, 28, 31);
    const walking = B.Play.homeVisitors.filter(v => v.room === id && ['walk', 'hop'].includes(v.behavior));
    const ranges = walking.map(v => [v.x, v.x]);
    for (let i = 0; i < 900; i++) {
      tick();
      walking.forEach((v, j) => { ranges[j][0] = Math.min(ranges[j][0], v.x); ranges[j][1] = Math.max(ranges[j][1], v.x); });
    }
    walking.forEach((v, j) => assert.ok(ranges[j][1] - ranges[j][0] > 5, v.kind + ' wanders on its garden floor'));
  }
  console.log('✓ all 65 rescued critters live across the garden; 39 species and the fountain fit the heart budget');
}

function milestones() {
  const g = bootGame(), B = g.BB;
  B.Save.data.introDone = 1; B.Main.set('play', {});
  const stars = B.World.findThings('*');
  const fill = (save, n) => { for (const th of stars.slice(0, n)) save.sparkles[th.tx + ',' + th.ty] = 1; };
  for (const item of B.Wardrobe.LIST.concat(B.Cosmetics.LIST).filter(a => a.stars > 0)) {
    const save = B.Save.fresh(); fill(save, item.stars - 1);
    assert.equal(B.Economy.unlocked(save, item), false, item.id + ' stays locked before its milestone');
    fill(save, item.stars); B.Economy.milestones(save);
    assert.equal(B.Economy.unlocked(save, item), true, item.id + ' unlocks at its milestone');
    assert.equal(save.starsSpent, 0); assert.equal(B.Save.count(save.sparkles), item.stars);
  }
  // A low-star mirror refuses equip but still permits picture previews.
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  B.Play.openWardrobe(); B.Play.toggleOutfit(0);
  assert.equal(B.Play.save.wear.head, null); assert.equal(B.Play.save.starsSpent, 0);
  // Migration keeps earlier purchases, original maze stars, outfits and
  // completion even when their new milestone is higher than the old cost.
  const old = B.Save.fresh(); old.v = 6; old.starsSpent = 30; old.introDone = 1;
  old.finale = true; old.outfits.scuba = 1; old.wear.face = 'scuba';
  old.outfits.wizard = 1; old.wear.head = 'wizard'; old.purchases['trail-rainbow'] = 1;
  old.cosmetics.trail = 'rainbow'; old.gates.nm = 1; old.pads['-173,13'] = 1;
  old.sparkles['-168,13'] = 1; fill(old, 30);
  B.Home.familyOrder().forEach(id => { old.family[id] = 1; });
  const migrated = bootGame(null, { storage: [['bubblebug_kingdom_v2', JSON.stringify(old)]] });
  migrated.BB.Main.set('play', {});
  const s = migrated.BB.Play.save;
  assert.equal(s.v, 8); assert.equal(s.starsSpent, 0); assert.equal(s.outfits.wizard, 1);
  assert.equal(s.purchases['trail-rainbow'], 1); assert.equal(s.cosmetics.trail, 'rainbow');
  assert.equal(s.sparkles['-168,13'], 1); assert.equal(s.pads['-173,13'], 1);
  assert.equal(s.finale, true); assert.equal(migrated.BB.Save.count(s.family), 12);
  assert.equal(migrated.BB.Save.count(s.sparkles), B.Save.count(old.sparkles));
  assert.equal(migrated.BB.Economy.unlocked(s, migrated.BB.Cosmetics.LIST[5]), true);
  console.log('✓ every star threshold, locked previews and v6 owned items/maze stars/completion migrate safely');
}

function render(dir) {
  const { createCanvas } = require('@napi-rs/canvas');
  const g = bootGame(createCanvas), B = g.BB;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  for (const th of B.World.findThings('*').slice(0, 120)) B.Play.save.sparkles[th.tx + ',' + th.ty] = 1;
  for (const bug of B.World.rooms.flatMap(r => B.Play.ents[r.id].bugs).slice(0, 8)) B.Play.save.friends[bug.key] = 1;
  fs.mkdirSync(dir, { recursive: true });
  const shot = name => { B.Play.zoneCard = 0; B.Play.pl.invuln = 0; B.Main.draw(); fs.writeFileSync(path.join(dir, name + '.png'), B.G.canvas.toBuffer('image/png')); };
  g.place('hm', B.Home.MIRROR_COL - 0.5, 32); g.tick(50); shot('mirror-outfits');
  B.Play.wardrobeTab(1); B.Play.wardrobe.sel = 5; shot('mirror-styles'); B.Play.closeWardrobe();
  g.place('ng', 16, 31); g.tick(50); shot('invite'); B.Play.chooseGarden(); shot('invited'); B.Play.closeGardenChoice();
  for (const r of B.World.rooms) if (r.def.family) B.Play.save.family[r.def.family] = 1;
  g.place('hm', 24, 32); g.tick(50); shot('fountain'); B.Play.chooseGarden(); g.tick(15); shot('fountain-party');
  console.log('✓ reward interfaces rendered to ' + dir);
}

if (require.main === module) {
  checks(bootGame()); movement(bootGame()); residents(bootGame()); milestones();
  const normal = JSON.stringify({ v: 4, cat: 'marshmallow', sparkles: { '6,13': 1 } });
  const demo = bootGame(null, { hash: '#play=phoebe&room=hm&demo=rewards', storage: [['bubblebug_kingdom_v2', normal]] });
  assert.equal(demo.BB.Save.preview, true); assert.equal(demo.BB.Economy.balance(demo.BB.Play.save, 'stars'), 250);
  assert.equal(demo.BB.Economy.balance(demo.BB.Play.save, 'hearts'), 65);
  demo.BB.Play.openWardrobe(); demo.BB.Play.toggleOutfit(0); demo.BB.Play.closeWardrobe(); demo.tick(150);
  assert.equal(demo.storage.get('bubblebug_kingdom_v2'), normal);
  demo.BB.Save.reset(); assert.equal(demo.storage.get('bubblebug_kingdom_v2'), normal);
  console.log('✓ one-click reward preview seeds currencies without writing or deleting the normal save');
  const idx = process.argv.indexOf('--render'); if (idx >= 0) render(path.resolve(process.argv[idx + 1]));
}
module.exports = { checks, movement, residents };
