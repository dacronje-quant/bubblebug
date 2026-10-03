#!/usr/bin/env node
// Exercise hidden clothes and three real maze -> cloud -> replay cycles,
// including reload, carried skills, rebuilt entities and fresh gate state.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');
const { walkMaze } = require('./test-maze');
const plain = value => JSON.parse(JSON.stringify(value));

function discoveries(g) {
  const { BB: B, place, tick } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  const save = B.Play.save;
  place('g2', 4, 14); tick(40, ['ArrowRight']); tick();
  assert.equal(save.glassesFound.googly, undefined, 'the old Ladybug Hill spot is empty');
  assert.equal(B.World.findThings('a').filter(th => th.item === 'googly').length, 1, 'one original pair in the world');
  place('nr', 3, 16);
  for (const bud of B.Play.ents.nr.things.filter(th => th.type === 'bud')) {
    B.Bubbles.blow(bud.x - 12, bud.y, 1, 0, B.Play.pl.cat); tick(60);
  }
  assert.equal(save.gates.nr, 1);
  place('nr', 25, 16); tick();
  assert.equal(save.glassesFound.googly, 1); assert.equal(save.wear.face, 'googly');
  place('c6', 3, 10); tick();
  assert.equal(save.glassesFound.disguise, 1); assert.equal(save.wear.face, 'disguise');
  save.abilities.swim = true; place('l5', 17, 29); tick();
  assert.equal(save.glassesFound.starshades, 1); assert.equal(save.wear.face, 'starshades');
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', {});
  for (const id of ['googly', 'disguise', 'starshades']) {
    assert.equal(B.Play.save.outfits[id], 1); assert.equal(B.Play.save.glassesFound[id], 1);
  }
  assert.equal(B.Play.save.wear.face, 'starshades');
  assert.equal(B.Play.save.starsSpent, 0);
  // (the three glasses are gone; the other hidden things still wait in the world)
  assert.equal(B.World.rooms.flatMap(r => B.Play.ents[r.id].things).some(th => th.type === 'glasses' && ['googly', 'disguise', 'starshades'].includes(th.item)), false);
  // All boss presents join their clothing category; hats use two pages.
  for (const item of B.Wardrobe.LIST.filter(a => a.boss)) B.Play.save.outfits[item.id] = 1;
  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(B.Links.HOLD + 15);
  B.Play.wardrobeTab(0); assert.equal(B.Play.wardrobeItems().length, 15);
  B.Input.pointers.push({ x: 647, y: 333 }); tick(); assert.equal(B.Play.wardrobe.sel, 8);
  assert.ok(B.Play.wardrobeItems().slice(8).every(item => item.slot === 'head'));
  B.Play.wardrobeTab(1); assert.equal(B.Play.wardrobeItems().length, 8);
  B.Play.wardrobeTab(2); assert.equal(B.Play.wardrobeItems().length, 8);
  for (const id of ['googly', 'disguise', 'starshades']) {
    const index = B.Play.wardrobeItems().findIndex(a => a.id === id);
    B.Play.toggleOutfit(index); assert.equal(B.Play.save.wear.face, id);
  }
  tick(1, ['ArrowUp']); tick(); tick(1, ['ArrowUp']); tick(); assert.equal(B.Play.wardrobe.focus, 'tabs');
  B.Play.closeWardrobe();
  console.log('✓ all hidden glasses save in Glasses; every boss gift is reachable in Hats or Necklaces');
  return g;
}

