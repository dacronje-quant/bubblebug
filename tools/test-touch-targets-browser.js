'use strict';
// Real browser hit testing: near misses, shared margins, two fingers and release.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const out = path.resolve(process.argv[2] || 'test-output/touch-targets');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER });
  const errors = [], cases = [];
  try {
    for (const [width, height] of [[320,568],[390,844],[568,320],[640,360],[844,390],[1024,768],[1194,450]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href + '#play=phoebe&ab=all&demo=rainbow');
      await page.waitForFunction(() => BB.Play.t > 30);
      await page.evaluate(() => {
        BB.Main.update = () => {};
        BB.Play.intro = BB.Play.iris = BB.Play.kinCard = null; BB.Play.zoneCard = 0;
        document.body.classList.add('has-tricks'); BB.G.resize();
      });
      await page.waitForTimeout(60);
      const cdp = await context.newCDPSession(page);
      const rect = id => page.locator('#' + id).boundingBox();
      const held = () => page.evaluate(() => { BB.Input.poll(); return { ...BB.Input.held }; });
      const send = (type, points = []) => cdp.send('Input.dispatchTouchEvent', {
        type, touchPoints: points.map((p, i) => ({ ...p, id: i + 1, radiusX: 1, radiusY: 1, force: 1 }))
      });
      const end = async (type = 'touchEnd') => {
        await send(type);
        assert.ok(Object.values(await held()).every(v => !v), 'all fingers release on ' + type);
      };
      const geometry = await page.evaluate(() => ({ view: { ...BB.G.view }, top: BB.G.touchPadTop, reserve: BB.G.touchFloorReserve }));
      for (const [id, action] of [['t-left','left'],['t-right','right'],['t-bubble','bubble'],['t-jump','jump'],['t-trick','down']]) {
        const r = await rect(id);
        // Nine pixels above the artwork must hit its transparent margin.
        const p = { x: r.x + r.width / 2, y: r.y - 9 };
        await send('touchStart', [p]);
        const state = await held();
        assert.equal(state[action], true, `${width}x${height} ${id} accepts a near miss`);
        assert.equal(Object.values(state).filter(Boolean).length, 1, 'one action per finger');
        assert.deepEqual(await rect(id), r, 'pressed feedback never shrinks the hit target');
        assert.equal(await page.locator('#' + id).evaluate(el => el.classList.contains('down')), true);
        await end();
      }

      const l = await rect('t-left'), r = await rect('t-right');
      const middle = (l.x + l.width + r.x) / 2;
      const y = l.y + l.height / 2;
      await send('touchStart', [{ x: middle - 1, y }]);
      assert.equal((await held()).left, true, 'left half of shared margin chooses Left');
      await send('touchMove', [{ x: middle + 1, y }]);
      assert.equal((await held()).right, true, 'sliding across midpoint chooses Right');
      assert.equal((await held()).left, false, 'old direction releases');
      await send('touchMove', [{ x: r.x + r.width / 2, y: r.y - 9 }]);
      assert.equal((await held()).right, true, 'slide accepts expanded target');
      await end('touchCancel');

      const j = await rect('t-jump');
      await send('touchStart', [{ x: l.x + l.width / 2, y: l.y - 9 }, { x: j.x + j.width / 2, y: j.y - 9 }]);
      const both = await held();
      assert.ok(both.left && both.jump, 'walking and jumping work with two near-miss touches');
      await end();

      await send('touchStart', [{ x: l.x + l.width / 2, y: l.y - 12 }]);
      assert.ok(Object.values(await held()).every(v => !v), 'outside the margin does not move the kitten');
      await end();
      assert.equal(await page.evaluate(() => document.elementFromPoint(BB.G.view.x + BB.G.view.w / 2, BB.G.view.y + BB.G.view.h / 2).id), 'game', 'open game area remains available');
      assert.deepEqual(await page.evaluate(() => ({ view: { ...BB.G.view }, top: BB.G.touchPadTop, reserve: BB.G.touchFloorReserve })), geometry, 'visual bounds and camera clearance stay steady');
      await page.screenshot({ path: path.join(out, `${width}x${height}-play.png`) });

      // Map/Pause retain their normal scene handlers, including margin taps.
      for (const id of ['pause-btn','map-btn']) {
        const b = await rect(id);
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height + 9);
        assert.equal(await page.evaluate(() => BB.Main.name), 'pause', id + ' margin opens overlay');
        if (id === 'map-btn') assert.equal(await page.evaluate(() => BB.Pause.map), true);
        await page.waitForTimeout(40);
        const close = await rect(id);
        await page.touchscreen.tap(close.x + close.width / 2, close.y + close.height + 9);
        assert.equal(await page.evaluate(() => BB.Main.name), 'play', id + ' margin closes overlay');
        await page.waitForTimeout(40);
      }

      await page.evaluate(() => { document.body.classList.add('in-maze'); });
      await page.waitForTimeout(50);
      for (const [id, action] of [['t-up','up'],['t-down','down']]) {
        const b = await rect(id);
        await send('touchStart', [{ x: b.x + b.width / 2, y: b.y - 9 }]);
        const state = await held();
        assert.equal(state[action], true, 'maze margin accepts ' + action);
        assert.equal(state.jump || state.bubble, false, 'hidden action buttons never activate');
        await end();
      }
      await page.screenshot({ path: path.join(out, `${width}x${height}-maze-controls.png`) });
      await page.evaluate(() => { document.body.classList.remove('in-maze'); BB.Play.openWardrobe(); });
      await page.waitForTimeout(50);
      assert.equal(await page.locator('#touch').isVisible(), false, 'picture menus hide control margins');
      assert.equal(await page.locator('#map-btn').isVisible(), false);
      assert.equal(await page.locator('#pause-btn').isVisible(), false);
      cases.push({ width, height, ...geometry });
      await context.close();
      console.log(`Touch margins passed ${width}x${height}`);
    }
    assert.deepEqual(errors, [], 'no page errors');
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ cases, errors }, null, 2));
    console.log('All nine buttons, shared margins, sliding, multitouch, cancellation and menu visibility passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
