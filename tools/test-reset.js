#!/usr/bin/env node
// Real menus, save replacement, reloads and preview protection for both resets.
'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const KEY = 'bubblebug_kingdom_v2';
const plain = v => JSON.parse(JSON.stringify(v));
function completed(g) {
  const B = g.BB;
  B.World.build();
  const s = B.Save.data = B.Save.fresh();
  B.Home.familyOrder().forEach(id => { s.family[id] = 1; });
  B.RAINBOW_KIN.forEach(id => { s.kin[id] = 1; });
  Object.keys(s.abilities).forEach(id => { s.abilities[id] = true; });
  Object.assign(s, { cat: 'phoebe', mazeSolved: true, rainbowUnlocked: true, kinIntro: 1, cloudMask: 63,
    introDone: 1, leftHome: 1, finale: true, replayCount: 3, fountainUses: 5, heartsSpent: 2,
    outfits: { wizard: 1 }, wear: { head: 'wizard', neck: null, face: null }, gestures: { twirl: 1 },
    purchases: { 'heart-fountain': 1, 'resident-bunny': 1, 'bubble-rainbow': 1 },
    cosmetics: { bubble: 'rainbow', trail: 'rainbow' }, residents: { bunny: 1 }, hiddenResidents: { bunny: 1 },
    voiceStory: { kin_complete: 1, kin_six_home: 1, kin_rbMama: 1, story_homecoming: 1 },
    storyPending: ['kin_rbMama', 'story_family_complete'] });
  for (const th of B.World.findThings('*').slice(0, 260)) s.sparkles[th.tx + ',' + th.ty] = 1;
  for (const r of B.World.rooms) {
    if (r.def.boss) s.bosses[r.id] = 1;
    if (r.grid.some(row => row.includes('G'))) s.gates[r.id] = 1;
  }
  for (const field of ['friends', 'toys', 'buds', 'pads', 'babies', 'keys', 'songs', 'secrets', 'visited', 'doors', 'glassesFound']) s[field].kept = 1;
  B.Save.write(); B.Main.set('play', {}); B.Play.writeSave();
  return B.Save.data;
}
function tap(g, b) { g.BB.Input.pointers.push({ x: b.x, y: b.y }); g.tick(); }
function titleChoice(g) { g.BB.Main.set('title'); g.tick(20); g.BB.Title.choose(1); g.tick(12); }

// Opening either menu, hovering, cancelling and backing out never write a reset.
{
  const g = bootGame(), B = g.BB;
  completed(g); titleChoice(g);
  const saved = g.storage.get(KEY);
  assert.equal(B.Title.confirm.focus, 2);
  const b = B.Title.cbtn(0);
  B.Input.pointerPos = b; B.Input.pointerVersion++; g.tick(30);
  assert.equal(B.Title.confirm.focus, 0); assert.equal(g.storage.get(KEY), saved);
  // The entire card, not just its centre, accepts a tap.
  tap(g, { x: b.x - b.w / 2 + 8, y: b.y + b.h / 2 - 8 });
  assert.equal(B.Title.confirm.stage, 'all'); assert.equal(B.Title.confirm.focus, 1);
  g.tick(12); g.tick(1, ['Enter']); g.tick(12);
  assert.equal(B.Title.confirm, null);
  B.Title.choose(1); g.tick(12); assert.equal(B.Title.confirm.focus, 2);
  g.tick(1, ['Enter']); g.tick(); assert.equal(B.Title.confirm, null);
  assert.equal(g.storage.get(KEY), saved);
  B.Main.set('play', {}); g.place('nm', 6, 32); g.tick(B.Links.HOLD + 15);
  assert.equal(B.Play.portalChoice.focus, 2);
  const before = g.storage.get(KEY);
  g.tick(1, ['Enter']); g.tick(); assert.equal(B.Play.portalChoice, null);
  assert.equal(g.storage.get(KEY), before);
}

