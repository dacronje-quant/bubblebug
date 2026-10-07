// ════════════════════════════════════════════════════════════════
//  VOICE — a friendly spoken line for the big moments, so little players
//  who can't read yet still hear what happened: "You found Phoebe's Mama!",
//  "A jingle bell!", "Hooray! The goose is happy!".
//  Plays bundled story and family recordings, with device speech as a fallback.
//  Lines queue without overlapping and stop on mute or scene changes.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const synth = typeof window !== 'undefined' && window.speechSynthesis;
  let voice = null, picked = false;
  let current = null, timer = null, watchdog = null, generation = 0, ducked = false;
  const queue = [];
  function started(job) {
    if (current !== job || job.generation !== generation || job.started) return;
    job.started = true;
    if (job.options.onStart) job.options.onStart();
  }

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

  const muted = () => BB.Audio && BB.Audio.muted;
  function duck() {
    if (BB.Audio) { BB.Audio.setSpeechActive(true); ducked = true; }
  }
  function restore() {
    if (ducked && BB.Audio) BB.Audio.setSpeechActive(false);
    ducked = false;
  }
  function detach(job) {
    if (job.audio) {
      job.audio.onended = job.audio.onerror = job.audio.onplaying = null;
      try { job.audio.pause(); } catch (e) { /* optional audio */ }
    }
    if (job.utterance) job.utterance.onstart = job.utterance.onend = job.utterance.onerror = null;
  }
  // ended = the line was played to the end (not stopped, cancelled or failed)
  function finish(job, ended) {
    if (current !== job) return;
    if (ended && job.options.onEnd) { try { job.options.onEnd(); } catch (e) { /* caller */ } }
    clearTimeout(watchdog); watchdog = null;
    detach(job); current = null; restore(); pump();
  }
  function fallback(job) {
    if (current !== job || job.generation !== generation || job.fallback) return;
    job.fallback = true; detach(job);
    clearTimeout(watchdog);
    watchdog = setTimeout(() => { if (current === job) BB.Voice.stop(); }, 30000);
    if (!synth || muted() || job.clip.fallback === false) { finish(job); return; }
    try {
      if (!picked) voice = pick();
      const u = job.utterance = new SpeechSynthesisUtterance(job.clip.text);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-GB'; u.rate = 0.95; u.pitch = 1.05; u.volume = 1;
      u.onend = () => finish(job, true);
      u.onerror = () => finish(job);
      u.onstart = () => started(job);
      duck(); synth.speak(u);
    } catch (e) { finish(job); }
  }
  function pump() {
    if (current || !queue.length) return;
    if (muted()) { BB.Voice.stop(); return; }
    const job = current = queue.shift();
    const start = () => {
      timer = null;
      if (current !== job || job.generation !== generation || muted()) return;
      if (job.options.valid && !job.options.valid()) { finish(job); return; }
      watchdog = setTimeout(() => { if (current === job) BB.Voice.stop(); }, 30000);
      if (!job.clip.file || typeof window.Audio !== 'function') { fallback(job); return; }
      try {
        const a = job.audio = new window.Audio(job.clip.file);
        a.preload = 'auto'; a.volume = 0.95;
        a.onended = () => finish(job, true);
        a.onerror = () => fallback(job);
        a.onplaying = () => {
          if (current !== job) return;
          if (!job.started && job.options.valid && !job.options.valid()) { finish(job); return; }
          started(job);
          duck();
          clearTimeout(watchdog);
          watchdog = setTimeout(() => { if (current === job) BB.Voice.stop(); }, (Number.isFinite(a.duration) ? a.duration + 5 : 30) * 1000);
        };
        const playing = a.play();
        if (playing && playing.catch) playing.catch(error => {
          if (current !== job || job.generation !== generation) return;
          // A browser gesture restriction applies to speech too. Never
          // keep a blocked welcome queued until a much later interaction.
          if (error.name === 'NotAllowedError') finish(job); else fallback(job);
        });
      } catch (e) { fallback(job); }
    };
    if (job.delay) timer = setTimeout(start, job.delay); else start();
  }
  function enqueue(id, clip, delay, options = {}) {
    if (!clip || !clip.text || muted() || (!synth && typeof window.Audio !== 'function')) return false;
    if ((current && current.id === id && current.clip.text === clip.text) || queue.some(job => job.id === id && job.clip.text === clip.text)) return false;
    queue.push({ id, clip, delay: Math.max(0, delay || 0), generation, options }); pump(); return true;
  }
  BB.Voice = {
    play(id, delay = 0, options = {}) { return enqueue(id, BB.VOICE_CLIPS[id], delay, options); },
    cancel(id, options = {}) {
      for (let i = queue.length - 1; i >= 0; i--) if (queue[i].id === id) queue.splice(i, 1);
      if (current && current.id === id && !(options.keepStarted && current.started)) {
        const job = current;
        clearTimeout(timer); timer = null;
        if (job.utterance && synth) { detach(job); synth.cancel(); }
        finish(job);
      }
    },
    get currentId() { return current && current.id; },
    get queuedIds() { return queue.map(job => job.id); },
    // Walking into another room invalidates pending local announcements,
    // but a line already being heard finishes with its music duck intact.
    leaveRoom() {
      queue.length = 0;
      if (current && !current.started) this.cancel(current.id);
    },
    stop() {
      generation++; queue.length = 0;
      if (timer !== null) clearTimeout(timer);
      clearTimeout(watchdog); watchdog = null;
      timer = null;
      if (current) detach(current);
      current = null;
      try { if (synth) synth.cancel(); } catch (e) { /* optional speech */ }
      restore();
    },
  };
})(window.BB);
