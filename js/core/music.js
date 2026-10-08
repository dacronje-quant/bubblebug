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
//
//  Each region also has a recorded score (Lyria 3.5, assets/music/<key>.js,
//  a seamless loop). When one exists it is used instead of the layered
//  song: the old region's music fades out while the new one fades in, and
//  each region resumes where it left off. Boss, party and lullaby tunes
//  stay layered. The next region can be warmed in the background.
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
    home: { // the Cat House: a slow, warm waltz-y music box
      bpm: 84, lead: 'musicbox', arp: 'harp', perc: 'tick', padBright: 900,
      chords: ['F3 A3 C4', 'D3 F3 A3', 'Bb2 D3 F3', 'C3 E3 G3', 'F3 A3 C4', 'A2 C3 E3', 'Bb2 D3 F3', 'C3 G3 E4'].map(chord),
      melody: line(`C6 . A5 . F5 . A5 .   D6 . A5 . F5 . D5 .   D6 . Bb5 . F5 . D6 .   C6 . . . G5 . . .
                    A5 . C6 . F6 . E6 D6   C6 . A5 . E5 . C6 .   Bb5 . D6 . F6 . D6 .   C6 . . . . . . .`),
    },
    boss: { // a playful "uh-oh, someone's grumpy" tune for the arenas
      bpm: 112, lead: 'marimba', arp: 'bell', perc: 'shaker', padBright: 1300,
      chords: ['A2 C3 E3', 'F2 A2 C3', 'G2 B2 D3', 'E2 G#2 B2', 'A2 C3 E3', 'F2 A2 C3', 'D3 F3 A3', 'E2 G#2 B2'].map(chord),
      melody: line(`A5 . C6 . E6 . C6 .   F5 . A5 . C6 . A5 .   G5 . B5 . D6 . B5 .   G#5 . . . E5 . . .
                    A5 C6 E6 . D6 C6 B5 .   A5 . C6 . F6 . E6 .   D6 . F6 . A5 . D6 .   B5 . G#5 . E5 . . .`),
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
  // regions with a recorded score (keys of BB.ZONES)
  const RECORDED = ['gardens', 'meadow', 'caves', 'hive', 'ruins', 'clouds', 'lagoon', 'dunes', 'frost', 'autumn', 'springs', 'starlight', 'home'];
  const FADE_OUT = 2.2, FADE_IN = 2.8, REC_LEVEL = 0.62, KEEP = 3;
  const busses = {};
  let procGain = null, procOff = null, rec = null, recToken = 0;
  const buffers = new Map(), loading = {}, resumeAt = {};
  let decoding = Promise.resolve(), prewarm = null;
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
    procGain = ctx.createGain(); procGain.gain.value = 1; procGain.connect(master);
    for (const l of LAYERS) {
      const g = ctx.createGain(); g._music = true; g.gain.value = target[l] || 0; g.connect(procGain); busses[l] = g;
    }
    return true;
  }

  // ──── recorded region scores ────
  // Decode small, four-character-aligned base64 slices between browser
  // turns. This also works from file://, where fetch/worker URLs can fail.
  function unpack(mp3) {
    return new Promise(resolve => {
      const padding = mp3.endsWith('==') ? 2 : mp3.endsWith('=') ? 1 : 0;
      const bytes = new Uint8Array(mp3.length / 4 * 3 - padding);
      const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
      let at = 0, out = 0;
      function part() {
        const until = clock() + 2;
        try {
          do {
            const bin = atob(mp3.slice(at, at + 16384));
            for (let i = 0; i < bin.length; i++) bytes[out++] = bin.charCodeAt(i);
            at += 16384;
          } while (at < mp3.length && clock() < until);
        } catch (e) { resolve(null); return; }
        if (at < mp3.length) setTimeout(part, 0);
        else resolve(bytes.buffer);
      }
      // Never unpack inside a room-transition tick, even for a cached file.
      setTimeout(part, 0);
    });
  }
  function decode(name) {
    const d = window.BB_MUSIC && window.BB_MUSIC[name];
    if (!d) return Promise.resolve(null);
    return unpack(d.mp3).then(bytes => new Promise(resolve => {
      if (!bytes || !A.ctx) { resolve(null); return; }
      try {
        const p = A.ctx.decodeAudioData(bytes, b => resolve(b), () => resolve(null));
        if (p && p.catch) p.catch(() => resolve(null));
      } catch (e) { resolve(null); }
    })).then(b => {
      if (!b) return null;
      b._loopEnd = Math.min(b.duration, d.frames / d.rate);
      delete window.BB_MUSIC[name]; // the decoded copy is all we need now
      return b;
    });
  }
  function load(name) {
    if (buffers.has(name)) { const b = buffers.get(name); buffers.delete(name); buffers.set(name, b); return Promise.resolve(b); }
    if (loading[name]) return loading[name];
    loading[name] = new Promise(resolve => {
      if (window.BB_MUSIC && window.BB_MUSIC[name]) { resolve(); return; }
      if (typeof document === 'undefined') { resolve(); return; }
      const el = document.createElement('script');
      el.src = 'assets/music/' + name + '.js';
      el.onload = el.onerror = () => { el.remove(); resolve(); };
      document.head.appendChild(el);
    }).then(() => {
      // Only one encoded score is unpacked/decoded at a time, including
      // preloads, so rapid travel cannot create a burst of audio allocations.
      const job = decoding.then(() => decode(name));
      decoding = job.catch(() => null);
      return job;
    }).then(b => {
      delete loading[name];
      if (b) {
        buffers.set(name, b);
        // keep only the last few regions decoded (each is ~30 MB of samples)
        for (const old of buffers.keys()) {
          if (buffers.size <= KEEP) break;
          if (old !== songName && (!rec || rec.name !== old)) buffers.delete(old);
        }
      }
      return b;
    });
    return loading[name];
  }
  function fadeOutRecorded() {
    if (!rec) return;
    const r = rec, t = A.ctx.currentTime;
    resumeAt[r.name] = (r.offset + t - r.start) % r.buffer._loopEnd;
    r.gain.gain.cancelScheduledValues(t);
    r.gain.gain.setValueAtTime(r.gain.gain.value, t);
    r.gain.gain.linearRampToValueAtTime(0, t + FADE_OUT);
    try { r.src.stop(t + FADE_OUT + 0.1); } catch (e) { /* already stopped */ }
    rec = null;
  }
  function startRecorded(name, buffer) {
    const ctx = A.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buffer; src.loop = true; src.loopStart = 0; src.loopEnd = buffer._loopEnd;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(REC_LEVEL, t + FADE_IN);
    src.connect(gain); gain.connect(master);
    const offset = resumeAt[name] || 0;
    src.start(t, offset);
    rec = { name, src, gain, buffer, start: t, offset };
  }
  function fadeProcedural(on) {
    const t = A.ctx.currentTime;
    procGain.gain.cancelScheduledValues(t);
    procGain.gain.setValueAtTime(procGain.gain.value, t);
    procGain.gain.linearRampToValueAtTime(on ? 1 : 0, t + (on ? FADE_IN : FADE_OUT));
    clearTimeout(procOff);
    // (the layered song stops scheduling once it has faded away)
    if (!on) procOff = setTimeout(() => { if (rec) { song = null; pendingSong = null; if (timer) { clearInterval(timer); timer = null; } } }, FADE_OUT * 1000 + 300);
  }
  function startProcedural(name) {
    const s = SONGS[name] || SONGS.gardens;
    if (!song) { song = s; step = 0; nextTime = A.ctx.currentTime + 0.1; }
    else pendingSong = s;
    if (!timer) timer = setInterval(tick, 30);
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
    RECORDED,
    preload(name) {
      // Warm just one likely destination after a short delay in this zone.
      // Cancel the previous request when a new zone is entered.
      clearTimeout(prewarm);
      if (!A.ctx || !RECORDED.includes(name) || name === songName) return;
      const current = songName;
      prewarm = setTimeout(() => {
        prewarm = null;
        if (songName === current && !A.muted) load(name);
      }, 1200);
    },
    play(name) {
      this.wanted = name;
      if (!ensureBusses()) return; // no audio yet — started once the player taps/presses
      if (name === songName) return;
      songName = name;
      const token = ++recToken;
      if (RECORDED.includes(name)) {
        this.preload(RECORDED[(RECORDED.indexOf(name) + 1) % RECORDED.length]);
        load(name).then(buffer => {
          if (token !== recToken || songName !== name) return;
          // Keep the old music audible during background preparation, then
          // crossfade as soon as the next score is ready.
          fadeOutRecorded();
          if (buffer) { startRecorded(name, buffer); fadeProcedural(false); }
          else { fadeProcedural(true); startProcedural(name); } // (no file: the layered song)
        });
      } else {
        clearTimeout(prewarm); prewarm = null;
        fadeOutRecorded();
        fadeProcedural(true);
        startProcedural(name);
      }
    },
    stop() {
      if (timer) { clearInterval(timer); timer = null; } song = null; pendingSong = null; songName = null; this.wanted = null;
      if (rec) { try { rec.src.stop(); } catch (e) { /* stopped */ } rec = null; }
      ++recToken;
      clearTimeout(prewarm); prewarm = null;
      clearTimeout(procOff); procOff = null;
    },
    get recording() { return rec ? rec.name : null; },
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
      // (recorded scores already suit their region, so darkness only softens the layered songs)
      const cutoff = m.paused ? 900 : rec ? 12000 : 12000 - (m.dark || 0) * 8000;
      master._warm.frequency.setTargetAtTime(cutoff, t, 0.3);
      master.gain.setTargetAtTime(m.paused ? 0.6 : 1, t, 0.3);
    },
  };
})(window.BB);
