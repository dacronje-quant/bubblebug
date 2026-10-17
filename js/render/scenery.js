// ════════════════════════════════════════════════════════════════
//  SCENERY — a little extra life and depth around the play area.
//
//  Back: tiny animals going about their day far behind the terrain:
//  birds and butterflies over the gardens, bats in the caverns, bees
//  round the hive, fish in the lagoon, fireflies at the springs and
//  shooting stars in the night sky. They never touch the game.
//
//  Front: soft, out-of-focus grass, leaves, crystals or coral drifting
//  past along the bottom edge of the screen, faster than the kitten
//  (closer to the "camera"), so each room feels deep. Only along the
//  very bottom and with gaps, so it never hides anything that matters.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const TAU = Math.PI * 2;
  // its own random stream, so decoration never shifts the gameplay's randomness
  const rand = BB.rng(0x5ce7e);

  // ──── Back: background animals (screen space, like the ambient drift) ────
  const LIFE = {
    gardens: ['butterfly', 'butterfly', 'bird'], meadow: ['butterfly', 'butterfly', 'bird'],
    caves: ['bat'], hive: ['bee', 'bee', 'butterfly'], ruins: ['bird'], clouds: ['bird', 'bird'],
    lagoon: ['fish', 'fish', 'gull'], dunes: ['bird'], frost: ['bird'], autumn: ['bird', 'butterfly'],
    springs: ['firefly', 'firefly', 'firefly'], starlight: ['shoot'],
  };
  const COLS = ['#ff9ec8', '#ffd66b', '#9fd8ff', '#c8a8ff', '#ffb38a'];
  const life = [];
  let lifeZone = null, spawnT = 0;

  function spawn(kind) {
    const W = G.W, H = G.H, dir = rand() < 0.5 ? 1 : -1;
    const a = { kind, dir, t: 0, ph: rand() * TAU, depth: 0.15 + rand() * 0.3, col: COLS[(rand() * COLS.length) | 0] };
    a.x = dir > 0 ? -30 : W + 30;
    a.s = 0.6 + a.depth;
    if (kind === 'fish') { a.y = H * (0.6 + rand() * 0.3); a.v = 0.4 + rand() * 0.4; a.col = ['#ffb35c', '#ff8fb8', '#8fe0ff'][(rand() * 3) | 0]; }
    else if (kind === 'firefly') { a.x = rand() * W; a.y = H * (0.3 + rand() * 0.6); a.v = 0.15; a.life = 400 + rand() * 300; }
    else if (kind === 'shoot') { a.x = W * (0.2 + rand() * 0.8); a.y = H * rand() * 0.3; a.v = 7; a.dir = -1; a.life = 50; }
    else if (kind === 'bat') { a.y = H * (0.15 + rand() * 0.5); a.v = 0.9 + rand() * 0.6; }
    else if (kind === 'bee') { a.y = H * (0.2 + rand() * 0.6); a.v = 0.6 + rand() * 0.5; }
    else if (kind === 'butterfly') { a.y = H * (0.25 + rand() * 0.5); a.v = 0.4 + rand() * 0.3; }
    else { a.y = H * (0.08 + rand() * 0.3); a.v = 0.8 + rand() * 0.6; } // birds & gulls
    // birds fly in a little flock now and then
    if ((kind === 'bird' || kind === 'gull') && rand() < 0.4) {
      for (let i = 1; i <= 2; i++) life.push(Object.assign({}, a, { x: a.x - dir * i * 26, y: a.y + i * 12, ph: a.ph + i }));
    }
    life.push(a);
  }

  function updateBack(zoneKey, cam, lastCam, still) {
    const kinds = LIFE[zoneKey];
    if (zoneKey !== lifeZone) { life.length = 0; lifeZone = zoneKey; spawnT = 60; }
    if (!kinds || still) return;
    const dx = cam.x - lastCam.x, dy = cam.y - lastCam.y;
    const cap = zoneKey === 'springs' ? 9 : 5;
    if (--spawnT <= 0 && life.length < cap) { spawn(kinds[(rand() * kinds.length) | 0]); spawnT = 200 + rand() * 300; }
    for (let i = life.length - 1; i >= 0; i--) {
      const a = life[i];
      a.t++; a.ph += 0.1;
      a.x += a.dir * a.v - dx * a.depth; a.y -= dy * a.depth;
      if (a.kind === 'butterfly') a.y += Math.sin(a.ph * 0.4) * 0.6;
      else if (a.kind === 'bee') a.y += Math.sin(a.ph * 0.9) * 0.8;
      else if (a.kind === 'bat') a.y += Math.sin(a.ph * 0.5) * 0.9;
      else if (a.kind === 'fish') a.y += Math.sin(a.ph * 0.2) * 0.2;
      else if (a.kind === 'firefly') { a.x += Math.sin(a.ph * 0.15) * 0.4 - a.dir * a.v; a.y += Math.cos(a.ph * 0.11) * 0.3; }
      else if (a.kind === 'shoot') a.y += 3;
      const gone = a.life != null ? a.t > a.life : (a.x < -80 || a.x > G.W + 80);
      if (gone || a.y < -100 || a.y > G.H + 100) life.splice(i, 1);
    }
  }

  function drawBack(c) {
    for (const a of life) {
      const { x, y, s } = a;
      if (a.kind === 'firefly') {
        const k = Math.max(0, Math.min(1, a.t / 40, (a.life - a.t) / 40)) * (0.6 + 0.4 * Math.sin(a.ph * 0.6));
        G.drawGlow(x, y, 14, '#fff38a', 0.8 * k, c);
        c.fillStyle = `rgba(255,255,220,${k})`; G.circle(x, y, 1.6, c); c.fill();
        continue;
      }
      if (a.kind === 'shoot') {
        const k = Math.max(0, Math.min(1, (a.life - a.t) / 20));
        const g = c.createLinearGradient(x, y, x + 60, y - 26);
        g.addColorStop(0, `rgba(255,250,220,${0.9 * k})`); g.addColorStop(1, 'rgba(255,250,220,0)');
        c.strokeStyle = g; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y - 26); c.stroke();
        c.fillStyle = `rgba(255,255,255,${k})`; G.twinkle(x, y, 4, c); c.fill();
        continue;
      }
      c.save();
      c.globalAlpha = 0.75;
      c.translate(x, y); c.scale(a.dir * s, s);
      const flap = Math.sin(a.ph * 2.2);
      switch (a.kind) {
        case 'bird': case 'gull': {
          c.strokeStyle = a.kind === 'gull' ? 'rgba(255,255,255,0.95)' : 'rgba(70,60,100,0.6)';
          c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(-8, -flap * 4); c.quadraticCurveTo(-4, -3 - flap * 2, 0, 0); c.quadraticCurveTo(4, -3 - flap * 2, 8, -flap * 4); c.stroke();
          break;
        }
        case 'butterfly': {
          const w = 0.35 + Math.abs(flap) * 0.65;
          c.fillStyle = a.col;
          for (const d of [-1, 1]) { G.ellipse(d * 4 * w, -2, 4.5 * w, 3.5, d * 0.4, c); c.fill(); G.ellipse(d * 3 * w, 2.5, 3 * w, 2.5, -d * 0.3, c); c.fill(); }
          c.fillStyle = '#5a4060'; c.fillRect(-0.6, -3, 1.2, 7);
          break;
        }
        case 'bat': {
          c.fillStyle = 'rgba(70,50,110,0.85)';
          c.beginPath(); c.moveTo(0, 0);
          c.quadraticCurveTo(-6, -5 - flap * 4, -12, -flap * 5); c.quadraticCurveTo(-8, 1, -4, 2);
          c.lineTo(4, 2); c.quadraticCurveTo(8, 1, 12, -flap * 5); c.quadraticCurveTo(6, -5 - flap * 4, 0, 0); c.fill();
          G.circle(0, 0, 3.2, c); c.fill();
          break;
        }
        case 'bee': {
          c.fillStyle = 'rgba(255,255,255,0.7)';
          G.ellipse(-1, -4, 3, 4 * (0.4 + Math.abs(flap) * 0.6), -0.4, c); c.fill();
          c.fillStyle = '#ffd04a'; G.ellipse(0, 0, 5, 3.6, 0, c); c.fill();
          c.fillStyle = '#5a3a1a'; c.fillRect(-1.5, -3.4, 1.6, 6.8); c.fillRect(1.6, -3, 1.4, 6);
          break;
        }
        case 'fish': {
          c.fillStyle = BB.rgba(a.col, 0.7);
          G.ellipse(0, 0, 9, 4.5, 0, c); c.fill();
          c.beginPath(); c.moveTo(-7, 0); c.lineTo(-14, -5 + flap * 1.5); c.lineTo(-14, 5 + flap * 1.5); c.closePath(); c.fill();
          c.fillStyle = 'rgba(30,30,60,0.7)'; G.circle(5, -1, 1.1, c); c.fill();
          if (a.t % 90 < 30) { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8; G.circle(12, -5 - (a.t % 90) * 0.3, 1.6, c); c.stroke(); }
          break;
        }
      }
      c.restore();
    }
  }

  // ──── Front: a soft, out-of-focus strip along the bottom ────
  const FW = 1800, FH = 150;
  const FRONT = {
    gardens: { parts: ['blades', 'leaf', 'flower'], col: '#2f6a3a', col2: '#4f8f4a', accent: '#ff9ec8' },
    meadow: { parts: ['blades', 'mushroom', 'leaf'], col: '#3a5a3a', col2: '#5a7a4a', accent: '#ff8a8a' },
    caves: { parts: ['shard', 'shard', 'blades'], col: '#1c1a40', col2: '#2c2a60', accent: '#6a8aff' },
    hive: { parts: ['comb', 'blades'], col: '#6a4214', col2: '#8a5a1a', accent: '#ffd04a' },
    ruins: { parts: ['blades', 'leaf', 'stone'], col: '#2f4a46', col2: '#4a6660', accent: '#9fd0c8' },
    clouds: { parts: ['puff'], col: '#ffffff', col2: '#efe8ff', accent: '#ffffff' },
    lagoon: { parts: ['kelp', 'coral', 'kelp'], col: '#1f6a6a', col2: '#2f8a80', accent: '#ff8fa8' },
    dunes: { parts: ['blades', 'stone'], col: '#8a5a2a', col2: '#a8743a', accent: '#ffd08a' },
    frost: { parts: ['snow', 'pine'], col: '#e8f4ff', col2: '#3a5a7a', accent: '#ffffff' },
    autumn: { parts: ['leaf', 'blades', 'leaf'], col: '#7a3a1a', col2: '#a85a2a', accent: '#ffb060' },
    springs: { parts: ['bamboo', 'blades'], col: '#1f3a3a', col2: '#2f5048', accent: '#ff9a70' },
    starlight: { parts: ['shard', 'blades'], col: '#2a1f50', col2: '#3a2f70', accent: '#ffe27a' },
  };
  const frontCache = new Map();

  function paintPart(c, part, x, R, rnd) {
    const base = FH;
    const col = rnd() < 0.5 ? R.col : R.col2;
    c.fillStyle = col; c.strokeStyle = col;
    switch (part) {
      case 'blades':
        for (let i = 0; i < 12; i++) {
          const bx = x + rnd() * 140, h = 40 + rnd() * 70, lean = (rnd() - 0.5) * 50;
          c.beginPath(); c.moveTo(bx - 6, base); c.quadraticCurveTo(bx + lean * 0.4, base - h * 0.6, bx + lean, base - h); c.quadraticCurveTo(bx + lean * 0.3 + 4, base - h * 0.5, bx + 6, base); c.fill();
        }
        break;
      case 'leaf': {
        const lx = x + 40 + rnd() * 60, h = 70 + rnd() * 40, rot = (rnd() - 0.5) * 0.8;
        c.save(); c.translate(lx, base); c.rotate(rot);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-36, -h * 0.6, 0, -h); c.quadraticCurveTo(36, -h * 0.6, 0, 0); c.fill();
        c.restore();
        break;
      }
      case 'flower': {
        const fx = x + 50 + rnd() * 60, h = 60 + rnd() * 40;
        c.lineWidth = 6; c.beginPath(); c.moveTo(fx, base); c.quadraticCurveTo(fx + 10, base - h / 2, fx, base - h); c.stroke();
        c.fillStyle = R.accent;
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; G.circle(fx + Math.cos(a) * 14, base - h + Math.sin(a) * 14, 11, c); c.fill(); }
        c.fillStyle = '#ffe27a'; G.circle(fx, base - h, 8, c); c.fill();
        break;
      }
      case 'mushroom': {
        const mx = x + 50 + rnd() * 60, h = 50 + rnd() * 40;
        c.fillRect(mx - 8, base - h, 16, h);
        c.fillStyle = R.accent; G.ellipse(mx, base - h, 40, 24, 0, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.8)'; G.circle(mx - 12, base - h - 8, 6, c); c.fill(); G.circle(mx + 14, base - h - 4, 4, c); c.fill();
        break;
      }
      case 'shard':
        for (let i = 0; i < 4; i++) {
          const sx = x + rnd() * 130, h = 50 + rnd() * 80, w = 14 + rnd() * 16, lean = (rnd() - 0.5) * 24;
          c.fillStyle = i === 0 ? R.accent : col;
          c.globalAlpha = i === 0 ? 0.5 : 1;
          c.beginPath(); c.moveTo(sx - w / 2, base); c.lineTo(sx - w / 2 + lean * 0.6, base - h * 0.75); c.lineTo(sx + lean, base - h); c.lineTo(sx + w / 2 + lean * 0.6, base - h * 0.75); c.lineTo(sx + w / 2, base); c.fill();
          c.globalAlpha = 1;
        }
        break;
      case 'comb':
        for (let i = 0; i < 5; i++) {
          const hx = x + 20 + (i % 3) * 34 + (i > 2 ? 17 : 0), hy = base - 20 - (i > 2 ? 30 : 0) - rnd() * 6;
          c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.lineTo(hx + Math.cos(a) * 18, hy + Math.sin(a) * 18); } c.closePath(); c.fill();
        }
        c.fillStyle = R.accent; G.ellipse(x + 60, base - 70, 8, 12, 0, c); c.fill();
        break;
      case 'stone':
        G.ellipse(x + 60 + rnd() * 30, base, 50 + rnd() * 20, 26 + rnd() * 14, 0, c); c.fill();
        break;
      case 'puff':
        for (let i = 0; i < 5; i++) { G.circle(x + 20 + i * 26, base - 4 - rnd() * 18, 26 + rnd() * 16, c); c.fill(); }
        break;
      case 'kelp':
        c.lineWidth = 10; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const kx = x + 20 + rnd() * 110, h = 80 + rnd() * 60;
          c.beginPath(); c.moveTo(kx, base);
          for (let k = 1; k <= 6; k++) c.lineTo(kx + Math.sin(k * 1.3 + i) * 10, base - h * k / 6);
          c.stroke();
        }
        break;
      case 'coral':
        c.fillStyle = R.accent; c.strokeStyle = R.accent; c.lineWidth = 9; c.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const cx = x + 60 + (rnd() - 0.5) * 40, a = -Math.PI / 2 + (rnd() - 0.5) * 1.4, l = 30 + rnd() * 40;
          c.beginPath(); c.moveTo(cx, base); c.lineTo(cx + Math.cos(a) * l, base + Math.sin(a) * l); c.stroke();
          G.circle(cx + Math.cos(a) * l, base + Math.sin(a) * l, 7, c); c.fill();
        }
        break;
      case 'snow':
        c.fillStyle = R.col;
        for (let i = 0; i < 4; i++) { G.ellipse(x + 20 + i * 36, base, 34 + rnd() * 14, 18 + rnd() * 16, 0, c); c.fill(); }
        break;
      case 'pine': {
        const px = x + 60 + rnd() * 40, h = 90 + rnd() * 40;
        c.fillStyle = R.col2;
        for (let k = 0; k < 3; k++) { const w = 46 - k * 12, y0 = base - k * h / 3.4; c.beginPath(); c.moveTo(px - w, y0); c.lineTo(px, y0 - h / 2.2); c.lineTo(px + w, y0); c.fill(); }
        c.fillStyle = R.col;
        for (let k = 0; k < 3; k++) { const w = 30 - k * 8, y0 = base - k * h / 3.4 - h / 3.6; G.ellipse(px, y0, w * 0.6, 5, 0, c); c.fill(); }
        break;
      }
      case 'bamboo':
        for (let i = 0; i < 3; i++) {
          const bx = x + 20 + rnd() * 120;
          c.fillRect(bx - 6, base - 140, 12, 140);
          c.fillStyle = R.col2;
          for (let k = 1; k < 5; k++) c.fillRect(bx - 7, base - k * 34, 14, 3);
          c.fillStyle = col;
          c.save(); c.translate(bx, base - 90 - rnd() * 30); c.rotate(-0.6 + rnd() * 1.2);
          c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(22, -8, 50, 0); c.quadraticCurveTo(22, 6, 0, 0); c.fill();
          c.restore();
        }
        break;
    }
  }

  function frontFor(zoneKey) {
    if (frontCache.has(zoneKey)) return frontCache.get(zoneKey);
    const R = FRONT[zoneKey];
    let img = null;
    if (R) {
      const off = G.offscreen(FW, FH, 0.75);
      const c = off.ctx;
      // a soft focus (where the browser supports canvas filters)
      try { c.filter = 'blur(3px)'; } catch (e) { /* older browsers: crisp, but still soft-coloured */ }
      const rnd = BB.rng(zoneKey.length * 977 + 13);
      // clumps with wide gaps between, so most of the screen stays clear
      let x = 60;
      while (x < FW - 220) {
        const part = R.parts[(rnd() * R.parts.length) | 0];
        paintPart(c, part, x, R, rnd);
        if (rnd() < 0.6) paintPart(c, 'blades', x + 40, R, rnd);
        x += 360 + rnd() * 380;
      }
      img = off.canvas;
    }
    frontCache.set(zoneKey, img);
    return img;
  }

  // drawn over everything in the world (but under the HUD)
  function drawFront(c, zoneKey, cam, alpha = 1) {
    const img = frontFor(zoneKey);
    if (!img || alpha <= 0.01) return;
    const k = 1.45; // closer than the kitten: slides by faster
    const ox = -(((cam.x * k) % FW) + FW) % FW;
    // a gentle bob with the camera's height, never more than a few px
    const y = G.H - FH * 0.78 + BB.clamp(-cam.y * 0.02 % 12, -6, 6);
    c.save();
    c.globalAlpha = (zoneKey === 'clouds' ? 0.55 : 0.82) * alpha;
    for (let x = ox; x < G.W; x += FW) c.drawImage(img, x, y, FW, FH);
    c.restore();
  }

  BB.Scenery = { updateBack, drawBack, drawFront, clear: () => { frontCache.clear(); } };
})(window.BB);
