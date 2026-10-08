#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const out = process.argv[2];
async function click(page, index, touch) {
  const p = await page.evaluate(index => {
    const b = BB.Title.cbtn(index), v = BB.G.view;
    return { x: v.x + b.x / BB.G.W * v.w, y: v.y + b.y / BB.G.H * v.h };
  }, index);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER });
  const errors = [];
  try {
    if (out) fs.mkdirSync(out, { recursive: true });
    for (const [name, width, height, touch] of [['desktop', 1280, 720, false], ['tablet', 1024, 768, true], ['phone-wide', 844, 390, true], ['phone-tall', 390, 844, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
      await page.waitForFunction(() => BB.Title.t > 16);
      await page.evaluate(() => {
        BB.World.build(); const s = BB.Save.data = BB.Save.fresh();
        BB.Home.familyOrder().forEach(id => { s.family[id] = 1; });
        BB.RAINBOW_KIN.forEach(id => { s.kin[id] = 1; });
        Object.keys(s.abilities).forEach(id => { s.abilities[id] = true; });
        Object.assign(s, { cat: 'phoebe', mazeSolved: true, rainbowUnlocked: true, kinIntro: 1, cloudMask: 63, introDone: 1, leftHome: 1, finale: true });
        for (const th of BB.World.findThings('*').slice(0, 100)) s.sparkles[th.tx + ',' + th.ty] = 1;
        BB.Save.write(); BB.Main.set('title'); BB.Title.choose(1);
      });
      await page.waitForFunction(() => BB.Title.confirm?.t > 10);
      assert.equal(await page.evaluate(() => BB.Title.confirm.focus), 2);
      const saved = await page.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2'));
      if (out) await page.screenshot({ path: path.join(out, name + '-choices.png') });
      await click(page, 2, touch);
      assert.equal(await page.evaluate(() => BB.Title.confirm), null);
      assert.equal(await page.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2')), saved);
      await page.evaluate(() => BB.Title.choose(1));
      await page.waitForFunction(() => BB.Title.confirm?.t > 10);
      await click(page, 1, touch);
      await page.waitForFunction(() => BB.Main.name === 'play' && BB.Play.kinCard && !BB.Main.fadeDir);
      assert.deepEqual(await page.evaluate(() => ({ cat: BB.Play.pl.cat, cats: Object.keys(BB.Play.save.family).length, kin: Object.keys(BB.Play.save.kin).length, mask: BB.Play.save.cloudMask, stars: Object.keys(BB.Play.save.sparkles).length, skills: Object.values(BB.Play.save.abilities).every(Boolean) })), { cat: 'phoebe', cats: 12, kin: 0, mask: 0, stars: 100, skills: true });
      await page.reload(); await page.waitForFunction(() => BB.Title.t > 16);
      await page.keyboard.press('Enter'); await page.waitForFunction(() => BB.Main.name === 'play');
      assert.equal(await page.evaluate(() => Object.keys(BB.Play.save.kin).length), 0);
      assert.equal(await page.evaluate(() => Object.keys(BB.Play.save.family).length), 12);
      await page.evaluate(() => { BB.Play.writeSave(); BB.Main.set('title'); BB.Title.choose(1); });
      await page.waitForFunction(() => BB.Title.confirm?.t > 10);
      await click(page, 0, touch);
      await page.waitForFunction(() => BB.Title.confirm?.stage === 'all' && BB.Title.confirm.t > 10);
      assert.equal(await page.evaluate(() => BB.Title.confirm.focus), 1);
      if (out) await page.screenshot({ path: path.join(out, name + '-full-reset.png') });
      await click(page, 0, touch);
      await page.waitForFunction(() => BB.Main.name === 'select');
      assert.deepEqual(await page.evaluate(() => ({ cats: Object.keys(BB.Save.data.family).length, kin: Object.keys(BB.Save.data.kin).length, skills: Object.values(BB.Save.data.abilities).some(Boolean), rainbow: BB.Save.data.rainbowUnlocked, stored: localStorage.getItem('bubblebug_kingdom_v2') })), { cats: 0, kin: 0, skills: false, rainbow: false, stored: null });
      await page.keyboard.press('Enter'); await page.waitForFunction(() => BB.Main.name === 'play' && !BB.Main.fadeDir);
      assert.equal(await page.evaluate(() => BB.Play.room.id), 'hm');
      assert.equal(await page.evaluate(() => BB.Play.wardrobeTabs()), 5);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      console.log('✓ ' + name + ': both picture choices, safe cancel, family reload and full reset through a new playable game');
      await context.close();
    }
    assert.deepEqual(errors, []); console.log('✓ zero runtime errors in desktop/tablet/phone reset flows');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
