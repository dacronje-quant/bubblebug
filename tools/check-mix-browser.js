// Real-browser checks for the relocated glasses and music ducking.
// NODE_PATH must include Playwright; BUBBLEPAWS_BROWSER can select Edge/Chrome.
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BUBBLEPAWS_BROWSER || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const OriginalAudio = window.Audio;
      window.testClips = [];
      window.Audio = class extends OriginalAudio { constructor(src) { super(src); window.testClips.push(this); } };
    });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '#play=marshmallow&room=nr');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      BB.Voice.stop();
      const r = BB.World.byId.nr, b = BB.Play.pl.body;
      b.x = (r.x + 17) * 32 + 6; b.y = (r.y + 16) * 32 - b.h;
      b.vx = b.vy = 0; b.grounded = true; BB.Play.pl.state = 'play';
      BB.Play.zoneCard = 0; BB.Play.iris = null; BB.Camera.snap(r, b);
    });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => BB.World.findThings('a').filter(t => t.item === 'googly').length), 1);
    assert.equal(await page.evaluate(() => BB.Play.ents.g2.things.some(t => t.item === 'googly')), false);
    if (out) { fs.mkdirSync(out, { recursive: true }); await page.screenshot({ path: path.join(out, 'root-hollow-glasses.png') }); }
    await page.evaluate(() => {
      for (const bud of BB.Play.ents.nr.things.filter(t => t.type === 'bud')) BB.Bubbles.blow(bud.x - 12, bud.y, 1, 0, BB.Play.pl.cat);
    });
    await page.waitForFunction(() => BB.Play.save.gates.nr === 1);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => BB.Play.save.glassesFound.googly === 1);
    await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(() => BB.Play.save.wear.face), 'googly');
    if (out) await page.screenshot({ path: path.join(out, 'root-hollow-collected.png') });
    await page.evaluate(() => { BB.Play.writeSave(); BB.Save.load(); });
    assert.equal(await page.evaluate(() => BB.Save.data.glassesFound.googly), 1);
    await page.evaluate(() => { BB.Voice.stop(); BB.Audio.init(); BB.Voice.play('cat_mamaMallow'); BB.Voice.play('cat_papaBirman'); });
    await page.waitForFunction(() => window.testClips.some(a => !a.paused && a.currentTime > 0.1));
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.testClips.filter(a => !a.paused).length), 1, 'one recorded voice at a time');
    assert.ok(await page.evaluate(() => BB.Audio.musicBus.gain.value < 0.13));
    await page.evaluate(() => BB.Audio.duck(0.3, 0.2));
    await page.waitForTimeout(600);
    assert.ok(await page.evaluate(() => BB.Audio.musicBus.gain.value < 0.13), 'fanfare completion cannot undo speech duck');
    await page.evaluate(() => BB.Audio.setMuted(true));
    assert.equal(await page.evaluate(() => window.testClips.filter(a => !a.paused).length), 0);
    assert.equal(await page.evaluate(() => BB.Voice.queuedIds.length), 0);
    await page.evaluate(() => { BB.Audio.setMuted(false); BB.Voice.play('cat_babyPatches'); });
    await page.waitForFunction(() => BB.Voice.currentId === null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    assert.ok(await page.evaluate(() => BB.Audio.musicBus.gain.value > 0.45), 'music returns after actual recording end');
    await page.evaluate(() => { BB.Voice.play('cat_mamaMallow'); BB.Main.set('pause'); });
    assert.equal(await page.evaluate(() => BB.Voice.currentId), null);
    assert.equal(await page.evaluate(() => window.testClips.filter(a => !a.paused).length), 0);
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: one existing pair, old spot empty, two-bud gate, walk-in pickup, saved unlock, recorded voice serialization, lasting music duck and mute/pause/end cleanup.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
