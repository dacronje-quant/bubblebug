'use strict';
const assert = require('node:assert/strict');
const { createGame, replay, runtimeState, virtualClock, resumeSmoke, probeResponse } = require('./lib/playability-harness.cjs');
const { catalog, inspect, createLedger, persistenceDifferences, progressLosses } = require('./lib/unlock-ledger.cjs');
const { jumpEdges, shiftJump } = require('./lib/input-variations.cjs');

const actions = [{ ticks: 300, keys: [] }, { ticks: 85, keys: ['ArrowRight'] }, { ticks: 12, keys: ['ArrowRight', 'Space'] }, { ticks: 110, keys: ['ArrowRight'] }];
const a = createGame({ seed: 14 }), b = createGame({ seed: 14 });
assert.equal(a.place, undefined, 'completion harness has no teleport API');
replay(a, actions); replay(b, actions);
assert.deepEqual(runtimeState(a.BB), runtimeState(b.BB));
assert.equal(JSON.stringify(a.BB.Play.save), JSON.stringify(b.BB.Play.save), 'identical fresh inputs and seed produce the same save');
assert.deepEqual(a.trace, b.trace);
const edgeSource = createGame({ seed: 99 });
edgeSource.tick(300); edgeSource.tick(8, ['Space']);
edgeSource.keys([]); edgeSource.keys(['Space']); edgeSource.tick(3, ['Space']);
assert.ok(edgeSource.trace.some(chunk => chunk.eventsBefore), 'between-tick key edges are retained');
const edgeReplay = createGame({ seed: 99 }); replay(edgeReplay, edgeSource.trace);
assert.deepEqual(runtimeState(edgeSource.BB), runtimeState(edgeReplay.BB));
const edges = jumpEdges(edgeSource.trace);
assert.equal(edges.length, 2, 'both the first jump and release/repress jump edge are candidates');
const actualTicks = new Set(edgeSource.jumpEvents.map(event => event.tick));
assert.equal(edges.filter(edge => actualTicks.has(edge.tick)).length, 1, 'an unlearned mid-air jump press is not claimed as an actual movement event');
const varied = shiftJump(edgeSource.trace, 0, -2);
assert.equal(varied.trace.reduce((n, c) => n + c.ticks, 0), edgeSource.ticks, 'jump jitter preserves duration');
assert.notEqual(varied.trace[edges[0].index - 1].ticks, edgeSource.trace[edges[0].index - 1].ticks);
assert.throws(() => shiftJump(edgeSource.trace, 0, 100000), /erase/);
assert.equal(a.ticks, actions.reduce((n, a) => n + a.ticks, 0));
assert.equal(a.BB.Settings.difficulty, 'medium');
a.BB.Play.writeSave();
const continued = resumeSmoke(a, { seed: 14 });
assert.equal(continued.responsive, true, 'Continue can actually play/jump at its earned saved checkpoint');
// Fixtures cover avatars that the fresh input adventure does not select.
for (const cat of ['marshmallow', 'rainbow']) {
  const earned = createGame(); earned.tick(300);
  earned.BB.Play.save.cat = cat; earned.BB.Play.writeSave();
  const before = JSON.parse(JSON.stringify(earned.BB.Play.save));
  const resumed = resumeSmoke(earned);
  assert.equal(resumed.game.BB.Play.save.cat, cat, 'Continue preserves the selected ' + cat);
  assert.equal(resumed.responsive, true);
  assert.deepEqual(progressLosses(before, resumed.game.BB.Play.save), []);
}
// A jump effect can occur together with a ceiling bonk without playable
// displacement. These mocks test the response detector, not world routes.
const immobileBody = { x: 0, y: 0, fx: 0 };
const immobile = { BB: { Play: { pl: { body: immobileBody } }, Main: { name: 'play' } },
  tick() { immobileBody.fx = a.BB.FX.JUMP | a.BB.FX.BONK; } };
