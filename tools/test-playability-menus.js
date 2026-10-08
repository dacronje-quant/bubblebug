#!/usr/bin/env node
'use strict';
// These are isolated earned-state fixtures for menu-controller contracts.
// They deliberately place the player at real hotspots; their success is
// never proof that a fresh adventure can earn or physically reach them.
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const { serviceGardenMenu, exerciseWardrobe } = require('./lib/playability-menus.cjs');
const { catalog, inspect, createLedger, persistenceDifferences } = require('./lib/unlock-ledger.cjs');
const plain = value => JSON.parse(JSON.stringify(value));

function fixture({ allFriends = false, allClothes = false, cat = 'phoebe' } = {}) {
  const game = bootGame(), B = game.BB;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', { cat });
  if (allFriends) for (const e of Object.values(B.Play.ents)) for (const bug of e.bugs) if (!bug.king) B.Play.save.friends[bug.key] = bug.kind;
  if (allClothes) {
    for (const item of B.Wardrobe.LIST) B.Play.save.outfits[item.id] = 1;
    for (const item of B.Cosmetics.LIST) B.Play.save.purchases[item.id] = 1;
    B.Play.save.rainbowUnlocked = true;
  }
  return game;
}
function open(game, kind) {
  const B = game.BB;
  game.place('ng', 3, 31); game.tick(2);
  if (kind === 'friends') game.place('ng', 24, 31);
  else if (kind === 'fountain') game.place('hm', 24, 32);
  else game.place('hm', B.Home.MIRROR_COL - 0.5, 32);
  game.tick(B.Links.HOLD + 15);
  if (kind === 'mirror') assert.ok(B.Play.wardrobe, 'the real mirror hotspot opens');
  else assert.equal(B.Play.gardenChoice?.kind, kind, 'the real garden hotspot opens ' + kind);
}
function suppress(game, key) {
  const tick = game.tick;
  game.tick = (n = 1, keys = []) => tick(n, keys.filter(k => k !== key));
}