function cycles(g) {
  const { BB: B, tick, place, storage } = g;
  const abilities = Object.fromEntries(Object.keys(B.Save.fresh().abilities).map(key => [key, true]));
  B.Settings.setDifficulty('hard');
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
  Object.assign(B.Save.data, { abilities, outfits: { googly: 1, wizard: 1 }, wear: { head: 'wizard', face: 'googly' }, gestures: { twirl: 1 }, cosmetics: { bubble: 'classic', trail: 'rainbow' } });
  B.Main.set('play', {});
  assert.equal(B.Save.rainbowReplay(), false);
  for (let cycle = 1; cycle <= 3; cycle++) {
    let save = B.Play.save;
    // Completed adventure fixture, rebuilt through the real scene. The
    // route proof separately reaches every boss/puzzle from a fresh home.
    B.Home.familyOrder().forEach(id => { save.family[id] = 1; }); save.finale = true;
    for (const room of B.World.rooms) {
      if (room.def.boss || room.things.some(th => th.ch === 'K')) save.bosses[room.id] = 1;
      if (room.grid.some(row => row.includes('G'))) save.gates[room.id] = 1;
      for (const bug of B.Play.ents[room.id].bugs) save.friends[bug.key] = bug.kind;
    }
    for (const th of B.World.findThings('*').slice(0, 260)) save.sparkles[th.tx + ',' + th.ty] = 1;
    save.purchases['resident-bunny'] = 1; save.residents.bunny = 1;
    save.purchases['heart-fountain'] = 1; save.heartsSpent = 2; save.fountainUses = 3;
    save.keys.old = 1; save.songs.old = 1; save.babies.old = 1; save.secrets.g2 = 1;
    save.bench = { x: 100, y: 100 }; save.glassesFound.googly = 1;
    B.Play.writeSave(); B.Main.set('play', {}); save = B.Play.save;
    assert.equal(B.Play.ents.g6.bosses[0].state, 'happy');
    place('nm', 21, 32); tick(B.Links.HOLD + 15); tick(1, ['Enter']); tick();
    assert.ok(B.Play.maze);
    for (const pad of B.GardenMaze.ORDER) walkMaze(g, pad);
    walkMaze(g, B.GardenMaze.PRIZE); assert.equal(save.mazeSolved, true); assert.equal(save.rainbowUnlocked, true);
    // Back out of character choice; the rescue has already been earned.
    tick(12); tick(1, ['Escape']); tick(); B.Play.closeMaze();
    // the replay cloud waits until Rainbow's whole family is home (kept through replays)
    for (const id of B.RAINBOW_KIN) save.kin[id] = 1;
    place('nm', 6, 32); tick(B.Links.HOLD + 15);
    assert.equal(B.Play.portalChoice.kind, 'cloud'); assert.equal(B.Play.portalChoice.focus, 1);
    const unchanged = B.Save.data;
    tick(1, ['Enter']); tick(); assert.equal(B.Play.portalChoice, null); assert.equal(B.Save.data, unchanged);
    assert.equal(B.Save.data.replayCount, cycle - 1);
    place('nm', 21, 32); tick(); place('nm', 6, 32); tick(B.Links.HOLD + 15);
    tick(1, ['ArrowLeft']); tick(); tick(50, ['Enter']); tick();
    save = B.Play.save;
    assert.equal(B.Main.name, 'play'); assert.equal(B.Save.data, save);
    assert.equal(save.replayCount, cycle); assert.equal(save.cat, 'rainbow'); assert.equal(B.Play.pl.cat, 'rainbow');
    assert.equal(save.rainbowUnlocked, true); assert.equal(save.mazeSolved, false); assert.equal(save.inMaze, false);
    assert.deepEqual(plain(save.abilities), abilities);
    assert.equal(save.outfits.googly, 1); assert.equal(save.wear.face, 'googly'); assert.equal(save.gestures.twirl, 1);
    assert.equal(save.cosmetics.trail, 'rainbow'); // earned at 250 stars in the old run
    for (const field of ['family', 'sparkles', 'friends', 'toys', 'buds', 'gates', 'bosses', 'pads', 'babies', 'keys', 'songs', 'secrets', 'residents', 'glassesFound']) assert.deepEqual(plain(save[field]), {}, field + ' starts over');
    assert.equal(save.purchases['heart-fountain'], undefined); assert.equal(save.purchases['resident-bunny'], undefined);
    assert.equal(save.heartsSpent, 0); assert.equal(save.starsSpent, 0); assert.equal(save.fountainUses, 0);
    assert.notDeepEqual(plain(save.bench), { x: 100, y: 100 });
    if (save.bench) assert.equal(B.World.roomAtPx(save.bench.x + 10, save.bench.y + 12).id, 'hm');
    assert.equal(save.finale, false); assert.equal(B.Play.party, null);
    assert.equal(B.Play.maze, null); assert.equal(B.Play.portalChoice, null); assert.equal(B.Play.homeVisitors.length, 0);
    assert.ok(B.World.byId.g6.grid.some(row => row.includes('G')));
    assert.notEqual(B.Play.ents.g6.bosses[0].state, 'happy');
    assert.ok(B.World.rooms.flatMap(r => B.Play.ents[r.id].bugs).every(b => b.state === 'gloomy'));
    assert.equal(B.RainbowJourney.unlocked(save, 'rainbow'), false); assert.equal(B.RainbowJourney.unlocked(save, 'cloud'), false);
    assert.equal(B.Play.wardrobeTabs(), 6); // permanent rescued character choice
    assert.equal(B.Settings.difficulty, 'hard');
    tick(400); assert.equal(B.Play.intro, null); assert.equal(save.introDone, 1);
    B.Play.writeSave(); assert.ok(storage.get('bubblebug_kingdom_v2'));
    B.Save.load(); B.Main.set('play', {}); save = B.Play.save;
    assert.equal(save.replayCount, cycle); assert.equal(save.cat, 'rainbow'); assert.deepEqual(plain(save.abilities), abilities);
    assert.notEqual(B.Play.ents.g6.bosses[0].state, 'happy');
    // Clothes are retained, but their hidden pickups can be found anew.
    B.World.openGates(B.World.byId.nr);
    place('nr', 25, 16); tick(); assert.equal(save.glassesFound.googly, 1);
  }
  console.log('✓ three maze/rescue/cloud/replay cycles rebuild every run, survive reload and retain skills/clothes');
  return g;
}

