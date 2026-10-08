#!/usr/bin/env node
// Rainbow's family: lost only once Rainbow is rescued (no reset), found by
// walking up, ridden home on a rainbow, saved; the courtyard doorway stays
// shut until all six are home, then opens Mama's Cloud Maze (colour
// bridges, solved with real key presses); rainbow bubbles; the replay cloud
// waits for the whole family, who stay home through replays; one map
// opened from play or the pause menu.
'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const { happyMazeGraph, cloudMazeGraph } = require('./lib/maze-graph.cjs');

const g = bootGame(), B = g.BB, P = B.Play, RF = B.RainbowFamily;
const heard = [];
B.Voice.play = (id, d, o = {}) => { heard.push(id); if (o.onEnd) o.onEnd(); return true; }; // (each line plays to the end)
const kinThings = () => B.World.rooms.flatMap(r => P.ents[r.id].things.filter(th => th.type === 'kin'));
const plain = v => JSON.parse(JSON.stringify(v));

// 1. Before Rainbow is rescued, her family is nowhere to be seen.
const fixture = Object.assign(B.Save.fresh(), { cat: 'phoebe', introDone: 1, leftHome: 1, finale: true });
Object.keys(fixture.abilities).forEach(k => { fixture.abilities[k] = true; });
B.Save.data = fixture; B.Main.set('play', { cat: 'phoebe' });
assert.equal(B.World.findThings('@').length, 6, 'six relatives wait around the kingdom (Mama in the Cloud Maze)');
assert.equal(kinThings().length, 0); assert.equal(RF.hunting(P.save), false); assert.equal(RF.nest(P.save), false);
const zones = new Set(B.World.findThings('@').map(t => B.World.roomAtTile(t.tx, t.ty).zone));
assert.ok(zones.size >= 6, 'spread across the kingdom');
for (const id of B.RAINBOW_KIN) {
  assert.ok(B.CATS[id].magical && B.VOICE_CLIPS['kin_' + id], id);
  assert.notEqual(B.CATS[B.Kittens.fadedId(id, 1)].fur, B.CATS[id].fur, 'lost relatives are grey: ' + id);
}

// 2. Rescue Rainbow in the hedge maze: the hunt starts at once, no reset.
B.Home.familyOrder().forEach(id => { P.save.family[id] = 1; });
const stars = Object.keys(P.save.sparkles).length;
assert.equal(P.openJourneyChoice('rainbow'), true); P.closeJourneyChoice();
assert.equal(P.openMaze(), true);
for (const p of B.GardenMaze.PADS) P.save.pads[p.key] = 1;
Object.assign(P.maze, B.GardenMaze.PRIZE); P.mazeCell();
assert.equal(P.save.mazeSolved, true);
assert.deepEqual(heard.slice(-2), ['story_rainbow_rescue', 'kin_hunt_start']);
P.closeMaze(true);
assert.equal(kinThings().length, 6, 'all six appear in the same world');
assert.ok(P.kinCard, 'a picture card shows the new goal'); assert.equal(P.save.kinIntro, 1);
assert.equal(Object.keys(P.save.family).length, 12, 'nothing was reset'); assert.equal(Object.keys(P.save.sparkles).length, stars);
assert.equal(RF.hunting(P.save), true); assert.equal(RF.nest(P.save), true);

// 3. The courtyard doorway stays shut (and the replay cloud hidden) while they're lost.
assert.equal(B.RainbowJourney.unlocked(P.save, 'rainbow'), false);
assert.equal(B.RainbowJourney.unlocked(P.save, 'cloud'), false);
assert.equal(P.openJourneyChoice('rainbow'), false);