assert.equal(probeResponse(immobile).responsive, false, 'JUMP/BONK without movement cannot establish playable Continue');
const walkingBody = { x: 0, y: 0 };
const lowCeiling = { BB: { Play: { pl: { body: walkingBody } }, Main: { name: 'play' } },
  tick(n, keys) { if (keys.includes('ArrowLeft')) walkingBody.x--; if (keys.includes('ArrowRight')) walkingBody.x++; } };
assert.equal(probeResponse(lowCeiling).responsive, true, 'walking remains a valid response under a low ceiling');
lowCeiling.BB.Main.name = 'pause';
assert.equal(probeResponse(lowCeiling).responsive, false, 'displacement outside the play scene cannot pass Continue response');
assert.equal(createGame({ mode: 'hard' }).BB.Settings.hard, true);
const c = createGame({ seed: 15 });
const firstBug = game => Object.values(game.BB.Play.ents).flatMap(e => e.bugs)[0];
assert.notEqual(firstBug(c).t, firstBug(createGame({ seed: 14 })).t, 'seed affects real entities');
const bounded = createGame({ maxTicks: 2 });
assert.throws(() => bounded.tick(3), e => e.code === 'TICK_BUDGET');
const corrupt = createGame(); corrupt.BB.Play.pl.body.x = NaN;
assert.throws(() => corrupt.tick(), e => e.code === 'INVALID_PHYSICS');
const clock = virtualClock(), timers = [];
const removed = clock.setTimeout(() => timers.push('bad'), 0); clock.clearTimeout(removed);
clock.setTimeout(() => { timers.push('first'); clock.setTimeout(() => timers.push('next'), 0); }, 10);
clock.advance(10); assert.deepEqual(timers, ['first']); clock.advance(1); assert.deepEqual(timers, ['first', 'next']);

const game = createGame(), B = game.BB, expected = catalog(B), ledger = createLedger(B, expected);
assert.ok(expected.namespaces.sparkles.length > 800);
assert.equal(expected.namespaces.abilities.length, 10); assert.equal(expected.namespaces.family.length, 12);
assert.equal(expected.namespaces.kin.length, 7);
assert.equal(expected.namespaces.doors.length, 12);
assert.equal(Object.values(expected.doorRequirements).reduce((n, count) => n + count, 0), 24);
for (const [zone, count] of Object.entries(expected.doorRequirements)) assert.equal(count, B.Links.flapTiles(Number(zone)).length);
assert.ok(expected.budget.availableHearts >= expected.budget.heartsNeeded);
const fresh = ledger.inspect(); assert.equal(fresh.complete, false);
assert.ok(fresh.missing.includes('abilities:wings')); assert.ok(fresh.missing.includes('kin:rbMama'));
// Mutation checks operate on test fixtures, never on the completion run.
const saved = JSON.parse(JSON.stringify(B.Play.save));
for (const [field, ids] of Object.entries(expected.namespaces)) B.Play.save[field] = Object.fromEntries(ids.map(id => [id,
  field === 'friends' ? expected.friends.find(b => b.key === id).kind : field === 'doors' ? expected.doorRequirements[id] : 1]));
Object.assign(B.Play.save, { finale: true, rainbowUnlocked: true, mazeSolved: true, fountainUses: 1, heartsSpent: expected.budget.heartsNeeded });
assert.equal(inspect(B, expected, { requireAllCollectibles: true }).complete, true);
const earnedFixture = JSON.parse(JSON.stringify(B.Play.save));

