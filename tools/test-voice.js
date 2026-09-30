#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { bootGame } = require('./test-neighbourhood');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function lifecycle() {
  const created = [], spoken = [], ducked = [];
  let muted = false;
  class Audio {
    constructor(src) { this.src = src; this.duration = 5; this.paused = true; created.push(this); }
    play() { this.paused = false; if (this.onplaying) this.onplaying(); return Promise.resolve(); }
    pause() { this.paused = true; }
    end() { this.paused = true; if (this.onended) this.onended(); }
  }
  const synth = { getVoices: () => [], speak: u => spoken.push(u), cancel() {} };
  const context = { console, setTimeout, clearTimeout, Audio, speechSynthesis: synth,
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    BB: { Audio: { get muted() { return muted; }, duck: (...args) => ducked.push(args) } } };
  context.window = context; vm.createContext(context);
  for (const file of ['voice-clips.js', 'voice.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/core', file), 'utf8'), context);
  const V = context.BB.Voice;
  V.play('cat_babySnowflake'); V.play('story_family_complete');
  assert.ok(created[0].src.endsWith('cat_babySnowflake.wav')); assert.equal(created.length, 1);
  assert.equal(V.queuedIds[0], 'story_family_complete'); created[0].end();
  assert.equal(created.length, 2); assert.ok(created[1].src.endsWith('story_family_complete.mp3'));
  assert.ok(ducked.some(([amount]) => amount === 0.32));
  V.stop(); assert.ok(created[1].paused); assert.equal(V.currentId, null);
  const before = created.length;
  V.play('story_welcome', 20); V.stop(); await wait(35); assert.equal(created.length, before);
  V.play('story_welcome', 20); muted = true; await wait(35); V.stop(); assert.equal(created.length, before);
  assert.equal(V.play('story_welcome'), false); muted = false;
  V.play('story_rainbow_call');
  const failed = created.at(-1), staleEnded = failed.onended;
  failed.onerror(); failed.onerror && failed.onerror(); assert.equal(spoken.length, 1);
  V.play('story_rainbow_rescue'); spoken[0].onend(); assert.equal(V.currentId, 'story_rainbow_rescue');
  staleEnded(); assert.equal(V.currentId, 'story_rainbow_rescue');
  V.stop(); assert.ok(created.at(-1).paused);
  V.play('cat_babyPatches'); created.at(-1).onerror();
  assert.equal(spoken.length, 1); assert.equal(V.currentId, null); // never replace an original baby with device speech
  assert.equal(V.play('unknown'), false);
  console.log('✓ recordings queue without overlap; original baby WAV; duck, cancellation, mute and error fallback');
}
function story() {
  const g = bootGame(), B = g.BB, P = B.Play, heard = [];
  B.Voice.play = id => { heard.push(id); return true; };
  B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' }); g.tick(70);
  assert.equal(heard.filter(id => id === 'story_welcome').length, 1);
  g.tick(200); assert.equal(heard.filter(id => id === 'story_welcome').length, 1);
  const family = B.Home.familyOrder();
  for (const fam of family) P.ctx().onFamily({ fam, x: 0, y: 0 });
  assert.equal(heard.filter(id => id.startsWith('cat_')).length, 12);
  assert.equal(heard.at(-1), 'story_family_complete'); assert.equal(heard.at(-2), 'cat_' + family.at(-1));
  P.ctx().onFamily({ fam: family.at(-1), x: 0, y: 0 });
  assert.equal(heard.filter(id => id === 'story_family_complete').length, 1);
  P.openJourneyChoice('rainbow'); P.closeJourneyChoice(); P.openJourneyChoice('rainbow');
  assert.equal(heard.filter(id => id === 'story_rainbow_call').length, 1);
  assert.equal(P.openMaze(), true);
  for (const p of B.GardenMaze.PADS) P.save.pads[p.key] = 1;
  Object.assign(P.maze, B.GardenMaze.PRIZE); P.mazeCell();
  assert.equal(heard.filter(id => id === 'story_rainbow_rescue').length, 1);
  P.maze.rewardLock = false; P.mazeCell(); assert.equal(heard.filter(id => id === 'story_rainbow_rescue').length, 1);
  P.closeMaze(true); P.openJourneyChoice('cloud'); P.closeJourneyChoice(); P.openJourneyChoice('cloud');
  assert.equal(heard.filter(id => id === 'story_replay_choice').length, 1);
  P.save.abilities.doubleJump = true; P.save.outfits.horn = 1;
  const previous = P.save; B.Save.write(); B.Save.load();
  assert.equal(B.Save.data.voiceStory.story_rainbow_rescue, 1);
  assert.equal(B.Save.data.family[family[0]], 1); B.Save.data = previous;
  for (let run = 1; run <= 3; run++) {
    assert.equal(B.Save.rainbowReplay(), true);
    assert.equal(Object.keys(B.Save.data.voiceStory).length, 0);
    assert.equal(B.Save.data.abilities.doubleJump, true); assert.equal(B.Save.data.outfits.horn, 1);
    B.Main.set('play', { cat: 'rainbow' }); g.tick(70);
    assert.equal(heard.filter(id => id === 'story_replay_start').length, run);
    assert.equal(heard.filter(id => id === 'story_welcome').length, 1);
    P.save.mazeSolved = true; P.save.rainbowUnlocked = true;
  }
  console.log('✓ all 12 greetings, queued family completion, once-only story cues, reload and three Rainbow replay openings');
}
(async () => { await lifecycle(); story(); })().catch(e => { console.error(e); process.exitCode = 1; });
