#!/usr/bin/env node
// Integration checks using the actual classic scripts, scene updates and
// physics. No browser or npm install required. Optional PNGs use a local
// @napi-rs/canvas installation: node tools/test-neighbourhood.js --render DIR
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SAVE_KEY = 'bubblebug_kingdom_v2';

function bootGame(canvasFactory, options = {}) {
  const storage = new Map(options.storage || []), events = new Map(), elements = new Map();
  const listen = (name, fn) => { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); };
  const classList = () => { const set = new Set(); return {
    add: c => set.add(c), remove: c => set.delete(c),
    contains: c => set.has(c),
    toggle(c, on) { if (on == null) on = !set.has(c); if (on) set.add(c); else set.delete(c); },
  }; };
  const element = () => ({ style: {}, classList: classList(), addEventListener() {}, dataset: {} });
  const canvas = () => {
    const cv = canvasFactory ? canvasFactory(960, 540) : { width: 960, height: 540, getContext: () => ({}) };
    cv.style = {}; cv.addEventListener = () => {}; return cv;
  };
  elements.set('game', canvas());
  for (const id of ['pause-btn', 'map-btn', 'touch']) elements.set(id, element());
  const context = {
    console, performance, setTimeout, clearTimeout,
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    addEventListener: listen, matchMedia: () => ({ matches: false }),
    requestAnimationFrame() {}, navigator: { getGamepads: () => [] }, location: { hash: options.hash || '' },
    document: {
      hidden: false, body: { classList: classList() }, addEventListener: listen,
      getElementById: id => elements.get(id), querySelectorAll: () => [],
      createElement: tag => tag === 'canvas' ? canvas() : element(),
    },
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key),
    },
  };
  context.window = context;
  vm.createContext(context);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, match[1]), 'utf8'), context, { filename: match[1] });
  }
  let held = new Set();
  function keys(next = []) {
    const wanted = new Set(next);
    const send = (type, code) => { for (const fn of events.get(type) || []) fn({ code, preventDefault() {}, repeat: false }); };
    for (const code of held) if (!wanted.has(code)) send('keyup', code);
    for (const code of wanted) if (!held.has(code)) send('keydown', code);
    held = wanted;
  }
  function tick(n = 1, next = []) {
    keys(next);
    for (let i = 0; i < n; i++) { context.BB.Input.poll(); context.BB.Main.update(); }
  }
  function place(id, col, floor) {
    const B = context.BB, P = B.Play, r = B.World.byId[id];
    if (P.room !== r) P.leaveRoom(P.room);
    P.room = r; P.prevRoom = null;
    P.enterZone(r.zone);
    P.wardrobe = null; P.gardenChoice = null; P.gardenHold = 0; P.maze = null; P.portalChoice = null;
    context.document.body.classList.remove('in-maze');
    P.pl.state = 'play'; P.intro = null; P.iris = null; P.traveling = null; P.linkLock = null;
    P.pl.body = B.Physics.newBody((r.x + col) * 32 + 6, (r.y + floor) * 32 - 24);
    P.pl.body.grounded = true; P.pl.body.groundKind = 1;
    P.checkpoint = { x: P.pl.body.x, y: P.pl.body.y };
    P.pendingCP = false; P.invuln = 60; B.Camera.snap(r, P.pl.body);
  }
  return { BB: context.BB, context, storage, tick, keys, place };
}

