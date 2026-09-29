// Pictures at the existing mirror; these choices never change bubble
// targets, speed, radius, collision, powers or movement.
(function (BB) {
  'use strict';
  const LIST = [
    { id: 'bubble-classic', slot: 'bubble', value: 'classic', cost: 0 },
    { id: 'bubble-heart', slot: 'bubble', value: 'heart', cost: 10 },
    { id: 'bubble-star', slot: 'bubble', value: 'star', cost: 10 },
    { id: 'bubble-flower', slot: 'bubble', value: 'flower', cost: 20 },
    { id: 'trail-classic', slot: 'trail', value: 'classic', cost: 0 },
    { id: 'trail-rainbow', slot: 'trail', value: 'rainbow', cost: 30 },
    { id: 'trail-paw', slot: 'trail', value: 'paw', cost: 15 },
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
    c.restore();
  }
  function icon(c, item, x, y, s, t) {
    if (item.slot === 'bubble') bubble(c, item.value, x, y, 14 * s, '#d8b8ff', 1, t);
    else if (item.value === 'paw') BB.Gestures.drawPaw(c, x, y, 1.2 * s, '#ff9ec7', '#b85b86');
    else if (item.value === 'rainbow') {
      c.save(); c.lineWidth = 4 * s; c.lineCap = 'round';
      COLORS.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(x, y + 11 * s, (20 - i * 4) * s, Math.PI, Math.PI * 2); c.stroke(); }); c.restore();
    } else { c.fillStyle = '#ffd84a'; BB.G.twinkle(x, y, 13 * s, c); c.fill(); }
  }
  function trail(save, x, y, t) {
    const style = save.cosmetics.trail;
    if (style === 'rainbow') BB.Particles.trail('dot', x, y, COLORS[Math.floor(t / 6) % COLORS.length]);
    if (style === 'paw') BB.Particles.trail('paw', x, y, '#ff9ec7');
  }
  BB.Cosmetics = { LIST, COLORS, bubble, icon, trail, flower };
})(window.BB);
