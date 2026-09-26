// ════════════════════════════════════════════════════════════════
//  GFX — canvas setup and shared drawing helpers.
//  The game thinks in a fixed 960×540 logical view; the backing canvas
//  is scaled to the real screen (up to 2× for crisp vector art on
//  high-DPI tablets) and letterboxed with soft bars.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const TAU = Math.PI * 2;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const G = BB.G = {
    canvas, ctx,
    W: C.VIEW_W, H: C.VIEW_H,
    scale: 1,                 // backing pixels per logical pixel
    maxScale: C.MAX_RENDER_SCALE, // lowered automatically on slow machines
    view: { x: 0, y: 0, w: 0, h: 0 }, // canvas placement in CSS px
    t: 0,                     // global animation clock (ticks)

    resize() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const aspect = G.W / G.H;
      let w = vw, h = vw / aspect;
      if (h > vh) { h = vh; w = vh * aspect; }
      w = Math.floor(w); h = Math.floor(h);
      const dpr = window.devicePixelRatio || 1;
      const s = BB.clamp((w * dpr) / G.W, 0.75, G.maxScale);
      const changed = Math.abs(s - G.scale) > 0.01 || canvas.width !== Math.round(G.W * s);
      G.scale = s;
      canvas.width = Math.round(G.W * s);
      canvas.height = Math.round(G.H * s);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.style.left = Math.floor((vw - w) / 2) + 'px';
      canvas.style.top = Math.floor((vh - h) / 2) + 'px';
      G.view = { x: Math.floor((vw - w) / 2), y: Math.floor((vh - h) / 2), w, h };
      ctx.imageSmoothingEnabled = true;
      if (changed && BB.onScaleChange) BB.onScaleChange(s);
    },

    // CSS client coords → logical game coords
    toLogical(clientX, clientY) {
      return { x: (clientX - G.view.x) / G.view.w * G.W, y: (clientY - G.view.y) / G.view.h * G.H };
    },

    begin() { ctx.setTransform(G.scale, 0, 0, G.scale, 0, 0); },

    // Offscreen canvas sized in logical px, drawn at the current scale
    offscreen(w, h, scale = G.scale) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * scale));
      c.height = Math.max(1, Math.ceil(h * scale));
      const x = c.getContext('2d');
      x.setTransform(scale, 0, 0, scale, 0, 0);
      return { canvas: c, ctx: x, w, h, scale };
    },
  };

  // ──── Cached soft glow sprites (for additive light) ────
  const glowCache = new Map();
  G.glow = function (color, size = 64) {
    const key = color + size;
    let c = glowCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = size * 2;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(size, size, 0, size, size, size);
      g.addColorStop(0, BB.rgba(color, 1));
      g.addColorStop(0.25, BB.rgba(color, 0.55));
      g.addColorStop(0.6, BB.rgba(color, 0.14));
      g.addColorStop(1, BB.rgba(color, 0));
      x.fillStyle = g;
      x.fillRect(0, 0, size * 2, size * 2);
      glowCache.set(key, c);
    }
    return c;
  };
  G.drawGlow = function (x, y, r, color, alpha = 1, c = ctx) {
    const img = G.glow(color);
    const prev = c.globalAlpha;
    c.globalAlpha = prev * alpha;
    c.drawImage(img, x - r, y - r, r * 2, r * 2);
    c.globalAlpha = prev;
  };

  // ──── Shapes ────
  G.circle = (x, y, r, c = ctx) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  G.ellipse = (x, y, rx, ry, rot = 0, c = ctx) => { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
  G.rrect = (x, y, w, h, r, c = ctx) => {
    c.beginPath();
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  G.star = (x, y, r, points = 5, inner = 0.45, rot = -Math.PI / 2, c = ctx) => {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = rot + i * Math.PI / points;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  };
  // 4-point twinkle
  G.twinkle = (x, y, r, c = ctx) => {
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.closePath();
  };
  G.heart = (x, y, s, c = ctx) => {
    c.beginPath();
    c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.5, y - s * 1.05, x, y - s * 0.45);
    c.bezierCurveTo(x + s * 0.5, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
    c.closePath();
  };

  // A friendly soap bubble with an iridescent rim
  G.bubble = (x, y, r, tint = '#9fe8ff', alpha = 1, c = ctx) => {
    c.save();
    c.globalAlpha = alpha;
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.6, BB.rgba(tint, 0.12));
    g.addColorStop(0.88, BB.rgba(tint, 0.45));
    g.addColorStop(1, 'rgba(255,255,255,0.85)');
    c.fillStyle = g;
    G.circle(x, y, r, c); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = Math.max(1, r * 0.08);
    c.beginPath(); c.arc(x, y, r * 0.72, -2.6, -1.7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    G.circle(x - r * 0.38, y - r * 0.42, r * 0.14, c); c.fill();
    c.restore();
  };

  // Chunky outlined text (only used for the logo and parents' extras —
  // gameplay never depends on reading)
  G.FONT = '"Fredoka", "Baloo 2", "Nunito", "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif';
  G.text = (str, x, y, size, fill, stroke = 'rgba(40,20,60,0.85)', align = 'center', c = ctx) => {
    c.font = `800 ${size}px ${G.FONT}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = size * 0.22; c.strokeText(str, x, y); }
    c.fillStyle = fill;
    c.fillText(str, x, y);
  };
})(window.BB);
