#!/usr/bin/env node
// Prove the entire enemy-free maze graph is connected, then walk its real
// inputs through pads, rewards, reload, kitten choices and the exit.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');

function walkMaze(g, target) {
    const { BB: B, tick } = g, M = B.GardenMaze;
    const start = B.Play.maze, queue = [{ x: start.x, y: start.y, steps: [] }], seen = new Set();
    let route;
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i], key = node.x + ',' + node.y;
      if (seen.has(key)) continue; seen.add(key);
      if (node.x === target.x && node.y === target.y) { route = node.steps; break; }
      for (const [code, dx, dy] of [['ArrowLeft',-1,0],['ArrowRight',1,0],['ArrowUp',0,-1],['ArrowDown',0,1]]) {
        if (M.walkable(node.x + dx, node.y + dy)) queue.push({ x: node.x + dx, y: node.y + dy, steps: [...node.steps, { code, x: node.x + dx, y: node.y + dy }] });
      }
    }
    assert.ok(route, 'route exists to ' + JSON.stringify(target));
    for (const step of route) {
      tick(9, [step.code]);
      assert.equal(B.Play.maze.x, step.x); assert.equal(B.Play.maze.y, step.y);
    }
    g.keys([]);
}

function check(g) {
  const { BB: B, tick, place } = g, M = B.GardenMaze;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  let save = B.Play.save;
  const walkTo = target => walkMaze(g, target);
  // Walking into the courtyard never launches a game. Its rainbow needs
  // all twelve real family IDs, even when the old finale/gate is saved.
  for (const state of ['fresh', 'finale', 'eleven']) {
    save.finale = state === 'finale' || state === 'eleven'; save.family = {};
    if (state === 'eleven') B.Home.familyOrder().slice(0, 11).forEach(id => { save.family[id] = 1; });
    place('nm', 21, 32); tick(60);
    assert.equal(B.Play.room.id, 'nm'); assert.equal(B.Play.maze, null); assert.equal(B.Play.portalChoice, null);
    assert.equal(M.available(save), false);
    // Old maze gate flags cannot accidentally unlock the new entrance.
    save.gates.nm = 1; assert.equal(B.Play.openJourneyChoice('rainbow'), false);
  }
  save.finale = false; B.Home.familyOrder().forEach(id => { save.family[id] = 1; });
  const earned = JSON.stringify({ friends: save.friends, family: save.family, abilities: save.abilities, bosses: save.bosses, finale: save.finale });
  place('nm', 21, 32); tick(60);
  assert.equal(B.Play.maze, null); assert.equal(B.Play.portalChoice.kind, 'rainbow');
  tick(1, ['Enter']); tick();
  assert.ok(B.Play.maze); assert.equal(B.Play.pl.state, 'maze');
  assert.equal(B.Play.chooseMazeCat('rainbow'), false);
  const maze = B.Play.maze;
  const gamepad = button => [{ connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === button })) }];
  g.context.navigator.getGamepads = () => gamepad(9); tick();
  assert.equal(B.Main.name, 'pause'); assert.equal(B.Play.maze, maze);
  g.context.navigator.getGamepads = () => []; tick(); tick(1, ['Enter']); tick();
  assert.equal(B.Main.name, 'play'); assert.equal(B.Play.maze, maze);
  console.log('✓ twelve cats reveal the rainbow; only its picture interaction enters the maze');

  // Exhaustive graph check: every path, branch, collectible, pad and the
  // exit belongs to one component. Undirected edges guarantee a way back.
  const queue = [M.START], seen = new Set(); let edges = 0, branches = 0, deadEnds = 0;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], key = p.x + ',' + p.y; if (seen.has(key)) continue; seen.add(key);
    const next = [[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy]) => ({ x: p.x + dx, y: p.y + dy })).filter(n => M.walkable(n.x,n.y));
    edges += next.length; if (next.length >= 3) branches++; if (next.length === 1) deadEnds++;
    queue.push(...next);
  }
  assert.equal(seen.size, M.MAP.flat().filter(c => c === '.').length);
  assert.ok(edges / 2 >= seen.size, 'multiple loops'); assert.ok(branches >= 8); assert.ok(deadEnds >= 5);
  for (const p of [M.PRIZE, ...M.PADS, ...M.STARS.map(([x,y]) => ({ x,y }))]) assert.ok(seen.has(p.x + ',' + p.y));
  console.log(`✓ every maze path and exit connected (${seen.size} cells, ${branches} branches, ${deadEnds} dead ends)`);

  // Blocked directions never cut through a hedge.
  const before = { x: B.Play.maze.x, y: B.Play.maze.y };
  tick(20, ['ArrowDown']); assert.equal(B.Play.maze.x, before.x); assert.equal(B.Play.maze.y, before.y); tick();
  for (const pad of [M.PADS[0], M.PADS[2], M.PADS[1]]) walkTo(pad);
  assert.equal(M.ready(save), true); assert.equal(save.mazeSolved, false);
  // Every original maze star key is reachable and collected exactly once.
  for (const [x, y] of M.STARS) walkTo({ x, y });
  for (let i = 0; i < M.STARS.length; i++) assert.equal(save.sparkles[M.starKey(i)], 1);
  const total = B.Save.count(save.sparkles);
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', {}); save = B.Play.save;
  assert.ok(B.Play.maze); assert.equal(M.ready(save), true); assert.equal(B.Save.count(save.sparkles), total);
  walkTo(M.PRIZE); assert.equal(save.mazeSolved, true); assert.equal(B.Play.maze.choice, true);
  tick(10); B.Play.maze.sel = 2;
  g.context.navigator.getGamepads = () => gamepad(1); tick();
  assert.equal(B.Play.maze.choice, false); assert.equal(save.cat, 'marshmallow');
  g.context.navigator.getGamepads = () => []; tick();
  const adjacent = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => ({ x: M.PRIZE.x + dx, y: M.PRIZE.y + dy })).find(p => M.walkable(p.x,p.y));
  walkTo(adjacent); walkTo(M.PRIZE);
  tick(10); tick(1, ['ArrowRight']); tick(); tick(1, ['ArrowRight']); tick(); tick(1, ['Enter']); tick();
  assert.equal(save.cat, 'rainbow'); assert.equal(B.Play.pl.cat, 'rainbow'); assert.equal(B.Play.maze.choice, false);
  assert.equal(JSON.stringify({ friends: save.friends, family: save.family, abilities: save.abilities, bosses: save.bosses, finale: save.finale }), earned);
  assert.equal(save.starsSpent, 0); assert.equal(save.heartsSpent, 0);
  console.log('✓ walking, gamepad pause/back, reload and rainbow kitten rewards work without spending');

  B.Play.closeMaze();
  assert.equal(B.Play.lastZone, B.Play.room.zone); assert.equal(B.Music.wanted, B.ZONES[B.Play.room.zone].key);
  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(50);
  assert.equal(B.Play.wardrobeTabs(), 6);
  B.Play.wardrobeTab(5);
  const body = B.Play.pl.body;
  for (const [i, cat] of ['marshmallow', 'phoebe', 'rainbow'].entries()) {
    B.Play.toggleOutfit(i); assert.equal(save.cat, cat); assert.equal(B.Play.pl.cat, cat); assert.equal(B.Play.pl.body, body);
  }
  B.Play.closeWardrobe();
  B.Play.writeSave(); B.Save.load(); B.Main.set('play', {}); save = B.Play.save;
  assert.equal(save.cat, 'rainbow'); assert.equal(B.Play.pl.cat, 'rainbow'); assert.equal(save.mazeSolved, true);
  assert.equal(B.Save.count(save.sparkles), total); assert.equal(save.finale, false);
  place('nm', 21, 32); tick(60); tick(1, ['Enter']); tick(); assert.ok(B.Play.maze);
  walkTo(M.START);
  tick(9, ['ArrowRight']); assert.equal(B.Play.maze, null); assert.equal(B.Play.room.id, 'nm');
  console.log('✓ all three playable kittens can be chosen again at the mirror, persist, and keep progress');
  return g;
}

if (require.main === module) {
  const dir = process.argv[2];
  const canvasFactory = dir ? require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas')).createCanvas : null;
  const g = check(bootGame(canvasFactory)), B = g.BB;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    g.place('nm', 28, 32); B.Play.openMaze(); B.Play.draw(B.G.ctx);
    fs.writeFileSync(path.join(dir, 'hedge-maze.png'), B.G.canvas.toBuffer('image/png'));
    B.Play.maze.choice = true; B.Play.maze.sel = 2; B.Play.draw(B.G.ctx);
    fs.writeFileSync(path.join(dir, 'kitten-choices.png'), B.G.canvas.toBuffer('image/png'));
  }
}
module.exports = { check, walkMaze };