// 4. Walk up to Grandpa: found, colour back, rides home.
// Each relative's own happy maze, solved with real key presses: the
// shortest route from the solver, retrying if a friendly bee is in the way.
const HM = B.HappyMaze, KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
const miniGraphs = new Map();
function plan(def) {
  if (!miniGraphs.has(def)) miniGraphs.set(def, happyMazeGraph(HM, def));
  const graph = miniGraphs.get(def);
  assert.ok(graph.solution, def.name + ' can be solved');
  assert.equal(graph.summary.traps, 0, def.name + ' has a reachable trap: ' + JSON.stringify(graph.trapWitness));
  // All reachable positions/item masks are enumerated before one reverse
  // graph traversal checks completion. The live walk still tests bee waits.
  return graph.solution.actions;
}
function solveMini() {
  const m = P.mini; assert.ok(m, 'a happy maze is open');
  for (const d of plan(m.def)) {
    for (let tries = 0; ; tries++) {
      assert.ok(tries < 30, 'a bee never blocks for long');
      const before = [m.x, m.y].join();
      g.tick(1, [KEY[d]]); g.tick(1);
      while (P.mini && P.mini.moving) g.tick(1);
      if (!P.mini || P.mini.done || [m.x, m.y].join() !== before) break;
      g.tick(17);
    }
  }
  assert.ok(P.mini && P.mini.done, 'the relative is reached');
  g.tick(140); assert.equal(P.mini, null);
}
const names = new Set(Object.values(HM.MAZES).map(d => d.name));
assert.equal(names.size, 6, 'six different mazes');
assert.deepEqual(Object.keys(HM.MAZES).sort(), [...RF.WORLD()].sort());
const grandpa = kinThings().find(th => th.kin === 'rbGrandpa'), np = B.World.byId.np;
g.place('np', grandpa.x / 32 - np.x - 4, Math.round(grandpa.y / 32) - np.y);
for (let i = 0; i < 90 && !P.mini; i++) g.tick(1, ['ArrowRight']);
assert.equal(P.mini.id, 'rbGrandpa', "walking up to Grandpa opens his lily-pond maze"); assert.ok(heard.includes('kin_minimaze'));
assert.equal(P.save.kin.rbGrandpa, undefined, 'not home until he is cheered up');
// leaving early keeps him waiting; step away and come back to try again
P.closeMini(false); assert.equal(P.mini, null); g.tick(5); assert.equal(P.mini, null, 'no instant re-open');
g.place('np', 2, 31); g.tick(2); // (far away on the lower path)
g.place('np', grandpa.x / 32 - np.x - 4, Math.round(grandpa.y / 32) - np.y);
for (let i = 0; i < 120 && !P.mini; i++) g.tick(1, ['ArrowRight']);
solveMini();
assert.equal(P.save.kin.rbGrandpa, 1); assert.ok(heard.includes('kin_rbGrandpa'));
// he finishes saying hello before his cloud comes
let talking = 'kin_rbGrandpa';
Object.defineProperty(B.Voice, 'currentId', { configurable: true, get: () => talking });
g.tick(400);
const waiting = P.ents.np.things.find(th => th.type === 'kin');
assert.ok(waiting && !waiting.x0, 'still on the ground while talking'); talking = null;
g.tick(400);
assert.ok(!P.ents.np.things.some(th => th.type === 'kin'), 'Grandpa rode home');
P.writeSave(); B.Save.load(); B.Main.set('play', {});
assert.equal(P.save.kin.rbGrandpa, 1); assert.equal(kinThings().length, 5); assert.equal(P.kinCard, null, 'the goal card shows once');

// 5. The others, each through their own maze: the sixth brings Rainbow's hint.
for (const th of kinThings()) { P.ctx().onKin(th); assert.equal(P.mini.id, th.kin); solveMini(); }
assert.equal(RF.count(P.save), 6); assert.equal(RF.mamaReady(P.save), true);
assert.ok(heard.includes('kin_six_home')); assert.ok(!heard.includes('kin_complete'));
g.place('nm', 21, 32);
assert.equal(B.RainbowJourney.unlocked(P.save, 'rainbow'), true);
assert.equal(P.openJourneyChoice('rainbow'), true); assert.ok(heard.includes('kin_mama_call'));
assert.equal(P.chooseJourney(), true);
assert.ok(P.cloud, "the doorway opens Mama's Cloud Maze, not the hedge maze"); assert.equal(P.maze, null);
assert.ok(heard.includes('kin_cloud_maze'));

