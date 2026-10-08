'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const out = path.resolve(process.argv[2] || 'test-output/skill-controls');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER });
  const errors = [], results = [];
  try {
    for (const [width, height] of [[960, 540], [390, 844], [844, 390], [1024, 768]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href + '#play=phoebe&ab=all');
      await page.waitForFunction(() => BB.Play.t > 10);
      await page.evaluate(() => {
        BB.Main.update = () => {}; BB.Play.intro = BB.Play.iris = BB.Play.gift = null;
        BB.Play.zoneCard = 0;
        window.skillTile = BB.World.tile;
        window.skillPoll = BB.Input.poll.bind(BB.Input);
        BB.Input.poll = () => {}; // Keep the animation loop from consuming edges before our fixed tick.
        window.skillShots = 0; window.skillPad = [];
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => skillPad });
        window.skillReset = () => {
          BB.Input.clearAll(); skillPoll();
          BB.World.tile = (x, y) => y >= 100 ? '#' : '.';
          const p = BB.Play.pl = BB.Player.create(0, 3200 - BB.CFG.PH, 'phoebe');
          p.body.grounded = true; skillShots = 0;
        };
        window.skillStep = () => {
          skillPoll();
          const p = BB.Play.pl;
          const fx = BB.Player.update(p, BB.Input, BB.Play.save.abilities,
            { bubbleCount: 0, blow: () => skillShots++ });
          return { fx, shots: skillShots, used: p.body.bbUsed };
        };
      });
      const sample = () => page.evaluate(() => skillStep());
      const prepare = () => page.evaluate(() => skillReset());
      // Actual keyboard events through BB.Input; hold never repeats a jump.
      await prepare();
      const keyTap = async keys => {
        for (const key of keys) await page.keyboard.down(key);
        const result = await sample();
        for (const key of keys) await page.keyboard.up(key);
        await sample(); return result;
      };
      assert.ok((await keyTap(['Space'])).fx & 1);
      for (let i = 0; i < 4; i++) await sample();
      assert.ok((await keyTap(['Space'])).fx & 2);
      const both = await keyTap(['Space', 'KeyX']);
      assert.ok(both.fx & 2048); assert.equal(both.shots, 1);
      assert.ok((await keyTap(['Space'])).fx & 4096);
      // Standard gamepad A jumps; B shoots without consuming the bounce.
      await prepare();
      const pad = async indices => page.evaluate(indices => {
        skillPad = [{ connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, (_, i) =>
          ({ pressed: indices.includes(i), value: indices.includes(i) ? 1 : 0 })) }];
      }, indices);
      const padTap = async indices => { await pad(indices); const result = await sample(); await pad([]); await sample(); return result; };
      assert.ok((await padTap([0])).fx & 1);
      for (let i = 0; i < 4; i++) await sample();
      const airShot = await padTap([1]); assert.equal(airShot.shots, 1); assert.equal(airShot.used, false);
      assert.ok((await padTap([0])).fx & 2);
      assert.ok((await padTap([0])).fx & 2048);
      assert.ok((await padTap([0])).fx & 4096);
      await page.evaluate(() => { skillPad = []; });
      // Actual phone/tablet pointer input, including two fingers together.
      await prepare(); await page.evaluate(() => BB.Input.enableTouch());
      const cdp = await context.newCDPSession(page);
      const point = async id => { const r = await page.locator('#' + id).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
      const jump = await point('t-jump'), bubble = await point('t-bubble');
      const touchTap = async points => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.map((p, i) => ({ ...p, id: i + 1 })) });
        const result = await sample();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sample(); return result;
      };
      assert.ok((await touchTap([jump])).fx & 1);
      for (let i = 0; i < 4; i++) await sample();
      assert.ok((await touchTap([jump])).fx & 2);
      const touchBoth = await touchTap([jump, bubble]);
      assert.ok(touchBoth.fx & 2048); assert.equal(touchBoth.shots, 1);
      assert.ok((await touchTap([jump])).fx & 4096);
      const glow = await page.evaluate(() => {
        BB.World.tile = skillTile;
        const r = BB.World.byId.h4, row = r.grid.findIndex(row => row.includes(':')), col = r.grid[row].indexOf(':');
        const wx = (r.x + col) * 32 + 16, wy = (r.y + row) * 32 + 4;
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
        const c = cv.getContext('2d'), oldW = BB.G.W, oldH = BB.G.H, oldGlow = BB.G.drawGlow;
        BB.G.W = 256; BB.G.H = 128;
        function render(offset, distance, on = true) {
          const cam = { x: wx - 80 + offset, y: wy - 40 }, calls = [];
          c.clearRect(0, 0, 256, 128);
          BB.G.drawGlow = (...args) => { calls.push(args.slice(0, 5)); return oldGlow(...args); };
          BB.Tiles.drawLive(c, r, cam, 0, { glow: on, px: wx + distance, py: wy });
          const call = calls.find(v => Math.abs(v[0] - (wx - cam.x)) < 0.01 && Math.abs(v[1] - (wy - cam.y)) < 0.01);
          const data = c.getImageData(0, 0, 256, 128).data;
          return { radius: call && call[2], alpha: call && call[4], visible: Array.from(data).filter((v, i) => i % 4 === 3 && v > 180).length };
        }
        let near, moved, far, closed;
        try { near = render(0, 0); moved = render(10, 0); far = render(0, 1000); closed = render(0, 0, false); }
        finally { BB.G.drawGlow = oldGlow; BB.G.W = oldW; BB.G.H = oldH; }
        const P = BB.Play; P.room = r; P.prevRoom = null; P.enterZone(r.zone);
        P.pl = BB.Player.create(wx - BB.CFG.PW / 2, (r.y + row) * 32 - BB.CFG.PH, 'phoebe');
        P.pl.body.grounded = true; BB.Camera.snap(r, P.pl.body); P.zoneCard = 0;
        return { near, moved, far, closed };
      });
      assert.equal(glow.near.radius, 46); assert.equal(glow.moved.radius, 46);
      assert.equal(glow.far.radius, 30); assert.ok(glow.near.alpha > glow.far.alpha);
      assert.ok(glow.near.visible > glow.closed.visible, 'open bridge has a clear walking surface');
      await page.screenshot({ path: path.join(out, `glow-${width}x${height}.png`) });
      for (const [ability, t] of [['glow', 70], ['bubbleBounce', 83]]) {
        await page.evaluate(({ ability, t }) => {
          BB.Play.gift = { ability, t, card: 1 }; BB.Main.draw();
        }, { ability, t });
        await page.screenshot({ path: path.join(out, `${ability}-card-${width}x${height}.png`) });
      }
      results.push({ width, height, keyboard: true, gamepad: true, touch: true, glow });
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log('Keyboard, gamepad and multitouch jump/shoot sequences; Glow camera invariance/brightness; both skill cards: four viewports, no runtime errors.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
