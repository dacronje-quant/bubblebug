#!/usr/bin/env node
// Optional real-browser checks. Requires Playwright and its Chromium,
// or BUBBLEPAWS_BROWSER pointing to a compatible browser executable.
// node tools/test-browser.js [screenshot-directory]
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = (() => {
  try { return require('playwright'); }
  catch (e) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
    return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  }
})();
const ROOT = path.resolve(__dirname, '..');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const out = process.argv[2] && path.resolve(process.argv[2]);
const pause = page => page.waitForTimeout(120);
async function tap(page, x, y, touch = false) {
  const p = await page.evaluate(({ x, y }) => ({
    x: BB.G.view.x + x / BB.G.W * BB.G.view.w,
    y: BB.G.view.y + y / BB.G.H * BB.G.view.h,
  }), { x, y });
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await pause(page);
}
async function place(page, id, col, floor) {
  await page.evaluate(({ id, col, floor }) => {
    const P = BB.Play, r = BB.World.byId[id];
    if (P.room !== r) P.leaveRoom(P.room);
    P.room = r; P.prevRoom = null; P.enterZone(r.zone);
    P.wardrobe = null; P.gardenChoice = null; P.gardenHold = 0;
    P.pl.state = 'play'; P.intro = null; P.traveling = null; P.linkLock = null;
    P.pl.body = BB.Physics.newBody((r.x + col) * 32 + 6, (r.y + floor) * 32 - 24);
    P.pl.body.grounded = true; P.pl.body.groundKind = 1;
    P.checkpoint = { x: P.pl.body.x, y: P.pl.body.y }; P.pendingCP = false;
    P.invuln = 60; BB.Camera.snap(r, P.pl.body);
  }, { id, col, floor });
}
async function shot(page, name) {
  if (out) await page.screenshot({ path: path.join(out, name + '.png') });
}