const lastFlapZone = expected.namespaces.doors[0];
B.Play.save.doors[lastFlapZone] = expected.doorRequirements[lastFlapZone] - 1;
assert.ok(inspect(B, expected).missing.includes('doors:' + lastFlapZone), 'one discovered flap cannot stand in for both fast-travel destinations');
B.Play.save.doors[lastFlapZone] = String(expected.doorRequirements[lastFlapZone]);
assert.ok(inspect(B, expected).missing.includes('doors:' + lastFlapZone), 'fast-travel discovery requires a numeric saved count');
B.Play.save.doors[lastFlapZone] = expected.doorRequirements[lastFlapZone];
assert.equal(inspect(B, expected).details.doors.flaps.earned, 24);
delete B.Play.save.shortcuts[expected.namespaces.shortcuts[0]];
assert.equal(inspect(B, expected).complete, false, 'permanent hatch unlock is required by the default all-unlocks ledger');
B.Play.save.shortcuts[expected.namespaces.shortcuts[0]] = 1;

const checkpointFixture = { ...earnedFixture, room: 'g2', x: 100, y: 200, bench: { x: 80, y: 200 },
  mazePosition: { x: 5, y: 7 }, inMaze: true, mazeReturn: { x: 100, y: 200 }, mazePuzzleVersion: 1, mazeLegacyAccess: false };
for (const field of ['room', 'x', 'y', 'bench', 'mazePosition', 'inMaze', 'mazeReturn', 'mazePuzzleVersion', 'mazeLegacyAccess']) {
  const lost = JSON.parse(JSON.stringify(checkpointFixture)); delete lost[field];
  assert.ok(persistenceDifferences(checkpointFixture, lost).includes(field), 'Continue checkpoint loss is detected: ' + field);
}
const movedCheckpoint = { ...checkpointFixture, room: 'g3', x: 200, y: 300, bench: { x: 210, y: 300 },
  mazePosition: null, inMaze: false, mazeReturn: null, mazeLegacyAccess: false };
assert.deepEqual(progressLosses(checkpointFixture, movedCheckpoint), [], 'normal movement and leaving a maze can advance checkpoint fields');
const partialDoors = JSON.parse(JSON.stringify(earnedFixture)); partialDoors.doors[lastFlapZone]--;
assert.deepEqual(progressLosses(partialDoors, earnedFixture), [], 'discovering another real flap while resuming is monotone progress');
assert.ok(progressLosses(earnedFixture, partialDoors).includes('doors'), 'losing an already discovered destination is detected');
delete B.Play.save.sparkles[expected.namespaces.sparkles[0]];
delete B.Play.save.friends[expected.namespaces.friends[0]];
assert.equal(inspect(B, expected).complete, true, 'owned rewards alone cannot establish collection persistence');
assert.deepEqual(persistenceDifferences(earnedFixture, B.Play.save), ['sparkles', 'friends'], 'Continue losing optional collections is detected');
const extraProgress = JSON.parse(JSON.stringify(earnedFixture)); extraProgress.sparkles.newDuringResume = 1;
assert.deepEqual(progressLosses(earnedFixture, extraProgress), [], 'legitimate new rewards while resuming do not count as lost progress');
B.Play.save = B.Save.data = earnedFixture;
delete B.Play.save.family[expected.namespaces.family[0]]; B.Play.save.family['made-up-cat'] = 1;
assert.equal(inspect(B, expected).complete, false, 'right count with wrong ID cannot pass');
B.Play.save.family[expected.namespaces.family[0]] = 1;
delete B.Play.save.outfits[expected.namespaces.outfits[0]];
assert.equal(inspect(B, expected).complete, false, 'missing boss present cannot pass');
B.Play.save.outfits[expected.namespaces.outfits[0]] = 1;
B.Play.save.heartsSpent = 100000;
assert.ok(inspect(B, expected).errors.length, 'overspending cannot pass');
B.Play.save = B.Save.data = saved;
ledger.observe(0); assert.equal(ledger.events.length, 2, 'only default classic cosmetic rewards are initially earned');
// The actual save must contain current earned IDs; stale storage is a failure.
B.Play.save.family.testFixture = 1;
assert.equal(ledger.persisted(game.storage).complete, false);
console.log('Deterministic full-runtime inputs, trace replay, tick budgets, physics invariants, catalog IDs, affordability and persistence detection passed.');