function check() {
  const cases = [], failures = [];
  const run = (name, test) => {
    try { test(); cases.push(name); console.log('✓ ' + name); }
    catch (error) { failures.push({ name, message: error.message }); console.error('✗ ' + name + ': ' + error.message); }
  };
  run('39 invitations and fountain fit 65 earned hearts; repeats preserve spending and hidden choices', () => {
    const game = fixture({ allFriends: true }), B = game.BB, P = B.Play;
    open(game, 'friends');
    const kinds = [...P.gardenChoice.kinds], first = serviceGardenMenu(game);
    assert.equal(kinds.length, 39); assert.equal(first.unlocked.length, 39);
    assert.equal(P.save.heartsSpent, 39); assert.equal(P.homeVisitors.length, 65); assert.equal(P.gardenChoice, null);
    P.save.hiddenResidents[kinds[0]] = 1;
    open(game, 'friends'); assert.equal(serviceGardenMenu(game).unlocked.length, 0);
    assert.equal(P.save.heartsSpent, 39); assert.equal(P.save.hiddenResidents[kinds[0]], 1);
    open(game, 'fountain'); serviceGardenMenu(game);
    assert.equal(P.save.heartsSpent, 40); assert.equal(P.save.fountainUses, 1); assert.equal(P.save.gestures.twirl, 1);
    assert.equal(P.gardenChoice, null);
    // An exhausted wallet can repeat a previously earned fountain for free.
    P.save.heartsSpent = B.Save.count(P.save.friends);
    const spent = P.save.heartsSpent;
    open(game, 'fountain'); serviceGardenMenu(game);
    assert.equal(P.save.heartsSpent, spent); assert.equal(P.save.fountainUses, 2); assert.equal(P.gardenChoice, null);
    B.Save.load(); B.Main.set('play', {});
    assert.equal(P.save.fountainUses, 2); assert.equal(P.save.hiddenResidents[kinds[0]], 1);
    assert.equal(P.save.heartsSpent, spent); assert.equal(B.Save.count(P.save.residents), 39);
  });
  run('unaffordable invitations/fountain never spend or award rewards', () => {
    const game = fixture({ allFriends: true }), P = game.BB.Play;
    P.save.heartsSpent = game.BB.Save.count(P.save.friends);
    open(game, 'friends'); assert.throws(() => serviceGardenMenu(game), /Insufficient/);
    assert.equal(Object.keys(P.save.residents).length, 0);
    open(game, 'fountain'); assert.throws(() => serviceGardenMenu(game), /Insufficient/);
    assert.equal(P.save.purchases['heart-fountain'], undefined); assert.equal(P.save.gestures.twirl, undefined);
    assert.equal(P.save.fountainUses, 0); assert.equal(P.save.heartsSpent, 65);
  });
  run('missing/invalid/paused menus are rejected before input', () => {
    const game = fixture(), B = game.BB;
    assert.throws(() => serviceGardenMenu(game), /menu/);
    assert.throws(() => exerciseWardrobe(game), /mirror/);
    open(game, 'friends'); B.Play.gardenChoice.kind = 'invalid-fixture';
    assert.throws(() => serviceGardenMenu(game), /menu/);
    open(game, 'mirror'); B.Main.set('pause');
    assert.throws(() => exerciseWardrobe(game), /mirror/);
    assert.equal(B.Main.name, 'pause');
  });
  for (const cat of ['phoebe', 'rainbow']) run('all 41 accessories/styles actually equip through keyboard for ' + cat, () => {
    const game = fixture({ allClothes: true, cat }), B = game.BB, P = B.Play;
    open(game, 'mirror');
    const seen = new Set(), originalTick = game.tick;
    game.tick = (...args) => {
      originalTick(...args);
      for (const id of Object.values(P.save.wear)) if (id) seen.add(id);
      for (const item of B.Cosmetics.LIST) {
        const current = item.slot === 'bubble' ? B.Cosmetics.bubbleFor(P.save, P.pl.cat) : P.save.cosmetics.trail;
        if (item.value === current) seen.add(item.id);
      }
    };
    const before = plain({ stars: P.save.sparkles, hearts: P.save.heartsSpent, purchases: P.save.purchases });
    const result = exerciseWardrobe(game), expected = plain(B.Wardrobe.LIST.concat(B.Cosmetics.LIST).map(item => item.id).sort());
    assert.equal(expected.length, 41); assert.deepEqual(result.unavailable, []);
    assert.deepEqual([...seen].sort(), expected); assert.deepEqual(result.worn.sort(), expected);
    assert.equal(P.wardrobe, null);
    assert.deepEqual(plain({ stars: P.save.sparkles, hearts: P.save.heartsSpent, purchases: P.save.purchases }), before);
    const wear = plain(P.save.wear), cosmetics = plain(P.save.cosmetics);
    B.Save.load(); B.Main.set('play', {});
    assert.deepEqual(plain(P.save.wear), wear); assert.deepEqual(plain(P.save.cosmetics), cosmetics);
  });
  run('fresh wardrobe reports locks and only equips the two default styles', () => {
    const game = fixture(), P = game.BB.Play; open(game, 'mirror');
    const result = exerciseWardrobe(game);
    assert.deepEqual(result.worn.sort(), ['bubble-classic', 'trail-classic']);
    assert.ok(result.unavailable.length > 20); assert.deepEqual(plain(P.save.wear), { head: null, neck: null, face: null });
    assert.equal(P.save.starsSpent, 0); assert.equal(P.save.heartsSpent, 0);
  });
  run('suppressed wardrobe input is rejected instead of reported worn', () => {
    const game = fixture({ allClothes: true }); open(game, 'mirror'); suppress(game, 'Enter');
    assert.throws(() => exerciseWardrobe(game), /did not equip/);
  });
  run('suppressed invitation input cannot report an unlocked species', () => {
    const game = fixture({ allFriends: true }); open(game, 'friends'); suppress(game, 'Enter');
    assert.throws(() => serviceGardenMenu(game), /did not unlock/);
    assert.equal(game.BB.Play.save.heartsSpent, 0);
  });
  run('suppressed repeat-fountain input cannot reuse past reward as proof of a new use', () => {
    const game = fixture({ allFriends: true }); open(game, 'fountain'); serviceGardenMenu(game);
    open(game, 'fountain'); suppress(game, 'Enter');
    assert.throws(() => serviceGardenMenu(game), /Fountain/);
    assert.equal(game.BB.Play.save.fountainUses, 1);
  });
  run('catalog validates actual King ID and persisted values/preferences', () => {
    const game = fixture({ allFriends: true, allClothes: true }), B = game.BB, P = B.Play;
    const expected = catalog(B), ledger = createLedger(B, expected);
    assert.equal(expected.kingKeys.length, 1);
    P.save.friends['invented-king-fixture'] = 'king';
    assert.ok(inspect(B, expected).errors.some(e => e.includes('invented-king-fixture')));
    delete P.save.friends['invented-king-fixture']; P.save.friends[expected.kingKeys[0]] = 'king';
    assert.ok(!inspect(B, expected).errors.some(e => e.includes('Unknown')));
    Object.assign(P.save, { hiddenResidents: { bunny: 1 }, cloudMask: 3, kinIntro: 1, doors: { 2: 1 } });
    P.writeSave(); assert.equal(ledger.persisted(game.storage).complete, true);
    const saved = JSON.parse(game.storage.get('bubblebug_kingdom_v2'));
    for (const field of ['hiddenResidents', 'cloudMask', 'kinIntro', 'doors', 'cosmetics', 'wear']) {
      const corrupt = plain(saved); delete corrupt[field];
      game.storage.set('bubblebug_kingdom_v2', JSON.stringify(corrupt));
      assert.ok(ledger.persisted(game.storage).differences.includes(field), 'persistence detects missing ' + field);
    }
    const corrupt = plain(saved), key = expected.namespaces.friends[0]; corrupt.friends[key] = 'wrong-species-fixture';
    game.storage.set('bubblebug_kingdom_v2', JSON.stringify(corrupt));
    assert.ok(ledger.persisted(game.storage).differences.includes('friends'));
    assert.deepEqual(persistenceDifferences(saved, plain(saved)), []);
  });
  if (failures.length) throw new Error(failures.length + ' menu/ledger contract check(s) failed: ' + failures.map(f => f.name).join('; '));
  return { passed: cases.length, scope: 'isolated earned fixtures; no fresh-playthrough proof' };
}
if (require.main === module) {
  try { const result = check(); console.log('✓ ' + result.passed + ' menu/ledger fixture contracts passed; fresh-playthrough completion remains a separate check'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { check };
