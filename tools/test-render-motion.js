'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const { BB: B } = bootGame();
B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', { cat: 'phoebe' });
const P = B.Play, b = P.pl.body;
P.t = 100; B.G.t = 100;
B.RenderMotion.beforeTick('play');
const start = { x: b.x, y: b.y, cam: B.Camera.x };
b.x += 6; b.y -= 10; P.t++; B.G.t++; B.Camera.x += 4;
const exact = { x: b.x, y: b.y, cam: B.Camera.x, t: P.t };
for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
  B.RenderMotion.draw(alpha, () => {
    assert.equal(b.x, start.x + 6 * alpha); assert.equal(b.y, start.y - 10 * alpha);
    assert.equal(B.Camera.x, start.cam + 4 * alpha); assert.equal(P.t, 100 + alpha);
  });
  assert.deepEqual({ x: b.x, y: b.y, cam: B.Camera.x, t: P.t }, exact);
}
assert.throws(() => B.RenderMotion.draw(0.5, () => { throw Error('draw failed'); }), /draw failed/);
assert.deepEqual({ x: b.x, y: b.y, cam: B.Camera.x, t: P.t }, exact, 'failed rendering restores simulation too');
B.RenderMotion.beforeTick('play'); b.x += 1000;
B.RenderMotion.draw(0.5, () => assert.equal(b.x, exact.x + 1000, 'teleports never smear across the world'));
B.RenderMotion.beforeTick('play'); b.x += 16; B.Camera.snap(P.room, b);
B.RenderMotion.draw(0.25, () => assert.equal(b.x, exact.x + 1016, 'camera snap resets positional interpolation'));
const replaced = B.Physics.newBody(100, 200);
B.RenderMotion.beforeTick('play'); P.pl.body = replaced;
B.RenderMotion.draw(0.5, () => assert.equal(P.pl.body.x, 100, 'a new body never inherits an old render pose'));
B.RenderMotion.reset();
B.RenderMotion.draw(0, () => assert.equal(P.pl.body.x, 100, 'scene changes clear snapshots'));
console.log('Subtick drawing interpolates player/camera/time and restores exact state; throws, snaps, teleports and replaced bodies are safe.');
