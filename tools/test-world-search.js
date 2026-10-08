#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const search = require('./verify-world.js');

test('reused input clears old presses and directions before a new frame', () => {
  const input = { left: true, right: true, jump: true, jumpPressed: true, bubblePressed: true };
  assert.equal(search.planInput({ kind: 'walk', d: 1, k: 3, keep: false }, 0, {}, input), input);
  assert.equal(input.left, false);
  assert.equal(input.right, true);
  assert.equal(input.jumpPressed, false);
  assert.equal(input.bubblePressed, false);
  search.planInput({ kind: 'walk', d: 1, k: 3, keep: false }, 4, {}, input);
  assert.deepEqual(input, { left: false, right: false, jump: false, jumpPressed: false, bubblePressed: false });
});

test('a trajectory that never settles is recorded as unresolved', () => {
  const original = search.P.step;
  const metrics = search.newState().metrics;
  try {
    search.P.step = p => { p.grounded = false; p.vy = 1; return 0; };
    const result = search.simulate({ x: 0, y: 0, safeX: 0, safeY: 0 }, { kind: 'walk', d: 1, k: 3, keep: false }, {}, null, metrics);
    assert.equal(result.unresolved, true);
    assert.equal(result.activeInput, false);
    assert.equal(result.node, undefined);
    assert.equal(metrics.physicsTicks, 320);
  } finally { search.P.step = original; }
});

test('a long active swim is bounded coverage rather than a reported product lock', () => {
  const original = search.P.step;
  const metrics = search.newState().metrics;
  try {
    search.P.step = p => { p.grounded = false; p.inWater = true; return 0; };
    const result = search.simulate({ x: 0, y: 0, safeX: 0, safeY: 0 }, { kind: 'swim', d: 1, wait: 0, stop: null, run: 0 }, { swim: true }, null, metrics);
    assert.equal(result.unresolved, true);
    assert.equal(result.activeInput, true);
    assert.equal(result.rescue, undefined);
    assert.equal(metrics.physicsTicks, 1600);
  } finally { search.P.step = original; }
});

test('rescue uses the safety point updated during the trajectory', () => {
  const original = search.P.step;
  try {
    search.P.step = p => { p.lastSafe.x = 111; p.lastSafe.y = 222; return search.FX.HAZARD; };
    const result = search.simulate({ x: 0, y: 0, safeX: 9, safeY: 10 }, { kind: 'walk', d: 1, k: 3, keep: false }, {}, null);
    assert.deepEqual(result.rescue, { x: 111, y: 222 });
    assert.equal(result.ticks, 1);
  } finally { search.P.step = original; }
});

test('a settled endpoint preserves safety crossed earlier in the trajectory', () => {
  const original = search.P.step;
  try {
    search.P.step = p => {
      p.x = 100; p.y = 100; p.vx = 0; p.vy = 0; p.grounded = true;
      p.lastSafe.x = 303; p.lastSafe.y = 404;
      return 0;
    };
    const state = search.newState();
    search.addNode(state, 0, 100, 0, 100);
    search.explore(state, {});
    const endpoint = [...state.nodes.values()].find(n => n.x === 100);
    assert.ok(endpoint);
    assert.equal(endpoint.safeX, 303);
    assert.equal(endpoint.safeY, 404);
  } finally { search.P.step = original; }
});

test('a deliberately missing start fails instead of returning a pass', () => {
  const original = search.W.findThings;
  try {
    search.W.findThings = function (ch) { return ch === 'S' ? [] : original.call(this, ch); };
    const result = search.runStage(search.STAGES[0]);
    assert.equal(result.status, 'failed');
    assert.equal(result.failures, 1);
    assert.match(result.out.join('\n'), /start is not placed/);
  } finally { search.W.findThings = original; }
});

test('goal coverage rejects square corners outside the runtime interaction radius', () => {
  const thing = { tx: 0, ty: 0 };
  // The old 56px bounding square admitted this point, although it is
  // approximately 78px away and cannot trigger either real interaction.
  const corner = { x: 61, y: 59 };
  assert.equal(search.reachesGoal(corner, thing, 'doubleJump'), false);
  assert.equal(search.reachesGoal(corner, thing, 'finale'), false);
  // Elders trigger within 60px; the finale needs the tighter 56px radius.
  const elderEdge = { x: 65, y: 4 };
  assert.equal(search.reachesGoal(elderEdge, thing, 'doubleJump'), true);
  assert.equal(search.reachesGoal(elderEdge, thing, 'finale'), false);
});

test('worker watchdog produces an incomplete JSON report and nonzero exit', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bubblebug-world-watchdog-'));
  const filename = path.join(directory, 'result.json');
  try {
    const child = spawnSync(process.execPath, [path.join(__dirname, 'verify-world.js'), '--stage', '0', '--jobs', '1', '--timeout-ms', '1', '--json', filename], { encoding: 'utf8', timeout: 10000 });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 2);
    const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(report.status, 'incomplete');
    assert.equal(report.complete, false);
    assert.equal(report.stages[0].status, 'timedOut');
    assert.equal(report.exitCode, 2);
    assert.doesNotMatch(child.stdout, /Sampled reachability checks passed/);
  } finally {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    if (fs.existsSync(filename + '.tmp')) fs.unlinkSync(filename + '.tmp');
    fs.rmdirSync(directory);
  }
});

test('successful search emits measured coverage and explicitly unvalidated route inputs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bubblebug-world-success-'));
  const filename = path.join(directory, 'result.json'), witnesses = path.join(directory, 'witnesses.json');
  try {
    const child = spawnSync(process.execPath, [path.join(__dirname, 'verify-world.js'), '--stage', '0', '--jobs', '1', '--json', filename, '--witnesses', witnesses], { encoding: 'utf8', timeout: 20000 });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stdout + child.stderr);
    const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(report.status, 'passed');
    assert.equal(report.complete, true);
    assert.equal(report.stages[0].queued, 0);
    assert.ok(report.stages[0].nodes > 0);
    assert.ok(report.stages[0].metrics.physicsTicks > 0);
    assert.ok(report.unresolvedTrajectories > 0);
    assert.match(report.scope, /not a complete runtime/);
    const candidate = JSON.parse(fs.readFileSync(witnesses, 'utf8'));
    assert.equal(candidate.validatedInRuntime, false);
    assert.equal(candidate.stages[0].validatedInRuntime, false);
    assert.ok(candidate.stages[0].steps.length > 0);
    for (const step of candidate.stages[0].steps) {
      assert.ok(step.action);
      if (step.action.inputs) assert.equal(step.action.inputs.reduce((sum, run) => sum + run.ticks, 0), step.action.ticks);
    }
  } finally {
    for (const file of [filename, witnesses, filename + '.tmp', witnesses + '.tmp']) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});