function checks(game) {
  const { BB: B, storage, tick, place } = game;
  const plain = value => JSON.parse(JSON.stringify(value));
  const fresh = () => { B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' }); };

  // Migration must move only the old house, preserving all saved progress
  // and doing so once. Saves elsewhere must keep their exact coordinates.
  const old = B.Save.fresh();
  Object.assign(old, { v: 4, cat: 'phoebe', room: 'hm', x: 488 * 32 + 6, y: -86 * 32 - 24,
    bench: { x: 488 * 32 + 6, y: -86 * 32 - 24 },
    sparkles: { '6,13': 1 }, friends: { '48,13': 'bunny' }, bosses: { g6: 1 },
    family: { mamaMallow: 1 }, introDone: 1, leftHome: 1 });
  old.abilities.doubleJump = true;
  storage.set(SAVE_KEY, JSON.stringify(old));
  assert.equal(B.Save.load(), true);
  assert.equal(B.Save.data.v, 9);
  assert.equal(B.Save.data.x, old.x - 630 * 32);
  assert.equal(B.Save.data.y, old.y + 100 * 32);
  assert.deepEqual(plain(B.Save.data.bench), { x: old.bench.x - 630 * 32, y: old.bench.y + 100 * 32 });
  for (const key of ['bosses', 'family', 'abilities']) assert.deepEqual(plain(B.Save.data[key]), plain(old[key]));
  // (and then the v9 kingdom rebuild moves Sunrise Lawn 30 tiles east, Daisy Steps 30 more)
  assert.deepEqual(plain(B.Save.data.sparkles), { '36,13': 1 });
  assert.deepEqual(plain(B.Save.data.friends), { '78,13': 'bunny' });
  B.Save.write(); const migrated = JSON.stringify(B.Save.data);
  B.Save.load(); assert.equal(JSON.stringify(B.Save.data), migrated);
  B.Main.set('play', { cat: 'phoebe' }); assert.equal(B.Play.room.id, 'hm');
  const outside = { ...old, room: 'g2', x: 48 * 32 + 6, y: 14 * 32 - 24 };
  storage.set(SAVE_KEY, JSON.stringify(outside)); B.Save.load();
  assert.equal(B.Save.data.x, outside.x + 30 * 32); assert.equal(B.Save.data.y, outside.y);
  assert.equal(B.Save.data.bench.x, old.bench.x - 630 * 32);
  for (const v of [2, 3]) {
    storage.set(SAVE_KEY, JSON.stringify({ ...outside, v }));
    assert.equal(B.Save.load(), true); assert.equal(B.Save.data.v, 9);
  }
  console.log('✓ v2/v3/v4 saves migrate; home moves once and progress survives');

  fresh();
  assert.equal(B.World.rooms.length, 103);   // 87 rooms + 16 link rooms
  assert.equal(B.World.findThings('*').length, 880);
  assert.equal(B.World.findThings('b').length + B.World.findThings('c').length, 65);
  assert.equal(B.World.findThings('B').length, 28);
  const front = B.Play.ents.hm.things.find(th => th.type === 'door' && th.front);
  place('hm', 58, 32); tick(65);
  assert.equal(B.Play.traveling, null); assert.equal(B.Play.room.id, 'hm');
  assert.equal(front.hold, 0);
  // The normal character must walk every lower path without jumping,
  // traveling, rescue or a frozen room slide. Also measure camera continuity.
  place('hm', 57, 32);
  const seen = new Set(); let previousX = B.Camera.x, maxDelta = 0;
  for (let i = 0; i < 1100 && B.Play.room.id !== 'g1'; i++) {
    tick(1, ['ArrowRight']); seen.add(B.Play.room.id);
    assert.equal(B.Play.pl.state, 'play'); assert.equal(B.Play.traveling, null);
    assert.equal(B.Camera.sliding, false);
    maxDelta = Math.max(maxDelta, Math.abs(B.Camera.x - previousX)); previousX = B.Camera.x;
  }
  for (const id of ['ng', 'np', 'nr', 'g1']) assert.ok(seen.has(id), 'walk reaches ' + id);
  assert.equal(B.Play.save.leftHome, 1); assert.ok(maxDelta < 20, 'camera remains continuous');
  for (let i = 0; i < 1100 && B.Play.room.id !== 'hm'; i++) tick(1, ['ArrowLeft']);
  assert.equal(B.Play.room.id, 'hm');
  assert.equal(B.Play.save.finale, false);
  console.log('✓ continuous, jump-free walk from home through all three rooms and back');
  place('hm', 3, 32);
  tick(120, ['ArrowLeft']);
  assert.equal(B.Play.room.id, 'hm'); assert.equal(B.Play.maze, null); assert.equal(B.Play.portalChoice, null);
  assert.ok(B.Play.pl.body.x >= (B.World.byId.hm.x + 2) * 32);
  console.log('✓ the indoor rainbow door blocks the courtyard before 12 cats');

  // The two original progression gates remain closed until solved.
  place('g1', 26, 14); tick(180, ['ArrowRight']);
  assert.equal(B.Play.room.id, 'g1'); assert.ok(B.Play.pl.body.x + 20 <= (B.World.byId.g1.x + 29) * 32);
  // (Goose Green is mirror-image in the compact kingdom: its gate is on the west side)
  const gooseOn = B.roomDir(B.World.byId.g6) > 0;
  place('g6', gooseOn ? 25 : 4, 14); tick(180, [gooseOn ? 'ArrowRight' : 'ArrowLeft']);
  assert.equal(B.Play.room.id, 'g6'); assert.equal(B.Play.save.bosses.g6, undefined);
  console.log('✓ tutorial gate and Goose gate cannot be walked past');

  // Solve the new optional nook with actual bubbles, targets and orb delays.
  place('nr', 3, 16); game.keys([]);
  const buds = B.Play.ents.nr.things.filter(th => th.type === 'bud');
  assert.equal(buds.length, 2);
  for (const bud of buds) {
    B.Bubbles.blow(bud.x - 12, bud.y, 1, 0, B.Play.pl.cat); tick(60);
    assert.equal(B.Play.save.buds[bud.key], 1);
  }
  assert.equal(B.Play.save.gates.nr, 1);
  const before = Object.keys(B.Play.save.sparkles).length;
  for (const col of [23, 26]) { place('nr', col, 16); tick(2); }
  assert.equal(Object.keys(B.Play.save.sparkles).length, before + 2);
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', { cat: 'phoebe' });
  assert.equal(B.Play.save.gates.nr, 1);
  assert.equal(B.World.byId.nr.grid.some(row => row.includes('G')), false);
  assert.equal(B.Play.ents.nr.things.some(th => th.type === 'sparkle' && th.x > -11 * 32 && th.y < 0), false);
  console.log('✓ two-bud reward nook opens, saves, and never duplicates collected stars');

  fresh();
  const chosen = [], kinds = new Set();
  choose: for (const r of B.World.rooms) for (const bug of B.Play.ents[r.id].bugs) {
    if (kinds.has(bug.kind)) continue;
    kinds.add(bug.kind); chosen.push(bug);
    if (chosen.length === 4) break choose;
  }
  for (const bug of chosen.slice(0, 4)) B.Play.save.friends[bug.key] = 1; // legacy format
  B.Main.set('play', { cat: 'phoebe' });
  assert.equal(B.Play.homeVisitors.length, 0);
  B.Play.openGardenChoice('friends');
  assert.equal(B.Play.chooseGarden(), true); B.Play.gardenChoice.sel = 1;
  assert.equal(B.Play.chooseGarden(), true); B.Play.closeGardenChoice();
  assert.equal(B.Play.homeVisitors.length, 2);
  assert.equal(new Set(B.Play.homeVisitors.map(v => v.kind)).size, 2);
  const hearts = Object.keys(B.Play.save.friends).length;
  place('ng', 4, 31); tick(240);
  assert.equal(B.Play.mood, B.CFG.MOOD_MAX);
  assert.equal(Object.keys(B.Play.save.friends).length, hearts);
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', { cat: 'phoebe' });
  assert.equal(B.Play.homeVisitors.length, 2);
  assert.equal(Object.keys(B.Play.save.friends).length, hearts);
  // The late-game slide and every existing flap still arrive in the house.
  const skylight = B.Links.skylightTile();
  B.Play.travel(B.Links.spot(skylight.tx, skylight.ty), 'slide');
  tick(B.CFG.IRIS_TIME + 1);
  assert.equal(B.Play.room.id, 'hm'); assert.equal(B.Play.save.finale, true);
  assert.ok(B.Play.party);
  console.log('✓ invited friends persist without extra hearts; the homecoming slide still works');
}

if (require.main === module) {
  checks(bootGame());
  const renderAt = process.argv.indexOf('--render');
  if (renderAt >= 0) {
    const { createCanvas } = require('@napi-rs/canvas');
    const dir = path.resolve(process.argv[renderAt + 1]); fs.mkdirSync(dir, { recursive: true });
    const game = bootGame(createCanvas), B = game.BB;
    B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'marshmallow' });
    for (const bug of B.World.rooms.flatMap(r => B.Play.ents[r.id].bugs).slice(0, 8)) B.Play.save.friends[bug.key] = bug.kind;
    B.Play.openGardenChoice('friends');
    for (let i = 0; i < Math.min(3, B.Play.gardenChoice.kinds.length); i++) { B.Play.gardenChoice.sel = i; B.Play.chooseGarden(); }
    B.Play.closeGardenChoice();
    for (const [id, col, floor] of [['hm', 56, 32], ['ng', 18, 31], ['np', 15, 31], ['nr', 12, 16], ['nm', 17, 25], ['g1', 3, 14]]) {
      game.place(id, col, floor); game.tick(30); B.Play.zoneCard = 0; B.Play.pl.invuln = 0; B.Main.draw();
      fs.writeFileSync(path.join(dir, id + '.png'), B.G.canvas.toBuffer('image/png'));
    }
    console.log('✓ game scenes rendered to ' + dir);
  }
}

module.exports = { bootGame };