(async () => {
  if (out) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const errors = [];
  const watch = page => page.on('pageerror', e => errors.push(e.message));
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
    const page = await context.newPage(); watch(page);
    await page.goto(URL); await page.waitForFunction(() => BB.Title.t > 16);
    await page.keyboard.press('ArrowDown'); await pause(page);
    await page.keyboard.press('ArrowRight'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Settings.difficulty), 'medium');
    await page.keyboard.press('ArrowRight'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Settings.difficulty), 'hard');
    for (const [i, mode] of [[0, 'easy'], [1, 'medium'], [2, 'hard'], [1, 'medium']]) {
      const p = await page.evaluate(i => BB.Title.mbtn(i), i);
      await tap(page, p.x, p.y);
      assert.equal(await page.evaluate(() => BB.Settings.difficulty), mode);
    }
    await shot(page, 'title-medium');
    await page.evaluate(() => {
      BB.World.build(); const s = BB.Save.data = BB.Save.fresh(); s.introDone = 1;
      for (const t of BB.World.findThings('*').slice(0, 250)) s.sparkles[t.tx + ',' + t.ty] = 1;
      BB.Main.set('play', {}); BB.Save.write();
    });
    const mirror = await page.evaluate(() => BB.Home.MIRROR_COL);
    await place(page, 'hm', mirror - 0.5, 32);
    await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await page.keyboard.down('KeyX'); await page.waitForTimeout(350); await page.keyboard.up('KeyX');
    assert.equal(await page.evaluate(() => BB.Play.save.starsSpent), 0);
    const previousHead = await page.evaluate(() => BB.Play.save.wear.head);
    await page.keyboard.press('ArrowUp'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.focus), 'tabs');
    assert.equal(await page.evaluate(() => BB.Play.save.wear.head), previousHead);
    await page.keyboard.press('ArrowRight'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.tab), 1);
    await page.keyboard.press('ArrowDown'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.focus), 'items');
    await tap(page, 621, 88); await tap(page, 593, 246); await tap(page, 593, 246);
    assert.equal(await page.evaluate(() => BB.Play.save.starsSpent), 0);
    await tap(page, 769, 150); await tap(page, 769, 150);
    assert.equal(await page.evaluate(() => BB.Play.save.cosmetics.bubble), 'flower');
    await shot(page, 'mirror-styles'); await tap(page, 776, 438);
    await page.waitForFunction(() => !BB.Play.wardrobe);
    await place(page, 'hm', 57, 32); await page.keyboard.down('ArrowRight');
    const walk = await page.evaluate(() => {
      const seen = new Set(); let safe = true;
      for (let i = 0; i < 1100 && BB.Play.room.id !== 'g1'; i++) {
        BB.Input.poll(); BB.Main.update(); seen.add(BB.Play.room.id);
        if (BB.Play.traveling || BB.Camera.sliding || BB.Play.pl.state !== 'play') safe = false;
      }
      return { seen: [...seen], room: BB.Play.room.id, safe };
    });
    await page.keyboard.up('ArrowRight');
    assert.equal(walk.room, 'g1'); assert.equal(walk.safe, true);
    for (const id of ['ng', 'np', 'nr', 'g1']) assert.ok(walk.seen.includes(id));
    await shot(page, 'garden-entry');
    const saved = await page.evaluate(() => ({
      mode: BB.Settings.difficulty, spent: BB.Play.save.starsSpent,
      trail: BB.Play.save.cosmetics.trail, bubble: BB.Play.save.cosmetics.bubble,
      stars: Object.keys(BB.Play.save.sparkles).sort(),
    }));
    assert.equal(saved.spent, 0); assert.ok(saved.stars.length >= 260);
    await page.reload(); await page.waitForFunction(() => BB.Title.t > 16);
    await page.keyboard.press('Space'); await page.waitForFunction(() => BB.Main.name === 'play');
    assert.deepEqual(await page.evaluate(() => ({
      mode: BB.Settings.difficulty, spent: BB.Play.save.starsSpent,
      trail: BB.Play.save.cosmetics.trail, bubble: BB.Play.save.cosmetics.bubble,
      stars: Object.keys(BB.Play.save.sparkles).sort(),
    })), saved);
    // Completed save fixture: changing the playable kitten through the
    // real keyboard category navigation must also survive Continue.
    await page.evaluate(() => {
      BB.Play.save.finale = true; BB.Play.save.mazeSolved = true;
      BB.Home.familyOrder().forEach(id => { BB.Play.save.family[id] = 1; });
    });
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await page.keyboard.press('ArrowUp'); await pause(page);
    for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await pause(page); }
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.tab), 3);
    await page.keyboard.press('ArrowDown'); await pause(page);
    await page.keyboard.press('ArrowRight'); await pause(page); await page.keyboard.press('ArrowRight'); await pause(page);
    await page.keyboard.press('Enter'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.pl.cat), 'rainbow');
    await shot(page, 'mirror-kittens'); await tap(page, 776, 438);
    await page.reload(); await page.waitForFunction(() => BB.Title.t > 16);
    await page.keyboard.press('Space'); await page.waitForFunction(() => BB.Main.name === 'play');
    assert.equal(await page.evaluate(() => BB.Play.pl.cat), 'rainbow');
    assert.equal(await page.evaluate(() => Object.keys(BB.Play.save.sparkles).length), saved.stars.length);
    const normal = await page.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2'));
    await page.goto(pathToFileURL(path.join(ROOT, 'try-rewards.html')).href);
    await page.waitForFunction(() => BB.Save.preview && BB.Main.name === 'play');
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await tap(page, 505, 150); await tap(page, 776, 438); await page.reload();
    await page.waitForFunction(() => BB.Save.preview);
    assert.equal(await page.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2')), normal);
    await place(page, 'hm', 2, 32); await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => BB.Play.maze !== null); await page.keyboard.up('ArrowLeft');
    await shot(page, 'hedge-maze');
    await page.evaluate(() => { BB.Play.maze.choice = true; BB.Play.maze.choiceT = 10; BB.Play.maze.sel = 2; });
    await shot(page, 'kitten-choices');
    await page.evaluate(() => BB.Play.closeMaze());
    console.log('✓ Chromium: keyboard categories, free milestones, hedge maze, styles, continuous walk, reload and safe preview');
    await context.close();

    const tablet = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
    const touch = await tablet.newPage(); watch(touch);
    await touch.goto(URL); await touch.waitForFunction(() => BB.Title.t > 16);
    await tap(touch, 790, 466, true); assert.equal(await touch.evaluate(() => BB.Settings.difficulty), 'medium');
    await touch.goto(pathToFileURL(path.join(ROOT, 'try-rewards.html')).href);
    await touch.waitForFunction(() => BB.Save.preview && BB.Main.name === 'play');
    await place(touch, 'hm', mirror - 0.5, 32); await touch.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await tap(touch, 505, 150, true); assert.equal(await touch.evaluate(() => BB.Play.save.starsSpent), 0);
    await tap(touch, 769, 246, true); await tap(touch, 769, 246, true);
    assert.equal(await touch.evaluate(() => BB.Play.save.wear.face), 'scuba');
    await shot(touch, 'scuba-milestone');
    await tap(touch, 776, 438, true); await touch.waitForFunction(() => !BB.Play.wardrobe);
    await place(touch, 'ng', 16, 31); await touch.waitForFunction(() => BB.Play.gardenChoice?.t > 8);
    await tap(touch, 480, 390, true); assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 1);
    await shot(touch, 'touch-invite'); await tap(touch, 678, 145, true);
    await place(touch, 'hm', 24, 32); await touch.waitForFunction(() => BB.Play.gardenChoice?.t > 8);
    await tap(touch, 480, 390, true);
    assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 2);
    assert.equal(await touch.evaluate(() => BB.Play.gardenChoice), null);
    assert.equal(await touch.evaluate(() => BB.Play.zoneCard), 0);
    await shot(touch, 'touch-fountain-party');
    await touch.waitForFunction(() => BB.Play.fountainCd === 0);
    await place(touch, 'hm', 21, 32); await pause(touch); await place(touch, 'hm', 24, 32);
    await touch.waitForFunction(() => BB.Play.gardenChoice?.t > 8); await tap(touch, 480, 390, true);
    assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 2);
    assert.equal(await touch.evaluate(() => BB.Play.save.fountainUses), 2);
    assert.equal(await touch.evaluate(() => document.body.classList.contains('touch')), true);
    await touch.evaluate(() => { BB.Play.room = BB.World.byId.nm; BB.Play.openMaze(); });
    await tap(touch, 448, 506, true);
    await touch.waitForFunction(() => BB.Play.maze.y === 12);
    await tap(touch, 850, 30, true);
    assert.equal(await touch.evaluate(() => BB.Play.room.id), 'hm');
    assert.equal(await touch.evaluate(() => BB.Play.maze), null);
    assert.deepEqual(errors, []);
    console.log('✓ Chromium touch: scuba mask, milestones, maze directions, invitations, free fountain repeat and zero page errors');
    await tablet.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
