#!/usr/bin/env node
// Every reward's own progress, activity unlocks, clothing and replay persistence.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');
const plain = value => JSON.parse(JSON.stringify(value));

function check(g) {
  const { BB: B } = g;
  const all = B.Wardrobe.LIST.concat(B.Cosmetics.LIST);
  assert.equal(B.Wardrobe.LIST.filter(a => a.slot === 'face').length, 8);
  assert.equal(B.Wardrobe.LIST.filter(a => a.slot === 'neck').length, 8);
  assert.equal(B.Cosmetics.LIST.filter(a => a.slot === 'trail').length, 4);
  assert.equal(new Set(all.map(a => a.id)).size, all.length);
  B.World.build();
  const available = {
    buds: B.World.findThings('o').length,
    songs: B.World.rooms.filter(r => r.things.some(th => th.ch === 'V')).length,
    toys: new Set(B.World.rooms.filter(r => r.def.toy).map(r => r.def.toy)).size,
    family: B.Home.familyOrder().length,
    gestures: B.Gestures.LIST.length,
    bosses: B.World.rooms.filter(r => r.def.boss || r.things.some(th => th.ch === 'K')).length,
    rainbow: 1,
    kin: B.RAINBOW_KIN.length, // six in the world and Mama in the replay maze
  };
  assert.equal(B.World.findThings('@').length + 1, B.RAINBOW_KIN.length);
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  available.friends = B.World.rooms.flatMap(r => B.Play.ents[r.id].bugs).length;
  for (const item of all.filter(a => a.unlock)) assert.ok(available[item.unlock.kind] >= item.unlock.count, item.id + ' is achievable with the actual game content');
  const stars = n => Object.fromEntries(Array.from({ length: n }, (_, i) => ['star-' + i, 1]));
  for (const item of all.filter(a => Number.isFinite(a.stars))) {
    const save = B.Save.fresh();
    for (const found of [0, Math.floor(item.stars / 2), Math.max(0, item.stars - 1), item.stars, item.stars + 10]) {
      save.sparkles = stars(found);
      assert.equal(B.Economy.progress(save, item), item.stars ? Math.min(1, found / item.stars) : 1, item.id);
      assert.equal(B.Economy.unlocked(save, item), found >= item.stars, item.id);
    }
  }
  const rich = B.Save.fresh(); rich.sparkles = stars(500); B.Economy.milestones(rich);
  for (const item of all.filter(a => a.discover || a.boss)) {
    assert.equal(B.Economy.unlocked(rich, item), false);
    assert.equal(B.Economy.progress(rich, item), 0, item.id + ' stays empty until found');
    rich.outfits[item.id] = 1; assert.equal(B.Economy.progress(rich, item), 1);
  }
  // Test the drawn width too: an empty bar must not leave rounded gold caps.
  const fills = [], c = { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, quadraticCurveTo() {}, closePath() {}, fill() {}, clip() {},
    fillRect(x, y, w) { fills.push(w); } };
  const fresh = B.Save.fresh(); fresh.sparkles = stars(100);
  B.Economy.progressBar(c, fresh, B.Wardrobe.BY.scuba, 0, 0, 220); assert.equal(fills.pop(), 110);
  B.Economy.progressBar(c, rich, { id: 'unfound', discover: 'garden' }, 0, 0, 220); assert.equal(fills.pop(), 0);
  console.log('✓ exactly 8 glasses, 8 collars and 4 trails; all bars use their own goal and only earned items fill completely');

  for (const item of all.filter(a => a.unlock)) {
    const save = B.Save.data = B.Save.fresh(), goal = item.unlock;
    const owner = item.slot === 'trail' || item.slot === 'bubble' ? 'purchases' : 'outfits';
    if (goal.kind !== 'rainbow') {
      for (let i = 0; i < goal.count - 1; i++) save[goal.kind]['found-' + i] = 1;
      save[goal.kind].unfound = 0;
    }
    assert.equal(B.Economy.unlocked(save, item), false); assert.equal(B.Economy.progress(save, item), (goal.count - 1) / goal.count);
    B.Save.write(); assert.equal(save[owner][item.id], undefined);
    if (goal.kind === 'rainbow') save.rainbowUnlocked = true;
    else save[goal.kind]['found-last'] = 1;
    const before = plain({ sparkles: save.sparkles, friends: save.friends, family: save.family, bosses: save.bosses, heartsSpent: save.heartsSpent });
    B.Save.write(); assert.equal(save[owner][item.id], 1); assert.equal(B.Economy.progress(save, item), 1);
    assert.deepEqual(plain({ sparkles: save.sparkles, friends: save.friends, family: save.family, bosses: save.bosses, heartsSpent: save.heartsSpent }), before);
    B.Save.load(); assert.equal(B.Save.data[owner][item.id], 1);
    if (goal.kind === 'rainbow') B.Save.data.rainbowUnlocked = false;
    else B.Save.data[goal.kind] = {};
    assert.equal(B.Economy.progress(B.Save.data, item), 1, 'earned progress never goes backwards');
  }
  console.log('✓ flower/family/critter/toy/song/trick/rainbow/boss rewards earn once when saved and survive Continue');

  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
  const save = B.Save.data; save.sparkles = stars(300);
  for (const item of all.filter(a => a.unlock)) {
    if (item.unlock.kind === 'rainbow') save.rainbowUnlocked = true;
    else for (let i = 0; i < item.unlock.count; i++) save[item.unlock.kind]['goal-' + i] = 1;
  }
  for (const item of all.filter(a => a.discover || a.boss)) save.outfits[item.id] = 1;
  B.Main.set('play', {}); B.Play.openWardrobe(); B.Play.wardrobe.t = 20;
  for (const [tab, slot] of [[1, 'neck'], [2, 'face'], [4, 'trail']]) {
    B.Play.wardrobeTab(tab);
    assert.equal(B.Play.wardrobeItems().length, slot === 'trail' ? 4 : 8);
    B.Play.wardrobeItems().forEach((item, i) => { B.Play.toggleOutfit(i); assert.equal(slot === 'trail' ? save.cosmetics.trail : save.wear[slot], slot === 'trail' ? item.value : item.id); });
  }
  const outfits = plain(save.outfits), styles = plain(save.purchases);
  for (let cycle = 1; cycle <= 3; cycle++) {
    B.Save.data.mazeSolved = true;
    assert.equal(B.Save.rainbowReplay(), true); B.Save.load();
    assert.equal(B.Save.data.replayCount, cycle);
    assert.deepEqual(plain(B.Save.data.outfits), outfits); assert.deepEqual(plain(B.Save.data.purchases), styles);
    for (const item of all) assert.equal(B.Economy.progress(B.Save.data, item), 1, item.id + ' retained through replay ' + cycle);
    assert.equal(B.Save.data.cosmetics.trail, 'heart'); assert.equal(B.Save.data.heartsSpent, 0);
  }
  console.log('✓ every new item can be worn; all unlocked clothing/styles and full bars persist through three Rainbow replays');
}

