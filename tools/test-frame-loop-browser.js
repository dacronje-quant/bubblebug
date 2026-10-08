'use strict';
// Drive the actual rAF game loop at tablet cadences with real canvas drawing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const URL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const out = path.join(__dirname, '..', 'test-output', 'frame-loop');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const errors = [], results = [];
    for (const hz of [30, 60, 90, 120]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.testClock = 0;
        Object.defineProperty(performance, 'now', { value: () => window.testClock });
        window.requestAnimationFrame = callback => { window.testNextFrame = callback; return 1; };
        window.testFrame = time => { window.testClock = time; window.testNextFrame(time); };
      });
      await page.goto(URL);
      const result = await page.evaluate(hz => {
        const B = BB, P = B.Play;
        B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
        B.Main.set('play', { cat: 'phoebe' });
        const room = B.World.byId.hm;
        P.pl.body = B.Physics.newBody((room.x + 8) * 32, (room.y + 32) * 32 - 24);
        P.pl.body.grounded = true; P.pl.body.groundKind = 1; P.iris = null;
        B.Camera.snap(room, P.pl.body); B.RenderMotion.reset();
        const samples = [], draw = B.Player.draw;
        B.Player.draw = (c, player, camera, ab) => { samples.push({ x: player.body.x, tick: P.save.playTicks }); return draw(c, player, camera, ab); };
        const before = P.save.playTicks, cap = B.G.maxScale;
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        for (let i = 1; i <= hz * 2; i++) window.testFrame(i * 1000 / hz);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
        const physics = P.pl.body.x;
        const canonical = JSON.stringify({ body: P.pl.body, camera: { x: B.Camera.x, y: B.Camera.y },
          t: P.t, particles: B.Particles.list, ambient: B.Particles.ambient, rain: B.Particles.rain,
          signFade: P.signFade, zoneCard: P.zoneCard, flash: P.flash, narrowDim: P.narrowDim });
        for (let i = 0; i < 12; i++) B.Main.draw(i / 12);
        const restored = JSON.stringify({ body: P.pl.body, camera: { x: B.Camera.x, y: B.Camera.y },
          t: P.t, particles: B.Particles.list, ambient: B.Particles.ambient, rain: B.Particles.rain,
          signFade: P.signFade, zoneCard: P.zoneCard, flash: P.flash, narrowDim: P.narrowDim });
        const between = samples.slice(0, hz * 2).filter((p, i, arr) => i > 20 && p.tick === arr[i - 1].tick && Math.abs(p.x - arr[i - 1].x) > 0.01).length;
        return { hz, ticks: P.save.playTicks - before, physics, cap, finalCap: B.G.maxScale,
          between, pure: canonical === restored, samples: samples.slice(20, 26) };
      }, hz);
      assert.ok(result.ticks >= 119 && result.ticks <= 120, `${hz} Hz runs sixty simulation ticks per second`);
      assert.equal(result.finalCap, result.cap, `${hz} Hz healthy cadence keeps quality`);
      assert.equal(result.pure, true, 'drawing fractional poses preserves simulation and effects');
      if (hz > 60) assert.ok(result.between > hz / 2, `${hz} Hz draws motion on frames between simulation ticks`);
      await page.screenshot({ path: path.join(out, hz + 'hz.png') });
      results.push(result); await page.close();
    }
    assert.ok(Math.max(...results.map(r => r.physics)) - Math.min(...results.map(r => r.physics)) <= 7, 'cadence does not change game speed (one tick tolerance)');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    console.log('Real browser loop keeps 60 Hz physics, draws between ticks at 90/120 Hz, preserves state and healthy quality at every cadence.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
