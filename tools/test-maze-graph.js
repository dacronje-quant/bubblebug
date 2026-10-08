#!/usr/bin/env node
// Exhaustive discrete progression graphs, not a browser or world-physics
// playthrough. Live maze timing/bee waits are in test-rainbow-family.js.
'use strict';
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { bootGame } = require('./test-neighbourhood');
const { analyzeGraph, solveGraph, pathTo, happyMazeGraph, cloudMazeGraph, gardenMazeGraph } = require('./lib/maze-graph.cjs');

function syntheticChecks() {
  const intact = { start: [['win', 'goal'], ['side', 'safe']], safe: [['win', 'goal'], ['branch', 'deep']],
    deep: [['continue', 'later']], later: [['continue', 'trap']], trap: [['return', 'goal']], goal: [] };
  const model = edges => ({ start: 'start', keyOf: s => s, isGoal: s => s === 'goal',
    expand: s => (edges[s] || []).map(([action, state]) => ({ action, state })) });
  const safe = analyzeGraph(model(intact));
  assert.equal(safe.summary.states, 6); assert.equal(safe.summary.traps, 0);
  assert.deepEqual(solveGraph(safe).actions, ['win']);
  assert.deepEqual(solveGraph(model(intact)).actions, ['win']);
  const mutated = { ...intact, trap: [['circle', 'trap']] };
  const trapped = analyzeGraph(model(mutated));
  assert.equal(trapped.summary.states, 6); assert.equal(trapped.summary.traps, 3);
  assert.equal(trapped.canComplete.has('start'), true, 'a solution from start does not make every branch safe');
  assert.deepEqual(trapped.trapWitness.actions, ['side', 'branch']);
  assert.deepEqual(pathTo(trapped, 'trap').actions, ['side', 'branch', 'continue', 'continue']);
  assert.equal(pathTo(trapped, 'missing'), null);
  // Reproduce the old first-goal stopping rule: the late trap is never
  // enumerated, so an assertion over just its discovered prefix misses it.
  const discovered = new Set(['start']), queue = ['start']; let found = false;
  for (let i = 0; i < queue.length && !found; i++) for (const [, next] of mutated[queue[i]]) {
    if (discovered.has(next)) continue;
    discovered.add(next); queue.push(next);
    if (next === 'goal') { found = true; break; }
  }
  assert.equal(discovered.has('trap'), false);
  const terminal = analyzeGraph({ ...model({ ...intact, goal: [['after', 'trap']], trap: [] }) });
  assert.equal(terminal.summary.traps, 3, 'the reachable side trap is still found');
  const finished = analyzeGraph({ start: 'goal', keyOf: s => s, isGoal: s => s === 'goal',
    expand: s => [{ action: 'after-completion', state: 'decorative' }] });
  assert.equal(finished.summary.states, 1, 'completed terminal scenes do not acquire imaginary outgoing traps');
  const impossible = analyzeGraph({ start: 'alone', keyOf: s => s, isGoal: () => false, expand: () => [] });
  assert.equal(impossible.solution, null); assert.equal(impossible.summary.traps, 1);
  assert.throws(() => analyzeGraph({ start: 0, keyOf: s => s, isGoal: () => false,
    expand: s => [{ state: s + 1, action: 'next' }], maxStates: 3 }), /state limit/);
}

function requireCompletable(graph, label) {
  assert.ok(graph.solution, label + ' has a route to completion');
  assert.equal(graph.summary.traps, 0, label + ' has an uncompletable reachable state: '
    + JSON.stringify(graph.trapWitness));
  return graph;
}

function check(B = bootGame().BB) {
  syntheticChecks();
  const reports = [];
  const add = (label, graph) => { requireCompletable(graph, label); reports.push({ label, ...graph.summary }); return graph; };
  for (const [id, def] of Object.entries(B.HappyMaze.MAZES)) {
    const graph = add(id, happyMazeGraph(B.HappyMaze, def));
    assert.ok(graph.states.size > graph.solution.states.length, id + ' enumerates side branches beyond one solution');
  }
  // Currents/wool animate automatically in the actual scene. A cyclic
  // mutation must be reported as a trap even though HM.move has a cap.
  const cyclic = { name: 'synthetic current cycle', map: [
    '###############', '#S>v.......abc#', '#.^<#########K#',
    '###############', '###############', '###############',
    '###############', '###############', '###############',
  ] };
  const loop = happyMazeGraph(B.HappyMaze, cyclic);
  assert.ok(loop.trapKeys.some(k => loop.states.get(k).automaticLoop), 'an endless automatic current ride is caught');

  const M = B.GardenMaze;
  const fresh = add('garden fresh / closed lantern gates', gardenMazeGraph(M));
  assert.equal(fresh.solution.states.at(-1).mask, 7);
  for (const s of fresh.states.values()) for (const gate of M.GATES) if (s.x === gate.x && s.y === gate.y) {
    const bit = 1 << M.PADS.findIndex(p => p.key === gate.key);
    assert.ok(s.mask & bit, 'closed lantern gate cannot be crossed before its pad');
  }
  const gardenMasks = add('garden all 8 saved lantern masks', gardenMazeGraph(M, { masks: Array.from({ length: 8 }, (_, i) => i) }));
  assert.equal(gardenMasks.summary.roots, 8);
  add('garden legacy open gates', gardenMazeGraph(M, { legacyAccess: true }));
  const completed = add('garden completed / safe exits', gardenMazeGraph(M, { solved: true, mask: 7 }));
  for (const [x, y] of M.STARS) assert.ok([...completed.states.values()].some(s => s.x === x && s.y === y), 'completed garden star cell remains accessible');
  assert.ok([...completed.states.values()].some(s => s.x === M.RESCUE_EXIT.x && s.y === M.RESCUE_EXIT.y));
  add('cloud fresh / closed colour bridges', cloudMazeGraph(B.CloudMaze));
  const cloudMasks = add('cloud all 64 saved colour masks', cloudMazeGraph(B.CloudMaze, { masks: Array.from({ length: 64 }, (_, i) => i) }));
  assert.equal(cloudMasks.summary.roots, 64);
  return reports;
}

if (require.main === module) {
  const t0 = performance.now(), reports = check(), seconds = (performance.now() - t0) / 1000;
  if (process.argv.includes('--json')) console.log(JSON.stringify({ reports, seconds, scope: 'discrete maze states; real scene timing remains a separate check' }));
  else {
    for (const r of reports) console.log(`✓ ${r.label}: ${r.states} states, ${r.edges} transitions, ${r.traps} traps`);
    console.log(`✓ late-branch trap and automatic-current-loop mutations detected; complete maze graph checks in ${seconds.toFixed(2)}s`);
  }
}
module.exports = { check, syntheticChecks, requireCompletable };