// Family-only reset preserves every earned field and restarts the hunt at home.
{
  const g = bootGame(), B = g.BB;
  completed(g); titleChoice(g);
  const old = plain(B.Save.data);
  tap(g, B.Title.cbtn(1)); g.tick(40);
  const next = B.Play.save;
  assert.equal(B.Main.name, 'play'); assert.equal(B.Play.room.id, 'hm');
  assert.equal(B.Play.pl.cat, 'phoebe'); assert.equal(B.Play.intro, null);
  assert.equal(Object.keys(next.kin).length, 0); assert.equal(next.cloudMask, 0);
  assert.ok(B.Play.kinCard); assert.equal(B.RainbowFamily.hunting(next), true);
  assert.equal(B.World.rooms.flatMap(r => B.Play.ents[r.id].things).filter(th => th.type === 'kin').length, 6);
  const changed = new Set(['kin', 'kinIntro', 'cloudMask', 'room', 'x', 'y', 'inMaze', 'mazeReturn', 'voiceStory', 'storyPending', 'playTicks']);
  for (const field of Object.keys(old)) if (!changed.has(field)) assert.deepEqual(plain(next[field]), old[field], field + ' remains earned');
  assert.ok(next.playTicks >= old.playTicks, 'play time keeps accumulating');
  assert.equal(next.voiceStory.kin_complete, undefined); assert.equal(next.voiceStory.story_homecoming, 1);
  assert.ok(next.storyPending.includes('kin_hunt_start')); assert.ok(!next.storyPending.includes('kin_rbMama'));
  assert.equal(B.RainbowJourney.unlocked(next, 'cloud'), false);
  assert.equal(B.RainbowJourney.unlocked(next, 'rainbow'), false);
  B.Save.load(); B.Main.set('play', {});
  assert.equal(B.Play.kinCard, null, 'hunt card only shows once, including reload');
  assert.equal(B.RainbowFamily.count(B.Play.save), 0); assert.equal(B.Play.save.cloudMask, 0);
  assert.equal(B.Play.save.family.grandma, old.family.grandma);
  assert.equal(B.Play.save.outfits.wizard, 1);
  assert.equal(B.Play.wardrobeTabs(), 6);
}

// Locked family reset cannot start before rescuing Rainbow, or react to a held key.
{
  const g = bootGame(), B = g.BB;
  B.Save.write(); titleChoice(g); const old = g.storage.get(KEY);
  assert.equal(B.Home.familyOrder().length, 12, 'a title-only reset menu builds all twelve portraits before Home caches them');
  tap(g, B.Title.cbtn(1)); g.tick(30);
  assert.equal(B.Main.name, 'title'); assert.ok(B.Title.confirm);
  assert.equal(g.storage.get(KEY), old); assert.equal(B.Save.resetRainbowFamily(), false);
  tap(g, B.Title.cbtn(0));
  g.tick(45, ['Enter']); assert.equal(B.Main.name, 'title', 'opening press cannot confirm an erase');
  g.tick(); g.tick(1, ['ArrowLeft']); g.tick(); g.tick(1, ['Enter']); g.tick(40);
  assert.equal(B.Main.name, 'select'); assert.equal(g.storage.has(KEY), false);
}

// Full reset clears every progress field, keeps device settings, and plays from the start.
{
  const g = bootGame(), B = g.BB;
  completed(g); B.Settings.setDifficulty('hard');
  g.place('nm', 6, 32); g.tick(B.Links.HOLD + 15);
  tap(g, B.Title.cbtn(0, B.Play.portalChoice)); g.tick(12);
  assert.equal(B.Play.portalChoice.stage, 'all');
  tap(g, B.Title.cbtn(0, B.Play.portalChoice)); g.tick(40);
  assert.equal(B.Main.name, 'select'); assert.equal(g.storage.has(KEY), false);
  const expected = plain(B.Save.fresh()); expected.cat = 'phoebe';
  assert.deepEqual(plain(B.Save.data), expected);
  assert.equal(B.Settings.difficulty, 'hard');
  g.tick(1, ['Enter']); g.tick(120);
  assert.equal(B.Main.name, 'play'); assert.equal(B.Play.room.id, 'hm');
  assert.equal(B.Play.save.rainbowUnlocked, false); assert.equal(B.Play.wardrobeTabs(), 5);
  assert.ok(B.Play.intro); assert.equal(B.Play.save.finale, false);
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', {});
  assert.equal(Object.keys(B.Play.save.family).length, 0);
  assert.ok(Object.values(B.Play.save.abilities).every(v => !v));
}

// Both preview resets leave an existing normal save byte-for-byte intact.
for (const full of [false, true]) {
  const g = bootGame(), B = g.BB;
  completed(g); const normal = g.storage.get(KEY);
  B.Save.preview = true; titleChoice(g);
  tap(g, B.Title.cbtn(full ? 0 : 1));
  if (full) { g.tick(12); tap(g, B.Title.cbtn(0)); }
  g.tick(45); assert.equal(g.storage.get(KEY), normal);
}
console.log('✓ both reset menus: safe defaults, whole-card taps, hover, cancel, locked choice, held keys and extra erase confirmation');
console.log('✓ Rainbow family only: all other progress retained, six relatives restored, home start, story reset and reload');
console.log('✓ full reset: all progress cleared, new kitten/start works, device difficulty kept; previews protect normal saves');
