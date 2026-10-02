// ════════════════════════════════════════════════════════════════
//  PARTICLES — sparkles, hearts, confetti, dust, dandelion seeds,
//  bubble-pop rings, splashes and each biome's ambient drift.
//  World particles live in world px; ambient ones in screen px so they
//  can parallax gently regardless of the room.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const TAU = Math.PI * 2;
  const MAX = 700;
  const list = [];
  const ambient = [];
  const rain = [];

  const CONFETTI = ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff', '#ffffff'];

  function spawn(p) {
    if (list.length >= MAX) list.shift();
    p.life = p.max = p.life || 40;
    p.vx = p.vx || 0; p.vy = p.vy || 0;
    p.g = p.g || 0; p.drag = p.drag == null ? 0.98 : p.drag;
    p.rot = p.rot || 0; p.vr = p.vr || 0;
    p.size = p.size || 3;
    list.push(p);
    return p;
  }

  const P = BB.Particles = {
    list,
    // burst of a kind around (x, y)
    burst(kind, x, y, n = 10, opt = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = (opt.speed || 2) * (0.4 + Math.random() * 0.8);
        const p = { kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0), life: (opt.life || 40) * (0.7 + Math.random() * 0.6),
          color: opt.color || (kind === 'confetti' ? BB.pick(CONFETTI) : '#fff6c2'), size: (opt.size || 3) * (0.7 + Math.random() * 0.6),
          g: opt.g || 0, drag: opt.drag, vr: (Math.random() - 0.5) * 0.3, rot: Math.random() * TAU };
        spawn(p);
      }
    },
    dust(x, y, n = 5, color = '#e8dcc8') {
      for (let i = 0; i < n; i++) spawn({ kind: 'dust', x: x + (Math.random() - 0.5) * 12, y, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 0.8, life: 22 + Math.random() * 12, size: 3 + Math.random() * 3, color, drag: 0.92 });
    },
    ring(x, y, color = '#ffffff', size = 10) { spawn({ kind: 'ring', x, y, life: 18, size, color }); },
    // a little celebration firework (party time!)
    firework(x, y) {
      const col = BB.pick(['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff', '#ffffff']);
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        spawn({ kind: 'spark', x, y, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, life: 46, size: 3, color: col, drag: 0.95, g: 0.03 });
      }
      spawn({ kind: 'ring', x, y, life: 22, size: 30, color: col });
    },
    heart(x, y, color = '#ff7eb6') { spawn({ kind: 'heart', x, y, vx: (Math.random() - 0.5) * 0.8, vy: -1.1 - Math.random() * 0.6, life: 60, size: 4 + Math.random() * 2, color, drag: 0.99 }); },
    seed(x, y) { spawn({ kind: 'seed', x, y, vx: (Math.random() - 0.5) * 1.2, vy: -0.4 - Math.random() * 0.6, life: 90, size: 4, color: '#ffffff', drag: 0.995, vr: (Math.random() - 0.5) * 0.05 }); },
    splash(x, y, color = '#bfe7ff') {
      for (let i = 0; i < 12; i++) spawn({ kind: 'dot', x, y, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, g: 0.25, life: 30, size: 2 + Math.random() * 2, color });
      spawn({ kind: 'ring', x, y, life: 24, size: 18, color });
    },
    // a little guiding star that flies from (x, y) toward (tx, ty)
    guide(x, y, tx, ty, color) {
      const d = Math.hypot(tx - x, ty - y) || 1, sp = 2.6;
      spawn({ kind: 'star', x, y, vx: (tx - x) / d * sp, vy: (ty - y) / d * sp, life: Math.max(12, Math.min(60, d / sp)), size: 3.4, color, drag: 1, vr: 0.12 });
    },
    trail(kind, x, y, color) { spawn({ kind, x, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.3, life: 26, size: 2.5 + Math.random() * 1.5, color, drag: 0.97 }); },

    update() {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.kind === 'seed') p.vx += Math.sin((p.life + p.x) * 0.05) * 0.03;
        if (--p.life <= 0) list.splice(i, 1);
      }
    },

    draw(c, cam) {
      const G = BB.G;
      for (const p of list) {
        const x = p.x - cam.x, y = p.y - cam.y;
        if (x < -40 || y < -40 || x > G.W + 40 || y > G.H + 40) continue;
        const k = p.life / p.max;
        c.globalAlpha = Math.min(1, k * 1.6);
        switch (p.kind) {
          case 'paw':
            BB.Gestures.drawPaw(c, x, y, p.size * 0.12, p.color, p.color);
            break;
          case 'flower':
            BB.Cosmetics.flower(c, x, y, p.size, p.color);
            break;
          case 'spark':
            c.fillStyle = p.color; G.twinkle(x, y, p.size * (0.5 + k), c); c.fill();
            break;
          case 'star':
            c.fillStyle = p.color; G.star(x, y, p.size * (0.6 + k * 0.6), 5, 0.5, p.rot, c); c.fill();
            break;
          case 'heart':
            c.fillStyle = p.color; G.heart(x, y, p.size * (0.6 + (1 - k) * 0.5), c); c.fill();
            break;
          case 'confetti':
            c.save(); c.translate(x, y); c.rotate(p.rot);
            c.fillStyle = p.color; c.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
            c.restore();
            break;
          case 'ring':
            c.strokeStyle = p.color; c.lineWidth = 2 * k;
            G.circle(x, y, p.size * (1.4 - k), c); c.stroke();
            break;
          case 'dust':
            c.fillStyle = p.color; G.circle(x, y, p.size * (1.2 - k * 0.4), c); c.fill();
            break;
          case 'seed':
            c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.8;
            c.save(); c.translate(x, y); c.rotate(p.rot);
            for (let j = 0; j < 6; j++) { const a = -Math.PI / 2 + (j - 2.5) * 0.35; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); c.stroke(); }
            c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 4); c.stroke();
            c.restore();
            break;
          default:
            c.fillStyle = p.color; G.circle(x, y, p.size * k + 0.5, c); c.fill();
        }
      }
      c.globalAlpha = 1;
    },

    clear() { list.length = 0; },

    // ──── Ambient drift (screen space) ────
    ambientUpdate(zoneKey, rainy, cam, lastCam) {
      const G = BB.G;
      const dx = cam.x - lastCam.x, dy = cam.y - lastCam.y;
      const want = { pollen: 28, spores: 36, glints: 30, honey: 26, rain: 16, wisps: 20, bubbles: 22, sand: 30, snow: 60, leaves: 22, steam: 16, stars: 40, motes: 24 }[BB.ZONES.find(z => z.key === zoneKey).ambient] || 20;
      const kind = BB.ZONES.find(z => z.key === zoneKey).ambient;
      while (ambient.length < want) {
        ambient.push({ kind, x: Math.random() * G.W, y: Math.random() * G.H, ph: Math.random() * TAU, s: 0.5 + Math.random(), depth: 0.3 + Math.random() * 0.9 });
      }
      for (let i = ambient.length - 1; i >= 0; i--) {
        const a = ambient[i];
        if (a.kind !== kind) { ambient.splice(i, 1); continue; }
        a.ph += 0.02;
        a.x -= dx * a.depth; a.y -= dy * a.depth;
        if (kind === 'pollen') { a.x += Math.sin(a.ph) * 0.3 + 0.15; a.y += Math.cos(a.ph * 0.7) * 0.2 - 0.05; }
        else if (kind === 'spores') { a.y -= 0.25 * a.s; a.x += Math.sin(a.ph) * 0.25; }
        else if (kind === 'glints') { a.y += 0.05; }
        else if (kind === 'honey') { a.y += 0.15 * a.s; a.x += Math.sin(a.ph) * 0.15; }
        else if (kind === 'rain') { a.y += 0.3; a.x += 0.1; }
        else if (kind === 'wisps') { a.x += 0.35 * a.s; }
        else if (kind === 'bubbles') { a.y -= 0.35 * a.s; a.x += Math.sin(a.ph * 2) * 0.3; }
        else if (kind === 'sand') { a.x += 0.9 * a.s; a.y += Math.sin(a.ph * 1.5) * 0.25; }
        else if (kind === 'snow') { a.y += 0.45 * a.s; a.x += Math.sin(a.ph) * 0.4; }
        else if (kind === 'leaves') { a.y += 0.4 * a.s; a.x += Math.sin(a.ph) * 0.8 + 0.2; }
        else if (kind === 'steam') { a.y -= 0.3 * a.s; a.x += Math.sin(a.ph) * 0.2; }
        else if (kind === 'stars') { a.y += 0.03; }
        else if (kind === 'motes') { a.y -= 0.06 * a.s; a.x += Math.sin(a.ph) * 0.15; }
        if (a.x < -20) a.x += G.W + 40; if (a.x > G.W + 20) a.x -= G.W + 40;
        if (a.y < -20) a.y += G.H + 40; if (a.y > G.H + 20) a.y -= G.H + 40;
      }
      // rain streaks
      if (rainy) {
        while (rain.length < 90) rain.push({ x: Math.random() * (G.W + 200), y: Math.random() * G.H, v: 7 + Math.random() * 5, l: 8 + Math.random() * 10 });
        for (const r of rain) {
          r.y += r.v; r.x -= r.v * 0.18 + dx * 0.9; r.y -= dy * 0.9;
          if (r.y > G.H || r.x < -20) { r.y = -r.l - Math.random() * 40; r.x = Math.random() * (G.W + 200); }
          if (r.y < -60) r.y += G.H + 60;
        }
      } else rain.length = 0;
    },

    ambientDraw(c, t) {
      const G = BB.G;
      for (const a of ambient) {
        const tw = 0.5 + 0.5 * Math.sin(a.ph * 3);
        switch (a.kind) {
          case 'pollen': c.fillStyle = `rgba(255,244,190,${0.35 + tw * 0.4})`; G.circle(a.x, a.y, 1.4 * a.s, c); c.fill(); break;
          case 'spores': G.drawGlow(a.x, a.y, 6 * a.s, '#8affd9', 0.5 + tw * 0.4, c); break;
          case 'glints': c.fillStyle = `rgba(190,230,255,${tw * 0.8})`; G.twinkle(a.x, a.y, 2.5 * a.s, c); c.fill(); break;
          case 'honey': G.drawGlow(a.x, a.y, 5 * a.s, '#ffd66b', 0.4 + tw * 0.4, c); break;
          case 'rain': c.fillStyle = 'rgba(210,235,255,0.25)'; G.circle(a.x, a.y, 1.6 * a.s, c); c.fill(); break;
          case 'wisps': c.fillStyle = `rgba(255,255,255,${0.15 + tw * 0.15})`; G.ellipse(a.x, a.y, 30 * a.s, 5 * a.s, 0, c); c.fill(); break;
          case 'bubbles':
            c.strokeStyle = `rgba(255,255,255,${0.35 + tw * 0.3})`; c.lineWidth = 1.2;
            G.circle(a.x, a.y, 3 * a.s, c); c.stroke();
            c.fillStyle = 'rgba(255,255,255,0.5)'; G.circle(a.x - a.s, a.y - a.s, 0.8 * a.s, c); c.fill(); break;
          case 'sand': c.fillStyle = `rgba(255,236,190,${0.3 + tw * 0.3})`; G.circle(a.x, a.y, 1.2 * a.s, c); c.fill(); break;
          case 'snow': c.fillStyle = `rgba(255,255,255,${0.55 + tw * 0.35})`; G.circle(a.x, a.y, 1.8 * a.s, c); c.fill(); break;
          case 'leaves': {
            c.save(); c.translate(a.x, a.y); c.rotate(a.ph * 2); c.scale(a.s, a.s);
            c.fillStyle = ['#e8783a', '#ffb060', '#d8442a', '#ffd04a'][Math.floor(a.depth * 4) % 4];
            c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(0, -4, 5, 0); c.quadraticCurveTo(0, 4, -5, 0); c.fill();
            c.restore(); break;
          }
          case 'steam': G.drawGlow(a.x, a.y, 30 * a.s, '#fff0f5', 0.12 + tw * 0.1, c); break;
          case 'stars': c.fillStyle = `rgba(255,248,220,${tw * 0.9})`; G.twinkle(a.x, a.y, 2.2 * a.s, c); c.fill(); break;
          case 'motes': c.fillStyle = `rgba(255,240,200,${0.2 + tw * 0.35})`; G.circle(a.x, a.y, 1.3 * a.s, c); c.fill(); break;
        }
      }
      if (rain.length) {
        c.strokeStyle = 'rgba(200,225,255,0.4)'; c.lineWidth = 1.2; c.lineCap = 'round';
        c.beginPath();
        for (const r of rain) { c.moveTo(r.x, r.y); c.lineTo(r.x - r.l * 0.18, r.y + r.l); }
        c.stroke();
      }
    },
  };
})(window.BB);
