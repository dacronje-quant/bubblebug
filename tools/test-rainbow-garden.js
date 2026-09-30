#!/usr/bin/env node
// The indoor family gate, staged picture maze, rescue exit and legacy saves.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');
const { walkMaze } = require('./test-maze');

function reach(M, save) {
  const seen = new Set(), queue = [M.START];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], key = p.x + ',' + p.y;
    if (seen.has(key)) continue; seen.add(key);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (M.walkable(p.x + dx, p.y + dy, save)) queue.push({ x: p.x + dx, y: p.y + dy });
  }
  return seen;
}

function check() {
  const g = bootGame(), { BB: B, tick, place } = g, M = B.GardenMaze;
  for (const mode of ['easy', 'medium', 'hard']) {
    B.Settings.setDifficulty(mode); B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
    Object.keys(B.Save.data.abilities).forEach(key => { B.Save.data.abilities[key] = true; });
    B.Main.set('play', {});
    place('hm', 3, 32); tick(180, ['ArrowLeft', 'Space']); tick();
    assert.equal(B.Play.room.id, 'hm'); assert.equal(B.Play.rainbowGateOpen, false);
    B.Home.familyOrder().slice(0, 11).forEach(id => { B.Play.save.family[id] = 1; });
    place('hm', 3, 32); tick(140, ['ArrowLeft']); tick(); assert.equal(B.Play.room.id, 'hm');
    assert.ok(B.World.byId.hm.def.cushions.every(col => col - 2.5 >= 9), 'family cushions leave a clear door approach');
    B.Home.familyOrder().forEach(id => { B.Play.save.family[id] = 1; });
    place('hm', 3, 32); tick(100, ['ArrowLeft']); tick();
    assert.equal(B.Play.room.id, 'nm'); assert.equal(B.Play.rainbowGateOpen, true);
    place('nm', 28, 32); tick(130, ['ArrowRight']); tick(); assert.equal(B.Play.room.id, 'hm');
  }
  console.log('✓ 0/11 cats lock the indoor door even with every power; 12 cats open a walkable return in all difficulties');

  // Checkpoints on the old west path can return without losing progress,
  // then the locked door stays closed on subsequent Continue.
  const old = B.Save.fresh(); Object.assign(old, { room: 'nm', x: -151 * 32 + 6, y: 14 * 32 - 24, introDone: 1, family: { mamaMallow: 1 } });
  g.storage.set('bubblebug_kingdom_v2', JSON.stringify(old)); B.Save.load(); B.Main.set('play', {});
  B.Play.iris = null; tick(160, ['ArrowRight']); tick();
  assert.equal(B.Play.room.id, 'hm'); assert.equal(B.Play.rainbowExitPass, false); assert.equal(B.Play.rainbowGateOpen, false);
  assert.equal(B.Play.save.family.mamaMallow, 1);
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', {}); assert.equal(B.Play.rainbowGateOpen, false);
  console.log('✓ old courtyard checkpoints can walk home through the new gate, which closes safely behind them');

  let save = B.Play.save; B.Home.familyOrder().forEach(id => { save.family[id] = 1; });
  place('nm', 21, 32); assert.equal(B.Play.openMaze(), true);
  for (let stage = 0; stage < 3; stage++) {
    const seen = reach(M, save), next = M.ORDER[stage];
    assert.ok(seen.has(next.x + ',' + next.y), 'the next lantern is reachable');
    assert.ok(!seen.has(M.PRIZE.x + ',' + M.PRIZE.y), 'Rainbow needs all three lanterns');
    for (const later of M.ORDER.slice(stage + 1)) assert.ok(!seen.has(later.x + ',' + later.y), 'the matching arch reveals the next section');
    const closed = M.GATES.find(gate => gate.key === next.key);
    assert.equal(M.walkable(closed.x, closed.y, save), false);
    walkMaze(g, next); assert.equal(save.pads[next.key], 1); assert.equal(M.walkable(closed.x, closed.y, save), true);
    B.Play.writeSave(); B.Save.load(); B.Main.set('play', {});
    save = B.Play.save;
  }
  assert.equal(reach(M, save).size, M.MAP.flat().filter(ch => ch === '.').length);
  walkMaze(g, M.PRIZE); assert.equal(save.mazeSolved, true); assert.equal(B.Play.maze.bloom, 0);
  tick(140); assert.equal(B.Play.maze.bloom, 1);
  B.Play.maze.sel = 2; tick(1, ['Enter']); tick(); assert.equal(save.cat, 'rainbow');
  tick(1, ['ArrowLeft']); tick(); assert.equal(B.Play.maze, null); assert.equal(B.Play.room.id, 'nm');
  const door = B.RainbowJourney.spot('rainbow');
  assert.ok(Math.abs(B.Play.pl.body.x + 10 - door.x) < 1); assert.equal(B.Play.save.inMaze, false);
  assert.equal(B.Play.journeyLock, 'rainbow');
  B.Save.load(); B.Main.set('play', {}); assert.equal(B.Play.save.mazeSolved, true);
  console.log('✓ moon → flower → star opens three connected sections; rescue blooms the garden and its nearby exit returns outside');

  // Saves already inside the original maze keep their route while new
  // entries use the matching gates. This compatibility pass is saved.
  const legacy = B.Save.fresh(); delete legacy.mazePuzzleVersion; delete legacy.mazeLegacyAccess;
  Object.assign(legacy, { inMaze: true, introDone: 1, mazePosition: { x: 1, y: 13 }, family: Object.fromEntries(B.Home.familyOrder().map(id => [id, 1])) });
  g.storage.set('bubblebug_kingdom_v2', JSON.stringify(legacy)); B.Save.load(); B.Main.set('play', {});
  assert.equal(B.Play.save.mazeLegacyAccess, true); assert.equal(B.Play.maze.x, 1);
  assert.equal(reach(M, B.Play.save).size, 204);
  B.Save.load(); B.Main.set('play', {}); assert.equal(B.Play.save.mazeLegacyAccess, true);
  walkMaze(g, M.START); B.Play.closeMaze(); assert.equal(B.Play.save.mazeLegacyAccess, false);
  B.Play.openMaze(); assert.equal(M.walkable(M.GATES[0].x, M.GATES[0].y, B.Play.save), false);
  console.log('✓ older active mazes retain their route/position across reload; new entries use lantern gates');
}

