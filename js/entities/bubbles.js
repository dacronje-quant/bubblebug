// ════════════════════════════════════════════════════════════════
//  BUBBLES — iridescent friendship bubbles.
//  They drift forward with a gentle wobble and, because tiny hands
//  aren't precise, softly home in on anything nearby that would love a
//  bubble (gloomy bugs, the Cloud King, sleepy buds, music flowers).
//  Marshmallow's bubbles are lilac-pink with little hearts trailing;
//  Phoebe's are honey-gold and mint with a sprinkle of stars.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const list = [];

  function blow(x, y, dir, vx, cat, style = 'classic') {
    list.push({ x, y, vx: dir * C.BUBBLE_SPEED + vx * 0.35, vy: -0.25, life: C.BUBBLE_LIFE, r: 3, dir, cat, style, t: 0, seed: Math.random() * 10 });
    BB.Audio.sfx.bubble(cat);
    BB.Particles.burst('dot', x, y, 3, { color: '#ffffff', speed: 1, life: 12, size: 2 });
  }

  function pop(b, big) {
    BB.Audio.sfx.pop(big ? 0.8 : 1 + Math.random() * 0.2);
    BB.Particles.ring(b.x, b.y, '#ffffff', b.r + 4);
    BB.Particles.burst('dot', b.x, b.y, 6, { color: '#e8fbff', speed: 2, life: 16, size: 1.8 });
    if (b.style === 'flower') BB.Particles.burst('flower', b.x, b.y, 5, { color: '#ffb3cf', speed: 1.5, life: 32, size: 4 });
    if (b.style === 'rainbow') for (const col of BB.RAINBOW) BB.Particles.burst('spark', b.x, b.y, 1, { color: col, speed: 2.2, life: 28 });
  }

  // targets: [{ x, y, r, homing, hit(bubble) → true if consumed }]
  function update(targets) {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.t++;
      b.r = Math.min(9, b.r + 0.9);
      // homing assist toward the best target ahead
      let best = null, bestD = 300;
      for (const tg of targets) {
        if (!tg.homing) continue;
        const dx = tg.x - b.x, dy = tg.y - b.y;
        if (dx * b.dir < -10 || Math.abs(dy) > 110) continue;
        const d = Math.hypot(dx, dy);
        if (d < bestD) { bestD = d; best = tg; }
      }
      if (best) {
        const dx = best.x - b.x, dy = best.y - b.y, d = Math.max(1, Math.hypot(dx, dy));
        b.vx += (dx / d) * C.BUBBLE_ASSIST; b.vy += (dy / d) * C.BUBBLE_ASSIST;
      } else {
        b.vy -= 0.012; // buoyant
      }
      const sp = Math.hypot(b.vx, b.vy), max = 5;
      if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
      if (Math.abs(b.vx) < 1.6 && !best) b.vx = b.dir * 1.6;
      b.x += b.vx; b.y += b.vy + Math.sin(b.t * 0.25 + b.seed) * 0.35;

      if (b.t % 5 === 0) {
        const m = b.cat === 'marshmallow';
        const heart = b.style === 'heart' || (b.style === 'classic' && m);
        BB.Particles.trail(heart ? 'heart' : 'star', b.x - b.vx * 2, b.y, heart ? '#ffc6e6' : '#ffe27a');
      }

      let gone = false;
      for (const tg of targets) {
        if (Math.hypot(tg.x - b.x, tg.y - b.y) < tg.r + b.r) {
          if (tg.hit(b)) { pop(b, true); gone = true; break; }
        }
      }
      if (!gone) {
        const ch = BB.World.tile(Math.floor(b.x / T), Math.floor(b.y / T));
        if (b.t > 2 && BB.Physics.solidSide(ch)) { pop(b); gone = true; }
      }
      if (!gone && --b.life <= 0) { pop(b); gone = true; }
      if (gone) list.splice(i, 1);
    }
  }

  function draw(c, cam) {
    for (const b of list) {
      const cat = BB.CATS[b.cat];
      const tint = (Math.floor(b.t / 12) % 2) ? cat.bubbleTint : cat.bubbleTint2;
      const fade = Math.min(1, b.life / 12);
      BB.Cosmetics.bubble(c, b.style, b.x - cam.x, b.y - cam.y, b.r * (1 + Math.sin(b.t * 0.3) * 0.05), tint, 0.95 * fade, b.t);
    }
  }

  BB.Bubbles = { list, blow, update, draw, clear: () => { list.length = 0; } };
})(window.BB);