function activities(g) {
  const { BB: B, storage } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  const ctx = B.Play.ctx(), save = B.Play.save;
  const recorded = () => JSON.parse(storage.get('bubblebug_kingdom_v2'));
  const buds = B.World.rooms.flatMap(r => B.Play.ents[r.id].things).filter(th => th.type === 'bud');
  assert.equal(buds.length, 4);
  buds.forEach((bud, i) => {
    assert.equal(B.Things.target(bud, ctx).hit(), true);
    assert.equal(recorded().buds[bud.key], 1, 'even a single flower persists before opening its gate');
    assert.equal(B.Economy.progress(save, B.Wardrobe.BY.flowerframes), (i + 1) / 4);
  });
  assert.equal(recorded().outfits.flowerframes, 1);
  const songs = B.World.rooms.filter(r => r.things.some(th => th.ch === 'V'));
  assert.equal(songs.length, 2);
  for (const [i, room] of songs.entries()) {
    const things = ctx.entsOf(room), stone = things.find(th => th.type === 'stone');
    g.place(room.id, (stone.x - room.px) / B.CFG.TILE - 0.5, (stone.y - room.py) / B.CFG.TILE);
    const songCtx = B.Play.ctx();
    // Let the real singing-stone update reach its listening phase.
    for (let frame = 0; frame < 250 && stone.phase !== 'listen'; frame++) B.Puzzles.update(stone, songCtx);
    assert.equal(stone.phase, 'listen');
    for (const note of stone.seq) {
      const bell = things.find(th => th.type === 'bell' && th.idx === note);
      assert.equal(B.Things.target(bell, songCtx).hit(), true);
    }
    assert.equal(recorded().songs[room.id], 1, 'song saves before its delayed gate celebration');
    assert.equal(B.Economy.progress(save, B.Wardrobe.BY.pearls), (i + 1) / 2);
  }
  assert.equal(recorded().outfits.pearls, 1);
  B.Save.load(); B.Main.set('play', {});
  assert.equal(B.Play.save.outfits.flowerframes, 1); assert.equal(B.Play.save.outfits.pearls, 1);
  assert.equal(B.Play.save.starsSpent, 0); assert.equal(B.Play.save.heartsSpent, 0);
  console.log('✓ real flower hits and both bell-song sequences save their new rewards immediately, including before gate animations');
}

