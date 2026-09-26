// ════════════════════════════════════════════════════════════════
//  CRITTERS — every bug, elder and the Cloud King, in vector.
//
//  Nobody here is a villain: gloomy bugs are just having a rainy day.
//  Their `mood` (1 = very gloomy … 0 = happy) is shown without numbers:
//    • a little personal rain-cloud over their head that shrinks with
//      every friendship bubble
//    • droopy eyelids and a wobbly frown that slowly turn upward
//    • colours that brighten from grey-ish to full and cheerful
//  When a bug is befriended the cloud becomes a tiny rainbow.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const TAU = Math.PI * 2;
  const OUT = '#3a2a3a';

  // ──── Shared face ────
  function face(c, x, y, s, mood, st) {
    const t = st.t || 0;
    const blink = st.blink || 0;
    const happy = mood < 0.05;
    const ex = 3.6 * s, er = 2.6 * s;
    for (const side of [-1, 1]) {
      const cx = x + side * ex, cy = y;
      if (happy && st.joy) {
        c.strokeStyle = OUT; c.lineWidth = 1.2 * s; c.lineCap = 'round';
        c.beginPath(); c.arc(cx, cy + er * 0.3, er * 0.8, Math.PI + 0.3, -0.3); c.stroke();
        continue;
      }
      c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 0.9 * s;
      G.ellipse(cx, cy, er, er * 1.1 * (1 - blink * 0.9), 0, c); c.fill(); c.stroke();
      if (blink < 0.8) {
        const look = (st.lookX || 0) * er * 0.3;
        c.fillStyle = '#1b1422';
        G.circle(cx + look, cy + er * 0.2 + mood * er * 0.2, er * 0.55, c); c.fill();
        c.fillStyle = '#fff';
        G.circle(cx + look + er * 0.25, cy - er * 0.1, er * 0.22, c); c.fill();
      }
      // droopy lids for gloomy moods
      if (mood > 0.15) {
        c.fillStyle = st.lid || '#8a7a8a';
        c.beginPath();
        c.ellipse(cx, cy, er + 0.4, er * 1.15, 0, Math.PI + 0.15, -0.15);
        c.closePath();
        c.save(); c.clip();
        c.fillRect(cx - er - 1, cy - er * 1.3, er * 2 + 2, er * 1.3 * mood * 1.1);
        c.restore();
        // worried brows
        c.strokeStyle = OUT; c.lineWidth = 1.1 * s; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(cx - side * er * 0.9, cy - er * 1.35 - mood * 0.8 * s);
        c.lineTo(cx + side * er * 0.7, cy - er * 1.5 + mood * 1.2 * s);
        c.stroke();
      }
    }
    // mouth: frown → smile
    const my = y + 4.4 * s;
    const curve = (0.5 - mood) * 3.2 * s; // + smile, - frown
    c.strokeStyle = OUT; c.lineWidth = 1.2 * s; c.lineCap = 'round';
    if (happy) {
      c.fillStyle = '#c0395a';
      c.beginPath(); c.moveTo(x - 2.6 * s, my - 0.6 * s);
      c.quadraticCurveTo(x, my + 3.8 * s, x + 2.6 * s, my - 0.6 * s); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,140,170,0.55)';
      G.ellipse(x - 6.2 * s, y + 3 * s, 1.8 * s, 1.1 * s, 0, c); c.fill();
      G.ellipse(x + 6.2 * s, y + 3 * s, 1.8 * s, 1.1 * s, 0, c); c.fill();
    } else {
      const wob = Math.sin(t * 0.2) * 0.4 * s * mood;
      c.beginPath(); c.moveTo(x - 2.4 * s, my + wob);
      c.quadraticCurveTo(x, my + curve, x + 2.4 * s, my - wob); c.stroke();
    }
  }

  // Personal rain-cloud (gloom meter) / rainbow (befriended)
  function moodCloud(c, x, y, mood, t, s = 1) {
    if (mood <= 0.02) return;
    const k = 0.6 + mood * 0.7;
    c.save();
    c.translate(x, y + Math.sin(t * 0.05) * 1.5);
    c.scale(k * s, k * s);
    c.fillStyle = BB.mix('#c9ccd8', '#8a8fa6', mood);
    c.strokeStyle = 'rgba(60,60,90,0.5)'; c.lineWidth = 1;
    c.beginPath();
    c.arc(-6, 2, 5, 0, TAU); c.arc(0, -1, 7, 0, TAU); c.arc(7, 2, 5, 0, TAU);
    c.fill();
    c.fillRect(-9, 1, 18, 6);
    // drizzle
    c.strokeStyle = 'rgba(120,170,255,0.8)'; c.lineWidth = 1.2; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const dx = -5 + i * 5, ph = ((t * 0.08 + i * 0.37) % 1);
      c.globalAlpha = 1 - ph;
      c.beginPath(); c.moveTo(dx, 8 + ph * 8); c.lineTo(dx - 1, 11 + ph * 8); c.stroke();
    }
    c.restore();
  }

  function rainbow(c, x, y, a, s = 1) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = a;
    c.lineWidth = 2 * s;
    ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => {
      c.strokeStyle = col;
      c.beginPath(); c.arc(x, y + 6 * s, (11 - i * 2) * s, Math.PI, 0); c.stroke();
    });
    c.restore();
  }

  function legs(c, x, y, n, span, len, t, speed, color, s) {
    c.strokeStyle = color; c.lineWidth = 1.4 * s; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const lx = x - span / 2 + (span / (n - 1 || 1)) * i;
      const ph = Math.sin(t * speed + i * 2.1) * 2 * s;
      c.beginPath(); c.moveTo(lx, y); c.lineTo(lx + ph, y + len); c.stroke();
    }
  }

  // Desaturate toward grey when gloomy
  const tone = (hex, mood) => BB.mix(hex, '#8d8a9a', mood * 0.45);

  // ──── Bugs ────  (x, y) = centre of body, facing via st.facing
  const BUGS = {
    ladybug(c, st, mood) {
      const t = st.t, walk = st.walk || 0;
      legs(c, 0, 5, 3, 14, 5, t, walk ? 0.4 : 0, OUT, 1);
      c.fillStyle = tone('#e8403a', mood); c.strokeStyle = OUT; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(-2, 0, 12, 9.5, 0, Math.PI, 0); c.lineTo(10, 4); c.quadraticCurveTo(-2, 8, -14, 4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#231a24';
      for (const [sx, sy, r] of [[-7, -3, 2.4], [0, -6, 2], [3, -1, 2.3], [-3, 3, 1.8]]) { G.circle(sx, sy, r, c); c.fill(); }
      c.strokeStyle = OUT; c.beginPath(); c.moveTo(-2, -9); c.lineTo(-2, 5); c.stroke();
      c.fillStyle = tone('#2d2433', mood * 0.3);
      G.circle(10, 0, 7, c); c.fill(); c.stroke();
      antennae(c, 11, -6, t, '#2d2433');
      face(c, 11, 0, 0.88, mood, Object.assign({ lid: '#3b3140' }, st));
    },
    beetle(c, st, mood) {
      const t = st.t;
      legs(c, -2, 5, 3, 14, 5, t, st.walk ? 0.4 : 0, OUT, 1);
      const g = c.createLinearGradient(-12, -10, 8, 6);
      g.addColorStop(0, tone('#3fd1b0', mood)); g.addColorStop(1, tone('#3d6ad6', mood));
      c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.3;
      G.ellipse(-3, 0, 12, 8.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)'; G.ellipse(-7, -4, 5, 2, -0.3, c); c.fill();
      c.fillStyle = tone('#2f5b8c', mood); G.circle(9, 0, 6.5, c); c.fill(); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(13, -4); c.quadraticCurveTo(18, -8, 16, -13); c.stroke();
      face(c, 9, 0, 0.82, mood, Object.assign({ lid: '#2f5b8c' }, st));
    },
    caterpillar(c, st, mood) {
      const t = st.t;
      for (let i = 0; i < 5; i++) {
        const sx = -16 + i * 6.5, sy = Math.sin(t * (st.walk ? 0.25 : 0.06) + i) * 1.6;
        c.fillStyle = tone(i % 2 ? '#8fdc5e' : '#6cc24a', mood); c.strokeStyle = OUT; c.lineWidth = 1.2;
        G.circle(sx, sy + 1, 5.6, c); c.fill(); c.stroke();
        c.fillStyle = tone('#ffe066', mood); G.circle(sx, sy - 1.5, 1.3, c); c.fill();
        c.strokeStyle = OUT; c.beginPath(); c.moveTo(sx - 1, sy + 6); c.lineTo(sx - 1, sy + 8); c.stroke();
      }
      c.fillStyle = tone('#a5e86e', mood); c.strokeStyle = OUT;
      G.circle(15, -2, 7.5, c); c.fill(); c.stroke();
      antennae(c, 15, -9, t, OUT);
      face(c, 15, -2, 0.9, mood, Object.assign({ lid: '#6cc24a' }, st));
    },
    pillbug(c, st, mood) {
      const t = st.t;
      legs(c, 0, 5, 5, 20, 4, t, st.walk ? 0.5 : 0, OUT, 1);
      c.fillStyle = tone('#8a9ccf', mood); c.strokeStyle = OUT; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(-1, 2, 14, 10, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(40,40,80,0.55)'; c.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-1 + i * 5, 2); c.quadraticCurveTo(-1 + i * 4, -6, -1 + i * 3.2, -7.5); c.stroke(); }
      c.fillStyle = tone('#b5c3ef', mood); c.strokeStyle = OUT; c.lineWidth = 1.2;
      G.circle(12, -1, 6, c); c.fill(); c.stroke();
      antennae(c, 13, -6, t, OUT);
      face(c, 12, -1, 0.82, mood, Object.assign({ lid: '#8a9ccf' }, st));
    },
    bee(c, st, mood) {
      const t = st.t;
      const flap = Math.sin(t * 1.2) * 0.6;
      c.fillStyle = 'rgba(220,240,255,0.75)'; c.strokeStyle = 'rgba(80,120,160,0.6)'; c.lineWidth = 1;
      G.ellipse(-3, -10, 7, 4.5, -0.6 + flap, c); c.fill(); c.stroke();
      G.ellipse(3, -10, 6, 4, 0.5 - flap, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffd23f', mood); c.strokeStyle = OUT; c.lineWidth = 1.3;
      G.ellipse(0, 0, 12, 9.5, 0, c); c.fill(); c.stroke();
      c.save(); G.ellipse(0, 0, 12, 9.5, 0, c); c.clip();
      c.fillStyle = tone('#3a2a1e', mood * 0.4);
      c.fillRect(-7, -10, 3.5, 20); c.fillRect(-1, -10, 3.5, 20);
      c.restore();
      c.strokeStyle = OUT; G.ellipse(0, 0, 12, 9.5, 0, c); c.stroke();
      antennae(c, 7, -7, t, OUT);
      face(c, 6, 0, 0.85, mood, Object.assign({ lid: '#e0b830' }, st));
    },
    spider(c, st, mood) {
      const t = st.t;
      c.strokeStyle = OUT; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        for (const side of [-1, 1]) {
          const w = Math.sin(t * 0.15 + i * 1.3 + side) * 1.2;
          const ky = -9 + i * 3.4, fy = 5 + i * 3;
          c.beginPath(); c.moveTo(side * 6, -2 + i * 2);
          c.lineTo(side * (13 + i * 0.6), ky + w);
          c.lineTo(side * (15 + i * 1.2), fy);
          c.stroke();
        }
      }
      c.fillStyle = tone('#8e6bd6', mood); c.strokeStyle = OUT; c.lineWidth = 1.3;
      G.circle(0, 0, 10, c); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.25)'; G.circle(-3, -4, 4, c); c.fill();
      face(c, 0, 1, 1.0, mood, Object.assign({ lid: '#6f52b0' }, st));
    },
    snailet(c, st, mood) {
      const t = st.t;
      c.fillStyle = tone('#f2c9a0', mood); c.strokeStyle = OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-14, 7); c.quadraticCurveTo(0, 9, 14, 6); c.quadraticCurveTo(16, -4, 10, -3); c.lineTo(-14, 5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = tone('#f59ac0', mood);
      G.circle(-3, -3, 9, c); c.fill(); c.stroke();
      c.strokeStyle = tone('#c0567f', mood); c.lineWidth = 1.4;
      c.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.3) { const r = 7 - a * 0.45; c.lineTo(-3 + Math.cos(a) * r, -3 + Math.sin(a) * r); }
      c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(12, -3); c.lineTo(14, -10); c.moveTo(14, -3); c.lineTo(17, -9); c.stroke();
      face(c, 13, 0, 0.72, mood, Object.assign({ lid: '#d8a878' }, st));
    },
    moth(c, st, mood) {
      const t = st.t;
      const flap = Math.sin(t * 0.5) * 0.5;
      c.fillStyle = tone('#efe6ff', mood); c.strokeStyle = 'rgba(90,70,140,0.7)'; c.lineWidth = 1.1;
      for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1); c.rotate(flap * 0.6);
        c.beginPath(); c.ellipse(9, -6, 10, 7, -0.4, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(8, 4, 6, 5, 0.4, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = tone('#c9b6ff', mood); G.circle(10, -6, 2.6, c); c.fill();
        c.restore();
      }
      c.fillStyle = tone('#fff8ef', mood); c.strokeStyle = OUT; c.lineWidth = 1.2;
      G.ellipse(0, 0, 6.5, 9, 0, c); c.fill(); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 1;
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * 2, -8); c.quadraticCurveTo(side * 7, -16, side * 9, -13); c.stroke();
      }
      face(c, 0, -2, 0.78, mood, Object.assign({ lid: '#d8ccf0' }, st));
    },
  };

  function antennae(c, x, y, t, col) {
    c.strokeStyle = col; c.lineWidth = 1.1; c.lineCap = 'round';
    for (const d of [-1, 1]) {
      const w = Math.sin(t * 0.12 + d) * 1.2;
      c.beginPath(); c.moveTo(x + d * 2, y); c.quadraticCurveTo(x + d * 4, y - 5, x + d * 5 + w, y - 8); c.stroke();
      c.fillStyle = '#ff8fb8'; G.circle(x + d * 5 + w, y - 8, 1.6, c); c.fill();
    }
  }

  function drawBug(c, kind, x, y, st) {
    const mood = BB.clamp(st.mood == null ? 1 : st.mood, 0, 1);
    const fn = BUGS[kind] || BUGS.ladybug;
    c.save();
    c.translate(x + (st.shake || 0), y);
    const s = st.scale || 1;
    const sq = st.squash || 1;
    c.scale((st.facing || 1) * s / Math.sqrt(sq), s * sq);
    if (st.spin) c.rotate(st.spin);
    fn(c, st, mood);
    c.restore();
    if (mood > 0.02 && !st.noCloud) moodCloud(c, x, y - 24 * (st.scale || 1), mood, st.t);
    if (st.rainbow) rainbow(c, x, y - 22 * (st.scale || 1), st.rainbow);
  }

  // ──── The Cloud King (a big, fluffy, crowned cloud-moth) ────
  function drawKing(c, x, y, st) {
    const mood = BB.clamp(st.mood == null ? 1 : st.mood, 0, 1);
    const t = st.t;
    const s = st.scale || 1;
    c.save();
    c.translate(x + (st.shake || 0), y);
    c.scale(s, s);
    // cape of cloud
    const flap = Math.sin(t * 0.08) * 0.25;
    c.fillStyle = tone('#f4efff', mood); c.strokeStyle = 'rgba(120,100,170,0.6)'; c.lineWidth = 1.4;
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1); c.rotate(flap);
      c.beginPath();
      c.arc(20, -8, 16, 0, TAU); c.arc(30, 6, 12, 0, TAU); c.arc(16, 12, 10, 0, TAU);
      c.fill(); c.stroke();
      c.fillStyle = tone('#ffd6f0', mood); G.circle(22, -6, 5, c); c.fill();
      c.fillStyle = tone('#f4efff', mood);
      c.restore();
    }
    // body
    const g = c.createRadialGradient(-4, -6, 2, 0, 0, 22);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, tone('#dcd2ff', mood));
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.arc(Math.cos(a) * 15, Math.sin(a) * 13, 6.5, 0, TAU); }
    c.fill();
    G.ellipse(0, 0, 18, 16, 0, c); c.fill();
    // crown
    c.fillStyle = '#ffd34d'; c.strokeStyle = '#c28a14'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-10, -14); c.lineTo(-12, -26); c.lineTo(-5, -20); c.lineTo(0, -29); c.lineTo(5, -20); c.lineTo(12, -26); c.lineTo(10, -14); c.closePath(); c.fill(); c.stroke();
    for (const [gx, gy, col] of [[-12, -26, '#ff7b9c'], [0, -29, '#7cc8ff'], [12, -26, '#8fe388']]) { c.fillStyle = col; G.circle(gx, gy, 2, c); c.fill(); }
    // feathery antennae
    c.strokeStyle = OUT; c.lineWidth = 1.2;
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 6, -14); c.quadraticCurveTo(side * 14, -30, side * 20, -26); c.stroke();
    }
    face(c, 0, -1, 1.25, mood, Object.assign({ lid: '#cfc3f5' }, st));
    c.restore();
    if (mood > 0.02) moodCloud(c, x, y - 52 * s, mood, st.t, 1.8);
    if (st.rainbow) rainbow(c, x, y - 48 * s, st.rainbow, 2);
  }

  // ──── Elders ────  st: { t, awake (0..1), glow }
  const ELDERS = {
    doubleJump(c, st) { // Butterfly Elder
      const t = st.t, aw = st.awake || 0;
      const flap = Math.sin(t * (0.04 + aw * 0.05)) * (0.18 + aw * 0.2);
      for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1); c.rotate(-flap);
        const g = c.createRadialGradient(18, -14, 3, 18, -10, 30);
        g.addColorStop(0, '#fff3a8'); g.addColorStop(0.4, '#7ef0d8'); g.addColorStop(1, '#6a7cff');
        c.fillStyle = g; c.strokeStyle = '#3b3070'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(20, -16, 22, 17, -0.5, 0, TAU); c.fill(); c.stroke();
        const g2 = c.createRadialGradient(14, 12, 2, 14, 12, 16);
        g2.addColorStop(0, '#ffd1f0'); g2.addColorStop(1, '#c46ad8');
        c.fillStyle = g2;
        c.beginPath(); c.ellipse(15, 12, 13, 11, 0.5, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)';
        G.circle(26, -20, 4, c); c.fill(); G.circle(14, -8, 2.5, c); c.fill();
        c.restore();
      }
      c.fillStyle = '#5a4a8a'; c.strokeStyle = '#2a2050'; c.lineWidth = 1.4;
      G.ellipse(0, 4, 5, 16, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#7b6ab8'; G.circle(0, -14, 8, c); c.fill(); c.stroke();
      c.strokeStyle = '#2a2050'; c.lineWidth = 1.3;
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * 3, -20); c.quadraticCurveTo(side * 8, -34, side * 14, -34); c.stroke();
        c.fillStyle = '#ffe98a'; G.circle(side * 14, -34, 2.4, c); c.fill();
      }
      elderFace(c, 0, -14, 0.8, aw, t);
    },
    wallClimb(c, st) { // Snail Elder
      const t = st.t, aw = st.awake || 0;
      c.fillStyle = '#9fe6c9'; c.strokeStyle = '#2f5a55'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-30, 18); c.quadraticCurveTo(0, 24, 30, 18); c.quadraticCurveTo(36, -8, 24, -8); c.lineTo(-26, 14); c.closePath(); c.fill(); c.stroke();
      const g = c.createRadialGradient(-6, -10, 4, -4, -4, 26);
      g.addColorStop(0, '#e6f7ff'); g.addColorStop(0.5, '#8fb8ff'); g.addColorStop(1, '#8a64d6');
      c.fillStyle = g;
      G.circle(-6, -4, 22, c); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
      c.beginPath();
      for (let a = 0; a < TAU * 2.4; a += 0.2) { const r = 18 - a * 1.1; c.lineTo(-6 + Math.cos(a + t * 0.01) * r, -4 + Math.sin(a + t * 0.01) * r); }
      c.stroke();
      // crystals on the shell
      c.fillStyle = 'rgba(200,240,255,0.9)'; c.strokeStyle = '#5a6fc0'; c.lineWidth = 1;
      for (const [cx, cy, h] of [[-14, -24, 10], [-4, -27, 13], [6, -22, 9]]) {
        c.beginPath(); c.moveTo(cx - 3, cy + 4); c.lineTo(cx, cy - h); c.lineTo(cx + 3, cy + 4); c.closePath(); c.fill(); c.stroke();
      }
      c.strokeStyle = '#2f5a55'; c.lineWidth = 2;
      for (const d of [0, 6]) {
        const bob = Math.sin(t * 0.05 + d) * 2 * aw;
        c.beginPath(); c.moveTo(24 + d * 0.3, -6); c.lineTo(26 + d, -22 - bob); c.stroke();
        c.fillStyle = '#9fe6c9'; G.circle(26 + d, -22 - bob, 3, c); c.fill(); c.stroke();
      }
      elderFace(c, 26, 4, 0.8, aw, t);
    },
    glow(c, st) { // Firefly Elder
      const t = st.t, aw = st.awake || 0;
      const pulse = 0.6 + Math.sin(t * 0.06) * 0.2 + aw * 0.3;
      G.drawGlow(0, 12, 46 + pulse * 14, '#fff3a0', 0.5 * pulse, c);
      const flap = Math.sin(t * 0.3) * 0.3 * (0.3 + aw);
      c.fillStyle = 'rgba(230,245,255,0.7)'; c.strokeStyle = 'rgba(80,110,160,0.7)'; c.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1); c.rotate(-0.4 + flap);
        c.beginPath(); c.ellipse(14, -16, 16, 8, -0.4, 0, TAU); c.fill(); c.stroke();
        c.restore();
      }
      const g = c.createRadialGradient(0, 16, 2, 0, 14, 16);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#fff38a'); g.addColorStop(1, '#ffb52e');
      c.fillStyle = g; c.strokeStyle = '#8a5a14'; c.lineWidth = 1.4;
      G.ellipse(0, 14, 13, 15, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#6a4a8c'; G.ellipse(0, -8, 12, 10, 0, c); c.fill(); c.stroke();
      c.strokeStyle = '#3a2a4a'; c.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * 4, -16); c.quadraticCurveTo(side * 9, -28, side * 14, -26); c.stroke();
        c.fillStyle = '#fff38a'; G.circle(side * 14, -26, 2.4, c); c.fill();
      }
      elderFace(c, 0, -8, 0.85, aw, t);
    },
    float(c, st) { // Dandelion Elder
      const t = st.t, aw = st.awake || 0;
      const sway = Math.sin(t * 0.03) * 0.08;
      c.save(); c.rotate(sway);
      c.strokeStyle = '#6aa85a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(4, 14, 0, 0); c.stroke();
      c.fillStyle = '#7fc46a'; c.strokeStyle = '#3f7a3a'; c.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        c.beginPath(); c.moveTo(1, 24); c.quadraticCurveTo(16, 14 - aw * 6, 20, 2 - aw * 8); c.quadraticCurveTo(10, 14, 1, 24); c.fill(); c.stroke();
        c.restore();
      }
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1;
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * TAU + t * 0.004;
        const r = 26 + Math.sin(i * 3.1) * 2;
        c.beginPath(); c.moveTo(0, -14); c.lineTo(Math.cos(a) * r, -14 + Math.sin(a) * r); c.stroke();
        c.fillStyle = '#fff'; G.circle(Math.cos(a) * r, -14 + Math.sin(a) * r, 2.4, c); c.fill();
      }
      const g = c.createRadialGradient(-3, -17, 2, 0, -14, 14);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#efe9c8');
      c.fillStyle = g; c.strokeStyle = '#a89a6a'; c.lineWidth = 1.2;
      G.circle(0, -14, 13, c); c.fill(); c.stroke();
      elderFace(c, 0, -14, 0.8, aw, t);
      c.restore();
    },
  };

  // Elders have sleepy closed eyes until you come near
  function elderFace(c, x, y, s, awake, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.strokeStyle = OUT; c.fillStyle = OUT; c.lineWidth = 1.6; c.lineCap = 'round';
    for (const side of [-1, 1]) {
      if (awake > 0.5) {
        c.fillStyle = '#fff'; G.ellipse(side * 4.5, -1, 3, 3.6, 0, c); c.fill(); c.stroke();
        c.fillStyle = '#1b1422'; G.circle(side * 4.5, -0.4, 1.8, c); c.fill();
        c.fillStyle = '#fff'; G.circle(side * 4.5 + 0.8, -1.4, 0.8, c); c.fill();
      } else {
        c.beginPath(); c.arc(side * 4.5, -1, 2.8, 0.2, Math.PI - 0.2); c.stroke();
      }
    }
    c.fillStyle = 'rgba(255,140,170,0.5)';
    G.ellipse(-7.5, 3, 2, 1.2, 0, c); c.fill(); G.ellipse(7.5, 3, 2, 1.2, 0, c); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1.4;
    c.beginPath(); c.arc(0, 2.5, 2.4, 0.2, Math.PI - 0.2); c.stroke();
    if (awake < 0.5) {
      // sleepy "z" bubbles, drawn as tiny floating circles
      const k = (t * 0.02) % 1;
      c.globalAlpha = 1 - k;
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.2;
      G.circle(9 + k * 6, -10 - k * 12, 2 + k * 2, c); c.stroke();
      c.globalAlpha = 1;
    }
    c.restore();
  }

  function drawElder(c, ability, x, y, st) {
    const fn = ELDERS[ability];
    if (!fn) return;
    c.save();
    c.translate(x, y + Math.sin((st.t || 0) * 0.03) * 2);
    c.scale(st.scale || 1, st.scale || 1);
    fn(c, st);
    c.restore();
  }

  BB.Critters = { drawBug, drawKing, drawElder, moodCloud, rainbow, face, KINDS: Object.keys(BUGS) };
})(window.BB);
