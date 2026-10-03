'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const g = bootGame(), B = g.BB, P = B.Play, heard = [], cancelled = [];
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' });
let current = null, queued = [];
B.Voice = {
  get currentId() { return current; }, get queuedIds() { return queued; },
  play(id, delay, opts = {}) {
    if (opts.valid && !opts.valid()) return false;
    heard.push(id); current = id; opts.onStart?.(); return true;
  },
  cancel(id) { cancelled.push(id); if (current === id) current = null; queued = queued.filter(x => x !== id); },
  stop() { current = null; queued = []; },
};
g.place('g1', 5, 14); P.pl.idleT = 0;
P.updateGuidance(); assert.equal(heard.at(-1), 'tutorial_paw_pads');
const pads = P.ents.g1.things.filter(th => th.type === 'pad');
for (const pad of pads) P.save.pads[pad.key] = 1;
P.updateGuidance(); assert.ok(cancelled.includes('tutorial_paw_pads'));
const n = heard.length; P.updateGuidance(); assert.equal(heard.length, n);
g.place('g1', 9, 14); P.pl.idleT = 181; current = null; P.guidance.next = 0;
P.updateGuidance(); assert.equal(heard.at(-1), 'tutorial_jump');
P.updateGuidance(); assert.equal(current, 'tutorial_jump', 'starting a hint must not invalidate itself');
P.guidance.jumped = true; P.updateGuidance(); assert.equal(current, null);
g.place('nr', 7, 16); current = null; P.guidance.next = 0;
P.updateGuidance(); assert.equal(heard.at(-1), 'tutorial_sleepy_buds');
for (const bud of P.ents.nr.things.filter(th => th.type === 'bud')) P.save.buds[bud.key] = 1;
P.updateGuidance(); assert.ok(cancelled.includes('tutorial_sleepy_buds'));
// Moving away before a delayed item cue starts invalidates it.
let valid;
B.Voice.play = (id, delay, opts) => { valid = opts.valid; return true; };
P.save.wear.face = 'googly';
assert.equal(P.sayGuidance('tutorial_googly_glasses', () => P.save.wear.face === 'googly', 500), true);
assert.equal(valid(), true); g.place('ng', 5, 31); assert.equal(valid(), false);
// Discoveries cue their explanation once, with the family introduction first.
B.Voice.play = (id, delay, opts = {}) => {
  if (opts.valid && !opts.valid()) return false;
  heard.push(id); current = id; opts.onStart?.(); return true;
};
P.ctx().onFamily({ fam: 'mamaMallow', x: 0, y: 0 });
assert.deepEqual(heard.slice(-2), ['cat_mamaMallow', 'tutorial_first_family']);
P.ctx().onGlasses({ item: 'googly', x: 0, y: 0 });
assert.equal(heard.at(-1), 'tutorial_googly_glasses');
const afterGlasses = heard.length;
P.ctx().onGlasses({ item: 'googly', x: 0, y: 0 });
assert.equal(heard.length, afterGlasses);
// The elder explains double jump during the gift demonstration.
g.place('m3', 7, 14); const elder = P.ents.m3.things.find(th => th.type === 'elder');
P.startGift(elder); P.gift.t = 110; P.updateGift();
assert.equal(heard.at(-1), 'tutorial_double_jump');
P.gift.closing = true; P.updateGuidance();
assert.ok(cancelled.includes('tutorial_double_jump'));
// Goose guidance is relevant only during the first glowing bubble window.
g.place('g6', 20, 14); const goose = P.ents.g6.bosses[0];
P.pl.body.x = goose.x - 10; P.pl.body.y = goose.y - 24;
goose.state = 'sniffle'; current = null; P.guidance.next = 0; P.gift = null;
P.updateGuidance(); assert.equal(heard.at(-1), 'tutorial_goose');
goose.state = 'attack'; P.updateGuidance();
assert.ok(cancelled.includes('tutorial_goose'));
g.place('g2', 18, 14); const bug = P.ents.g2.bugs.find(th => th.state === 'gloomy');
P.pl.body.x = bug.x - 10; P.pl.body.y = bug.y - 24;
current = null; P.guidance.next = 0; P.updateGuidance();
assert.equal(heard.at(-1), 'tutorial_sad_animal');
bug.state = 'happy'; P.updateGuidance();
assert.ok(cancelled.includes('tutorial_sad_animal'));
// Progress survives loading and the next adventure resets heard cues.
B.Save.write(); B.Save.load();
assert.equal(B.Save.data.voiceStory.tutorial_paw_pads, 1);
B.Save.data.mazeSolved = true; B.Save.data.rainbowUnlocked = true;
assert.equal(B.Save.rainbowReplay(), true);
assert.equal(B.Save.data.voiceStory.tutorial_paw_pads, undefined);
console.log('Guidance checks passed: first-time cues, successful-action cancellation, stale room hints, save/reload and replay reset.');
