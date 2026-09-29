// ════════════════════════════════════════════════════════════════
//  VOICE — a friendly spoken line for the big moments, so little players
//  who can't read yet still hear what happened: a cat saying who they are,
//  "Ooh, a jingle bell!", "Hooray! The goose is happy!".
//  line(key) plays the recorded clip assets/voice/<key>.wav (the host's and
//  each cat's own voice); if there's no clip yet it speaks the same words
//  (BB.VoiceLines) with the device's own voice instead. Stays quiet when the
//  sound is off, and does nothing where neither is available.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const synth = typeof window !== 'undefined' && window.speechSynthesis;
  let voice = null, picked = false;

  // the most natural-sounding English voice the device has: the newer
  // "natural" / "neural" / "enhanced" voices sound far less robotic than
  // the old built-in ones (which we avoid if there's anything better)
  function score(v) {
    const n = v.name;
    let s = 0;
    if (/natural|neural|premium|enhanced|siri/i.test(n)) s += 50;
    if (/Google UK English Female|Google US English/i.test(n)) s += 30;
    if (/Samantha|Karen|Moira|Tessa|Serena|Martha|Libby|Sonia|Aria|Jenny|Emma|Ava|Zoe/i.test(n)) s += 20;
    if (/espeak|compact|Zira|David|Mark|Hazel/i.test(n)) s -= 30;
    if (/^en-(GB|US|AU|IE|NZ)/i.test(v.lang)) s += 5;
    return s;
  }
  function pick() {
    if (!synth) return null;
    const all = synth.getVoices() || [];
    if (!all.length) return null;
    picked = true;
    const en = all.filter(v => /^en(-|_|$)/i.test(v.lang));
    return en.sort((a, b) => score(b) - score(a))[0] || null;
  }
  if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged = () => { voice = pick(); };

  const DIR = 'assets/voice/';
  let clip = null;          // the recorded line playing right now
  const missing = {};       // keys with no clip on disk — go straight to the device voice

  function speak(text) {
    if (!synth || !text) return;
    try {
      if (!picked) voice = pick();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-GB';
      u.rate = 0.95; u.pitch = 1.05; u.volume = 1; // (a raised pitch is what sounds most robotic)
      synth.speak(u);
    } catch (e) { /* speech is a bonus, never a crash */ }
  }
  function hush() {
    try { if (synth) synth.cancel(); } catch (e) { /* ignore */ }
    if (clip) { try { clip.pause(); } catch (e) { /* ignore */ } clip = null; }
  }
  function play(key, text) {
    hush();
    if (missing[key]) { speak(text); return; }
    try {
      const a = clip = new Audio(DIR + key + '.wav');
      a.volume = 1;
      const fallback = () => { missing[key] = 1; if (clip === a) { clip = null; speak(text); } };
      a.addEventListener('error', fallback);
      const p = a.play();
      if (p && p.catch) p.catch(e => { if (e && e.name !== 'AbortError') fallback(); });
    } catch (e) { speak(text); }
  }

  BB.Voice = {
    // a plain spoken sentence, in the device's voice
    say(text, delay = 0) {
      if (!text || (BB.Audio && BB.Audio.muted)) return;
      if (delay) setTimeout(() => speak(text), delay); else speak(text);
    },
    // one of the game's own lines (BB.VoiceLines): recorded clip first, device voice as the fallback
    line(key, delay = 0) {
      const text = BB.VoiceLines && BB.VoiceLines[key];
      if (!text || (BB.Audio && BB.Audio.muted)) return;
      if (delay) setTimeout(() => play(key, text), delay); else play(key, text);
    },
    stop: hush,
  };
})(window.BB);
