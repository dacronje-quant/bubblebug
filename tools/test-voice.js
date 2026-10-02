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
    BB: { Audio: { get muted() { return muted; }, setSpeechActive: active => ducked.push(active) } } };
  context.window = context; vm.createContext(context);
  for (const file of ['voice-clips.js', 'voice.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/core', file), 'utf8'), context);
  const V = context.BB.Voice;
  V.play('cat_babySnowflake'); V.play('story_family_complete');
  assert.ok(created[0].src.endsWith('cat_babySnowflake.wav')); assert.equal(created.length, 1);
  assert.equal(V.queuedIds[0], 'story_family_complete'); created[0].end();
  assert.equal(created.length, 2); assert.equal(created[1].src, context.BB.VOICE_CLIPS.story_family_complete.file);
  assert.ok(ducked.includes(true));
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
  assert.equal(spoken.length, 1); assert.equal(V.currentId, null); // preserve the baby's character rather than using a generic device voice
  assert.equal(V.play('unknown'), false);
  // A stale hint never starts after queued family speech.
  V.play('cat_mamaMallow');
  let relevant = true, starts = 0;
  V.play('tutorial_sleepy_buds', 0, { valid: () => relevant, onStart: () => starts++ });
  relevant = false; const countBefore = created.length; created.at(-1).end();
  assert.equal(created.length, countBefore); assert.equal(starts, 0);
  assert.equal(V.currentId, null);
  // Completing an action cancels only its hint and advances the next voice.
  V.play('tutorial_sleepy_buds', 0, { onStart: () => starts++ });
  const hintAudio = created.at(-1);
  V.play('cat_papaBirman'); V.cancel('tutorial_sleepy_buds');
  assert.equal(hintAudio.paused, true); assert.equal(starts, 1);
  assert.equal(V.currentId, 'cat_papaBirman'); V.stop();
  const clips = context.BB.VOICE_CLIPS;
  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/voice/gemini-3.8/manifest.json'), 'utf8'));
  const retained = new Set(pack.retainedClips.map(c => c.id));
  assert.equal(Object.keys(clips).length, 41);
  for (const [id, clip] of Object.entries(clips)) {
    if (retained.has(id)) { assert.equal(clip.source, 'gpt-4o-mini-tts', id); assert.ok(fs.existsSync(path.join(__dirname, '..', clip.file)), id); continue; }
    assert.equal(clip.source, 'gemini-3.8-flash-tts', id);
    assert.ok(clip.file.startsWith('assets/voice/gemini-3.8/'), id);
    const bytes = fs.readFileSync(path.join(__dirname, '..', clip.file));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', id);
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', id);
  }
  assert.equal(clips.cat_babySnowflake.voice, 'Puck');
  assert.equal(clips.cat_babyPatches.voice, 'Leda');
  assert.equal(new Set(Object.values(clips).filter(c => c.speaker === 'narrator').map(c => c.voice)).size, 1);
  assert.equal(clips.story_rainbow_call.voice, clips.story_rainbow_rescue.voice);
  assert.equal(pack.clips.length + retained.size, 41);
  // each of Rainbow's relatives keeps one voice; Mama's call, greeting and thanks match
  for (const id of ['rbGrandpa', 'rbPapa', 'rbGranny', 'rbSplash', 'rbPumpkin', 'rbTwinkle', 'rbMama']) assert.equal(clips['kin_' + id].speaker, id);
  assert.equal(clips.kin_mama_call.voice, clips.kin_rbMama.voice); assert.equal(clips.kin_complete.voice, clips.kin_rbMama.voice);
  assert.equal(clips.kin_rbTwinkle.fallback, false);
  assert.equal(clips.kin_cloud_maze.voice, clips.story_welcome.voice);
  assert.equal(clips.kin_hunt_start.voice, clips.story_rainbow_call.voice); assert.equal(clips.kin_six_home.voice, clips.story_rainbow_call.voice);
  const gameRoot = path.join(__dirname, '..');
  function audioFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? audioFiles(file) : /\.(mp3|wav)$/.test(entry.name) ? [path.relative(gameRoot, file).replace(/\\/g, '/')] : [];
    });
  }
  assert.deepEqual(audioFiles(path.join(gameRoot, 'assets/voice')).sort(), Object.values(clips).map(c => c.file).sort(), 'ship exactly the audio files selected by the game');
  console.log('✓ 41 bundled recordings; consistent narrator/Rainbow/rainbow family; queue, duck, cancellation, mute and error fallback');
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
  assert.equal(heard.filter(id => id === 'kin_hunt_start').length, 1); // her own family is lost next
  assert.equal(heard.indexOf('kin_hunt_start'), heard.indexOf('story_rainbow_rescue') + 1);
  P.closeMaze(true);
  assert.equal(P.openJourneyChoice('cloud'), false); // the replay waits for Rainbow's whole family
  for (const id of B.RAINBOW_KIN) P.save.kin[id] = 1;
  P.openJourneyChoice('cloud'); P.closeJourneyChoice(); P.openJourneyChoice('cloud');
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
