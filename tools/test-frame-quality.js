'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function boot() {
  let resized = 0;
  const B = { CFG: { MAX_RENDER_SCALE: 2 }, lerp: (a, b, k) => a + (b - a) * k,
    G: { maxScale: 2, scale: 2, resize() { this.scale = this.maxScale; resized++; } }, Tiles: { clear() {} } };
  const document = { hidden: false }, context = { window: { BB: B }, document, Math };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/engine/frame-quality.js'), 'utf8'), context);
  return { B, document, resized: () => resized };
}
for (const hz of [30, 60, 90, 120]) {
  const { B, document, resized } = boot(), period = 1000 / hz;
  const run = (seconds, work, draw) => { for (let i = 0; i < hz * seconds; i++) B.FrameQuality.sample(period, work, draw); };
  run(30, period * 0.2, period * 0.1);
  assert.equal(B.G.maxScale, 2, `${hz} Hz with spare time preserves full quality`);
  assert.equal(resized(), 0);
  run(1, period * 0.95, period * 0.6);
  assert.equal(B.G.maxScale, 2, 'brief load does not lower quality');
  run(12, period * 0.95, period * 0.6);
  assert.ok(B.G.maxScale < 2, `${hz} Hz sustained drawing load lowers resolution`);
  const low = B.G.maxScale;
  document.hidden = true; run(30, 0, 0);
  assert.equal(B.G.maxScale, low, 'hidden time cannot count toward recovery');
  document.hidden = false;
  B.FrameQuality.sample(1000, 0, 0);
  assert.equal(B.G.maxScale, low, 'a background gap cannot recover quality');
  run(55, period * 0.15, period * 0.1);
  assert.equal(B.G.maxScale, 2, `${hz} Hz restores full quality after sustained headroom`);
  run(20, period * 0.95, period * 0.05);
  assert.equal(B.G.maxScale, 2, 'lowering drawing resolution cannot fix a simulation-only bottleneck');
}
console.log('Quality preserves healthy 30/60/90/120 Hz displays, ignores spikes/hidden gaps, lowers sustained rendering load and recovers.');
