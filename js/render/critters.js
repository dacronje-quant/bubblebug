// ════════════════════════════════════════════════════════════════
//  CRITTERS — every animal, bug, elder and the Cloud King, in vector.
//
//  Nobody here is a villain: gloomy critters — bunnies, hedgehogs, frogs,
//  mice, bats, moles, bear cubs, owls, turtles, ducklings, lambs, birds
//  and plenty of bugs — are just having a rainy day.
//  Their `mood` (1 = very gloomy … 0 = happy) is shown without numbers:
//    • a little personal rain-cloud over their head that shrinks with
//      every friendship bubble
//    • droopy eyelids and a wobbly frown that slowly turn upward
//    • colours that brighten from grey-ish to full and cheerful
//  When a critter is befriended the cloud becomes a tiny rainbow.
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

  // ──── Animals ────  (same conventions: centre of body, facing right)
  const FUR_OUT = '#4a3440';
  function ear(c, x, y, rx, ry, rot, col, inner) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = col; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
    G.ellipse(0, 0, rx, ry, 0, c); c.fill(); c.stroke();
    if (inner) { c.fillStyle = inner; G.ellipse(0, ry * 0.15, rx * 0.5, ry * 0.65, 0, c); c.fill(); }
    c.restore();
  }
  function feet(c, xs, y, col, t, walk) {
    c.fillStyle = col; c.strokeStyle = FUR_OUT; c.lineWidth = 1;
    xs.forEach((x, i) => { const k = walk ? Math.sin(t * 0.3 + i * 2) * 1.5 : 0; G.ellipse(x + k, y, 3.2, 2.2, 0, c); c.fill(); c.stroke(); });
  }
  function nose(c, x, y, col = '#ff8fa8', r = 1.6) { c.fillStyle = col; G.ellipse(x, y, r * 1.2, r, 0, c); c.fill(); }

  Object.assign(BUGS, {
    bunny(c, st, mood) {
      const t = st.t, fur = tone('#f6efe8', mood);
      const droop = mood * 0.9; // gloomy bunnies' ears flop down
      ear(c, 3, -18 + droop * 4, 2.8, 8, -0.15 - droop * 0.9, fur, '#ffb3c8');
      c.fillStyle = tone('#ffffff', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.circle(-11, 0, 4, c); c.fill(); c.stroke();
      c.fillStyle = fur; G.ellipse(-2, 2, 11, 8, 0, c); c.fill(); c.stroke();
      feet(c, [-7, 4], 9, fur, t, st.walk);
      G.circle(8, -6, 7.8, c); c.fillStyle = fur; c.fill(); c.stroke();
      ear(c, 9, -18 + droop * 4, 2.8, 8, 0.2 + droop * 0.9, fur, '#ffb3c8');
      nose(c, 14.5, -4.5);
      face(c, 8.5, -6.5, 0.6, mood, Object.assign({ lid: '#e8dcd0' }, st));
    },
    hedgehog(c, st, mood) {
      const t = st.t;
      feet(c, [-6, 5], 9, tone('#e8c9a0', mood), t, st.walk);
      // spiky coat
      c.fillStyle = tone('#8a6448', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI * 1.05, r = i % 2 ? 11 : 15;
        c.lineTo(-2 + Math.cos(a) * r, 6 + Math.sin(a) * r * 0.95);
      }
      c.lineTo(8, 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = tone('#f0d6b0', mood);
      c.beginPath(); c.ellipse(8, 1, 8, 7, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(13, -1); c.quadraticCurveTo(20, 1, 15, 5); c.closePath(); c.fill();
      nose(c, 18.5, 2, '#3a2a3a', 1.7);
      face(c, 8, 0, 0.58, mood, Object.assign({ lid: '#d8bc94' }, st));
    },
    bluebird(c, st, mood) {
      const t = st.t, flap = Math.sin(t * 0.5) * 0.7;
      c.fillStyle = tone('#5aa8f0', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-18, -4); c.lineTo(-17, 4); c.closePath(); c.fill(); c.stroke();
      G.circle(0, 0, 10, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffe6c9', mood); G.ellipse(3, 4, 6.5, 5.5, 0, c); c.fill();
      c.save(); c.translate(-2, -1); c.rotate(-0.4 + flap);
      c.fillStyle = tone('#3f86d4', mood); G.ellipse(-5, 0, 7, 4, 0, c); c.fill(); c.stroke();
      c.restore();
      c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(9, 0); c.lineTo(14, 1.5); c.lineTo(9, 3); c.closePath(); c.fill();
      face(c, 3.5, -2.5, 0.55, mood, Object.assign({ lid: '#4a90d8' }, st));
    },
    frog(c, st, mood) {
      const t = st.t, col = tone('#7ed26a', mood);
      c.fillStyle = col; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(-8, 6, 5.5, 3.5, 0, c); c.fill(); c.stroke();
      G.ellipse(1, 2, 13, 8.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#d9f5b8', mood); G.ellipse(3, 5, 8, 4.5, 0, c); c.fill();
      c.fillStyle = col;
      for (const ex of [-2.8, 5.6]) { G.circle(1 + ex, -6, 5, c); c.fill(); c.stroke(); }
      feet(c, [7, 11], 9, col, t, false);
      face(c, 2.4, -6.2, 0.95, mood, Object.assign({ lid: '#5cb04a' }, st));
    },
    mouse(c, st, mood) {
      const t = st.t, fur = tone('#c9b5a8', mood);
      c.strokeStyle = tone('#f0a6b8', mood); c.lineWidth = 1.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-11, 4); c.quadraticCurveTo(-20, 6 + Math.sin(t * 0.1) * 3, -22, -4); c.stroke();
      ear(c, -1, -10, 5, 5.5, 0, fur, '#ffc0cf');
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(-1, 1, 11, 8, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(4, -6); c.quadraticCurveTo(17, -2, 16, 3); c.quadraticCurveTo(10, 7, 4, 6); c.closePath(); c.fill(); c.stroke();
      ear(c, 7, -10, 5, 5.5, 0.3, fur, '#ffc0cf');
      feet(c, [-5, 4], 9, tone('#f0d8d0', mood), t, st.walk);
      nose(c, 16, 1);
      face(c, 8, -2, 0.55, mood, Object.assign({ lid: '#b0a094' }, st));
    },
    bat(c, st, mood) {
      const t = st.t, flap = Math.sin(t * 0.35);
      c.fillStyle = tone('#8a76c0', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1); c.rotate(flap * 0.35);
        c.beginPath(); c.moveTo(6, -3);
        c.quadraticCurveTo(14, -12, 22, -6); c.quadraticCurveTo(19, -1, 20, 3);
        c.quadraticCurveTo(16, 0, 14, 4); c.quadraticCurveTo(10, 1, 7, 5); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
      c.fillStyle = tone('#a894d8', mood);
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 3, -8); c.lineTo(side * 7, -15); c.lineTo(side * 8, -6); c.closePath(); c.fill(); c.stroke(); }
      G.circle(0, 0, 9, c); c.fill(); c.stroke();
      face(c, 0, -1, 0.75, mood, Object.assign({ lid: '#7a66b0' }, st));
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(1, 3.6); c.lineTo(2, 5.6); c.lineTo(3, 3.6); c.fill();
    },
    mole(c, st, mood) {
      const t = st.t, fur = tone('#6b5670', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(0, 1, 13, 9, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffb3c8', mood);
      for (const px of [-8, 9]) { G.ellipse(px, 8, 4.5, 3, 0, c); c.fill(); c.stroke(); }
      // little miner's lamp for the caves
      c.fillStyle = '#ffd34d'; G.rrect(-3, -11, 7, 4, 2, c); c.fill();
      G.drawGlow(0.5, -10, 12, '#fff3a0', 0.6, c);
      c.fillStyle = tone('#ff9fbf', mood);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; G.circle(12 + Math.cos(a) * 2, 2 + Math.sin(a) * 2, 1.4, c); c.fill(); }
      face(c, 5, -1, 0.55, mood, Object.assign({ lid: '#5a4560' }, st));
    },
    bearcub(c, st, mood) {
      const t = st.t, fur = tone('#b57a48', mood), light = tone('#f0cfa0', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.3;
      G.ellipse(-3, 4, 12, 10, 0, c); c.fill(); c.stroke();
      c.fillStyle = light; G.ellipse(0, 6, 6, 6, 0, c); c.fill();
      feet(c, [-9, 3], 13, fur, t, st.walk);
      ear(c, 1, -17, 4, 4, 0, fur, light);
      ear(c, 13, -16, 4, 4, 0, fur, light);
      c.fillStyle = fur; G.circle(7, -8, 9.5, c); c.fill(); c.stroke();
      c.fillStyle = light; G.ellipse(10, -4, 5, 3.8, 0, c); c.fill();
      nose(c, 12.5, -5.5, '#3a2a3a', 1.8);
      // a tiny honey pot hugged close
      c.fillStyle = '#ffc93d'; c.strokeStyle = '#a8661a'; c.lineWidth = 1;
      G.rrect(-6, 2, 8, 8, 2, c); c.fill(); c.stroke();
      face(c, 7, -9, 0.62, mood, Object.assign({ lid: '#9c6a3e' }, st));
    },
    owl(c, st, mood) {
      const t = st.t, flap = Math.sin(t * 0.3) * 0.4;
      c.fillStyle = tone('#a88a6c', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      for (const side of [-1, 1]) { c.save(); c.scale(side, 1); c.rotate(-flap); G.ellipse(10, 2, 5, 9, 0.3, c); c.fill(); c.stroke(); c.restore(); }
      G.ellipse(0, 0, 11, 13, 0, c); c.fill(); c.stroke();
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 4, -11); c.lineTo(side * 9, -18); c.lineTo(side * 10, -9); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = tone('#f2e2c8', mood); G.ellipse(0, 5, 7, 7, 0, c); c.fill();
      c.strokeStyle = tone('#c9a888', mood); c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-2 + i * 2.5, 3 + (i % 2) * 3, 1.6, 0.2, Math.PI - 0.2); c.stroke(); }
      c.fillStyle = tone('#e8d4b8', mood);
      G.circle(-4, -4, 5, c); c.fill(); G.circle(4, -4, 5, c); c.fill();
      face(c, 0, -4, 1.05, mood, Object.assign({ lid: '#b8997a' }, st));
      c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(-1.5, -1); c.lineTo(1.5, -1); c.lineTo(0, 2); c.closePath(); c.fill();
    },
    turtle(c, st, mood) {
      const t = st.t, skin = tone('#a8d88a', mood);
      feet(c, [-8, 6], 8, skin, t, st.walk);
      c.fillStyle = skin; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.circle(13, -1, 5.8, c); c.fill(); c.stroke();
      c.fillStyle = tone('#5fa06a', mood);
      c.beginPath(); c.ellipse(-1, 4, 13, 12, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = tone('#3f7a4a', mood); c.lineWidth = 1.1;
      for (const [hx, hy] of [[-6, -1], [1, -4], [5, 1], [-2, 2]]) {
        c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(hx + Math.cos(a) * 3, hy + Math.sin(a) * 3); } c.closePath(); c.stroke();
      }
      c.fillStyle = tone('#e8d49a', mood); c.fillRect(-14, 3, 26, 2.5);
      face(c, 13.5, -1.5, 0.5, mood, Object.assign({ lid: '#8ac06c' }, st));
    },
    duckling(c, st, mood) {
      const t = st.t, fluff = tone('#ffe066', mood);
      feet(c, [-3, 4], 9, '#ffa24a', t, st.walk);
      c.fillStyle = fluff; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-10, -1); c.lineTo(-15, -5); c.lineTo(-12, 3); c.closePath(); c.fill(); c.stroke();
      G.ellipse(-1, 2, 11, 8, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffd23a', mood); G.ellipse(-3, 1, 5, 3.5, -0.3, c); c.fill();
      c.fillStyle = fluff; G.circle(7, -8, 7, c); c.fill(); c.stroke();
      c.fillStyle = fluff; c.beginPath(); c.moveTo(6, -15); c.lineTo(7, -19); c.lineTo(9, -15); c.fill();
      c.fillStyle = '#ff9a3c'; c.beginPath(); c.ellipse(14, -6, 4, 2, 0.1, 0, TAU); c.fill();
      face(c, 7, -9, 0.52, mood, Object.assign({ lid: '#e8c850' }, st));
    },
    lamb(c, st, mood) {
      const t = st.t, wool = tone('#ffffff', mood * 0.8);
      feet(c, [-7, 4], 10, '#5a4a5a', t, st.walk);
      c.fillStyle = BB.mix('#d8ccf0', '#9a94a8', mood * 0.4);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; G.circle(-2 + Math.cos(a) * 9, 1 + Math.sin(a) * 6, 5.2, c); c.fill(); }
      c.fillStyle = wool;
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; G.circle(-2 + Math.cos(a) * 8.5, 0 + Math.sin(a) * 5.5, 5, c); c.fill(); }
      G.ellipse(-2, 0, 9, 6, 0, c); c.fill();
      ear(c, 5, -7, 4, 2.2, -0.6, tone('#6a5a6a', mood), null);
      c.fillStyle = tone('#6a5a6a', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.1;
      G.ellipse(10, -3, 6.5, 7.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = wool; G.circle(9, -10, 4, c); c.fill(); G.circle(12, -10, 3.5, c); c.fill();
      ear(c, 15, -6, 4, 2.2, 0.6, tone('#6a5a6a', mood), null);
      face(c, 10, -3, 0.55, mood, Object.assign({ lid: '#4a3a4a' }, st));
    },
  });

  // ──── New-zone critters ────
  Object.assign(BUGS, {
    crab(c, st, mood) {
      const t = st.t, shell = tone('#ff7a5a', mood);
      c.strokeStyle = shell; c.lineWidth = 2; c.lineCap = 'round';
      for (const d of [-1, 1]) for (let i = 0; i < 3; i++) {
        const w = Math.sin(t * 0.4 + i + d) * 1.2 * (st.walk ? 1 : 0.2);
        c.beginPath(); c.moveTo(d * 7, 3 + i * 1.5); c.lineTo(d * (13 + i), 8 + i * 1.5 + w); c.stroke();
      }
      for (const d of [-1, 1]) {
        const snip = Math.sin(t * 0.15 + d) * 0.3;
        c.fillStyle = shell; c.strokeStyle = FUR_OUT; c.lineWidth = 1.1;
        c.save(); c.translate(d * 12, -6); c.rotate(d * (0.5 + snip));
        G.ellipse(0, 0, 4.5, 3.5, 0, c); c.fill(); c.stroke();
        c.fillStyle = tone('#ffd0c0', mood); c.beginPath(); c.moveTo(0, -1); c.lineTo(d * 4, -3); c.lineTo(d * 1, 1); c.fill();
        c.restore();
      }
      c.fillStyle = shell; c.strokeStyle = FUR_OUT; c.lineWidth = 1.3;
      G.ellipse(0, 1, 11, 7.5, 0, c); c.fill(); c.stroke();
      c.strokeStyle = FUR_OUT; c.lineWidth = 1;
      for (const d of [-3, 3]) { c.beginPath(); c.moveTo(d, -5); c.lineTo(d, -9); c.stroke(); }
      face(c, 0, -8, 0.7, mood, Object.assign({ lid: '#d85a40' }, st));
    },
    seal(c, st, mood) {
      const t = st.t, fur = tone('#c9ccd8', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(-15, 6); c.quadraticCurveTo(-20, 2, -19, -1); c.quadraticCurveTo(-14, 4, -9, 3); c.fill(); c.stroke();
      G.ellipse(-2, 2, 13, 8, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#eef0f6', mood); G.ellipse(0, 6, 9, 3.5, 0, c); c.fill();
      c.fillStyle = fur; G.ellipse(3, 7, 5, 2.5, 0.4, c); c.fill(); c.stroke();
      G.circle(9, -5, 8, c); c.fill(); c.stroke();
      c.fillStyle = tone('#aeb2c0', mood); for (const [dx, dy] of [[-4, -2], [-8, 3], [0, 4]]) { G.circle(dx, dy, 1.3, c); c.fill(); }
      nose(c, 16, -3.5, '#3a3040', 1.6);
      face(c, 9, -6, 0.62, mood, Object.assign({ lid: '#a8acba' }, st));
    },
    jellyfish(c, st, mood) {
      const t = st.t, col = tone('#ff9fd8', mood);
      c.strokeStyle = BB.rgba(col, 0.8); c.lineWidth = 1.5; c.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const x0 = -8 + i * 4;
        c.beginPath(); c.moveTo(x0, 4);
        for (let k = 1; k <= 4; k++) c.lineTo(x0 + Math.sin(t * 0.1 + i + k) * 2, 4 + k * 4);
        c.stroke();
      }
      G.drawGlow(0, -2, 22, '#ffb8e8', 0.4, c);
      c.fillStyle = BB.rgba(col, 0.9); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(0, 2, 12, 12, 0, Math.PI, 0); c.quadraticCurveTo(6, 7, 0, 4); c.quadraticCurveTo(-6, 7, -12, 2); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.5)'; G.ellipse(-4, -5, 3, 2, -0.4, c); c.fill();
      face(c, 0, -2, 0.75, mood, Object.assign({ lid: '#e880c0' }, st));
    },
    fish(c, st, mood) {
      const t = st.t, col = tone('#ffb03a', mood);
      const wag = Math.sin(t * 0.3) * 0.3;
      c.fillStyle = col; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.save(); c.translate(-10, 0); c.rotate(wag);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-8, -6); c.lineTo(-8, 6); c.closePath(); c.fill(); c.stroke();
      c.restore();
      G.ellipse(0, 0, 12, 8, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(-4, -7, 3, 14); c.fillRect(4, -7.5, 2.5, 15);
      c.strokeStyle = FUR_OUT; G.ellipse(0, 0, 12, 8, 0, c); c.stroke();
      c.fillStyle = col; c.beginPath(); c.moveTo(-2, -7); c.quadraticCurveTo(2, -13, 6, -7); c.fill();
      face(c, 6, -1, 0.55, mood, Object.assign({ lid: '#e0902a' }, st));
    },
    fennec(c, st, mood) {
      const t = st.t, fur = tone('#f0c890', mood), light = tone('#fff4e0', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-22, -2, -20, -10); c.quadraticCurveTo(-15, -4, -8, -3); c.fill(); c.stroke();
      c.fillStyle = light; G.circle(-20, -9, 2.5, c); c.fill();
      c.fillStyle = fur; G.ellipse(-2, 3, 10, 6.5, 0, c); c.fill(); c.stroke();
      feet(c, [-7, 3], 10, fur, t, st.walk);
      ear(c, 3, -17, 4.5, 9, -0.35, fur, '#ffc8b0');
      ear(c, 13, -17, 4.5, 9, 0.35, fur, '#ffc8b0');
      c.fillStyle = fur; G.circle(8, -5, 7.5, c); c.fill(); c.stroke();
      c.fillStyle = light; G.ellipse(11, -2, 4.5, 3, 0, c); c.fill();
      nose(c, 15, -3, '#3a2a2a', 1.4);
      face(c, 8, -6, 0.55, mood, Object.assign({ lid: '#d8a870' }, st));
    },
    meerkat(c, st, mood) {
      const t = st.t, fur = tone('#c8a078', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-4, 8); c.quadraticCurveTo(-12, 10, -13, 3); c.lineWidth = 3; c.strokeStyle = fur; c.stroke();
      c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(0, 0, 6.5, 10, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#f0dcc0', mood); G.ellipse(1.5, 2, 3.5, 6.5, 0, c); c.fill();
      c.fillStyle = fur;
      for (const d of [-1, 1]) { G.ellipse(3 + d, -2, 1.8, 3, 0.3, c); c.fill(); c.stroke(); }
      G.ellipse(2, -14, 6, 5.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#5a4030', mood); G.ellipse(0, -14.5, 3, 2.5, 0, c); G.ellipse(5, -14.5, 3, 2.5, 0, c); c.fill();
      nose(c, 7.5, -12.5, '#3a2a2a', 1.2);
      face(c, 2.5, -14.5, 0.52, mood, Object.assign({ lid: '#a8805a' }, st));
      feet(c, [-2, 3], 10, fur, t, false);
    },
    lizard(c, st, mood) {
      const t = st.t, col = tone('#7cc85a', mood);
      c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-8, 4); c.quadraticCurveTo(-18, 6 + Math.sin(t * 0.2) * 2, -22, 0); c.stroke();
      c.fillStyle = col; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(-1, 3, 11, 5, 0, c); c.fill(); c.stroke();
      feet(c, [-7, -3, 3, 7], 8, col, t, st.walk);
      c.fillStyle = tone('#ffd166', mood); for (const x of [-5, -1, 3]) { G.circle(x, 1, 1.2, c); c.fill(); }
      c.fillStyle = col; G.ellipse(11, -1, 7, 5.5, 0, c); c.fill(); c.stroke();
      face(c, 11, -2, 0.55, mood, Object.assign({ lid: '#5ea040' }, st));
    },
    scarab(c, st, mood) {
      const t = st.t;
      legs(c, -1, 5, 3, 14, 5, t, st.walk ? 0.4 : 0, OUT, 1);
      const g = c.createLinearGradient(-12, -8, 8, 6);
      g.addColorStop(0, tone('#7ae0c0', mood)); g.addColorStop(0.5, tone('#5a8aff', mood)); g.addColorStop(1, tone('#c46ad8', mood));
      c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.3;
      G.ellipse(-3, 0, 12, 8.5, 0, c); c.fill(); c.stroke();
      c.strokeStyle = OUT; c.beginPath(); c.moveTo(-3, -8.5); c.lineTo(-3, 8); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)'; G.ellipse(-8, -4, 4, 1.8, -0.3, c); c.fill();
      c.fillStyle = tone('#3a5a9a', mood); G.circle(9, 0, 6, c); c.fill(); c.stroke();
      face(c, 9, 0, 0.78, mood, Object.assign({ lid: '#3a5a9a' }, st));
    },
    penguin(c, st, mood) {
      const t = st.t, dark = tone('#2e3a54', mood * 0.6);
      const waddle = st.walk ? Math.sin(t * 0.3) * 0.12 : 0;
      c.save(); c.rotate(waddle);
      c.fillStyle = dark; c.strokeStyle = FUR_OUT; c.lineWidth = 1.3;
      G.ellipse(0, 0, 9.5, 12, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffffff', mood); G.ellipse(1.5, 2, 6.5, 9, 0, c); c.fill();
      c.fillStyle = dark; G.ellipse(-8, 1, 3, 7, 0.3, c); c.fill();
      c.fillStyle = '#ffa24a'; c.beginPath(); c.moveTo(6, -4); c.lineTo(11, -2.5); c.lineTo(6, -1); c.fill();
      c.fillStyle = '#ffa24a'; G.ellipse(-3, 12, 3.5, 1.8, 0, c); c.fill(); G.ellipse(4, 12, 3.5, 1.8, 0, c); c.fill();
      face(c, 2, -5, 0.55, mood, Object.assign({ lid: '#3a4664' }, st));
      c.restore();
    },
    polarcub(c, st, mood) {
      const t = st.t, fur = tone('#f6f4ee', mood * 0.7);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.3;
      G.ellipse(-3, 3, 13, 9.5, 0, c); c.fill(); c.stroke();
      feet(c, [-10, -3, 4], 12, fur, t, st.walk);
      ear(c, 3, -14, 3.5, 3.5, 0, fur, '#e8dcd8');
      ear(c, 13, -13, 3.5, 3.5, 0, fur, '#e8dcd8');
      c.fillStyle = fur; G.circle(8, -6, 8.5, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ece6dc', mood); G.ellipse(12, -3, 4.5, 3.5, 0, c); c.fill();
      nose(c, 15, -4, '#2a2a3a', 1.7);
      face(c, 7.5, -7, 0.6, mood, Object.assign({ lid: '#d8d4cc' }, st));
    },
    arcticfox(c, st, mood) {
      const t = st.t, fur = tone('#ffffff', mood * 0.7);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(-16, -4, 8, 5, -0.6 + Math.sin(t * 0.08) * 0.2, 0, TAU); c.fill(); c.stroke();
      G.ellipse(-2, 3, 11, 7, 0, c); c.fill(); c.stroke();
      feet(c, [-7, 4], 10, fur, t, st.walk);
      ear(c, 4, -14, 3.5, 6, -0.25, fur, '#dce0ee');
      ear(c, 12, -14, 3.5, 6, 0.3, fur, '#dce0ee');
      c.fillStyle = fur; G.circle(8, -5, 7.5, c); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(12, -7); c.lineTo(19, -3); c.lineTo(12, 0); c.fill(); c.stroke();
      nose(c, 18.5, -3, '#2a2a3a', 1.3);
      face(c, 8, -6, 0.55, mood, Object.assign({ lid: '#dcdcea' }, st));
    },
    squirrel(c, st, mood) {
      const t = st.t, fur = tone('#c8683a', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-6, 6); c.bezierCurveTo(-24, 6, -22, -22, -8, -18); c.bezierCurveTo(-14, -12, -12, 0, -4, 1); c.fill(); c.stroke();
      c.fillStyle = tone('#e89a6a', mood); G.ellipse(-15, -10, 3.5, 6, 0.3, c); c.fill();
      c.fillStyle = fur; G.ellipse(1, 2, 7, 8, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#f6dcc0', mood); G.ellipse(3, 4, 3.5, 5, 0, c); c.fill();
      ear(c, 3, -15, 2.2, 4, -0.2, fur, '#f0b89a');
      c.fillStyle = fur; G.circle(5, -8, 6.5, c); c.fill(); c.stroke();
      c.fillStyle = '#a8703a'; G.ellipse(7, 1, 2.5, 3, 0, c); c.fill(); // acorn!
      c.fillStyle = '#6a4020'; G.ellipse(7, -1.5, 2.8, 1.4, 0, c); c.fill();
      nose(c, 11, -7, '#3a2a2a', 1.1);
      face(c, 5, -8.5, 0.5, mood, Object.assign({ lid: '#b05a30' }, st));
    },
    fawn(c, st, mood) {
      const t = st.t, fur = tone('#c88a58', mood);
      c.strokeStyle = fur; c.lineWidth = 3; c.lineCap = 'round';
      const k = st.walk ? Math.sin(t * 0.3) * 2 : 0;
      for (const [x, d] of [[-8, 1], [-4, -1], [5, 1], [9, -1]]) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x + d * k, 14); c.stroke(); }
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(0, 2, 12, 6.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#fff4e4', mood);
      for (const [x, y] of [[-6, 0], [-2, -2], [2, 0], [-8, 3]]) { G.circle(x, y, 1.3, c); c.fill(); }
      c.fillStyle = fur; c.beginPath(); c.moveTo(7, -1); c.lineTo(10, -10); c.lineTo(14, -9); c.lineTo(12, 1); c.fill();
      ear(c, 9, -17, 2.5, 5, -0.8, fur, '#f0c0a8');
      c.fillStyle = fur; G.ellipse(13, -11, 6, 5, 0.2, c); c.fill(); c.stroke();
      nose(c, 18.5, -9.5, '#3a2a2a', 1.2);
      face(c, 12.5, -12, 0.5, mood, Object.assign({ lid: '#b07a4a' }, st));
    },
    raccoon(c, st, mood) {
      const t = st.t, fur = tone('#8e8a94', mood);
      c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.save(); c.translate(-12, -2); c.rotate(-0.6 + Math.sin(t * 0.08) * 0.1);
      c.fillStyle = fur; G.ellipse(-6, 0, 8, 4.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#3a3640'; c.fillRect(-9, -4, 2.5, 8); c.fillRect(-4, -4, 2.5, 8);
      c.restore();
      c.fillStyle = fur; G.ellipse(-1, 3, 11, 7.5, 0, c); c.fill(); c.stroke();
      feet(c, [-7, 4], 10, '#3a3640', t, st.walk);
      ear(c, 3, -13, 3, 3.5, -0.2, fur, '#f0e8f0');
      ear(c, 13, -13, 3, 3.5, 0.2, fur, '#f0e8f0');
      c.fillStyle = fur; G.circle(8, -5, 8, c); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; G.ellipse(11, -1, 5, 3.5, 0, c); c.fill();
      c.fillStyle = '#3a3640'; G.ellipse(8, -5.5, 7.5, 3, 0, c); c.fill(); // mask
      nose(c, 15, -2.5, '#2a2a2a', 1.4);
      face(c, 8, -5.5, 0.55, mood, Object.assign({ lid: '#6e6a74' }, st));
    },
    capybara(c, st, mood) {
      const t = st.t, fur = tone('#b0784a', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.3;
      G.rrect(-14, -6, 26, 16, 8, c); c.fill(); c.stroke();
      feet(c, [-9, 6], 11, tone('#8a5a36', mood), t, st.walk);
      G.rrect(4, -12, 16, 13, 6, c); c.fill(); c.stroke();
      ear(c, 7, -12, 2, 1.8, 0, tone('#8a5a36', mood), null);
      nose(c, 18, -7, '#3a2a2a', 1.4);
      // a little orange on its head, as capybaras do
      c.fillStyle = '#ffa24a'; G.circle(10, -15, 3.2, c); c.fill();
      c.fillStyle = '#5fb83a'; G.ellipse(11, -18, 1.8, 0.9, 0.5, c); c.fill();
      face(c, 11, -7, 0.55, mood, Object.assign({ lid: '#9a6a3e' }, st));
    },
    monkey(c, st, mood) {
      const t = st.t, fur = tone('#c8bcb0', mood);
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(-2, 3, 10, 8.5, 0, c); c.fill(); c.stroke();
      feet(c, [-7, 3], 11, fur, t, st.walk);
      c.fillStyle = fur; G.circle(6, -7, 8, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ff9fa0', mood); G.ellipse(8, -6, 5.5, 5, 0, c); c.fill(); // pink snow-monkey face
      c.fillStyle = tone('#ff9fa0', mood); G.circle(-1, -8, 2.2, c); c.fill();
      face(c, 8, -7, 0.55, mood, Object.assign({ lid: '#e88a8c' }, st));
      // tiny towel on its head for the hot springs
      c.fillStyle = '#ffffff'; c.strokeStyle = '#b8c8e8'; G.rrect(2, -16, 10, 3.5, 1.5, c); c.fill(); c.stroke();
    },
    koi(c, st, mood) {
      const t = st.t;
      const wag = Math.sin(t * 0.25) * 0.35;
      c.fillStyle = tone('#ffffff', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      c.save(); c.translate(-12, 0); c.rotate(wag);
      c.fillStyle = tone('#ff7a3a', mood);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-8, -9, -10, -6); c.quadraticCurveTo(-6, 0, -10, 6); c.quadraticCurveTo(-8, 9, 0, 0); c.fill(); c.stroke();
      c.restore();
      c.fillStyle = tone('#ffffff', mood); G.ellipse(0, 0, 13, 6.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ff6a2a', mood); G.ellipse(-3, -2, 5, 3, 0.2, c); c.fill(); G.ellipse(6, 1, 3, 2.2, 0, c); c.fill();
      face(c, 8, -1, 0.5, mood, Object.assign({ lid: '#f0d0c0' }, st));
    },
    dragon(c, st, mood) {
      const t = st.t, col = tone('#8fd4a8', mood);
      const flap = Math.sin(t * 0.3) * 0.5;
      c.fillStyle = tone('#c9a6ff', mood); c.strokeStyle = FUR_OUT; c.lineWidth = 1.1;
      c.save(); c.translate(-2, -6); c.rotate(-0.6 + flap);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-6, -12); c.lineTo(-2, -9); c.lineTo(2, -13); c.lineTo(4, -2); c.closePath(); c.fill(); c.stroke();
      c.restore();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(-8, 4); c.quadraticCurveTo(-18, 8, -20, 0); c.lineTo(-17, 2); c.quadraticCurveTo(-14, 4, -9, 0); c.fill(); c.stroke();
      G.ellipse(-2, 2, 9, 7.5, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#fff0b0', mood); G.ellipse(0, 4, 5, 4, 0, c); c.fill();
      c.fillStyle = col; G.circle(7, -6, 7.5, c); c.fill(); c.stroke();
      c.fillStyle = '#fff6d8'; for (const d of [3, 8]) { c.beginPath(); c.moveTo(d, -12); c.lineTo(d + 1, -17); c.lineTo(d + 2.5, -12); c.fill(); }
      face(c, 8, -6, 0.58, mood, Object.assign({ lid: '#6ab888' }, st));
    },
    unicorn(c, st, mood) {
      const t = st.t, fur = tone('#ffffff', mood * 0.7);
      c.strokeStyle = fur; c.lineWidth = 3.2; c.lineCap = 'round';
      const k = st.walk ? Math.sin(t * 0.3) * 2 : 0;
      for (const [x, d] of [[-8, 1], [-4, -1], [5, 1], [9, -1]]) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x + d * k, 13); c.stroke(); }
      c.fillStyle = fur; c.strokeStyle = FUR_OUT; c.lineWidth = 1.2;
      G.ellipse(0, 2, 12, 6.5, 0, c); c.fill(); c.stroke();
      const mane = ['#ff9ec7', '#ffd166', '#8fe3c8', '#9fb8ff'];
      mane.forEach((m, i) => { c.fillStyle = tone(m, mood); G.circle(-13 + i * 0.5, 0 + i * 2, 3, c); c.fill(); });
      c.fillStyle = fur; c.beginPath(); c.moveTo(7, -1); c.lineTo(10, -10); c.lineTo(14, -9); c.lineTo(12, 1); c.fill();
      G.ellipse(13, -11, 6, 5, 0.2, c); c.fill(); c.stroke();
      mane.forEach((m, i) => { c.fillStyle = tone(m, mood); G.circle(8 + i * 0.6, -15 + i * 2.2, 2.4, c); c.fill(); });
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#c28a14'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(13, -15); c.lineTo(16, -24); c.lineTo(16.5, -15); c.closePath(); c.fill(); c.stroke();
      face(c, 12.5, -11.5, 0.5, mood, Object.assign({ lid: '#e0dcee' }, st));
    },
  });

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

  // ──── The Cloud King (a lion cub with a mane of cloud and a golden crown) ────
  function drawKing(c, x, y, st) {
    const mood = BB.clamp(st.mood == null ? 1 : st.mood, 0, 1);
    const t = st.t;
    const s = st.scale || 1;
    c.save();
    c.translate(x + (st.shake || 0), y);
    c.scale((st.facing || 1) * s, s);
    // his little floating cloud-throne
    c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(150,130,210,0.7)'; c.lineWidth = 1.4;
    for (const [px, py, r] of [[-16, 26, 12.4], [0, 29, 14.4], [16, 26, 12.4]]) { c.fillStyle = 'rgba(150,130,210,0.7)'; G.circle(px, py, r, c); c.fill(); }
    c.fillStyle = '#ffffff';
    for (const [px, py, r] of [[-16, 26, 11], [0, 29, 13], [16, 26, 11]]) { G.circle(px, py, r, c); c.fill(); }
    // body + paws + tail with a fluffy tip
    const gold = tone('#f2c46b', mood), cream = tone('#fff0cc', mood);
    c.strokeStyle = OUT; c.lineWidth = 1.6; c.lineCap = 'round';
    const sw = Math.sin(t * 0.06) * 4;
    c.strokeStyle = gold; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-10, 16); c.quadraticCurveTo(-26, 16, -24 + sw * 0.5, 2); c.stroke();
    c.fillStyle = tone('#ffffff', mood * 0.5); G.circle(-24 + sw * 0.5, 0, 5, c); c.fill();
    c.fillStyle = gold; c.strokeStyle = OUT; c.lineWidth = 1.5;
    G.ellipse(0, 12, 13, 11, 0, c); c.fill(); c.stroke();
    c.fillStyle = cream; G.ellipse(0, 15, 7, 7, 0, c); c.fill();
    for (const px of [-7, 7]) { c.fillStyle = cream; G.ellipse(px, 22, 5, 3.5, 0, c); c.fill(); c.stroke(); }
    // cloud mane
    const puff = tone('#ffffff', mood * 0.5), puffShade = BB.mix('#e3dbff', '#a8a2bc', mood * 0.5);
    for (const [col, grow] of [[puffShade, 1.5], [puff, 0]]) {
      c.fillStyle = col;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + Math.sin(t * 0.03) * 0.05;
        G.circle(Math.cos(a) * 17, -10 + Math.sin(a) * 16, 7.5 + grow, c); c.fill();
      }
    }
    // face
    c.fillStyle = gold; c.strokeStyle = OUT; c.lineWidth = 1.5;
    G.circle(0, -10, 14, c); c.fill(); c.stroke();
    for (const side of [-1, 1]) { c.fillStyle = gold; G.circle(side * 11, -22, 4.5, c); c.fill(); c.stroke(); c.fillStyle = '#ffc0a8'; G.circle(side * 11, -22, 2.2, c); c.fill(); }
    c.fillStyle = cream; G.ellipse(0, -4, 8, 6, 0, c); c.fill();
    c.fillStyle = '#b8605a'; c.beginPath(); c.moveTo(-2.5, -7); c.lineTo(2.5, -7); c.lineTo(0, -4.5); c.closePath(); c.fill();
    // crown
    c.fillStyle = '#ffd34d'; c.strokeStyle = '#c28a14'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-9, -24); c.lineTo(-11, -35); c.lineTo(-4, -29); c.lineTo(0, -38); c.lineTo(4, -29); c.lineTo(11, -35); c.lineTo(9, -24); c.closePath(); c.fill(); c.stroke();
    for (const [gx, gy, col] of [[-11, -35, '#ff7b9c'], [0, -38, '#7cc8ff'], [11, -35, '#8fe388']]) { c.fillStyle = col; G.circle(gx, gy, 2, c); c.fill(); }
    face(c, 0, -12, 1.05, mood, Object.assign({ lid: '#d8a850' }, st));
    c.restore();
    if (mood > 0.02 && !st.noCloud) moodCloud(c, x, y - 62 * s, mood, st.t, 1.8);
    if (st.rainbow) rainbow(c, x, y - 58 * s, st.rainbow, 2);
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
    swim(c, st) { // Sea Turtle Elder
      const t = st.t, aw = st.awake || 0;
      const paddle = Math.sin(t * (0.03 + aw * 0.05)) * (0.15 + aw * 0.25);
      c.fillStyle = '#7fd0a8'; c.strokeStyle = '#2f6a55'; c.lineWidth = 1.5;
      // flippers
      for (const [fx, fy, r] of [[-26, 14, 0.5], [22, 16, -0.5]]) {
        c.save(); c.translate(fx, fy); c.rotate(r + paddle * Math.sign(fx));
        G.ellipse(0, 0, 13, 5, 0, c); c.fill(); c.stroke();
        c.restore();
      }
      // head, peeking out to the right
      G.circle(28, -2, 11, c); c.fill(); c.stroke();
      // shell
      const g = c.createRadialGradient(-6, -14, 4, -2, -4, 30);
      g.addColorStop(0, '#b8f0c0'); g.addColorStop(0.6, '#3fae8a'); g.addColorStop(1, '#2a7a6a');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(-2, 12, 28, 26, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(230,255,240,0.8)'; c.lineWidth = 1.4;
      for (const [hx, hy, r] of [[-2, -4, 7], [-16, 4, 5.5], [12, 4, 5.5], [-8, -12, 4], [5, -12, 4]]) {
        c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); } c.closePath(); c.stroke();
      }
      c.fillStyle = '#f6e2b0'; c.strokeStyle = '#2f6a55'; c.lineWidth = 1.5;
      G.rrect(-30, 10, 56, 6, 3, c); c.fill(); c.stroke();
      // a little bubble on the nose
      G.bubble(40, -14 - ((t * 0.3) % 20), 3.5, '#bff0ff', 0.9, c);
      elderFace(c, 29, -3, 0.75, aw, t);
    },
    dig(c, st) { // Tortoise Elder
      const t = st.t, aw = st.awake || 0;
      c.fillStyle = '#b8a070'; c.strokeStyle = '#5a4a2a'; c.lineWidth = 1.5;
      for (const lx of [-18, -6, 8, 18]) { G.rrect(lx - 4, 12, 9, 14, 4, c); c.fill(); c.stroke(); }
      // stubby, wise head
      const nod = Math.sin(t * 0.04) * 2 * aw;
      G.ellipse(28, 2 + nod, 11, 10, 0, c); c.fill(); c.stroke();
      // tall domed shell with sandy plates
      const g = c.createRadialGradient(-6, -16, 4, 0, -6, 34);
      g.addColorStop(0, '#f0c890'); g.addColorStop(0.6, '#c08a4a'); g.addColorStop(1, '#8a5a2a');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(0, 14, 30, 32, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(90,60,30,0.7)'; c.lineWidth = 1.4;
      for (const [hx, hy, r] of [[0, -6, 8], [-17, 4, 6], [17, 4, 6], [-9, -14, 4.5], [9, -14, 4.5], [0, 8, 5]]) {
        c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); } c.closePath(); c.stroke();
      }
      // a desert flower growing on top
      c.strokeStyle = '#5a8a3a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, -26); c.stroke();
      c.fillStyle = '#ff9ec7'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; G.circle(Math.cos(a) * 3, -28 + Math.sin(a) * 3, 2.4, c); c.fill(); }
      c.fillStyle = '#ffd34d'; G.circle(0, -28, 1.8, c); c.fill();
      elderFace(c, 29, 1 + nod, 0.72, aw, t);
    },
    spring(c, st) { // Snow Hare Elder
      const t = st.t, aw = st.awake || 0;
      const hop = aw > 0.5 ? Math.abs(Math.sin(t * 0.08)) * 5 : 0;
      c.translate(0, -hop);
      c.fillStyle = '#ffffff'; c.strokeStyle = '#8aa0c0'; c.lineWidth = 1.5;
      // body & big fluffy feet
      G.ellipse(0, 12, 20, 18, 0, c); c.fill(); c.stroke();
      G.ellipse(-12, 28, 10, 4.5, 0, c); c.fill(); c.stroke();
      G.ellipse(12, 28, 10, 4.5, 0, c); c.fill(); c.stroke();
      G.circle(-20, 18, 6, c); c.fill(); c.stroke();
      // long ears that boing
      for (const side of [-1, 1]) {
        c.save(); c.translate(side * 6, -24); c.rotate(side * (0.15 + Math.sin(t * 0.06 + side) * 0.08 * (0.3 + aw)));
        c.fillStyle = '#ffffff'; G.ellipse(0, -16, 5.5, 17, 0, c); c.fill(); c.stroke();
        c.fillStyle = '#ffc6d6'; G.ellipse(0, -15, 2.6, 12, 0, c); c.fill();
        c.restore();
      }
      c.fillStyle = '#ffffff'; G.circle(0, -12, 14, c); c.fill(); c.stroke();
      // a cosy red scarf
      c.fillStyle = '#ff6b6b'; c.strokeStyle = '#b83a3a'; c.lineWidth = 1.2;
      G.rrect(-13, -1, 26, 6, 3, c); c.fill(); c.stroke();
      G.rrect(6, 2, 6, 14, 2, c); c.fill(); c.stroke();
      c.fillStyle = '#ffc6d6'; G.circle(0, -8, 1.8, c); c.fill();
      elderFace(c, 0, -13, 0.85, aw, t);
    },
    rings(c, st) { // Badger Elder
      const t = st.t, aw = st.awake || 0;
      c.fillStyle = '#8a8a96'; c.strokeStyle = '#3a3a44'; c.lineWidth = 1.5;
      G.ellipse(0, 12, 24, 18, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#5a5a66';
      for (const lx of [-14, 12]) { G.rrect(lx - 5, 20, 10, 10, 4, c); c.fill(); c.stroke(); }
      // head with the famous stripes
      c.fillStyle = '#f4f0ea'; G.ellipse(0, -10, 15, 13, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#2a2a32';
      for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * 7, -12, 4, 11, side * -0.2, 0, TAU); c.fill(); }
      c.fillStyle = '#8a8a96';
      for (const side of [-1, 1]) { G.circle(side * 12, -22, 4.5, c); c.fill(); c.stroke(); }
      c.fillStyle = '#2a2a32'; G.circle(0, -2, 2.2, c); c.fill();
      // a toadstool lantern that glows brighter as he wakes
      const lx = 26, ly = 0;
      G.drawGlow(lx, ly - 10, 22 + aw * 10, '#ffd08a', 0.4 + aw * 0.4, c);
      c.strokeStyle = '#6a4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, ly + 28); c.lineTo(lx, ly - 4); c.stroke();
      c.fillStyle = '#f5ead0'; c.fillRect(lx - 2, ly - 8, 4, 6);
      c.fillStyle = '#d8442a'; c.strokeStyle = '#8a2a1a'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(lx, ly - 8, 9, 7, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; G.circle(lx - 3, ly - 11, 1.3, c); c.fill(); G.circle(lx + 3, ly - 10, 1.1, c); c.fill();
      elderFace(c, 0, -9, 0.75, aw, t);
    },
    bubbleBounce(c, st) { // Otter Elder
      const t = st.t, aw = st.awake || 0;
      c.fillStyle = '#9a6a44'; c.strokeStyle = '#4a2e1a'; c.lineWidth = 1.5;
      // tail
      c.beginPath(); c.moveTo(-12, 22); c.quadraticCurveTo(-34, 26, -36, 12); c.quadraticCurveTo(-26, 18, -12, 14); c.closePath(); c.fill(); c.stroke();
      G.ellipse(0, 10, 16, 22, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#f0dcc0'; G.ellipse(0, 12, 10, 16, 0, c); c.fill();
      c.fillStyle = '#9a6a44'; G.circle(0, -18, 14, c); c.fill(); c.stroke();
      for (const side of [-1, 1]) { G.circle(side * 11, -28, 3.5, c); c.fill(); c.stroke(); }
      c.fillStyle = '#f0dcc0'; G.ellipse(0, -12, 9, 6, 0, c); c.fill();
      c.fillStyle = '#2a1a14'; G.ellipse(0, -15, 2.6, 1.8, 0, c); c.fill();
      c.strokeStyle = 'rgba(60,30,20,0.6)'; c.lineWidth = 0.8;
      for (const side of [-1, 1]) for (const dy of [-1, 1.5]) { c.beginPath(); c.moveTo(side * 5, -13 + dy); c.lineTo(side * 14, -14 + dy * 2); c.stroke(); }
      // paws holding up a big wobbly bubble
      const bob = Math.sin(t * 0.06) * 3;
      G.bubble(0, -44 + bob, 11 + aw * 2, '#bff0ff', 0.95, c);
      c.fillStyle = '#9a6a44'; c.strokeStyle = '#4a2e1a'; c.lineWidth = 1.3;
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 12, 0); c.quadraticCurveTo(side * 16, -20, side * 8, -34 + bob); c.lineWidth = 5; c.strokeStyle = '#9a6a44'; c.stroke(); }
      elderFace(c, 0, -20, 0.8, aw, t);
    },
    wings(c, st) { // Star Whale
      const t = st.t, aw = st.awake || 0;
      const drift = Math.sin(t * 0.025) * 3;
      c.translate(0, -8 + drift);
      G.drawGlow(0, 0, 70, '#b8a0ff', 0.35 + aw * 0.25, c);
      // tail flukes
      const sw = Math.sin(t * 0.05) * 0.2;
      c.save(); c.translate(-38, -4); c.rotate(sw);
      c.fillStyle = '#8a7aff'; c.strokeStyle = '#3a2a8a'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-10, -18, -20, -16); c.quadraticCurveTo(-12, -4, -20, 8); c.quadraticCurveTo(-10, 8, 0, 0); c.fill(); c.stroke();
      c.restore();
      // big round body
      const g = c.createLinearGradient(0, -26, 0, 24);
      g.addColorStop(0, '#a898ff'); g.addColorStop(1, '#6a5ae0');
      c.fillStyle = g; c.strokeStyle = '#3a2a8a'; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(4, 0, 40, 24, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#e8e0ff';
      c.beginPath(); c.ellipse(8, 10, 30, 12, 0, 0, Math.PI); c.fill();
      c.strokeStyle = 'rgba(160,140,230,0.8)'; c.lineWidth = 1;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(8 + i * 7, 11); c.lineTo(8 + i * 7, 20 - Math.abs(i) * 1.5); c.stroke(); }
      // star freckles
      c.fillStyle = '#fff6d0';
      for (const [sx, sy, r] of [[-14, -12, 3], [-2, -18, 2.4], [-22, 0, 2], [10, -16, 1.8]]) { G.star(sx, sy, r, 5, 0.45, -Math.PI / 2, c); c.fill(); }
      // little star wings, flapping when awake
      const flap = Math.sin(t * (0.05 + aw * 0.1)) * (0.2 + aw * 0.3);
      c.save(); c.translate(10, 6); c.rotate(0.5 + flap);
      c.fillStyle = '#ffe27a'; c.strokeStyle = '#c28a14'; c.lineWidth = 1.2;
      G.star(10, 0, 11, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
      c.restore();
      // a sparkly spout
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.6 + i * 12) % 36;
        c.fillStyle = `rgba(255,246,208,${1 - ph / 36})`;
        G.twinkle(18 + (i - 1) * 6 * (ph / 36), -26 - ph, 2.5, c); c.fill();
      }
      elderFace(c, 26, -2, 0.85, aw, t);
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
