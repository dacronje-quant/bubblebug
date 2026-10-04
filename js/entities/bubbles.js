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
  const fading = []; // rainbow beams that landed: the tail catches up to the head
  const blooms = []; // and where they land, a little rainbow blooms
  const BEAM_LEN = 24;

  function blow(x, y, dir, vx, cat, style = 'classic') {
    const b = { x, y, vx: dir * C.BUBBLE_SPEED + vx * 0.35, vy: -0.25, life: C.BUBBLE_LIFE, r: 3, dir, cat, style, t: 0, seed: Math.random() * 10 };
    list.push(b);
    BB.Audio.sfx.bubble(cat);
    if (style === 'beam') {
      // the rainbow streams out from the paw: its path starts right here
      b.hist = [{ x, y }];
      for (const col of BB.RAINBOW) BB.Particles.burst('spark', x, y, 1, { color: col, speed: 1.6, life: 16 });
    } else BB.Particles.burst('dot', x, y, 3, { color: '#ffffff', speed: 1, life: 12, size: 2 });
  }

  function pop(b, big) {
    BB.Audio.sfx.pop(big ? 0.8 : 1 + Math.random() * 0.2);
    if (b.style === 'beam') {
      fading.push(b);
      blooms.push({ x: b.x, y: b.y, t: 0, big });
      BB.RAINBOW.forEach((col, i) => BB.Particles.burst('spark', b.x, b.y, big ? 2 : 1, { color: col, speed: 2.4, life: 30 }));
      return;
    }
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

      if (b.hist) {
        b.hist.unshift({ x: b.x, y: b.y });
        if (b.hist.length > BEAM_LEN) b.hist.pop();
        if (b.t % 4 === 0) BB.Particles.trail('star', b.x - b.vx * 3, b.y + (Math.random() - 0.5) * 8, BB.RAINBOW[(b.t >> 2) % BB.RAINBOW.length]);
      } else if (b.t % 5 === 0) {
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
    for (let i = fading.length - 1; i >= 0; i--) {
      const f = fading[i];
      f.hist.splice(-2, 2);
      if (f.hist.length < 2) fading.splice(i, 1);
    }
    for (let i = blooms.length - 1; i >= 0; i--) if (++blooms[i].t > 30) blooms.splice(i, 1);
  }

  // the beam's path with a gentle wave rolling along it, head first
  function beamPts(b, cam) {
    const n = b.hist.length;
    return b.hist.map((p, i) => {
      const w = Math.sin(b.t * 0.3 - i * 0.45 + b.seed) * 2.6 * (i / BEAM_LEN);
      return { x: p.x - cam.x, y: p.y - cam.y + w };
    });
  }
  function drawBeam(c, b, cam, alpha) {
    const pts = beamPts(b, cam);
    BB.Cosmetics.ribbon(c, pts, 15, alpha);
    // twinkles riding along the ribbon
    for (let i = 0; i < 4; i++) {
      const p = pts[Math.min(pts.length - 1, 2 + i * 4)];
      const a = Math.max(0, Math.sin(b.t * 0.2 + i * 1.7 + b.seed)) * alpha;
      if (a <= 0.05) continue;
      c.save(); c.globalAlpha = a; c.fillStyle = BB.RAINBOW[(i * 2) % 7];
      BB.G.twinkle(p.x + Math.sin(i * 7.3) * 6, p.y + Math.cos(i * 5.1) * 6, 1 + 1.6 * a, c); c.fill(); c.restore();
    }
  }
  function drawBloom(c, f, cam) {
    const k = f.t / 30, e = 1 - Math.pow(1 - k, 3), x = f.x - cam.x, y = f.y - cam.y;
    c.save(); c.lineCap = 'round'; c.globalAlpha = 1 - k; c.lineWidth = f.big ? 2.6 : 2;
    BB.RAINBOW.forEach((col, i) => {
      c.strokeStyle = col; c.beginPath();
      c.arc(x, y + 4, (f.big ? 8 : 5) + e * (f.big ? 22 : 12) + i * 2.4, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    });
    c.restore();
  }

  function draw(c, cam) {
    for (const f of fading) drawBeam(c, f, cam, Math.min(1, f.hist.length / 8));
    for (const f of blooms) drawBloom(c, f, cam);
    for (const b of list) {
      if (b.hist) {
        const fade = Math.min(1, b.life / 12);
        drawBeam(c, b, cam, fade);
        BB.Cosmetics.beamHead(c, b.x - cam.x, b.y - cam.y, 1, b.t, fade);
        continue;
      }
      const cat = BB.CATS[b.cat];
      const tint = (Math.floor(b.t / 12) % 2) ? cat.bubbleTint : cat.bubbleTint2;
      const fade = Math.min(1, b.life / 12);
      BB.Cosmetics.bubble(c, b.style, b.x - cam.x, b.y - cam.y, b.r * (1 + Math.sin(b.t * 0.3) * 0.05), tint, 0.95 * fade, b.t);
    }
  }

  BB.Bubbles = { list, blow, update, draw, clear: () => { list.length = 0; fading.length = 0; blooms.length = 0; } };
})(window.BB);
