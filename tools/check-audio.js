// Deterministic regression checks for voice races and the background mixer.
// Run: node tools/check-audio.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let now = 0, id = 0;
const timers = new Map(), clips = [], utterances = [], gains = [], convolvers = [], oscillators = [];
const timeout = (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; };
function advance(ms) {
  const end = now + ms;
  while (true) {
    const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break;
    now = next[1].at; timers.delete(next[0]); next[1].fn();
  }
  now = end;
}
const param = () => ({ value: 0, targets: [], setTargetAtTime(v) { this.value = v; this.targets.push(v); }, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
const node = () => ({ outputs: [], connect(n) { this.outputs.push(n); }, disconnect() {}, gain: param(), frequency: param(), Q: param(), detune: param(), start() {}, stop() {} });
class AudioContext {
  constructor() { this.sampleRate = 100; this.destination = node(); this.state = 'running'; }
  get currentTime() { return now / 1000; }
  createGain() { const n = node(); gains.push(n); return n; }
  createConvolver() { const n = node(); convolvers.push(n); return n; }
  createDynamicsCompressor() { const n = node(); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = param(); return n; }
  createBiquadFilter() { return node(); }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  createOscillator() { const n = node(); oscillators.push(n); return n; }
  createBufferSource() { return { ...node(), playbackRate: param() }; }
}
class Audio {
  constructor(src) { this.src = src; this.paused = false; clips.push(this); }
  play() { if (this.onplaying) this.onplaying(); return Promise.resolve(); }
  pause() { this.paused = true; }
  end() { if (this.onended) this.onended(); }
}
const synth = { getVoices: () => [], speak: u => utterances.push(u), cancel() {} };
const BB = { VOICE_CLIPS: Object.fromEntries(['first', 'second', 'absent'].map(id => [id, { text: id + ' cat', file: id + '.wav' }])) };
const context = vm.createContext({ window: { BB, AudioContext, Audio, speechSynthesis: synth }, Audio, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }, localStorage: { getItem() {}, setItem() {} }, setTimeout: timeout, clearTimeout: n => timers.delete(n), Date: { now: () => now }, Math });
for (const f of ['audio', 'voice']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/core/' + f + '.js'), 'utf8'), context);
BB.Audio.init();
const music = BB.Audio.musicBus, sfx = gains[1];
BB.Voice.play('first'); BB.Voice.play('second');
assert.equal(clips.length, 1, 'voices must play one at a time');
assert.equal(music.gain.value, 0.55 * 0.18);
assert.equal(sfx.gain.value, 0.8 * 0.4);
BB.Audio.duck(0.3, 1); advance(1500);
assert.equal(music.gain.value, 0.55 * 0.18, 'event duck must not end speech duck');
clips[0].end(); assert.equal(clips.length, 2);
clips[1].end(); assert.equal(music.gain.value, 0.55);
assert.equal(sfx.gain.value, 0.8);
BB.Voice.play('first', 700); BB.Audio.setMuted(true); advance(1000);
assert.equal(clips.length, 2, 'muting cancels delayed voices');
BB.Audio.setMuted(false); BB.Voice.play('first');
const staleError = clips[2].onerror;
BB.Voice.stop(); assert.equal(clips[2].paused, true);
staleError(); assert.equal(utterances.length, 0, 'stale load failure must not start speech');
BB.Voice.play('absent'); clips[3].onerror();
assert.equal(utterances.length, 1);
BB.VOICE_CLIPS.speech = { text: 'Plain speech' };
BB.Voice.play('speech'); assert.equal(utterances.length, 1);
utterances[0].onend(); assert.equal(utterances.length, 2);
utterances[1].onend(); assert.equal(music.gain.value, 0.55);
BB.Voice.play('first'); BB.Voice.play('first'); clips[4].end();
assert.equal(clips.length, 5, 'duplicate announcements should not accumulate');
BB.Voice.play('first', 500); BB.Voice.stop(); advance(1000);
assert.equal(clips.length, 5, 'stopping cancels pending scene announcements');
BB.Audio.duck(0.3, 4); advance(1000); BB.Audio.duck(0.5, 1); advance(1100);
assert.equal(music.gain.value, 0.55 * 0.3, 'overlapping fanfares retain the deeper, longer duck');
advance(2000); assert.equal(music.gain.value, 0.55);
assert.equal(convolvers[0].outputs[0], sfx, 'effect reverb must follow effect attenuation');
assert.equal(convolvers[1].outputs[0], music, 'music reverb must follow music attenuation');
const before = oscillators.length;
BB.Audio.sfx.sparkle(); BB.Audio.sfx.sparkle();
assert.equal(oscillators.length - before, 2, 'same-frame stars should make one chime');
BB.Voice.play('speech');
const talking = oscillators.length;
BB.Audio.sfx.meow('marshmallow'); BB.Audio.sfx.purr();
assert.equal(oscillators.length, talking, 'meows and purrs must not cover speech');
BB.Voice.stop();
console.log('Audio checks passed: serialized voices, fallback, stale callbacks, mute/stop, overlapping ducks, wet routing and effect limits.');
