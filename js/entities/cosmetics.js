// Pictures at the existing mirror; these choices never change bubble
// targets, speed, radius, collision, powers or movement.
(function (BB) {
  'use strict';
  const LIST = [
    { id: 'bubble-classic', name: 'Classic bubbles', slot: 'bubble', value: 'classic', stars: 0 },
    { id: 'bubble-heart', name: 'Heart bubbles', slot: 'bubble', value: 'heart', stars: 40 },
    { id: 'bubble-star', name: 'Star bubbles', slot: 'bubble', value: 'star', stars: 80 },
    { id: 'bubble-flower', name: 'Flower bubbles', slot: 'bubble', value: 'flower', stars: 140 },
    { id: 'bubble-rainbow', name: 'Rainbow bubbles', slot: 'bubble', value: 'rainbow', unlock: { kind: 'kin', count: 7 } },
    { id: 'trail-classic', name: 'Classic trail', slot: 'trail', value: 'classic', stars: 0 },
    { id: 'trail-rainbow', name: 'Rainbow trail', slot: 'trail', value: 'rainbow', stars: 250 },
    { id: 'trail-paw', name: 'Tiny paw trail', slot: 'trail', value: 'paw', stars: 60 },
    { id: 'trail-heart', name: 'Heart trail', slot: 'trail', value: 'heart', unlock: { kind: 'bosses', count: 3 } },
    // (kept last so the tab icons above keep their places in the list)
    { id: 'bubble-beam', name: 'Rainbow beams', slot: 'bubble', value: 'beam', unlock: { kind: 'rainbow', count: 1 } },
  ];
  const COLORS = ['#ff8fb8', '#ffe066', '#8fe388', '#7cc8ff', '#b99cff'];
  function flower(c, x, y, r, color) {
    c.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      BB.G.circle(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.45, c); c.fill();
    }
    c.fillStyle = '#ffe066'; BB.G.circle(x, y, r * 0.28, c); c.fill();
  }
  function bubble(c, style, x, y, r, tint, alpha, t) {
    BB.G.bubble(x, y, r, tint, alpha, c);
    c.save(); c.globalAlpha *= alpha; c.fillStyle = style === 'heart' ? '#ff7eb6' : '#ffd84a';
    if (style === 'heart') { BB.G.heart(x, y + 1, r * 0.55, c); c.fill(); }
    if (style === 'star') { BB.G.star(x, y, r * 0.6, 5, 0.5, -Math.PI / 2 + Math.sin(t * 0.06) * 0.15, c); c.fill(); }
    if (style === 'flower') flower(c, x, y, r * 0.6, '#ffb3cf');
    if (style === 'rainbow') {
      // Rainbow's family's own: a little rainbow inside every bubble
      c.lineWidth = Math.max(1, r * 0.12); c.lineCap = 'round';
      (BB.RAINBOW || COLORS).forEach((col, i, all) => {
        c.strokeStyle = col; c.beginPath(); c.arc(x, y + r * 0.32, r * (0.66 - i * 0.48 / all.length), Math.PI * 1.06, Math.PI * 1.94); c.stroke();
      });
    }
    c.restore();
  }
  // A rainbow beam: seven bands that follow the shot's own path (pts, head
  // first), tapering and fading towards the tail, with a soft white glow.
  function ribbon(c, pts, width, alpha) {
    const n = pts.length;
    if (n < 2 || alpha <= 0) return;
    const R = BB.RAINBOW, last = Math.max(1, n - 1);
    const nm = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      return { x: -dy / d, y: dx / d };
    });
    const half = i => width * (1 - (i / last) * 0.6) / 2;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalAlpha = alpha * 0.28; c.strokeStyle = '#ffffff';
    for (let i = 0; i < n - 1; i++) {
      c.lineWidth = half(i) * 3 * (1 - i / last);
      c.beginPath(); c.moveTo(pts[i].x, pts[i].y); c.lineTo(pts[i + 1].x, pts[i + 1].y); c.stroke();
    }
    c.globalAlpha = alpha;
    const h = pts[0], tl = pts[n - 1];
    for (let k = 0; k < R.length; k++) {
      const gr = c.createLinearGradient(h.x, h.y, tl.x, tl.y);
      gr.addColorStop(0, R[k]); gr.addColorStop(0.55, R[k] + 'cc'); gr.addColorStop(1, R[k] + '00');
      c.fillStyle = gr;
      const off = (i, e) => -half(i) + 2 * half(i) * (k + e) / R.length;
      c.beginPath();
      for (let i = 0; i < n; i++) { const o = off(i, 0); c[i ? 'lineTo' : 'moveTo'](pts[i].x + nm[i].x * o, pts[i].y + nm[i].y * o); }
      for (let i = n - 1; i >= 0; i--) { const o = off(i, 1) + 0.4; c.lineTo(pts[i].x + nm[i].x * o, pts[i].y + nm[i].y * o); }
      c.closePath(); c.fill();
    }
    // a glossy line along the top band
    c.globalAlpha = alpha * 0.55; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(0.8, width * 0.06);
    c.beginPath();
    const m = Math.ceil(n / 2);
    for (let i = 0; i < m; i++) { const o = -half(i) + width * 0.08; c[i ? 'lineTo' : 'moveTo'](pts[i].x + nm[i].x * o, pts[i].y + nm[i].y * o); }
    c.stroke();
    c.restore();
  }
  // the beam's leading star, with a warm halo
  function beamHead(c, x, y, s, t, alpha = 1) {
    c.save(); c.globalAlpha *= alpha;
    BB.G.drawGlow(x, y, 18 * s, '#fff1c2', 0.75, c);
    c.fillStyle = '#ffe066'; c.strokeStyle = '#e8a63a'; c.lineWidth = 1.2 * s;
    BB.G.star(x, y, 7.5 * s, 5, 0.5, t * 0.12, c); c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; BB.G.twinkle(x - 1.2 * s, y - 1.2 * s, 2.8 * s, c); c.fill();
    c.restore();
  }
  function icon(c, item, x, y, s, t) {
    if (item.value === 'beam') {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push({ x: x + (14 - u * 34) * s, y: y + (2 - Math.sin(u * Math.PI) * 12 + u * 8) * s }); }
      ribbon(c, pts, 11 * s, 1); beamHead(c, x + 14 * s, y + 2 * s, 0.8 * s, t);
    }
    else if (item.slot === 'bubble') bubble(c, item.value, x, y, 14 * s, '#d8b8ff', 1, t);
    else if (item.value === 'paw') BB.Gestures.drawPaw(c, x, y, 1.2 * s, '#ff9ec7', '#b85b86');
    else if (item.value === 'heart') {
      [[-10, 6, 5], [0, 0, 7], [11, -8, 4]].forEach(([dx, dy, r]) => {
        c.fillStyle = '#ff8fb8'; BB.G.heart(x + dx * s, y + dy * s, r * s, c); c.fill();
      });
    }
    else if (item.value === 'rainbow') {
      c.save(); c.lineWidth = 4 * s; c.lineCap = 'round';
      COLORS.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(x, y + 11 * s, (20 - i * 4) * s, Math.PI, Math.PI * 2); c.stroke(); }); c.restore();
    } else { c.fillStyle = '#ffd84a'; BB.G.twinkle(x, y, 13 * s, c); c.fill(); }
  }
  function trail(save, x, y, t) {
    const style = save.cosmetics.trail;
    if (style === 'rainbow') BB.Particles.trail('dot', x, y, COLORS[Math.floor(t / 6) % COLORS.length]);
    if (style === 'paw') BB.Particles.trail('paw', x, y, '#ff9ec7');
    if (style === 'heart') BB.Particles.trail('heart', x, y, '#ff8fb8');
  }
  // Rainbow keeps her own bubble choice, and starts out with rainbow beams.
  const bubbleKey = cat => cat === 'rainbow' ? 'rainbowBubble' : 'bubble';
  const bubbleFor = (save, cat) => save.cosmetics[bubbleKey(cat)] || (cat === 'rainbow' ? 'beam' : 'classic');
  BB.Cosmetics = { LIST, COLORS, bubble, icon, trail, flower, ribbon, beamHead, bubbleKey, bubbleFor };
})(window.BB);