function render(dir) {
  const { createCanvas } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas'));
  const g = bootGame(createCanvas), { BB: B, place, tick } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  fs.mkdirSync(dir, { recursive: true });
  const shot = name => { B.Play.zoneCard = 0; B.G.begin(); B.Play.draw(B.G.ctx); fs.writeFileSync(path.join(dir, name + '.png'), B.G.canvas.toBuffer('image/png')); };
  place('hm', 4, 32); shot('family-door-locked');
  B.Home.familyOrder().forEach(id => { B.Play.save.family[id] = 1; }); B.Play.syncRainbowGate();
  place('hm', 4, 32); shot('family-door-open');
  place('nm', 21, 32); shot('grand-courtyard-gloomy');
  B.Play.openMaze(); shot('maze-gloomy');
  B.GardenMaze.ORDER.forEach(pad => { walkMaze(g, pad); shot('maze-' + B.GardenMaze.GATES.find(gate => gate.key === pad.key).symbol); });
  walkMaze(g, B.GardenMaze.PRIZE); tick(130); B.Play.maze.sel = 2; shot('rainbow-rescued');
  B.Play.maze.choice = false; shot('maze-happy'); B.Play.closeMaze(true); shot('grand-courtyard-happy');
  const s = B.Play.save;
  for (const th of B.World.findThings('*').slice(0, 220)) s.sparkles[th.tx + ',' + th.ty] = 1;
  for (const item of B.Wardrobe.LIST) s.outfits[item.id] = 1;
  place('hm', B.Home.MIRROR_COL - 0.5, 32); B.Play.openWardrobe(); tick(20);
  for (const tab of [0,1,2,3,4,5]) { B.Play.wardrobeTab(tab); shot('wardrobe-' + tab); }
  B.Play.wardrobeTab(0); B.Play.wardrobe.sel = 8; shot('wardrobe-hats-page-2');
}
if (require.main === module) { check(); if (process.argv[2]) render(process.argv[2]); }
module.exports = { check };