function render(g, dir) {
  const { BB: B, tick, place } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  const save = B.Play.save;
  for (let i = 0; i < 250; i++) save.sparkles['star-' + i] = 1;
  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(B.Links.HOLD + 20); B.Play.zoneCard = 0;
  fs.mkdirSync(dir, { recursive: true });
  const texts = [], realText = B.G.text;
  B.G.text = function (s, ...args) { texts.push(String(s)); return realText.call(this, s, ...args); };
  const realDrawWardrobe = B.Play.drawWardrobe;
  B.Play.drawWardrobe = function (c, t) {
    texts.length = 0; realDrawWardrobe.call(this, c, t);
    assert.ok(texts.every(s => !/\d/.test(s)), 'wardrobe contains no numeric prices/progress: ' + texts.join(', '));
  };
  const shot = (name, tab, id) => {
    B.Play.wardrobeTab(tab); B.Play.wardrobe.sel = B.Play.wardrobeItems().findIndex(a => a.id === id);
    B.G.begin(); B.Play.draw(B.G.ctx);
    fs.writeFileSync(path.join(dir, name + '.png'), B.G.canvas.toBuffer('image/png'));
  };
  shot('hidden-glasses-empty', 2, 'googly');
  shot('heart-glasses-progress', 2, 'heartshades');
  save.buds = { a: 1, b: 1 }; shot('flower-glasses-half', 2, 'flowerframes');
  save.toys = { yarn: 1 }; shot('bow-tie-progress', 1, 'bowtie');
  shot('eight-collars', 1, 'pearls'); shot('four-trails', 4, 'trail-heart');
  for (const item of B.Wardrobe.LIST) save.outfits[item.id] = 1;
  save.rainbowUnlocked = true; B.Economy.milestones(save);
  for (const item of B.Cosmetics.LIST) save.purchases[item.id] = 1;
  for (const item of B.Wardrobe.LIST.filter(a => a.unlock || a.id === 'heartshades')) {
    shot('wear-' + item.id, item.slot === 'neck' ? 1 : 2, item.id);
  }
  shot('four-trails-unlocked', 4, 'trail-heart');
  B.G.text = realText;
  B.Play.drawWardrobe = realDrawWardrobe;
  console.log('✓ rendered new accessories, locked/partial/earned bars and all wardrobe categories with no reward numbers');
}
if (require.main === module) {
  check(bootGame());
  activities(bootGame());
  const dir = process.argv[2];
  if (dir) {
    const { createCanvas } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas'));
    render(bootGame(createCanvas), dir);
  }
}
module.exports = { check, activities, render };
