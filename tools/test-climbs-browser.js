'use strict';
// Real keyboard traversal across refreshed room seams, plus phone views.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const out = path.resolve(process.argv[2] || 'test-output/climb-refresh/browser');
async function place(page, id, col, floor, claws = false) {
  await page.evaluate(({ id, col, floor, claws }) => {
    const P = BB.Play, r = BB.World.byId[id];
    P.leaveRoom(P.room); P.room = r; P.prevRoom = null;
    P.pl.state = 'play'; P.intro = P.iris = P.gift = P.kinCard = P.bossCard = null;
    P.zoneCard = 0; P.lastZone = r.zone; P.way = null;
    Object.keys(P.save.abilities).forEach(k => { P.save.abilities[k] = false; });
    P.save.abilities.wallClimb = claws; P.save.rainbowUnlocked = false;
    P.pl.body = BB.Physics.newBody((r.x + col) * 32 + 6, (r.y + floor) * 32 - 24);
    P.pl.body.grounded = true; P.checkpoint = { x: P.pl.body.x, y: P.pl.body.y };
    P.invuln = 9999; BB.Camera.snap(r, P.pl.body);
  }, { id, col, floor, claws });
}
async function jump(page, x, floor) {
  await page.keyboard.down('Space');
  await page.waitForFunction(() => !BB.Play.pl.body.grounded, null, { timeout: 3000 });
  let direction = null, landed = false;
  for (let t = 0; t < 100; t++) {
    const p = await page.evaluate(() => ({ x: BB.Play.pl.body.x + 10, feet: BB.Play.pl.body.y + 24, grounded: BB.Play.pl.body.grounded, state: BB.Play.pl.state }));
    assert.equal(p.state, 'play', 'ordinary keyboard traversal stays in play');
    if (p.grounded) { landed = Math.abs(p.feet - floor) < 3; break; }
    const wanted = p.x < x - 8 ? 'ArrowRight' : p.x > x + 8 ? 'ArrowLeft' : null;
    if (wanted !== direction) {
      if (direction) await page.keyboard.up(direction);
      if (wanted) await page.keyboard.down(wanted);
      direction = wanted;
    }
    await page.waitForTimeout(20);
  }
  if (direction) await page.keyboard.up(direction);
  await page.keyboard.up('Space');
  assert.ok(landed, 'keyboard jump lands on intended shelf at ' + floor);
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BUBBLEPAWS_BROWSER, headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href + '#play=phoebe&ab=all&demo=rainbow');
    await page.waitForFunction(() => BB.Play.t > 30);
    await page.evaluate(() => {
      BB.Save.data = BB.Save.fresh(); BB.Save.data.introDone = BB.Save.data.leftHome = 1;
      BB.Main.set('play', { cat: 'phoebe' });
    });
    await place(page, 'np', 14, 31);
    const pond = await page.evaluate(() => ({ x: BB.World.byId.np.x, y: BB.World.byId.np.y }));
    for (const [col, row] of [[14, 28], [14, 25], [18, 22], [14, 19], [20, 16]]) await jump(page, (pond.x + col + 0.5) * 32, (pond.y + row) * 32);
    await page.screenshot({ path: path.join(out, 'pond-reward-loop.png') });

    await place(page, 'tw', 9, 15, true);
    for (const [col, row] of [[9, 29], [17, 26], [10, 23], [18, 20], [9, 17], [15, 14], [15, 12]]) await jump(page, (col + 0.5) * 32, (-18 + row) * 32);
    await page.evaluate(() => { BB.Play.zoneCard = 0; });
    await page.screenshot({ path: path.join(out, 'tower-upper-trail.png') });
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => BB.Play.room.id === 'h1', null, { timeout: 30000 });
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
    console.log('Real keyboard jumps traverse Pond Walk and the full Golden Tower; Sticky Paws reaches the Hive.');

    for (const mode of ['medium', 'easy']) {
      await page.evaluate(mode => {
        BB.Save.data = BB.Save.fresh(); BB.Save.data.introDone = BB.Save.data.leftHome = 1;
        BB.Settings.setDifficulty(mode); BB.Main.set('play', { cat: 'phoebe' });
      }, mode);
      await place(page, 'tx', 16, 2);
      await page.evaluate(() => { BB.Play.save.abilities.doubleJump = true; });
      await page.screenshot({ path: path.join(out, 'hatch-closed-' + mode + '.png') });
      await page.keyboard.down('Space');
      await page.waitForFunction(() => !BB.Camera.sliding && !BB.Play.pl.body.grounded && BB.Play.pl.body.vy >= -1, null, { timeout: 5000 });
      await page.keyboard.up('Space'); await page.waitForTimeout(40); await page.keyboard.down('Space');
      await page.waitForFunction(() => BB.Play.save.shortcuts.gardenMushroom === 1, null, { timeout: 5000 });
      await page.waitForFunction(() => BB.Play.pl.body.grounded, null, { timeout: 5000 });
      await page.keyboard.up('Space');
      assert.equal(await page.evaluate(() => BB.Play.pl.body.y + 24), 14 * 32, 'actual keyboard ascent lands beside open hatch');
      await page.evaluate(() => { BB.Play.zoneCard = 0; });
      await page.screenshot({ path: path.join(out, 'hatch-open-' + mode + '.png') });
      await page.keyboard.down('ArrowLeft');
      await page.waitForFunction(() => BB.Play.pl.body.x + 10 < 14 * 32, null, { timeout: 5000 });
      await page.keyboard.up('ArrowLeft');
      await page.waitForFunction(() => BB.Play.room.id === 'tx' && BB.Play.pl.body.grounded, null, { timeout: 5000 });
      assert.equal(await page.evaluate(() => BB.Play.pl.body.y + 24), 19 * 32, 'open hatch returns to the mushroom catch shelf');
    }
    console.log('Keyboard ascent unlocks garden hatch and safely drops back into mushrooms in Medium and Easy.');

    for (const [width, height] of [[1280, 720], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const [id, col, floor] of [['tw', 9, 15], ['tg', 15, 12], ['mg', 9, 27], ['g4', 16, 28], ['c5', 10, 25], ['h2', 13, 25], ['rl', 7, 45], ['f2', 14, 25], ['t4', 20, 30], ['l4', 25, 28]]) {
        await place(page, id, col, floor, true);
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(out, width + '-' + id + '.png') });
      }
      await place(page, 'tx', 16, 2);
      await page.screenshot({ path: path.join(out, width + '-hatch-ceiling.png') });
      await place(page, 'tw', 16, 15);
      await page.screenshot({ path: path.join(out, width + '-hatch-return.png') });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no page overflow at ' + width);
    }
    const normal = await page.evaluate(() => {
      const s = BB.Save.fresh(); s.cat = 'marshmallow'; s.toys.yarn = 1;
      const text = JSON.stringify(s); localStorage.setItem('bubblebug_kingdom_v2', text); return text;
    });
    await page.goto(pathToFileURL(path.join(__dirname, '../try-climbing-trails.html')).href);
    await page.waitForFunction(() => window.BB?.Play?.pl && BB.Play.t > 30);
    const preview = await page.evaluate(() => ({ preview: BB.Save.preview, room: BB.Play.room.id, normal: localStorage.getItem('bubblebug_kingdom_v2') }));
    assert.equal(preview.preview, true); assert.equal(preview.room, 'tx'); assert.equal(preview.normal, normal, 'climb preview never overwrites the normal adventure');
    assert.deepEqual(errors, [], 'refreshed rooms render without runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
