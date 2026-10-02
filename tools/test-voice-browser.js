#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), { pathToFileURL } = require('node:url');
const { chromium } = (() => {
  try { return require('playwright'); } catch (e) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
    return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  }
})();
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined,
    args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.__recordedVoices = [];
      const OriginalAudio = window.Audio;
      window.__OriginalAudio = OriginalAudio;
      window.Audio = class extends OriginalAudio { constructor(src) { super(src); window.__recordedVoices.push(this); } };
    });
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href + '#play=phoebe&room=hm&demo=rewards');
    await page.waitForFunction(() => window.BB && BB.Main.name === 'play');
    const decoded = await page.evaluate(async () => {
      return Promise.all(Object.values(BB.VOICE_CLIPS).map(c => new Promise((resolve, reject) => {
        const a = new window.__OriginalAudio(c.file);
        a.onloadedmetadata = () => resolve({ file: c.file, seconds: a.duration });
        a.onerror = () => reject(new Error('Cannot decode ' + c.file)); a.load();
      })));
    });
    assert.equal(decoded.length, 41); assert.ok(decoded.every(c => c.seconds > 1));
    await page.evaluate(() => { BB.Audio.setMuted(false); BB.Voice.play('cat_babySnowflake'); BB.Voice.play('story_family_complete'); });
    await page.waitForFunction(() => window.__recordedVoices[0]?.currentTime > 0);
    assert.ok(await page.evaluate(() => __recordedVoices[0].currentSrc.endsWith('cat_babySnowflake.wav')));
    assert.equal(await page.evaluate(() => __recordedVoices.length), 1);
    await page.evaluate(() => { const a = __recordedVoices[0]; a.currentTime = a.duration - 0.05; });
    await page.waitForFunction(() => window.__recordedVoices[1]?.currentTime > 0);
    assert.equal(await page.evaluate(() => BB.Voice.currentId), 'story_family_complete');
    await page.evaluate(() => { BB.Voice.play('story_rainbow_rescue'); BB.Audio.setMuted(true); });
    assert.ok(await page.evaluate(() => __recordedVoices.every(a => a.paused) && BB.Voice.currentId === null && !BB.Voice.queuedIds.length));
    const before = await page.evaluate(() => __recordedVoices.length);
    await page.evaluate(() => { BB.Audio.setMuted(false); BB.Voice.play('story_welcome', 40); BB.Main.go('pause'); });
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => __recordedVoices.length), before);
    assert.deepEqual(errors, []);
    console.log('✓ real browser decodes all 41 selected clips; Gemini baby introduction, queued completion, mute and pause cancel safely');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
