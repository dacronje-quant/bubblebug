#!/usr/bin/env node
// Deliberate entry/exit waits through real scene inputs and doorway updates.
'use strict';
const assert = require('assert/strict');
const { bootGame } = require('./test-neighbourhood');
const { walkMaze } = require('./test-maze');

function check(g) {
  const { BB: B, tick, keys, place } = g;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', {});
  const P = B.Play, save = P.save, wait = B.Links.HOLD, exitWait = B.GardenMaze.EXIT_HOLD;
  assert.ok(wait >= 45 && wait < 90); assert.ok(exitWait > wait && exitWait < 180);
  const hm = B.World.byId.hm;
  const flapTile = B.World.findThings('h')[0], liftTile = B.World.findThings('u')[0];
  const links = [
    B.Links.create(flapTile, B.World.roomAtTile(flapTile.tx, flapTile.ty), save),
    B.Links.hallDoors(hm).find(th => !th.walkOut),
    B.Links.create(liftTile, B.World.roomAtTile(liftTile.tx, liftTile.ty), save),
  ];
  for (const th of links) {
    save.doors[th.zone] = 1;
    let journeys = 0, locked = false;
    const body = { x: th.x - 10, y: th.y - 24, w: 20, h: 24, grounded: true, vx: 0 };
    const ctx = { save, pl: { body, state: 'play' }, linkLocked: () => locked,
      onFlapFound: q => { save.doors[q.zone] = q.idx + 1; }, travel: dest => { assert.ok(dest); journeys++; } };
    const frames = n => { for (let i = 0; i < n; i++) B.Links.update(th, ctx); };
    frames(wait - 1); assert.equal(journeys, 0);
    body.vx = 1; frames(1); assert.equal(th.hold, 0);
    body.vx = 0; frames(wait - 1); assert.equal(journeys, 0);
    body.x += 80; frames(1); assert.equal(th.hold, 0); body.x -= 80;
    frames(wait - 1); locked = true; frames(1); assert.equal(th.hold, 0); locked = false;
    frames(wait - 1); assert.equal(journeys, 0); frames(1); assert.equal(journeys, 1);
  }
  console.log('✓ doors, cat flaps and lifts wait 1 second; walking away or a travel lock clears progress');

  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(wait - 1); assert.equal(P.wardrobe, null);
  tick(1, ['ArrowRight']); assert.equal(P.mirrorHold, 0);
  place('hm', B.Home.MIRROR_COL - 0.5, 32); tick(wait - 1); assert.equal(P.wardrobe, null);
  tick(); assert.ok(P.wardrobe); P.closeWardrobe();
  place('ng', 24, 31); tick(wait - 1); assert.equal(P.gardenChoice, null);
  tick(); assert.equal(P.gardenChoice.kind, 'friends'); P.closeGardenChoice();
  place('nr', 10, 31); tick(wait - 1); assert.equal(P.gardenFun, null);
  tick(); assert.equal(P.gardenFun.kind, 'dance');
  B.Home.familyOrder().forEach(id => { save.family[id] = 1; });
  place('nm', 21, 32); tick(wait - 1); assert.equal(P.portalChoice, null);
  tick(); assert.equal(P.portalChoice.kind, 'rainbow'); P.closeJourneyChoice();
  console.log('✓ wardrobe, garden choices/play and rainbow entry share the shorter automatic wait');

  P.openMaze(); tick(exitWait * 2); assert.ok(P.maze); assert.equal(P.maze.exitHold, 0);
  P.closeMaze(); save.mazePosition = { x: 999, y: 999 }; P.openMaze(); tick(exitWait * 2);
  assert.ok(P.maze); assert.equal(P.maze.exitHold, 0); assert.equal(P.maze.x, B.GardenMaze.START.x);
  const M = B.GardenMaze, adjacent = { x: M.START.x, y: M.START.y - 1 };
  walkMaze(g, adjacent); walkMaze(g, M.START); tick(40);
  assert.ok(P.maze); assert.equal(P.maze.exitHold, 40);
  // A press/release between frames must still walk away and cancel exit.
  keys(['ArrowUp']); keys([]); tick(); assert.ok(P.maze.moving); assert.equal(P.maze.exitHold, 0);
  tick(8); assert.equal(P.maze.y, adjacent.y); tick(exitWait); assert.ok(P.maze);
  walkMaze(g, M.START); tick(exitWait - 1); assert.ok(P.maze); tick(); assert.equal(P.maze, null);
  assert.equal(save.inMaze, false); assert.equal(P.room.id, 'nm');
  console.log('✓ new maze entries are safe; returning to the house waits 2 seconds, and a quick turn cancels it');

  P.openMaze(); tick(1, ['ArrowUp']); assert.ok(P.maze.moving);
  B.Input.pointers.push({ x: 850, y: 30 }); tick(); tick(7);
  assert.equal(P.maze.exit.source, 'header'); assert.equal(P.maze.exitHold, 0);
  tick(60); assert.ok(P.maze); tick(1, ['Escape']); assert.equal(P.maze.exitHold, 0);
  tick(); tick(1, ['Enter']); tick(); assert.ok(P.maze); assert.equal(P.maze.exit, null);
  B.Input.pointers.push({ x: 850, y: 30 }); tick();
  tick(exitWait - 2); assert.ok(P.maze); tick(); assert.equal(P.maze, null);
  console.log('✓ clicking the house during a step queues its wait; pausing clears it and re-clicking waits afresh');

  save.mazeSolved = true; save.rainbowUnlocked = true;
  assert.equal(M.walkable(M.RESCUE_EXIT.x, M.RESCUE_EXIT.y, { ...save, mazeSolved: false }), false);
  save.mazePosition = { x: M.PRIZE.x, y: M.PRIZE.y }; P.openMaze();
  tick(9, ['ArrowLeft']); assert.equal(P.maze.x, M.RESCUE_EXIT.x); assert.equal(P.maze.exitHold, 0);
  tick(50); assert.ok(P.maze); assert.equal(P.maze.exit.kind, 'rescue');
  tick(9, ['ArrowRight']); assert.equal(P.maze.x, M.PRIZE.x); assert.equal(P.maze.exitHold, 0);
  assert.equal(P.maze.choice, false, 'walking away cancels exit without reopening the kitten picker');
  // Tapping the rescue house also walks through the new opening.
  B.Input.pointers.push({ x: 88, y: 99 }); tick(9); assert.equal(P.maze.x, M.RESCUE_EXIT.x);
  tick(50); assert.ok(P.maze);
  // Transient timers do not get saved or turn into an instant exit on Continue.
  P.writeSave(); B.Save.load(); B.Main.set('play', {});
  assert.equal(P.maze.exitHold, 0); assert.equal(P.maze.exit, null);
  assert.equal(P.maze.x, M.RESCUE_EXIT.x, 'Continue keeps the saved exit position');
  assert.equal(P.save.rainbowUnlocked, true); assert.equal(P.save.mazeSolved, true);
  tick(9, ['ArrowRight']); assert.equal(P.maze.choice, false);
  tick(9, ['ArrowLeft']); tick(exitWait - 1); assert.ok(P.maze); tick(); assert.equal(P.maze, null);
  assert.equal(P.room.id, 'nm'); assert.equal(P.save.mazeSolved, true);
  console.log('✓ rescue exit also waits 2 seconds; save/reload clears timers and preserves the rescued kitten');
}
if (require.main === module) check(bootGame());
module.exports = { check };
