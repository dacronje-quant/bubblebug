// ════════════════════════════════════════════════════════════════
//  AUDIO — a tiny Web Audio synthesizer. Zero audio files.
//
//  Signal flow:
//    voices → sfxBus ─┐
//    music  → musicBus┼→ master → compressor → speakers
//             reverb ─┘   (voices can also send into a soft hall reverb)
//
//  Everything is tuned soft and round: sine/triangle voices, gentle
//  attacks, no harsh buzzers. Every "negative" sound in the game is a
//  silly boing, never a buzzer.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';

  let ctx = null, master, comp, sfxBus, musicBus, reverb, reverbSend, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem('bubblebug_muted') === '1'; } catch (e) { /* private mode */ }

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(comp);

    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);

    // Generated hall reverb: two channels of exponentially decaying noise
    reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    reverb.buffer = ir;
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.35;
    reverbSend.connect(reverb); reverb.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ──── Voice primitives ────
  // tone: one oscillator with an envelope, optional pitch glide/vibrato/filter
  function tone(o) {
    if (!ctx || muted) return;
    const t0 = (o.at || ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || o.dur * 0.8));
    if (o.detune) osc.detune.value = o.detune;

    const g = ctx.createGain();
    const vol = o.vol == null ? 0.2 : o.vol;
    const a = o.attack || 0.005;
    const dur = o.dur || 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + a);
    if (o.hold) g.gain.setValueAtTime(vol, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    let node = osc;
    if (o.vib) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type || 'lowpass';
      f.frequency.setValueAtTime(o.filter.freq, t0);
      if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t0 + dur);
      f.Q.value = o.filter.q || 0.8;
      node.connect(f); node = f;
    }
    node.connect(g);
    let out = g;
    if (o.pan) {
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = o.pan; g.connect(p); out = p; }
    }
    out.connect(o.bus || sfxBus);
    if (o.verb) {
      const s = ctx.createGain(); s.gain.value = o.verb; out.connect(s); s.connect(reverbSend);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(o) {
    if (!ctx || muted) return;
    const t0 = (o.at || ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol || 0.1, t0 + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    if (o.verb) { const s = ctx.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(reverbSend); }
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + o.dur + 0.05);
  }

  // Instrument voices shared by SFX and the music sequencer
  const inst = {
    musicbox(f, at, vol, bus, verb = 0.5) {
      tone({ freq: f, at, dur: 1.4, vol, bus, verb });
      tone({ freq: f * 2, at, dur: 0.6, vol: vol * 0.28, bus, verb });
      tone({ freq: f * 3.01, at, dur: 0.3, vol: vol * 0.1, bus });
    },
    marimba(f, at, vol, bus, verb = 0.25) {
      tone({ freq: f, at, dur: 0.55, vol, bus, verb });
      tone({ freq: f * 4, at, dur: 0.12, vol: vol * 0.3, bus });
    },
    bell(f, at, vol, bus, verb = 0.6) {
      tone({ freq: f, at, dur: 2.2, vol, bus, verb });
      tone({ freq: f * 2.76, at, dur: 1.0, vol: vol * 0.35, bus, verb });
      tone({ freq: f * 5.4, at, dur: 0.45, vol: vol * 0.15, bus });
    },
    harp(f, at, vol, bus, verb = 0.55) {
      tone({ type: 'triangle', freq: f, at, dur: 1.1, vol, bus, verb, filter: { freq: f * 6, to: f * 1.5 } });
    },
    flute(f, at, vol, bus, len = 0.5, verb = 0.4) {
      tone({ freq: f, at, dur: len + 0.25, attack: 0.07, hold: len * 0.6, vol, bus, verb, vib: [5, f * 0.012] });
      noise({ at, dur: 0.12, vol: vol * 0.12, freq: f * 2, q: 2, bus });
    },
    piano(f, at, vol, bus, verb = 0.45) {
      tone({ type: 'triangle', freq: f, at, dur: 1.6, vol, bus, verb, filter: { freq: 3000, to: 600 } });
      tone({ freq: f * 2, at, dur: 0.5, vol: vol * 0.2, bus });
    },
    pad(freqs, at, len, vol, bus, bright = 1100) {
      for (const f of freqs) {
        for (const dt of [-7, 7]) {
          tone({ type: 'triangle', freq: f, detune: dt, at, dur: len + 0.9, attack: Math.min(0.6, len * 0.4), hold: len * 0.5,
            vol: vol / freqs.length, bus, verb: 0.5, filter: { freq: bright } });
        }
      }
    },
    bass(f, at, vol, bus, len = 0.4) {
      tone({ freq: f, at, dur: len + 0.2, attack: 0.01, hold: len * 0.4, vol, bus });
      tone({ type: 'triangle', freq: f * 2, at, dur: 0.18, vol: vol * 0.25, bus });
    },
    shaker(at, vol, bus) { noise({ at, dur: 0.07, vol, freq: 7000, q: 0.7, ftype: 'highpass', bus }); },
    tick(at, vol, bus) { noise({ at, dur: 0.03, vol, freq: 3500, q: 3, bus }); },
    drop(at, vol, bus, f = 1400) { tone({ freq: f, to: f * 0.45, glide: 0.08, at, dur: 0.14, vol, bus, verb: 0.4 }); },
    kick(at, vol, bus) { tone({ freq: 140, to: 50, glide: 0.1, at, dur: 0.18, vol, bus }); },
  };

  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  let sparkleStreak = 0, sparkleTime = 0;

  // ──── Sound effects ────
  const sfx = {
    // Each kitten has its own voice: Marshmallow is higher and floatier,
    // Phoebe is quicker and bouncier.
    jump(cat) {
      const hi = cat === 'marshmallow' ? 1.12 : 1;
      tone({ freq: 360 * hi, to: 720 * hi, glide: 0.09, dur: 0.14, vol: 0.13 });
      tone({ type: 'triangle', freq: 720 * hi, to: 900 * hi, delay: 0.04, dur: 0.1, vol: 0.05 });
    },
    djump(cat) {
      const hi = cat === 'marshmallow' ? 1.12 : 1;
      tone({ freq: 620 * hi, to: 1240 * hi, glide: 0.1, dur: 0.18, vol: 0.12, verb: 0.3 });
      noise({ dur: 0.18, vol: 0.05, freq: 1800, to: 5000, q: 2 }); // wing whoosh
      [1568, 2093].forEach((f, i) => tone({ freq: f * hi, delay: 0.05 + i * 0.05, dur: 0.3, vol: 0.04, verb: 0.5 }));
    },
    walljump() { tone({ freq: 500, to: 900, glide: 0.08, dur: 0.12, vol: 0.1 }); noise({ dur: 0.05, vol: 0.05, freq: 3000 }); },
    land(hard) { noise({ dur: 0.08, vol: hard ? 0.09 : 0.05, freq: 500, q: 0.8, ftype: 'lowpass' }); },
    step() { noise({ dur: 0.03, vol: 0.02, freq: 900, q: 1.5 }); },
    climb() { noise({ dur: 0.04, vol: 0.03, freq: 2400, q: 4 }); },
    bounce() {
      tone({ freq: 180, to: 520, glide: 0.18, dur: 0.3, vol: 0.18, vib: [22, 30] });
      tone({ freq: 700, to: 1100, delay: 0.08, dur: 0.18, vol: 0.05, verb: 0.3 });
    },
    bubble(cat) {
      // Marshmallow: a soft sighing blow. Phoebe: a quick playful "blip".
      if (cat === 'marshmallow') {
        tone({ freq: 500, to: 950, glide: 0.2, dur: 0.26, vol: 0.1, vib: [14, 25], verb: 0.3 });
        noise({ dur: 0.18, vol: 0.03, freq: 1200, q: 1 });
      } else {
        tone({ freq: 650, to: 1300, glide: 0.1, dur: 0.16, vol: 0.1, vib: [24, 40], verb: 0.2 });
        tone({ freq: 1500, delay: 0.07, dur: 0.1, vol: 0.04 });
      }
    },
    pop(p = 1) {
      tone({ freq: 1400 * p, to: 500 * p, glide: 0.05, dur: 0.08, vol: 0.12 });
      noise({ dur: 0.04, vol: 0.06, freq: 4000, q: 1 });
    },
    // A bubble lands on a gloomy bug: a rising, hopeful note per hit
    cheerHit(n) {
      const f = midi(72 + PENTA[Math.min(n, 6)]);
      inst.bell(f, ctx && ctx.currentTime, 0.1, sfxBus, 0.4);
    },
    // Bug befriended! Bright little major arpeggio + tiny giggle
    befriend() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [72, 76, 79, 84, 88].forEach((m, i) => inst.musicbox(midi(m), t + i * 0.07, 0.13, sfxBus));
      [0, 1, 2].forEach(i => tone({ freq: 900 + i * 180, to: 1300 + i * 180, at: t + 0.4 + i * 0.07, dur: 0.07, vol: 0.05 }));
    },
    // Bumping a gloomy bug: a silly "hmph" boing, never a buzzer
    hmph() {
      tone({ type: 'triangle', freq: 220, to: 150, glide: 0.2, dur: 0.25, vol: 0.12, vib: [9, 12] });
      tone({ freq: 330, to: 280, delay: 0.05, dur: 0.15, vol: 0.05 });
    },
    sparkle() {
      if (!ctx) return;
      const now = ctx.currentTime;
      sparkleStreak = now - sparkleTime < 1.2 ? Math.min(sparkleStreak + 1, 8) : 0;
      sparkleTime = now;
      const f = midi(79 + PENTA[sparkleStreak]);
      tone({ freq: f, dur: 0.5, vol: 0.09, verb: 0.5 });
      tone({ freq: f * 2, delay: 0.03, dur: 0.25, vol: 0.035, verb: 0.5 });
    },
    bench() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [60, 64, 67, 72].forEach((m, i) => inst.harp(midi(m), t + i * 0.12, 0.12, sfxBus));
      inst.pad([midi(48), midi(55), midi(64)], t, 1.5, 0.08, sfxBus, 800);
    },
    purr() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 26;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const g = ctx.createGain();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.9;
      const lg = ctx.createGain(); lg.gain.value = 0.03;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.8);
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(f); f.connect(g); g.connect(sfxBus);
      osc.start(t); lfo.start(t); osc.stop(t + 3); lfo.stop(t + 3);
    },
    // A synthesised "mew": a buzzy source through a moving vowel filter
    meow(cat) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const base = (BB.CATS && BB.CATS[cat] && BB.CATS[cat].voice) || 560;
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(base * 0.85, t);
      osc.frequency.linearRampToValueAtTime(base * 1.25, t + 0.12);
      osc.frequency.linearRampToValueAtTime(base * 0.8, t + 0.42);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 5;
      f1.frequency.setValueAtTime(700, t);             // "mm"
      f1.frequency.linearRampToValueAtTime(1900, t + 0.14); // "ee"
      f1.frequency.linearRampToValueAtTime(900, t + 0.42);  // "ow"
      const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 3200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.05);
      g.gain.setValueAtTime(0.2, t + 0.28);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(f1); f1.connect(f2); f2.connect(g); g.connect(sfxBus);
      const s = ctx.createGain(); s.gain.value = 0.25; g.connect(s); s.connect(reverbSend);
      osc.start(t); osc.stop(t + 0.55);
    },
    unlock() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => inst.bell(midi(m), t + i * 0.1, 0.11, sfxBus));
      inst.pad([midi(60), midi(67), midi(76)], t + 0.3, 2.4, 0.1, sfxBus, 1600);
      noise({ at: t + 0.1, dur: 1.4, vol: 0.04, freq: 6000, to: 12000, q: 0.5, verb: 0.6 });
    },
    rescue() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noise({ dur: 0.9, vol: 0.06, freq: 900, to: 3500, q: 1.2, verb: 0.5 });
      [84, 81, 79, 76, 79].forEach((m, i) => inst.musicbox(midi(m), t + 0.15 + i * 0.13, 0.07, sfxBus));
    },
    firefly() { tone({ freq: midi(88 + (Math.random() * 3 | 0) * 2), dur: 0.35, vol: 0.05, verb: 0.7 }); },
    note(m) { if (ctx) inst.marimba(midi(m), ctx.currentTime, 0.16, sfxBus, 0.4); },
    bloom(i) { if (ctx) inst.bell(midi(76 + PENTA[i % 6]), ctx.currentTime, 0.1, sfxBus); },
    gate() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [67, 71, 74, 79].forEach((m, i) => inst.harp(midi(m), t + i * 0.08, 0.12, sfxBus));
      noise({ dur: 0.6, vol: 0.05, freq: 400, to: 1600, q: 0.7 });
    },
    toy() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [72, 79, 76, 84].forEach((m, i) => inst.musicbox(midi(m), t + i * 0.09, 0.14, sfxBus));
      [0, 1, 2, 3].forEach(i => tone({ freq: 2000 + i * 300, at: t + 0.45 + i * 0.05, dur: 0.2, vol: 0.03, verb: 0.6 }));
    },
    secret() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [79, 83, 86, 91].forEach((m, i) => tone({ freq: midi(m), at: t + i * 0.06, dur: 0.5, vol: 0.05, verb: 0.8 }));
    },
    select() { tone({ freq: 880, to: 990, dur: 0.08, vol: 0.07 }); },
    confirm() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [72, 79, 84].forEach((m, i) => inst.marimba(midi(m), t + i * 0.06, 0.12, sfxBus));
    },
    whoosh() { noise({ dur: 0.35, vol: 0.05, freq: 600, to: 2400, q: 0.8 }); },
    yarn() { tone({ type: 'triangle', freq: 300 + Math.random() * 80, to: 200, dur: 0.1, vol: 0.06 }); },
    splash() { noise({ dur: 0.35, vol: 0.09, freq: 1200, to: 400, q: 0.6, verb: 0.3 }); },
    // sandstone crumbling under Mighty Paws: a soft sandy shush + tumble
    crumble() {
      noise({ dur: 0.4, vol: 0.08, freq: 700, to: 250, q: 0.5, ftype: 'lowpass' });
      [0, 0.06, 0.12].forEach(d => tone({ type: 'triangle', freq: 180 - d * 300, delay: d, dur: 0.09, vol: 0.05 }));
    },
    party() {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        noise({ at: t + i * 0.18, dur: 0.25, vol: 0.05, freq: 3000, to: 8000, q: 0.5 });
        inst.bell(midi(79 + PENTA[(i * 2) % 8]), t + i * 0.18 + 0.1, 0.06, sfxBus);
      }
    },
  };

  BB.Audio = {
    init,
    get ctx() { return ctx; },
    get muted() { return muted; },
    get musicBus() { return musicBus; },
    inst, tone, noise, midi,
    sfx: new Proxy(sfx, {
      get(target, name) {
        const fn = target[name];
        return (...args) => { if (ctx && !muted && fn) { try { fn(...args); } catch (e) { /* never crash on sound */ } } };
      },
    }),
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('bubblebug_muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
    },
    toggle() { this.setMuted(!muted); return muted; },
    // Duck the music under big moments (unlock fanfares, etc.)
    duck(amount, seconds) {
      if (!ctx) return;
      const t = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setTargetAtTime(0.55 * amount, t, 0.08);
      musicBus.gain.setTargetAtTime(0.55, t + seconds, 0.6);
    },
  };
})(window.BB);
