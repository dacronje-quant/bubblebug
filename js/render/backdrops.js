// ════════════════════════════════════════════════════════════════
//  BACKDROPS — deep, layered parallax painted procedurally per biome.
//  Everything is drawn from a tiny kitten's point of view: flowers are
//  trees, mushrooms are towers, and the sky is enormous.
//
//  Each zone has a live sky (gradient + sun / moon / stars / rays) and
//  three pre-painted, horizontally-repeating layers (far, mid, near)
//  that scroll at different speeds. Rooms in different zones crossfade.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const TAU = Math.PI * 2;
  const LW = 1200, LH = 720;
  const FACTORS = [0.08, 0.22, 0.45];
  const cache = new Map(); // zone → [far, mid, near]

  function layerCanvas() { return G.offscreen(LW, LH, 1); }

  // Repeating-safe drawing: draw a shape at x and x±LW so edges wrap
  function wrap(fn, x) { fn(x); if (x < 200) fn(x + LW); if (x > LW - 200) fn(x - LW); }

  // ──── painters ────
  const PAINT = {
    gardens(Z, L, rnd) {
      // far: soft clouds + rolling hills
      let c = L[0].ctx;
      for (let i = 0; i < 7; i++) {
        const x = rnd() * LW, y = 60 + rnd() * 160, s = 0.6 + rnd() * 0.9;
        wrap(xx => cloud(c, xx, y, s, 'rgba(255,255,255,0.85)'), x);
      }
      hills(c, LH - 250, 70, BB.mix(Z.far, Z.sky[1], 0.35), rnd, 3);
      hills(c, LH - 200, 60, Z.far, rnd, 4);
      // mid: giant flowers & round trees
      c = L[1].ctx;
      for (let i = 0; i < 6; i++) {
        const x = rnd() * LW, h = 220 + rnd() * 200;
        wrap(xx => giantFlower(c, xx, LH - 120, h, ['#ffb3d1', '#ffe28a', '#ffffff', '#d8b8ff'][i % 4], BB.mix(Z.mid, Z.sky[1], 0.25)), x);
      }
      hills(c, LH - 140, 40, Z.mid, rnd, 5);
      // near: tall grass blades & clover
      c = L[2].ctx;
      grassBlades(c, Z.near, rnd, 26, 260);
      for (let i = 0; i < 4; i++) { const x = rnd() * LW; wrap(xx => clover(c, xx, LH - 40 - rnd() * 60, 40 + rnd() * 30, Z.near), x); }
    },
    meadow(Z, L, rnd) {
      let c = L[0].ctx;
      for (let i = 0; i < 6; i++) {
        const x = rnd() * LW, h = 300 + rnd() * 220;
        wrap(xx => giantMushroom(c, xx, LH - 80, h, 90 + rnd() * 70, BB.mix(Z.far, Z.sky[0], 0.2), '#8f7fe0', 0.35), x);
      }
      c = L[1].ctx;
      for (let i = 0; i < 7; i++) {
        const x = rnd() * LW, h = 160 + rnd() * 170;
        wrap(xx => giantMushroom(c, xx, LH - 60, h, 60 + rnd() * 50, Z.mid, Z.accent, 0.7), x);
      }
      hills(c, LH - 90, 30, Z.mid, rnd, 5);
      c = L[2].ctx;
      ferns(c, Z.near, rnd);
    },
    caves(Z, L, rnd) {
      let c = L[0].ctx;
      for (let i = 0; i < 9; i++) {
        const x = rnd() * LW, h = 200 + rnd() * 380, w = 30 + rnd() * 50;
        wrap(xx => crystalPillar(c, xx, LH, w, h, BB.mix(Z.far, '#6a7cff', 0.2), 0.25), x);
      }
      c = L[1].ctx;
      stalactites(c, Z.mid, rnd, true);
      stalactites(c, Z.mid, rnd, false);
      c = L[2].ctx;
      for (let i = 0; i < 6; i++) {
        const x = rnd() * LW, h = 80 + rnd() * 140, w = 24 + rnd() * 30;
        wrap(xx => crystalPillar(c, xx, LH, w, h, Z.near, 0.6), x);
      }
    },
    hive(Z, L, rnd) {
      let c = L[0].ctx;
      honeycomb(c, 46, BB.rgba(Z.far, 0.9), BB.rgba(Z.sky[2], 0.5), rnd);
      c = L[1].ctx;
      for (let i = 0; i < 8; i++) {
        const x = rnd() * LW, len = 120 + rnd() * 260;
        wrap(xx => honeyCurtain(c, xx, len, 40 + rnd() * 50, Z.mid, rnd), x);
      }
      c = L[2].ctx;
      for (let i = 0; i < 5; i++) {
        const x = rnd() * LW;
        wrap(xx => combChunk(c, xx, LH - 20, 60 + rnd() * 70, Z.near), x);
      }
    },
    ruins(Z, L, rnd) {
      let c = L[0].ctx;
      for (let i = 0; i < 5; i++) { const x = rnd() * LW; wrap(xx => ruinTower(c, xx, LH - 120, 60 + rnd() * 40, 250 + rnd() * 200, Z.far), x); }
      hills(c, LH - 150, 40, Z.far, rnd, 3);
      c = L[1].ctx;
      for (let i = 0; i < 4; i++) { const x = rnd() * LW; wrap(xx => arch(c, xx, LH - 60, 170 + rnd() * 80, 200 + rnd() * 120, Z.mid), x); }
      c = L[2].ctx;
      grassBlades(c, Z.near, rnd, 14, 140);
      for (let i = 0; i < 6; i++) { const x = rnd() * LW; wrap(xx => ivy(c, xx, 0, 120 + rnd() * 200, Z.near, rnd), x); }
    },
    clouds(Z, L, rnd) {
      let c = L[0].ctx;
      for (let i = 0; i < 3; i++) { const x = 150 + i * 400 + rnd() * 100; wrap(xx => castle(c, xx, LH - 250, 0.8 + rnd() * 0.5, Z.far), x); }
      for (let i = 0; i < 6; i++) { const x = rnd() * LW; wrap(xx => cloud(c, xx, LH - 250 + rnd() * 40, 1.6 + rnd(), 'rgba(255,255,255,0.8)'), x); }
      c = L[1].ctx;
      for (let i = 0; i < 9; i++) { const x = rnd() * LW; wrap(xx => cloud(c, xx, LH - 120 - rnd() * 140, 1.4 + rnd() * 1.4, Z.mid), x); }
      c = L[2].ctx;
      for (let i = 0; i < 8; i++) { const x = rnd() * LW; wrap(xx => cloud(c, xx, LH - 20 - rnd() * 40, 1.2 + rnd() * 1.2, '#ffffff'), x); }
    },
  };

  // ──── shape helpers ────
  function cloud(c, x, y, s, col) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, 26 * s, 0, TAU); c.arc(x + 30 * s, y - 12 * s, 30 * s, 0, TAU);
    c.arc(x + 62 * s, y, 24 * s, 0, TAU); c.arc(x + 30 * s, y + 8 * s, 26 * s, 0, TAU);
    c.fill();
  }
  function hills(c, y, amp, col, rnd, n) {
    const ph = rnd() * TAU;
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 10) c.lineTo(x, y + Math.sin(x / LW * TAU * n / 2 + ph) * amp * 0.6 + Math.sin(x / LW * TAU * n + ph * 2) * amp * 0.4);
    c.lineTo(LW, LH); c.closePath(); c.fill();
  }
  function giantFlower(c, x, y, h, petal, stem) {
    c.strokeStyle = stem; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y + 40); c.quadraticCurveTo(x + 30, y - h / 2, x, y - h); c.stroke();
    c.fillStyle = stem;
    c.beginPath(); c.ellipse(x + 22, y - h * 0.4, 30, 11, -0.5, 0, TAU); c.fill();
    c.fillStyle = BB.mix(petal, stem, 0.35);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * 26, y - h + Math.sin(a) * 26, 22, 13, a, 0, TAU); c.fill(); }
    c.fillStyle = BB.mix('#ffd34d', stem, 0.35); G.circle(x, y - h, 16, c); c.fill();
  }
  function grassBlades(c, col, rnd, n, maxH) {
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = rnd() * LW, h = maxH * (0.4 + rnd() * 0.6), lean = (rnd() - 0.5) * 60, w = 10 + rnd() * 12;
      wrap(xx => {
        c.beginPath(); c.moveTo(xx - w / 2, LH); c.quadraticCurveTo(xx + lean * 0.3, LH - h * 0.6, xx + lean, LH - h);
        c.quadraticCurveTo(xx + lean * 0.3 + w * 0.2, LH - h * 0.5, xx + w / 2, LH); c.fill();
      }, x);
    }
  }
  function clover(c, x, y, s, col) {
    c.fillStyle = col;
    c.fillRect(x - 3, y, 6, LH - y);
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 1.1; G.heart(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45, s * 0.5, c); c.fill(); }
  }
  function giantMushroom(c, x, y, h, capW, col, spot, glowA) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x - capW * 0.15, y + 80); c.quadraticCurveTo(x - capW * 0.1, y - h / 2, x - capW * 0.08, y - h);
    c.lineTo(x + capW * 0.08, y - h); c.quadraticCurveTo(x + capW * 0.1, y - h / 2, x + capW * 0.15, y + 80); c.fill();
    c.beginPath(); c.ellipse(x, y - h, capW, capW * 0.55, 0, Math.PI, 0); c.closePath(); c.fill();
    for (let i = 0; i < 6; i++) {
      const sx = x + (i / 5 - 0.5) * capW * 1.4, sy = y - h - capW * 0.18 - Math.cos((i / 5 - 0.5) * 2) * capW * 0.18;
      G.drawGlow(sx, sy, 14, spot, glowA, c);
      c.fillStyle = BB.rgba(spot, glowA); G.circle(sx, sy, 4, c); c.fill();
    }
  }
  function ferns(c, col, rnd) {
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const x = rnd() * LW, h = 120 + rnd() * 160, lean = (rnd() - 0.5) * 1.2;
      wrap(xx => {
        c.beginPath(); c.moveTo(xx, LH);
        const tx = xx + lean * h, ty = LH - h;
        c.quadraticCurveTo(xx + lean * h * 0.2, LH - h * 0.6, tx, ty); c.stroke();
        for (let k = 0.2; k < 1; k += 0.1) {
          const px = xx + (tx - xx) * k * k, py = LH - h * k;
          for (const d of [-1, 1]) { c.beginPath(); c.ellipse(px + d * 14 * (1 - k), py, 14 * (1 - k) + 3, 4, d * 0.4, 0, TAU); c.fill(); }
        }
      }, x);
    }
  }
  function crystalPillar(c, x, y, w, h, col, glowA) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h + w * 0.6); c.lineTo(x, y - h); c.lineTo(x + w / 2, y - h + w * 0.6); c.lineTo(x + w / 2, y); c.closePath(); c.fill();
    c.fillStyle = `rgba(190,230,255,${glowA * 0.5})`;
    c.beginPath(); c.moveTo(x - w * 0.15, y); c.lineTo(x - w * 0.15, y - h + w * 0.7); c.lineTo(x, y - h + w * 0.2); c.lineTo(x, y); c.closePath(); c.fill();
    G.drawGlow(x, y - h + w * 0.4, w * 1.2, '#9fd8ff', glowA * 0.6, c);
  }
  function stalactites(c, col, rnd, top) {
    c.fillStyle = col;
    for (let i = 0; i < 16; i++) {
      const x = rnd() * LW, w = 20 + rnd() * 40, h = 60 + rnd() * 170;
      wrap(xx => {
        c.beginPath();
        if (top) { c.moveTo(xx - w / 2, 0); c.lineTo(xx, h); c.lineTo(xx + w / 2, 0); }
        else { c.moveTo(xx - w / 2, LH); c.lineTo(xx, LH - h * 0.8); c.lineTo(xx + w / 2, LH); }
        c.closePath(); c.fill();
      }, x);
    }
  }
  function honeycomb(c, s, line, fill, rnd) {
    c.strokeStyle = line; c.lineWidth = 5;
    for (let row = 0; row < LH / (s * 1.5) + 1; row++) {
      for (let col = 0; col < LW / (s * 1.73) + 1; col++) {
        const cx = col * s * 1.732 + (row % 2 ? s * 0.866 : 0), cy = row * s * 1.5;
        c.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; c.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); }
        c.closePath();
        if (rnd() < 0.3) { c.fillStyle = fill; c.fill(); }
        c.stroke();
      }
    }
  }
  function honeyCurtain(c, x, len, w, col, rnd) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x - w / 2, 0);
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const dx = x - w / 2 + (w / n) * i;
      const dl = len * (0.5 + 0.5 * Math.sin(i * 2.3 + x));
      c.lineTo(dx - 4, dl - 10); c.quadraticCurveTo(dx, dl + 12, dx + 4, dl - 10);
    }
    c.lineTo(x + w / 2, 0); c.closePath(); c.fill();
  }
  function combChunk(c, x, y, s, col) {
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const cx = x + (i % 3 - 1) * s * 0.9, cy = y - Math.floor(i / 3) * s * 0.8;
      c.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; c.lineTo(cx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5); }
      c.closePath(); c.fill();
    }
  }
  function ruinTower(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(x - w / 2, y - h, w, h + 150);
    for (let i = 0; i < 3; i++) c.fillRect(x - w / 2 + i * w / 2.5, y - h - 14, w / 5, 16);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); c.ellipse(x, y - h * 0.6, w * 0.15, w * 0.25, 0, 0, TAU); c.fill();
  }
  function arch(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(x - w / 2, y - h, w * 0.18, h + 80);
    c.fillRect(x + w / 2 - w * 0.18, y - h * 0.7, w * 0.18, h * 0.7 + 80);
    c.beginPath(); c.arc(x, y - h + w * 0.15, w / 2, Math.PI, Math.PI * 1.55); c.lineWidth = w * 0.16; c.strokeStyle = col; c.stroke();
  }
  function ivy(c, x, y, len, col, rnd) {
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < len; k += 8) c.lineTo(x + Math.sin(k * 0.05) * 10, y + k);
    c.stroke();
    for (let k = 10; k < len; k += 18) { G.heart(x + Math.sin(k * 0.05) * 10 + (k % 36 ? 8 : -8), y + k, 8, c); c.fill(); }
  }
  function castle(c, x, y, s, col) {
    c.fillStyle = col;
    const tw = 34 * s;
    for (const [dx, h] of [[-70, 150], [0, 230], [70, 170], [-35, 110], [35, 120]]) {
      const tx = x + dx * s, th = h * s;
      c.fillRect(tx - tw / 2, y - th, tw, th + 300);
      c.beginPath(); c.moveTo(tx - tw / 2 - 5, y - th); c.lineTo(tx, y - th - 50 * s); c.lineTo(tx + tw / 2 + 5, y - th); c.fill();
      c.fillRect(tx - 1, y - th - 75 * s, 2, 25 * s);
      c.beginPath(); c.moveTo(tx + 1, y - th - 75 * s); c.lineTo(tx + 18 * s, y - th - 68 * s); c.lineTo(tx + 1, y - th - 61 * s); c.fill();
    }
  }

  function layersFor(zone) {
    let L = cache.get(zone);
    if (!L) {
      const Z = BB.ZONES[zone];
      L = [layerCanvas(), layerCanvas(), layerCanvas()];
      PAINT[Z.key](Z, L, BB.rng(1234 + zone * 77));
      cache.set(zone, L);
      if (cache.size > 3) cache.delete(cache.keys().next().value);
    }
    return L;
  }

  // ──── Live sky ────
  function drawSky(c, zone, cam, t) {
    const Z = BB.ZONES[zone];
    const g = c.createLinearGradient(0, 0, 0, G.H);
    g.addColorStop(0, Z.sky[0]); g.addColorStop(0.6, Z.sky[1]); g.addColorStop(1, Z.sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, G.W, G.H);
    const px = -cam.x * 0.02;
    if (Z.key === 'gardens' || Z.key === 'clouds') {
      const sx = 760 + (px % 60), sy = 90;
      G.drawGlow(sx, sy, 220, '#fff4c2', 0.7, c);
      c.fillStyle = '#fffbe6'; G.circle(sx, sy, 34, c); c.fill();
      c.save(); c.globalAlpha = 0.12; c.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) {
        const a = -0.3 + i * 0.35 + Math.sin(t * 0.004 + i) * 0.03;
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a + 1.6) * 900, sy + Math.sin(a + 1.6) * 900); c.lineTo(sx + Math.cos(a + 1.72) * 900, sy + Math.sin(a + 1.72) * 900); c.fill();
      }
      c.restore();
    } else if (Z.key === 'meadow') {
      for (let i = 0; i < 60; i++) {
        const x = (BB.hash(i, 1, 1) * G.W + px * (i % 3)) % G.W, y = BB.hash(i, 2, 1) * G.H * 0.6;
        c.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t * 0.03 + i))})`;
        G.twinkle(x < 0 ? x + G.W : x, y, 1.5 + BB.hash(i, 3, 1) * 2, c); c.fill();
      }
      G.drawGlow(180, 100, 120, '#e6ddff', 0.5, c);
      c.fillStyle = '#f6f0ff'; G.circle(180, 100, 30, c); c.fill();
      c.fillStyle = Z.sky[0]; G.circle(193, 92, 26, c); c.fill();
    } else if (Z.key === 'caves') {
      for (let i = 0; i < 40; i++) {
        const x = ((BB.hash(i, 5, 2) * G.W + px * 3) % G.W + G.W) % G.W, y = BB.hash(i, 6, 2) * G.H;
        c.fillStyle = `rgba(160,210,255,${0.15 + 0.3 * Math.abs(Math.sin(t * 0.02 + i))})`;
        G.circle(x, y, 1.2, c); c.fill();
      }
    } else if (Z.key === 'hive') {
      G.drawGlow(G.W / 2, G.H * 0.3, 500, '#ffe39a', 0.35, c);
    } else if (Z.key === 'ruins') {
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 5; i++) { cloud(c, ((i * 260 + px * 4 + t * 0.1) % (G.W + 300)) - 150, 50 + i * 18, 2.2, 'rgba(220,230,240,0.18)'); }
    }
  }

  function drawLayers(c, zone, cam, roomBottom, alpha) {
    const L = layersFor(zone);
    c.globalAlpha = alpha;
    for (let i = 0; i < 3; i++) {
      const f = FACTORS[i];
      const ox = -((cam.x * f) % LW + LW) % LW;
      // camera above the room's floor → layers sink, revealing more sky
      const lift = BB.clamp((roomBottom - (cam.y + G.H)) * f * 0.6, 0, LH - G.H + 160);
      const oy = G.H - LH + lift + (i === 2 ? 40 : i === 1 ? 20 : 0);
      for (let x = ox; x < G.W; x += LW) c.drawImage(L[i].canvas, x, oy, LW, LH);
    }
    c.globalAlpha = 1;
  }

  // Full backdrop, crossfading between two zones during a room slide
  function draw(c, cam, zoneA, zoneB, mixT, roomBottom, t) {
    drawSky(c, zoneA, cam, t);
    drawLayers(c, zoneA, cam, roomBottom, 1);
    if (zoneB != null && zoneB !== zoneA && mixT > 0) {
      c.globalAlpha = mixT;
      drawSky(c, zoneB, cam, t);
      c.globalAlpha = 1;
      drawLayers(c, zoneB, cam, roomBottom, mixT);
    }
  }

  BB.Backdrops = { draw, drawSky, layersFor, cloud, clear: () => cache.clear() };
})(window.BB);
