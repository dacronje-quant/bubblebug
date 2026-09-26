// ════════════════════════════════════════════════════════════════
//  MUSIC — an adaptive, layered zone score.
//
//  Each zone has an 8-bar song made of layers (pad, bass, melody, arp,
//  percussion, twinkles). A look-ahead scheduler plays them sample-
//  accurately, and each layer's loudness follows what the kitten is doing:
//    • running & jumping   → arps and percussion swell in
//    • resting on a bench  → everything but a music-box lullaby fades out
//    • just made a friend  → a sparkly twinkle layer joins for a while
//    • deep dark caverns   → the whole mix gets softer and warmer
//  Changing zones crossfades to the new song on the next bar.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const A = BB.Audio;

  // Note names → MIDI
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nm(s) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
    if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const line = str => str.trim().split(/\s+/).map(t => (t === '.' ? null : t === '-' ? '-' : nm(t)));
  const chord = str => str.trim().split(/\s+/).map(nm);

  // 8 eighth-notes per bar, 8 bars per loop
  const SONGS = {
    gardens: {
      bpm: 100, lead: 'musicbox', arp: 'marimba', perc: 'shaker', padBright: 1400,
      chords: ['C3 E3 G3', 'F3 A3 C4', 'A2 C3 E3', 'G2 B2 D3', 'C3 E3 G3', 'F3 A3 C4', 'G2 B2 D3', 'C3 E3 G3'].map(chord),
      melody: line(`E5 G5 C6 . B5 G5 E5 .   F5 A5 C6 . A5 F5 . .   E5 A5 C6 . B5 A5 E5 .   D5 G5 B5 . A5 G5 . .
                    C6 . B5 G5 A5 . E5 G5   F5 . A5 C6 D6 . C6 A5   G5 . B5 D6 C6 B5 A5 B5   C6 . . G5 E5 . . .`),
    },
    meadow: {
      bpm: 84, lead: 'marimba', arp: 'musicbox', perc: 'tick', padBright: 900,
      chords: ['F3 A3 E4', 'E3 G3 D4', 'D3 F3 C4', 'C3 E3 B3', 'F3 A3 E4', 'E3 G3 D4', 'D3 F3 C4', 'C3 G3 E4'].map(chord),
      melody: line(`A5 . C6 . E6 . C6 .   G5 . B5 . D6 . B5 .   F5 . A5 . C6 . A5 G5   E5 . G5 . B5 . . .
                    C6 . A5 . F5 . G5 A5   B5 . G5 . E5 . F5 G5   A5 . F5 . D5 . E5 F5   E5 . . . G5 . . .`),
    },
    caves: {
      bpm: 72, lead: 'bell', arp: 'harp', perc: 'drop', padBright: 700,
      chords: ['A2 E3 B3', 'F2 C3 E3', 'C3 G3 D4', 'E2 B2 D3', 'A2 E3 C4', 'F2 A2 E3', 'C3 G3 E4', 'A2 E3 A3'].map(chord),
      melody: line(`A5 . . E6 . . C6 .   A5 . . F6 . . E6 .   G5 . . D6 . . E6 .   B5 . . . G5 . . .
                    C6 . . A5 . . E5 .   F5 . . A5 . . C6 .   E6 . D6 . C6 . B5 .   A5 . . . . . . .`),
    },
    hive: {
      bpm: 112, lead: 'marimba', arp: 'musicbox', perc: 'shaker', padBright: 1200,
      chords: ['D3 F#3 A3', 'G2 B2 D3', 'A2 C#3 E3', 'D3 F#3 A3', 'B2 D3 F#3', 'G2 B2 D3', 'A2 C#3 E3', 'D3 F#3 A3'].map(chord),
      melody: line(`F#5 A5 F#5 A5 D6 . A5 .   G5 B5 G5 B5 D6 . B5 .   A5 C#6 E6 C#6 A5 . E5 .   F#5 . E5 . D5 . . .
                    D6 . C#6 B5 A5 . F#5 .   B5 . A5 G5 F#5 . D5 .   E5 F#5 G5 A5 B5 C#6 D6 E6   D6 . A5 . F#5 . D5 .`),
    },
    ruins: {
      bpm: 76, lead: 'piano', arp: 'harp', perc: 'drop', padBright: 800,
      chords: ['E3 G3 B3', 'C3 E3 G3', 'G2 B2 D3', 'D3 F#3 A3', 'E3 G3 B3', 'C3 E3 G3', 'D3 F#3 A3', 'E3 B3 G4'].map(chord),
      melody: line(`B4 . E5 . G5 . F#5 E5   E5 . G5 . B5 . A5 G5   D5 . G5 . B5 . A5 G5   F#5 . . . A5 . . .
                    G5 . F#5 . E5 . B4 .   C5 . E5 . G5 . E5 .   D5 . F#5 . A5 . G5 F#5   E5 . . . . . . .`),
    },
    clouds: {
      bpm: 88, lead: 'harp', arp: 'bell', perc: 'tick', padBright: 1600,
      chords: ['G3 B3 F#4', 'C3 E3 B3', 'A2 C3 G3', 'D3 F#3 C4', 'G3 B3 D4', 'C3 E3 G3', 'A2 E3 C4', 'D3 A3 F#4'].map(chord),
      melody: line(`D6 . B5 . G5 . B5 D6   E6 . C6 . G5 . C6 E6   C6 . A5 . E5 . A5 C6   D6 . . C6 B5 . A5 .
                    G6 . D6 . B5 . D6 .   E6 . G6 . E6 . C6 .   A5 . C6 . E6 . F#6 .   G6 . . . D6 . . .`),
    },
    lagoon: {
      bpm: 96, lead: 'marimba', arp: 'harp', perc: 'shaker', padBright: 1400,
      chords: ['F3 A3 C4', 'Bb2 D3 F3', 'C3 E3 G3', 'F3 A3 C4', 'D3 F3 A3', 'Bb2 D3 F3', 'C3 E3 G3', 'F3 A3 C4'].map(chord),
      melody: line(`C5 . F5 A5 . F5 C6 .   Bb5 . D6 . Bb5 . F5 .   G5 . C6 . E6 . C6 .   A5 . F5 . C5 . . .
                    D5 . F5 A5 . F5 D6 .   D6 . Bb5 . F5 . D5 .   E5 G5 C6 . Bb5 G5 E5 .   F5 . . . A5 . . .`),
    },
    dunes: {
      bpm: 92, lead: 'marimba', arp: 'musicbox', perc: 'tick', padBright: 1100,
      chords: ['D3 F3 A3', 'C3 E3 G3', 'D3 F3 A3', 'A2 C3 E3', 'Bb2 D3 F3', 'C3 E3 G3', 'A2 C#3 E3', 'D3 F3 A3'].map(chord),
      melody: line(`D5 . F5 . A5 G5 F5 .   E5 . G5 . C6 . G5 .   F5 . A5 . D6 C6 A5 .   E5 . . C5 E5 . . .
                    F5 . Bb5 . D6 . Bb5 .   G5 . C6 . E6 . D6 C6   C#6 . A5 . E5 . G5 .   F5 . E5 . D5 . . .`),
    },
    frost: {
      bpm: 80, lead: 'bell', arp: 'musicbox', perc: 'tick', padBright: 1500,
      chords: ['G3 B3 D4', 'E3 G3 B3', 'C3 E3 G3', 'D3 F#3 A3', 'G3 B3 D4', 'B2 D3 F#3', 'C3 E3 G3', 'D3 A3 F#4'].map(chord),
      melody: line(`B5 . D6 . G6 . D6 .   B5 . G5 . E5 . G5 .   C6 . E6 . G6 . E6 .   D6 . . . A5 . . .
                    G5 . B5 . D6 . G6 .   F#6 . D6 . B5 . F#5 .   E6 . D6 . C6 . B5 .   A5 . . . D6 . . .`),
    },
    autumn: {
      bpm: 90, lead: 'piano', arp: 'harp', perc: 'shaker', padBright: 1000,
      chords: ['D3 F#3 A3', 'B2 D3 F#3', 'G2 B2 D3', 'A2 C#3 E3', 'D3 F#3 A3', 'G2 B2 D3', 'E3 G3 B3', 'A2 E3 C#4'].map(chord),
      melody: line(`A5 . F#5 . D5 . F#5 A5   B5 . A5 . F#5 . D5 .   G5 . B5 . D6 . B5 .   A5 . . . E5 . . .
                    F#5 . A5 . D6 . C#6 D6   B5 . G5 . D5 . G5 .   E5 . G5 . B5 . A5 G5   E5 . . . C#5 . . .`),
    },
    springs: {
      bpm: 68, lead: 'harp', arp: 'bell', perc: 'drop', padBright: 800,
      chords: ['A2 E3 C4', 'F2 C3 A3', 'C3 G3 E4', 'G2 D3 B3', 'A2 E3 C4', 'F2 C3 A3', 'G2 D3 B3', 'A2 E3 A3'].map(chord),
      melody: line(`E5 . . G5 A5 . . .   C6 . A5 . G5 . E5 .   D5 . E5 . G5 . . .   E5 . D5 . . . . .
                    A5 . . C6 D6 . . .   E6 . D6 . C6 . A5 .   G5 . A5 . C6 . D6 .   A5 . . . . . . .`),
    },
    starlight: {
      bpm: 78, lead: 'bell', arp: 'harp', perc: 'tick', padBright: 1500,
      chords: ['F3 A3 E4', 'G3 B3 D4', 'E3 G3 B3', 'A2 C3 E3', 'F3 A3 C4', 'G3 B3 D4', 'C3 E3 G3', 'C3 G3 E4'].map(chord),
      melody: line(`C6 . A5 . F5 . A5 B5   D6 . B5 . G5 . B5 D6   E6 . . B5 G5 . E5 .   A5 . . . C6 . . .
                    F6 . E6 . C6 . A5 .   B5 . D6 . G6 . D6 .   E6 . D6 . C6 . G5 .   C6 . . . . . . .`),
    },
    lullaby: { // title, select & finale-rest
      bpm: 70, lead: 'musicbox', arp: 'harp', perc: null, padBright: 700,
      chords: ['C3 G3 E4', 'A2 E3 C4', 'F2 C3 A3', 'G2 D3 B3', 'C3 G3 E4', 'A2 E3 C4', 'F2 C3 A3', 'G2 D3 G3'].map(chord),
      melody: line(`G5 . E5 . G5 . C6 .   A5 . E5 . A5 . C6 .   F5 . A5 . C6 . A5 .   G5 . D5 . B4 . . .
                    E5 . G5 . C6 . E6 .   C6 . A5 . E5 . A5 .   F5 . E5 . D5 . F5 .   E5 . . . . . . .`),
    },
    party: {
      bpm: 124, lead: 'musicbox', arp: 'marimba', perc: 'shaker', padBright: 1800,
      chords: ['C3 E3 G3', 'F3 A3 C4', 'A2 C3 E3', 'G2 B2 D3', 'C3 E3 G3', 'F3 A3 C4', 'G2 B2 D3', 'C3 E3 G3'].map(chord),
      melody: line(`E5 G5 C6 . B5 G5 E5 .   F5 A5 C6 . A5 F5 . .   E5 A5 C6 . B5 A5 E5 .   D5 G5 B5 . A5 G5 . .
                    C6 . B5 G5 A5 . E5 G5   F5 . A5 C6 D6 . C6 A5   G5 . B5 D6 C6 B5 A5 B5   C6 . . G5 E5 . . .`),
    },
  };

  const LAYERS = ['pad', 'bass', 'lead', 'arp', 'perc', 'twinkle'];
  const busses = {};
  let song = null, pendingSong = null, songName = null;
  let step = 0, nextTime = 0, timer = null;
  const target = { pad: 1, bass: 1, lead: 1, arp: 0.3, perc: 0.2, twinkle: 0 };
  let master = null;

  function ensureBusses() {
    const ctx = A.ctx;
    if (!ctx || master) return !!ctx;
    master = ctx.createGain(); master.gain.value = 1;
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 12000;
    master.connect(warm); warm.connect(A.musicBus);
    master._warm = warm;
    for (const l of LAYERS) {
      const g = ctx.createGain(); g.gain.value = target[l] || 0; g.connect(master); busses[l] = g;
    }
    return true;
  }

  const VOL = { pad: 0.16, bass: 0.2, lead: 0.13, arp: 0.07, perc: 0.05, twinkle: 0.04 };

  function schedule(at, s, st) {
    const bar = Math.floor(st / 8) % 8, sub = st % 8;
    const ch = s.chords[bar];
    const beat = 60 / s.bpm / 2; // eighth note length
    const inst = A.inst;

    if (sub === 0) {
      inst.pad(ch.map(A.midi), at, beat * 8, VOL.pad, busses.pad, s.padBright);
      inst.bass(A.midi(ch[0] - 12), at, VOL.bass, busses.bass, beat * 2);
    }
    if (sub === 4) inst.bass(A.midi(ch[0] - 12 + (bar % 2 ? 7 : 0)), at, VOL.bass * 0.8, busses.bass, beat * 2);

    const n = s.melody[bar * 8 + sub];
    if (n != null && n !== '-') {
      if (s.lead === 'flute') inst.flute(A.midi(n), at, VOL.lead, busses.lead, beat * 1.5);
      else inst[s.lead](A.midi(n), at, VOL.lead, busses.lead);
    }

    // Arpeggio: chord tones climbing two octaves up, one per eighth
    const arpNote = ch[sub % ch.length] + 12 + (sub >= 4 ? 12 : 0);
    inst[s.arp](A.midi(arpNote), at, VOL.arp, busses.arp, 0.3);

    if (s.perc === 'shaker') { inst.shaker(at, VOL.perc * (sub % 2 ? 0.6 : 1), busses.perc); if (sub === 0 || sub === 4) inst.kick(at, VOL.perc * 2.5, busses.perc); }
    else if (s.perc === 'tick' && sub % 2 === 0) inst.tick(at, VOL.perc, busses.perc);
    else if (s.perc === 'drop' && (sub === 3 || sub === 6) && Math.random() < 0.7) inst.drop(at, VOL.perc * 1.6, busses.perc, 1000 + Math.random() * 900);

    // Twinkles: random high pentatonic sparkles over the chord
    if (Math.random() < 0.45) {
      const t = ch[(Math.random() * ch.length) | 0] + 36;
      A.tone({ freq: A.midi(t), at: at + beat * 0.5 * Math.random(), dur: 0.9, vol: VOL.twinkle, bus: busses.twinkle, verb: 0.8 });
    }
  }

  function tick() {
    const ctx = A.ctx;
    if (!ctx || !song) return;
    const ahead = ctx.currentTime + 0.15;
    if (nextTime < ctx.currentTime - 0.5) nextTime = ctx.currentTime + 0.05; // tab was asleep
    while (nextTime < ahead) {
      if (pendingSong && step % 8 === 0) { song = pendingSong; pendingSong = null; step = 0; }
      if (!A.muted) schedule(nextTime, song, step);
      nextTime += 60 / song.bpm / 2;
      step = (step + 1) % 64;
    }
  }

  BB.Music = {
    SONGS,
    wanted: null,
    play(name) {
      this.wanted = name;
      if (!ensureBusses()) return; // no audio yet — started once the player taps/presses
      if (name === songName) return;
      songName = name;
      const s = SONGS[name] || SONGS.gardens;
      if (!song) { song = s; step = 0; nextTime = A.ctx.currentTime + 0.1; }
      else pendingSong = s;
      if (!timer) timer = setInterval(tick, 30);
    },
    stop() { if (timer) { clearInterval(timer); timer = null; } song = null; songName = null; },
    get current() { return songName; },

    // mood: { energy 0..1, calm bool, joy 0..1, dark 0..1, paused bool }
    setMood(m) {
      if (!master) return;
      const ctx = A.ctx;
      const t = ctx.currentTime;
      const calm = !!m.calm;
      target.pad = 1;
      target.bass = calm ? 0.15 : 1;
      target.lead = 1;
      target.arp = calm ? 0 : 0.25 + 0.75 * (m.energy || 0);
      target.perc = calm ? 0 : 0.15 + 0.85 * (m.energy || 0);
      target.twinkle = calm ? 0.8 : Math.min(1, 0.2 + (m.joy || 0));
      for (const l of LAYERS) busses[l].gain.setTargetAtTime(target[l], t, 0.4);
      const cutoff = m.paused ? 900 : 12000 - (m.dark || 0) * 8000;
      master._warm.frequency.setTargetAtTime(cutoff, t, 0.3);
      master.gain.setTargetAtTime(m.paused ? 0.6 : 1, t, 0.3);
    },
  };
})(window.BB);
