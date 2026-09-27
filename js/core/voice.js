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
          u.rate = 0.95; u.pitch = 1.05; u.volume = 1; // (a raised pitch is what sounds most robotic)
          synth.speak(u);
        } catch (e) { /* speech is a bonus, never a crash */ }
      };
      if (delay) setTimeout(go, delay); else go();
    },
    stop() { try { if (synth) synth.cancel(); } catch (e) { /* ignore */ } },
  };
})(window.BB);
