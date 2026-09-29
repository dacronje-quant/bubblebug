#!/usr/bin/env node
// Verify the new Easy / Medium / Hard choices against real play and input.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');
const MODE_KEY = 'bubblepaws_difficulty', OLD_KEY = 'bubblepaws_hard';

function checks() {
  for (const [storage, expected] of [
    [[], 'easy'],
    [[[OLD_KEY, '0']], 'medium'],
    [[[OLD_KEY, '1']], 'hard'],
    [[['bubblebug_kingdom_v2', JSON.stringify({ v: 4, cat: 'phoebe' })]], 'medium'],
    [[[MODE_KEY, 'easy'], [OLD_KEY, '1']], 'easy'],
    [[[MODE_KEY, 'medium'], [OLD_KEY, '1']], 'medium'],
    [[[MODE_KEY, 'invalid'], [OLD_KEY, '1']], 'hard'],
  ]) {
    const g = bootGame(null, { storage });
    assert.equal(g.BB.Settings.difficulty, expected);
    assert.equal(g.BB.Settings.assists, expected === 'easy');
    assert.equal(g.BB.Settings.hard, expected === 'hard');
  }
  const first = bootGame(); first.BB.Save.write();
  assert.equal(bootGame(null, { storage: [...first.storage] }).BB.Settings.difficulty, 'easy');
  console.log('✓ old Easy becomes Medium, old Hard stays Hard, and fresh devices get new Easy');

  const g = bootGame(), B = g.BB;
  g.tick(20);
  const press = code => { g.tick(1, [code]); g.tick(); };
  press('ArrowDown'); assert.equal(B.Title.focus, 2);
  press('ArrowRight'); assert.equal(B.Settings.difficulty, 'medium');
  press('ArrowRight'); assert.equal(B.Settings.difficulty, 'hard');
  press('ArrowLeft'); assert.equal(B.Settings.difficulty, 'medium');
  press('Space'); assert.equal(B.Settings.difficulty, 'hard');
  press('Space'); assert.equal(B.Settings.difficulty, 'easy');
  press('ArrowUp'); assert.equal(B.Title.focus, 1); assert.equal(B.Settings.difficulty, 'easy');
  for (const [i, mode] of ['easy', 'medium', 'hard'].entries()) {
    const p = B.Title.mbtn(i); B.Input.pointers.push({ x: p.x, y: p.y }); g.tick();
    assert.equal(B.Settings.difficulty, mode);
    assert.equal(bootGame(null, { storage: [...g.storage] }).BB.Settings.difficulty, mode);
  }
  B.Settings.setDifficulty('invalid'); assert.equal(B.Settings.difficulty, 'hard');
  B.Save.reset(); assert.equal(g.storage.get(MODE_KEY), 'hard');
  console.log('✓ keyboard and touch choose all three modes; the choice survives reload and New Game');

  const arcs = {};
  for (const mode of ['easy', 'medium', 'hard']) {
    const game = bootGame(), bb = game.BB;
    bb.Settings.setDifficulty(mode);
    bb.Save.data = bb.Save.fresh(); bb.Save.data.introDone = 1; bb.Save.data.leftHome = 1;
    bb.Main.set('play', {}); game.place('ng', 5, 31); game.tick(2);
    const samples = [];
    const step = bb.Physics.step, assists = [];
    bb.Physics.step = function (body, input, abilities, easy) {
      assists.push(easy); return step(body, input, abilities, easy);
    };
    for (let i = 0; i < 75; i++) {
      game.tick(1, ['Space']);
      const p = bb.Play.pl.body; samples.push([p.y, p.vy, p.grounded]);
    }
    assert.ok(assists.length > 0); assert.ok(assists.every(value => value === (mode === 'easy')));
    arcs[mode] = samples;
    bb.Play.invuln = 0; bb.Play.mood = bb.CFG.MOOD_MAX;
    assert.equal(bb.Play.hurt(bb.Play.pl.body.x - 20), true);
    assert.equal(bb.Play.mood, bb.CFG.MOOD_MAX - (mode === 'hard' ? 1 : 0));
  }
  assert.deepEqual(arcs.medium, arcs.hard);
  assert.notDeepEqual(arcs.easy, arcs.medium);
  assert.equal(Math.min(...arcs.easy.map(p => p[0])), Math.min(...arcs.medium.map(p => p[0])));
  console.log('✓ only new Easy uses assists; Medium keeps original movement and harmless bumps');
}

if (require.main === module) {
  checks();
  const at = process.argv.indexOf('--render');
  if (at >= 0) {
    const { createCanvas } = require('@napi-rs/canvas');
    const g = bootGame(createCanvas), dir = path.resolve(process.argv[at + 1]);
    fs.mkdirSync(dir, { recursive: true }); g.tick(20);
    for (const mode of ['easy', 'medium', 'hard']) {
      g.BB.Title.setMode(mode); g.tick(20); g.BB.Main.draw();
      fs.writeFileSync(path.join(dir, mode + '.png'), g.BB.G.canvas.toBuffer('image/png'));
    }
    console.log('✓ three-mode title screens rendered to ' + dir);
  }
}
module.exports = { checks };
