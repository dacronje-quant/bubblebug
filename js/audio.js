// ════════════════════════════════════════════════
//  AUDIO ENGINE (Web Audio API Synthesizer)
// ════════════════════════════════════════════════
const Audio = (() => {
  let ctx, muted = false, musicGain;
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.08;
      musicGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(freq, type, dur, vol = 0.2) {
    if (muted) return;
    const c = ensure();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  // Zone ambient chime scales
  let curZone = -1, musicInterval = null;
  const scales = {
    0: [262, 294, 330, 349, 392, 440, 494, 523], // C major - Sparkle Gardens
    1: [262, 294, 330, 392, 440, 523, 587, 659], // Pentatonic - Mushroom Meadow
    2: [220, 262, 294, 330, 392, 440, 494, 523], // A minor - Crystal Caves
    3: [294, 330, 370, 440, 494, 554, 587, 659], // D major - Honey Hive
    4: [247, 294, 330, 370, 440, 494, 554, 587], // B minor - Rainy Ruins
    5: [330, 392, 440, 494, 587, 659, 740, 784], // E major - Cloud Kingdom
  };

  function startMusic(zone) {
    if (zone === curZone && musicInterval) return;
    curZone = zone;
    stopMusic();
    if (muted) return;
    const sc = scales[zone] || scales[0];
    let i = 0;
    musicInterval = setInterval(() => {
      if (muted) return;
      const n = sc[i % sc.length];
      play(n, 'sine', 0.8, 0.05);
      if (Math.random() > 0.5) play(n * 1.5, 'sine', 0.6, 0.025);
      i = (i + 1) % (sc.length * 2);
    }, 850);
  }

  function stopMusic() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  return {
    ensure,
    boop() { play(520, 'sine', 0.1, 0.12); },
    jump() {
      play(420, 'sine', 0.08, 0.1);
      setTimeout(() => play(640, 'sine', 0.08, 0.08), 35);
    },
    djump() {
      play(640, 'sine', 0.1, 0.12);
      setTimeout(() => play(920, 'sine', 0.1, 0.1), 45);
    },
    bubble() {
      play(820, 'sine', 0.15, 0.1);
      setTimeout(() => play(1040, 'sine', 0.1, 0.08), 55);
    },
    sparkle() { play(1200 + Math.random() * 400, 'sine', 0.15, 0.12); },
    befriend() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => play(f, 'sine', 0.3, 0.15), i * 90));
    },
    bounce() {
      play(320, 'sine', 0.2, 0.15);
      setTimeout(() => play(560, 'sine', 0.15, 0.12), 70);
    },
    unlock() {
      [523, 587, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => play(f, 'sine', 0.4, 0.18), i * 110));
    },
    hurt() { play(190, 'triangle', 0.18, 0.1); },
    startMusic,
    stopMusic,
    toggle() {
      muted = !muted;
      const btn = document.getElementById('mute-btn');
      if (btn) btn.textContent = muted ? '🔇' : '🔊';
      if (muted) stopMusic(); else startMusic(curZone);
    },
    get muted() { return muted; }
  };
})();