// 6. The Cloud Maze: closed colour bridges, a forced order, kept colours.
const C = B.CloudMaze, key = { '-1,0': 'ArrowLeft', '1,0': 'ArrowRight', '0,-1': 'ArrowUp', '0,1': 'ArrowDown' };
function solve(from, mask, skip) {
  const graph = cloudMazeGraph(C, { from, mask, skip });
  return graph.solution ? graph.solution.states.map(s => [s.x, s.y, s.mask]) : null;
}
const route = solve(C.START, 0);
assert.ok(route && route.length > 100, 'Mama can be reached, after a real journey');
const order = route.map(([x, y]) => C.potAt(x, y)).filter((p, i, a) => p && a.indexOf(p) === i).join('');
assert.equal(order, 'voygtb', 'each relative opens the way to the next');
for (const pot of C.POTS) assert.equal(solve(C.START, 0, pot), null, 'every relative is needed: ' + pot);
assert.equal(C.walkable(3, 2, 0), false, 'the rainbow bridge needs all six colours');
// Complete position/colour graph from every saved colour mask, not just
// a successful START route per mask. Side branches must also reach Mama.
const cloudGraph = cloudMazeGraph(C, { masks: Array.from({ length: C.ALL + 1 }, (_, i) => i) });
assert.equal(cloudGraph.summary.traps, 0, 'Cloud Maze has a reachable trap: ' + JSON.stringify(cloudGraph.trapWitness));
assert.ok(cloudGraph.solution);
const walk = (steps) => {
  for (const [x, y] of steps) {
    const c = P.cloud, d = key[[x - c.x, y - c.y].join()];
    assert.ok(d, 'adjacent step');
    g.tick(1, [d]); g.tick(9);
    assert.deepEqual([P.cloud.x, P.cloud.y], [x, y]);
  }
};
const firstLeg = route.slice(1, route.findIndex(([x, y]) => C.potAt(x, y) === 'o') + 1);
walk(firstLeg);
assert.equal(P.save.cloudMask, (1 << C.POTS.indexOf('v')) | (1 << C.POTS.indexOf('o')), 'Twinkle and Pumpkin gave their colours');
// leave early through the way home (header button): colours are kept
P.closeCloud(false);
assert.equal(P.cloud, null); assert.equal(P.room.id, 'nm');
P.writeSave(); B.Save.load(); B.Main.set('play', {});
assert.equal(P.save.cloudMask, 1 << C.POTS.indexOf('v') | 1 << C.POTS.indexOf('o'));
g.place('nm', 21, 32); P.openJourneyChoice('rainbow'); P.chooseJourney();
const rest = solve(C.START, P.save.cloudMask);
walk(rest.slice(1));
assert.equal(P.save.kin.rbMama, 1); assert.ok(RF.complete(P.save));
assert.ok(P.cloud.done > 0); assert.ok(heard.includes('kin_rbMama')); assert.equal(heard.filter(id => id === 'kin_complete').length, 1);
assert.equal(P.save.purchases['bubble-rainbow'], 1); assert.equal(P.save.cosmetics.bubble, 'rainbow');
g.tick(430);
assert.equal(P.cloud, null, 'the celebration ends back in the courtyard'); assert.equal(P.room.id, 'nm');

