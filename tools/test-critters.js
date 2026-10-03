#!/usr/bin/env node
// Render every critter through its real entity/update/draw path, checking
// animation, canvas isolation and that drawing leaves progress untouched.
// Requires @napi-rs/canvas. Optional gallery: node tools/test-critters.js DIR
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { bootGame } = require('./test-neighbourhood');
const { createCanvas } = (() => {
  try { return require('@napi-rs/canvas'); }
  catch (e) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
    return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas'));
  }
})();

const g = bootGame(createCanvas), B = g.BB;
B.Save.data.introDone = 1; B.Main.set('play', {});
g.place('ng', 26, 31);
const room = B.World.byId.ng, ctx = B.Play.ctx();
const shape = { tx: room.x + 12, ty: room.y + 30, ch: 'b' };
const kinds = B.Critters.KINDS, frame = createCanvas(128, 128), c = frame.getContext('2d');
const gallery = createCanvas(1400, Math.ceil(kinds.length / 7) * 156), gc = gallery.getContext('2d');
gc.fillStyle = '#f6f1fa'; gc.fillRect(0, 0, gallery.width, gallery.height);
const saved = JSON.stringify(B.Play.save);
const silhouettes = new Set();
const render = b => {
  c.clearRect(0, 0, 128, 128);
  const before = JSON.stringify(b);
  B.Bugs.draw(c, b, { x: b.x - 64, y: b.y - 70 });
  assert.equal(JSON.stringify(b), before, b.kind + ' rendering must not change the entity');
  const matrix = c.getTransform();
  assert.deepEqual([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f], [1, 0, 0, 1, 0, 0]);
  assert.equal(c.globalAlpha, 1);
  const pixels = c.getImageData(0, 0, 128, 128).data;
  let ink = 0, edge = 0;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    if (pixels[(y * 128 + x) * 4 + 3]) {
      ink++;
      // A dangling spider's thread continues to the world ceiling.
      const thread = b.behavior === 'dangle' && y < 2 && Math.abs(x - 64) < 2;
      if ((x < 2 || x > 125 || y < 2 || y > 125) && !thread) edge++;
    }
  }
  assert.ok(ink > 160, b.kind + ' must remain visible');
  assert.equal(edge, 0, b.kind + ' art and cloud must fit its frame');
  return frame.toBuffer('image/png');
};
for (const [i, kind] of kinds.entries()) {
  const key = shape.tx + ',' + shape.ty;
  const b = B.Bugs.create(shape, room, { friends: { [key]: 1 } }, 0, kind);
  b.t = 20; b.pauseT = 0;
  const first = render(b);
  silhouettes.add(first.toString('base64'));
  assert.deepEqual(render(b), first, kind + ' drawing must be deterministic');
  for (let n = 0; n < 28; n++) B.Bugs.update(b, ctx);
  const animated = render(b);
  assert.notDeepEqual(animated, first, kind + ' must animate through actual updates');
  assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
  gc.fillStyle = '#ffffff'; gc.beginPath(); gc.roundRect(i % 7 * 200 + 8, Math.floor(i / 7) * 156 + 7, 184, 140, 20); gc.fill();
  B.Critters.drawBug(gc, kind, i % 7 * 200 + 100, Math.floor(i / 7) * 156 + 85,
    { t: b.t, mood: 0, facing: 1, scale: 2.4, blink: b.blink, walk: b.moving, step: b.stepT, noCloud: true });
  gc.fillStyle = '#705771'; gc.font = '15px sans-serif'; gc.textAlign = 'center';
  gc.fillText(kind, i % 7 * 200 + 100, Math.floor(i / 7) * 156 + 136);
  B.Bugs.hit(b, ctx); B.Bugs.update(b, ctx);
  assert.ok(b.greetT > 0); render(b);
  b.landT = 9; render(b);
  b.state = 'gloomy'; b.mood = b.visualMood = 1; render(b);
}
assert.equal(JSON.stringify(B.Play.save), saved);
assert.equal(silhouettes.size, kinds.length, 'every species must have its own art');
// A garden dance refreshes danceT each tick. Its pose must still animate.
const dancer = B.Bugs.create(shape, room, { friends: { [shape.tx + ',' + shape.ty]: 1 } }, 0, 'bunny');
dancer.t = 32; dancer.danceT = 30; const danceA = render(dancer);
dancer.t += 14; dancer.danceT = 30;
assert.notDeepEqual(render(dancer), danceA);
console.log('✓ all ' + kinds.length + ' critters animate, greet, land and show moods; rendering preserves entities, canvas state and saves');
if (process.argv[2]) {
  const dir = path.resolve(process.argv[2]); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'critter-gallery.png'), gallery.toBuffer('image/png'));
  console.log('✓ critter gallery rendered to ' + dir);
}
