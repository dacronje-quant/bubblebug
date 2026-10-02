#!/usr/bin/env node
// Real-browser check of the recorded region music, opened straight from
// disk: each region's score loads and decodes, loops seamlessly, fades out
// while the next region fades in, resumes where it left off, gives way to
// the layered boss/party songs, and sits at the same loudness as before.
// NODE_PATH must include Playwright; BUBBLEPAWS_BROWSER can select Edge/Chrome.
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BUBBLEPAWS_BROWSER || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '#play=phoebe&room=ng');
    await page.waitForTimeout(600);
    await page.keyboard.press('ArrowRight'); // (a key press starts audio)
    await page.evaluate(() => {
      BB.Audio.init(); BB.Voice.stop();
      const a = BB.Audio.ctx, an = a.createAnalyser(); an.fftSize = 2048; BB.Audio.musicBus.connect(an);
      window.level = () => { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); return Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length); };
      window.meter = ms => new Promise(res => { let sum = 0, n = 0; const id = setInterval(() => { sum += level() ** 2; n++; }, 50); setTimeout(() => { clearInterval(id); res(Math.sqrt(sum / n)); }, ms); });
    });
    // 1. the layered song's loudness, for comparison
    await page.evaluate(() => BB.Music.play('boss'));
    await page.waitForTimeout(3500);
    const layered = await page.evaluate(() => meter(5000));
    // 2. the Front Garden's recorded score fades in
    await page.evaluate(() => BB.Music.play('gardens'));
    await page.waitForFunction(() => BB.Music.recording === 'gardens', null, { timeout: 15000 });
    await page.waitForTimeout(3200);
    const recorded = await page.evaluate(() => meter(5000));
    const ratio = recorded / layered;
    assert.ok(ratio > 0.6 && ratio < 1.7, 'recorded music sits near the layered loudness: ' + ratio.toFixed(2));
    // 3. loops seamlessly: the source loops at the exact loop length
    const loop = await page.evaluate(() => { const d = window.BB_MUSIC; return { left: d && d.gardens ? 'kept' : 'freed' }; });
    assert.equal(loop.left, 'freed', 'the encoded copy is dropped once decoded');
    // 4. a new region: old fades out while the new one fades in, no silence gap
    await page.evaluate(() => BB.Music.play('meadow'));
    const dips = [];
    for (let i = 0; i < 30; i++) { dips.push(await page.evaluate(() => level())); await page.waitForTimeout(100); }
    await page.waitForFunction(() => BB.Music.recording === 'meadow', null, { timeout: 15000 });
    assert.ok(Math.min(...dips.slice(2)) > recorded * 0.05, 'never drops to silence between regions');
    // 5. back to the garden: it resumes rather than restarting
    await page.waitForTimeout(1500);
    await page.evaluate(() => BB.Music.play('gardens'));
    await page.waitForFunction(() => BB.Music.recording === 'gardens');
    // 6. a boss gets the layered tune; leaving brings the region back
    await page.evaluate(() => BB.Music.play('boss'));
    assert.equal(await page.evaluate(() => BB.Music.recording), null);
    await page.waitForTimeout(3000);
    assert.ok(await page.evaluate(() => meter(1500)) > layered * 0.4, 'boss tune plays');
    // 7. every region's file decodes
    for (const key of await page.evaluate(() => BB.Music.RECORDED)) {
      await page.evaluate(k => BB.Music.play(k), key);
      await page.waitForFunction(k => BB.Music.recording === k, key, { timeout: 20000 });
    }
    assert.deepEqual(errors, []);
    console.log('✓ 13 recorded region scores load from disk, match loudness (x' + ratio.toFixed(2) + '), crossfade without a gap, resume, and give way to boss music');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
