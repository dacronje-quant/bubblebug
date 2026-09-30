#!/usr/bin/env node
// Mouse hover must select safely and leave keyboard/gamepad focus usable.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');

function check(g) {
  const { BB: B, tick } = g;
  const hover = p => { B.Input.pointerPos = p; B.Input.pointerVersion++; tick(); };
  B.Save.data = B.Save.fresh(); B.Save.data.sparkles.kept = 1; B.Save.write();
  B.Main.set('title'); tick(20);
  const saved = g.storage.get('bubblebug_kingdom_v2');
  hover(B.Title.btn(1)); assert.equal(B.Title.focus, 1); tick(60);
  assert.equal(B.Main.name, 'title'); assert.equal(B.Title.confirm, null);
  tick(1, ['ArrowLeft']); tick(30); assert.equal(B.Title.focus, 0, 'parked mouse cannot override the keyboard');
  hover(B.Title.mbtn(2)); assert.equal(B.Title.focus, 2); assert.equal(B.Title.modeFocus, 2);
  assert.equal(B.Settings.difficulty, 'easy', 'hovering a difficulty never changes it');
  tick(1, ['ArrowLeft']); tick(); assert.equal(B.Settings.difficulty, 'medium');
  B.Title.choose(1); tick(12); hover(B.Title.cbtn(0)); tick(60);
  assert.equal(B.Title.confirm.focus, 0); assert.equal(B.Main.name, 'title');
  assert.equal(g.storage.get('bubblebug_kingdom_v2'), saved, 'hovering Start Fresh cannot erase a save');
  tick(1, ['ArrowRight']); tick(20); assert.equal(B.Title.confirm.focus, 1);
  tick(1, ['Enter']); tick(); assert.equal(B.Title.confirm, null);
  B.Main.set('select'); tick(20);
  hover(B.Select.spot(1)); tick(60); assert.equal(B.Select.sel, 1); assert.equal(B.Select.chosen, null);
  tick(1, ['ArrowLeft']); tick(30); assert.equal(B.Select.sel, 0);
  assert.equal(B.Select.chosen, null);
  g.context.navigator.getGamepads = () => [{ connected: true, axes: [1, 0], buttons: [] }];
  tick(); assert.equal(B.Select.sel, 1);
  g.context.navigator.getGamepads = () => []; tick();
  assert.equal(g.storage.get('bubblebug_kingdom_v2'), saved);
  console.log('✓ title, difficulty, erase check and kitten hover select safely; a parked mouse never steals keyboard/gamepad focus');
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  g.place('hm', 45, 32); tick(1, ['ArrowDown']); tick();
  assert.ok(B.Play.trickHint > 0); assert.equal(B.Play.pl.gesture, null);
  const th = Object.values(B.Play.ents).flatMap(e => e.things).find(th => th.trick);
  const body = B.Play.pl.body;
  body.x = th.x - body.w / 2; body.y = th.y - body.h / 2;
  B.Gestures.update(th, B.Play.ctx()); assert.equal(B.Play.save.gestures[th.gid], 1);
  g.place('hm', 45, 32); tick(1, ['ArrowDown']); assert.equal(B.Play.pl.gesture.id, th.gid);
  tick(1, ['ArrowRight']); assert.equal(B.Play.pl.gesture, null);
  console.log('✓ the Down-key hint, real trick pickup, learned gesture and movement cancellation keep working with the new symbol');
}