if (require.main === module) {
  discoveries(bootGame()); cycles(bootGame());
  // Old completed maze saves keep their character, and old maze positions
  // remain resumable through the new interaction-based entrance.
  const old = { ...bootGame().BB.Save.fresh(), v: 7, cat: 'rainbow', mazeSolved: true, room: 'hm', introDone: 1 };
  const migrated = bootGame(null, { storage: [['bubblebug_kingdom_v2', JSON.stringify(old)]] });
  migrated.BB.Main.set('play', {});
  assert.equal(migrated.BB.Play.save.v, 9); assert.equal(migrated.BB.Play.save.rainbowUnlocked, true);
  assert.equal(migrated.BB.Play.pl.cat, 'rainbow');
  console.log('✓ v7 rescues migrate without losing the unlocked Rainbow character');
  const legacy = bootGame(), L = legacy.BB; L.World.build();
  const active = L.Save.fresh(), mazeRoom = L.World.byId.nm, pad = L.GardenMaze.PADS[0];
  Object.assign(active, { v: 7, cat: 'phoebe', room: 'nm', x: (mazeRoom.x + 28) * 32 + 6, y: (mazeRoom.y + 32) * 32 - 24,
    finale: true, introDone: 1, mazePosition: { x: pad.x, y: pad.y } });
  L.Home.familyOrder().forEach(id => { active.family[id] = 1; });
  active.pads[pad.key] = 1; active.sparkles[L.GardenMaze.starKey(0)] = 1;
  const resumed = bootGame(null, { storage: [['bubblebug_kingdom_v2', JSON.stringify(active)]] }), R = resumed.BB;
  R.Main.set('play', {});
  assert.ok(R.Play.maze); assert.equal(R.Play.save.inMaze, true);
  assert.equal(R.Play.maze.x, pad.x); assert.equal(R.Play.maze.y, pad.y);
  assert.equal(R.Play.save.pads[pad.key], 1); assert.equal(R.Play.save.sparkles[R.GardenMaze.starKey(0)], 1);
  assert.deepEqual(plain(R.Play.save.family), plain(active.family));
  R.Play.closeMaze(); assert.equal(R.Play.room.id, 'nm'); assert.equal(R.Play.save.inMaze, false);
  const partial = L.Save.data = L.Save.fresh();
  Object.assign(partial, { mazeSolved: true, rainbowUnlocked: true, abilities: { doubleJump: true, wallClimb: true } });
  assert.equal(L.Save.rainbowReplay(), true); assert.equal(L.Save.data.abilities.doubleJump, true);
  assert.equal(L.Save.data.abilities.wallClimb, true); assert.equal(L.Save.data.abilities.wings, false);
  console.log('✓ active v7 maze saves resume with their stars/pads; replays carry exactly the learned skills');
  const dir = process.argv[2];
  if (dir) {
    const { createCanvas } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas'));
    const g = bootGame(createCanvas, { hash: '#play=phoebe&room=hm&demo=rewards' }), B = g.BB;
    B.Play.iris = null; B.G.begin();
    fs.mkdirSync(dir, { recursive: true });
    g.place('nm', 21, 32); B.Play.draw(B.G.ctx); fs.writeFileSync(path.join(dir, 'rainbow-path.png'), B.G.canvas.toBuffer('image/png'));
    g.tick(B.Links.HOLD + 15); B.Play.draw(B.G.ctx); fs.writeFileSync(path.join(dir, 'rainbow-entry.png'), B.G.canvas.toBuffer('image/png'));
    B.Play.closeJourneyChoice(); B.Play.save.mazeSolved = true; B.Play.save.rainbowUnlocked = true;
    g.place('nm', 6, 32); g.tick(B.Links.HOLD + 15); B.Play.draw(B.G.ctx); fs.writeFileSync(path.join(dir, 'cloud-replay.png'), B.G.canvas.toBuffer('image/png'));
    B.Play.closeJourneyChoice(); B.Play.pl.cat = B.Play.save.cat = 'rainbow';
    B.Play.save.wear = { head: null, neck: null, face: null };
    for (const item of B.Wardrobe.LIST) if (item.boss || item.discover) B.Play.save.outfits[item.id] = 1;
    g.place('hm', B.Home.MIRROR_COL - 0.5, 32); g.tick(B.Links.HOLD + 15); B.Play.wardrobeTab(2);
    B.Play.wardrobe.sel = B.Play.wardrobeItems().findIndex(item => item.id === 'googly');
    B.Play.draw(B.G.ctx); fs.writeFileSync(path.join(dir, 'mirror-glasses.png'), B.G.canvas.toBuffer('image/png'));
  }
}
module.exports = { discoveries, cycles };
