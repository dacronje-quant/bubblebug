'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url'), { chromium } = require('playwright');
const out = path.resolve(process.argv[2] || 'test-output/skill-prompts');
const skills = ['doubleJump', 'wallClimb', 'glow', 'float', 'swim', 'dig', 'spring', 'rings', 'bubbleBounce', 'wings'];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER });
  const errors = [], results = [];
  try {
    for (const [width, height, touch] of [[960, 540, false], [320, 568, true], [844, 390, true], [1024, 768, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href + '#play=phoebe&ab=all');
      await page.waitForFunction(() => BB.Play.t > 15);
      await page.evaluate(touch => {
        BB.Main.update = () => {}; const P = BB.Play;
        P.intro = P.iris = P.gift = null; P.zoneCard = 0; P.pl.state = 'play';
        if (touch) BB.Input.enableTouch(); BB.Input.device = touch ? 'touch' : 'keyboard';
        BB.G.resize();
      }, touch);
      for (const ability of skills) {
        const sample = await page.evaluate(ability => {
          const S = BB.SkillPrompts, P = BB.Play, spec = S.lesson(ability, P.save.abilities), layout = S.layout();
          // Render only the actual lesson once with a text spy, then through the scene.
          const c = BB.G.ctx, fillText = c.fillText; let words = 0;
          c.fillText = function (...args) { words++; return fillText.apply(this, args); };
          try { BB.G.begin(); S.draw(c, ability, spec.prefix.length * S.BEAT + S.BEAT, P.pl.cat, 1, P.save.abilities); }
          finally { c.fillText = fillText; }
          P.gift = { ability, t: 111 + spec.prefix.length * S.BEAT + S.BEAT, card: 1, lessonStart: 111 };
          BB.Main.draw();
          const view = BB.G.view, ratio = view.w / BB.G.W;
          return { ability, words, layout, css: { x: view.x + layout.x * ratio, y: view.y + layout.y * ratio,
            w: layout.w * ratio, h: layout.h * ratio }, padTop: BB.G.touchPadTop, touch: BB.Input.touchEnabled,
            chrome: ['map-btn', 'pause-btn'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }) };
        }, ability);
        assert.equal(sample.words, 0, ability + ' has no text or digits');
        assert.ok(sample.layout.x >= 0 && sample.layout.y >= 0);
        assert.ok(sample.layout.x + sample.layout.w <= 960 && sample.layout.y + sample.layout.h <= 540);
        if (touch) assert.ok(sample.css.y + sample.css.h < sample.padTop, ability + ' stays above the real touch row');
        const overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
        assert.ok(sample.chrome.every(r => !overlaps(sample.css, r)), ability + ' clears map and pause buttons');
        await page.screenshot({ path: path.join(out, `${ability}-${width}x${height}.png`) });
        results.push({ width, height, ...sample });
      }
      // Real canvas clicks must replay and continue, including phone input.
      await page.evaluate(() => {
        const P = BB.Play; P.gift = null; P.pl.state = 'play';
        P.startGift({ ability: 'bubbleBounce', x: P.pl.body.x, y: P.pl.body.y });
        P.gift.t = 110; P.updateGift(); P.gift.t += 120; BB.Main.draw();
      });
      const point = async name => page.evaluate(name => {
        const p = BB.SkillPrompts.layout()[name], v = BB.G.view;
        return { x: v.x + p.x * v.w / BB.G.W, y: v.y + p.y * v.h / BB.G.H };
      }, name);
      const replay = await point('replay');
      if (touch) await page.touchscreen.tap(replay.x, replay.y); else await page.mouse.click(replay.x, replay.y);
      const replayed = await page.evaluate(() => { const P = BB.Play; P.updateGift(); return { reset: P.gift.lessonStart === P.gift.t, closing: !!P.gift.closing }; });
      assert.equal(replayed.reset, true); assert.equal(replayed.closing, false);
      const next = await point('next');
      if (touch) await page.touchscreen.tap(next.x, next.y); else await page.mouse.click(next.x, next.y);
      assert.equal(await page.evaluate(() => { BB.Play.updateGift(); return !!BB.Play.gift.closing; }), true);
      for (const device of ['keyboard', 'gamepad']) {
        await page.evaluate(device => { BB.Input.device = device; BB.Play.gift = { ability: 'bubbleBounce', t: 200, card: 1, lessonStart: 111 }; BB.Main.draw(); }, device);
        if (width === 960) await page.screenshot({ path: path.join(out, `input-${device}.png`) });
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log('All ten picture prompts: four viewports, no text, touch-row clearance, real replay/continue clicks, keyboard/gamepad drawings, no runtime errors.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