function render(dir) {
  const { createCanvas } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas'));
  const g = bootGame(createCanvas), { BB: B, tick, place } = g;
  fs.mkdirSync(dir, { recursive: true });
  const shot = name => {
    B.G.begin(); B.Main.draw(B.G.ctx);
    fs.writeFileSync(path.join(dir, name + '.png'), B.G.canvas.toBuffer('image/png'));
  };
  tick(30); shot('new-game-paw'); B.Main.set('select'); tick(30); shot('kitten-paw');
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  for (const th of B.World.findThings('*').slice(0, 50)) B.Play.save.sparkles[th.tx + ',' + th.ty] = 1;
  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(B.Links.HOLD + 15); B.Play.zoneCard = 0;
  B.Play.wardrobe.sel = B.Play.wardrobeItems().findIndex(item => item.id === 'wizard');
  shot('star-reward-half');
  const color = (x, y) => [...B.G.ctx.getImageData(Math.round(x * B.G.scale), Math.round(y * B.G.scale), 1, 1).data].slice(0, 3);
  assert.deepEqual(color(622, 418), [255, 214, 101]);
  assert.deepEqual(color(628, 418), [232, 222, 234]);
  B.Play.closeWardrobe();
  B.Play.save.rainbowUnlocked = true; B.Play.chooseMazeCat('rainbow');
  B.Home.familyOrder().forEach(id => { B.Play.save.family[id] = 1; });
  const calls = [], originalPlayer = B.Player.draw, originalRing = B.Links.holdRing, originalLinkProgress = B.Links.drawProgress;
  B.Player.draw = function (...args) { calls.push('kitten'); return originalPlayer.apply(this, args); };
  B.Links.holdRing = function (c, x, y, k) { calls.push({ x, y, k }); return originalRing.call(this, c, x, y, k); };
  B.Links.drawProgress = function (c, th, cam, ctx) {
    if (th.hold > 0) calls.push({ x: th.x - cam.x, y: th.y - cam.y - (th.type === 'flap' ? 130 : th.type === 'door' && !th.front ? 150 : 96), k: th.hold / B.Links.HOLD });
    return originalLinkProgress.call(this, c, th, cam, ctx);
  };
  for (const [id, col, floor, name] of [
    ['hm', B.Home.MIRROR_COL - 0.5, 32, 'wardrobe'], ['ng', 16, 31, 'garden'],
    ['np', 14, 31, 'pond'], ['nm', 21, 32, 'rainbow'],
  ]) {
    place(id, col, floor); B.Play.journeyLock = null; B.Play.funLock = null; B.Play.mirrorLock = false;
    tick(B.Links.HOLD / 2); B.Play.zoneCard = 0; calls.length = 0;
    shot(name + '-wait');
    const rings = calls.filter(v => typeof v === 'object'); assert.equal(rings.length, 1, name);
    assert.ok(calls.indexOf(rings[0]) > calls.indexOf('kitten'), name + ' wait is in front of the kitten');
    const footY = B.Play.pl.body.y + B.Play.pl.body.h - B.Camera.y;
    assert.ok(footY - rings[0].y >= 95, name + ' wait sits above the kitten (allow camera rounding)');
    assert.ok(rings[0].k > 0 && rings[0].k < 1);
  }
  for (const type of ['door', 'flap', 'lift']) {
    const th = Object.values(B.Play.ents).flatMap(e => e.things).find(th => th.type === type && !th.front && !th.bossRoom);
    const r = B.World.byId[th.room]; B.Play.save.doors[th.zone] = 1;
    place(r.id, (th.x - r.px) / 32 - 0.5, (th.y - r.py) / 32);
    tick(B.Links.HOLD / 2); B.Play.zoneCard = 0; calls.length = 0; shot(type + '-wait');
    const rings = calls.filter(v => typeof v === 'object'); assert.equal(rings.length, 1, type);
    assert.ok(calls.indexOf(rings[0]) > calls.indexOf('kitten'), type + ' waits draw in front of the kitten');
    assert.ok(th.y - B.Camera.y - rings[0].y >= 95);
    assert.deepEqual(color(rings[0].x, rings[0].y + 3), [255, 216, 74], type + ' wait has a visible gold center');
  }
  B.Player.draw = originalPlayer; B.Links.holdRing = originalRing; B.Links.drawProgress = originalLinkProgress;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  place('hm', 45, 32); tick(1, ['ArrowDown']); tick(15); B.Play.zoneCard = 0; shot('gesture-missing');
  const tr = Object.values(B.Play.ents).flatMap(e => e.things).find(th => th.trick);
  place(tr.room, 2, 14);
  B.Play.pl.body.x = tr.x - B.Play.pl.body.w / 2 + 80; B.Play.pl.body.y = tr.y - B.Play.pl.body.h / 2;
  B.Camera.snap(B.Play.room, B.Play.pl.body); B.Play.zoneCard = 0; shot('gesture-pickup');
  for (const id of ['wave', 'dance']) B.Play.save.gestures[id] = 1;
  place('hm', 45, 32); tick(1, ['ArrowDown']); tick(15); B.Play.zoneCard = 0; shot('gesture-performing');
  const friends = Object.values(B.Play.ents).flatMap(e => e.bugs).filter(bug => !bug.king).slice(0, 2);
  for (const bug of friends) B.Play.save.friends[bug.key] = bug.kind;
  B.Play.save.heartsSpent = friends.length;
  place('ng', 16, 31); tick(B.Links.HOLD + 15); B.Play.zoneCard = 0; shot('critter-switch-no-heart');
  assert.equal(B.Play.chooseGarden(), false); assert.equal(Object.keys(B.Play.save.residents).length, 0);
  B.Play.save.heartsSpent--; shot('critter-switch-heart-ready');
  assert.equal(B.Play.chooseGarden(), true); shot('critter-switch-on');
  assert.equal(B.Play.chooseGarden(), true); shot('critter-switch-off');
  console.log('✓ real canvas: exactly half a star bar, translucent menu paws and unobstructed wardrobe/garden/pond/rainbow waits');
}
if (require.main === module) { check(bootGame()); if (process.argv[2]) render(path.resolve(process.argv[2])); }
module.exports = { check, render };
