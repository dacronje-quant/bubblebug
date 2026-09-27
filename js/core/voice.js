// ════════════════════════════════════════════════════════════════
//  VOICE — a friendly spoken line for the big moments, so little players
//  who can't read yet still hear what happened: "You found Phoebe's Mama!",
//  "A jingle bell!", "Hooray! The goose is happy!".
//  Uses the device's own speech voice (no files, works offline on most
//  tablets and computers); stays quiet when the sound is off, and simply
//  does nothing where speech isn't available.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const synth = typeof window !== 'undefined' && window.speechSynthesis;
  let voice = null, picked = false;

  // a warm, clear English voice if the device has one
  function pick() {
    if (!synth) return null;
    const all = synth.getVoices() || [];
    if (!all.length) return null;
    picked = true;
    const en = all.filter(v => /^en(-|_|$)/i.test(v.lang));
    const pref = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google UK English Female', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira', 'Female'];
    for (const name of pref) { const v = en.find(x => x.name.includes(name)); if (v) return v; }
    return en.find(v => v.localService) || en[0] || null;
  }
  if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged = () => { voice = pick(); };

  BB.Voice = {
    say(text, delay = 0) {
      if (!synth || !text || (BB.Audio && BB.Audio.muted)) return;
      const go = () => {
        try {
          if (!picked) voice = pick();
          synth.cancel();
          const u = new SpeechSynthesisUtterance(text);
          if (voice) u.voice = voice;
          u.lang = voice ? voice.lang : 'en-GB';
          u.rate = 0.92; u.pitch = 1.25; u.volume = 0.9;
          synth.speak(u);
        } catch (e) { /* speech is a bonus, never a crash */ }
      };
      if (delay) setTimeout(go, delay); else go();
    },
    stop() { try { if (synth) synth.cancel(); } catch (e) { /* ignore */ } },
  };
})(window.BB);
