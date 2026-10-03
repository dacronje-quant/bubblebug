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
  function icon(c, item, x, y, s, t) {
    if (item.slot === 'bubble') bubble(c, item.value, x, y, 14 * s, '#d8b8ff', 1, t);
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
  BB.Cosmetics = { LIST, COLORS, bubble, icon, trail, flower };
})(window.BB);