// 7. The replay cloud appears. Restart just this family twice, then
// finish all six happy mazes and Mama's real-key route again each time.
for (let cycle = 0; cycle < 2; cycle++) {
  const cats = plain(P.save.family), stars = plain(P.save.sparkles), outfits = plain(P.save.outfits);
  g.place('nm', 6, 32); g.tick(B.Links.HOLD + 15);
  assert.equal(P.portalChoice.kind, 'cloud'); assert.equal(P.portalChoice.focus, 2);
  g.tick(1, ['ArrowRight']); g.tick(); g.tick(1, ['Enter']); g.tick(40);
  assert.equal(P.room.id, 'hm'); assert.equal(RF.count(P.save), 0); assert.equal(P.save.cloudMask, 0);
  assert.equal(kinThings().length, 6); assert.ok(P.kinCard);
  assert.deepEqual(plain(P.save.family), cats); assert.deepEqual(plain(P.save.sparkles), stars);
  assert.deepEqual(plain(P.save.outfits), outfits); assert.equal(P.save.cosmetics.bubble, 'rainbow');
  B.Save.load(); B.Main.set('play', {});
  for (const th of kinThings()) { P.ctx().onKin(th); solveMini(); }
  assert.equal(RF.mamaReady(P.save), true);
  g.place('nm', 21, 32); P.openJourneyChoice('rainbow'); P.chooseJourney();
  assert.ok(P.cloud); walk(route.slice(1)); g.tick(430);
  assert.equal(RF.complete(P.save), true); assert.equal(P.cloud, null);
  assert.equal(heard.filter(id => id === 'kin_complete').length, cycle + 2, 'completion voice repeats for the new hunt');
}
console.log('✓ two family-only resets: every mini maze and Mama solved again after reload; other progress and rainbow bubbles stay earned');

// Keep the remote's legacy replay helper: a whole new adventure also
// loses Rainbow's family, whose hunt starts after rescuing Rainbow again.
assert.equal(B.RainbowJourney.unlocked(P.save, 'cloud'), true);
assert.equal(B.RainbowJourney.unlocked(P.save, 'rainbow'), true, 'the doorway leads back to the hedge maze');
g.place('nm', 21, 32); P.openJourneyChoice('rainbow'); P.chooseJourney(); assert.ok(P.maze); P.closeMaze();
const sk = B.Links.skylightTile(); g.place('hm', sk.tx - B.World.byId.hm.x, sk.ty - B.World.byId.hm.y + 1);
P.save.finale = false; P.startParty();
for (const id of B.RAINBOW_KIN) assert.ok(P.party.guests.some(q => q.cat === id), id + ' dances at the party');
P.party = null;
P.writeSave(); assert.equal(B.Save.rainbowReplay(), true);
assert.deepEqual(plain(B.Save.data.kin), {}); assert.equal(B.Save.data.kinIntro, 0); assert.equal(B.Save.data.cloudMask, 0);
B.Main.set('play', { cat: 'rainbow' });
assert.equal(kinThings().length, 0); assert.equal(RF.hunting(P.save), false); assert.equal(RF.nest(P.save), false);
assert.equal(P.save.purchases['bubble-rainbow'], 1);

// 8. One map: from play (M) and from the pause menu, the same kingdom map.
g.place('g2', 10, 14); g.tick(2);
g.tick(1, ['KeyM']); g.tick(1);
assert.equal(B.Main.name, 'pause'); assert.equal(B.Pause.map, true);
g.tick(12); g.tick(1, ['KeyM']); g.tick(1);
assert.equal(B.Main.name, 'play', 'closing a map opened during play goes straight back to playing');
B.Main.go('pause'); B.Pause.activate(2); assert.equal(B.Pause.map, true);
g.tick(12); B.Pause.closeMap(); assert.equal(B.Main.name, 'pause'); assert.equal(B.Pause.map, false);
// the sparkle trail always leads somewhere useful: a relative still to find, then Mama
{ let mask = 0, at = C.START;
  for (let i = 0; i < 7; i++) {
    const path = C.route(at.x, at.y, mask); assert.ok(path.length > 1, 'sparkle trail ' + i);
    const [x, y] = path.at(-1); at = { x, y };
    if (mask === C.ALL) { assert.deepEqual(at, { x: C.MAMA.x, y: C.MAMA.y }); break; }
    const pot = C.potAt(x, y); assert.ok(pot); mask |= 1 << C.POTS.indexOf(pot);
  } }
console.log("✓ Rainbow's family: lost after Rainbow's rescue (no reset), found on foot, finish talking, then ride home, saved; doorway waits for all six");
console.log('✓ Cloud Maze: forced colour order, no stuck states, kept colours, real-key walk to Mama, rainbow bubbles, party, legacy full replay resets family');
console.log('✓ one kingdom map from play or the pause menu');
