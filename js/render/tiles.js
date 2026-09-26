// ════════════════════════════════════════════════════════════════
//  TILES — procedural terrain art.
//
//  Static terrain (ground, ledges) is painted once per room into an
//  offscreen canvas: rounded, auto-tiled shapes with zone-specific
//  surfaces (grass & flowers, glowing moss, crystal clusters, honey
//  glaze, mossy bricks, puffy clouds). Decoration is seeded from world
//  coordinates so a room looks identical on every visit.
//
//  Living terrain — water, updrafts, glow-petals, bud gates, bouncy
//  mushrooms and shy walls — is drawn every frame so it can move.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const T = BB.CFG.TILE;
  const TAU = Math.PI * 2;
  const W = () => BB.World;

  const solidCh = ch => ch === '#' || ch === 'H' || ch === null;
  const isSolid = (tx, ty) => solidCh(W().tile(tx, ty));

  const cache = new Map(); // room.id → { canvas, shy, version, scale }

  // ──── Rounded tile body ────
  function tileShape(c, x, y, m) {
    const r = 10;
    const tl = !m.n && !m.w, tr = !m.n && !m.e, br = !m.s && !m.e, bl = !m.s && !m.w;
    // extend a hair into solid neighbours to avoid hairline seams
    const x0 = x - (m.w ? 0.5 : 0), y0 = y - (m.n ? 0.5 : 0);
    const x1 = x + T + (m.e ? 0.5 : 0), y1 = y + T + (m.s ? 0.5 : 0);
    c.beginPath();
    c.moveTo(x0 + (tl ? r : 0), y0);
    c.lineTo(x1 - (tr ? r : 0), y0);
    if (tr) c.quadraticCurveTo(x1, y0, x1, y0 + r);
    c.lineTo(x1, y1 - (br ? r : 0));
    if (br) c.quadraticCurveTo(x1, y1, x1 - r, y1);
    c.lineTo(x0 + (bl ? r : 0), y1);
    if (bl) c.quadraticCurveTo(x0, y1, x0, y1 - r);
    c.lineTo(x0, y0 + (tl ? r : 0));
    if (tl) c.quadraticCurveTo(x0, y0, x0 + r, y0);
    c.closePath();
  }

  function maskAt(tx, ty) {
    return { n: isSolid(tx, ty - 1), s: isSolid(tx, ty + 1), e: isSolid(tx + 1, ty), w: isSolid(tx - 1, ty) };
  }

  // depth below the nearest exposed top (for darkening deep ground)
  function depthAt(tx, ty) {
    let d = 0;
    while (d < 6 && isSolid(tx, ty - d - 1) && W().tile(tx, ty - d - 1) !== null) d++;
    return d;
  }

  // ──── Zone body painters ────
  function paintBody(c, z, tx, ty, x, y, m) {
    const Z = BB.ZONES[z];
    const d = depthAt(tx, ty);
    const base = BB.mix(Z.ground, Z.groundDark, Math.min(1, d / 5));
    c.fillStyle = base;
    tileShape(c, x, y, m); c.fill();
    c.save(); tileShape(c, x, y, m); c.clip();
    const h = (i) => BB.hash(tx, ty, i);

    if (Z.key === 'hive') {
      // honeycomb cells
      c.strokeStyle = BB.rgba(Z.groundDark, 0.7); c.lineWidth = 1.4;
      const hs = 8;
      for (let row = -1; row < 4; row++) {
        for (let col = -1; col < 3; col++) {
          const cx = x + col * hs * 1.75 + (row % 2 ? hs * 0.87 : 0) + ((tx * 5) % 7);
          const cy = y + row * hs * 1.5 + ((ty * 3) % 5);
          c.beginPath();
          for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; c.lineTo(cx + Math.cos(a) * hs, cy + Math.sin(a) * hs); }
          c.closePath();
          if (BB.hash(tx * 7 + col, ty * 5 + row, 3) < 0.25) { c.fillStyle = BB.rgba(Z.groundLight, 0.8); c.fill(); }
          c.stroke();
        }
      }
    } else if (Z.key === 'ruins') {
      // stone bricks
      c.strokeStyle = BB.rgba(Z.groundDark, 0.8); c.lineWidth = 1.3;
      for (let row = 0; row < 2; row++) {
        const by = y + row * 16;
        c.beginPath(); c.moveTo(x, by + 0.5); c.lineTo(x + T, by + 0.5); c.stroke();
        const off = ((ty * 2 + row) % 2) * 16;
        for (let bx = x - off; bx < x + T; bx += 32) {
          if (bx > x) { c.beginPath(); c.moveTo(bx + 0.5, by); c.lineTo(bx + 0.5, by + 16); c.stroke(); }
          c.fillStyle = BB.rgba(BB.hash(bx, by, 1) < 0.5 ? Z.groundLight : Z.groundDark, 0.25);
          c.fillRect(bx + 2, by + 2, 28, 12);
        }
      }
      if (h(9) < 0.25) { c.fillStyle = BB.rgba(Z.top, 0.55); G.ellipse(x + h(10) * T, y + h(11) * T, 7, 4, 0, c); c.fill(); }
    } else if (Z.key === 'clouds') {
      const g = c.createLinearGradient(0, y, 0, y + T);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, BB.mix('#ffffff', Z.groundDark, 0.35 + Math.min(1, d / 4) * 0.4));
      c.fillStyle = g; c.fillRect(x - 1, y - 1, T + 2, T + 2);
    } else if (Z.key === 'caves') {
      // faceted rock with crystal veins
      for (let i = 0; i < 3; i++) {
        c.fillStyle = BB.rgba(i % 2 ? Z.groundLight : Z.groundDark, 0.35);
        const px = x + h(i) * T, py = y + h(i + 5) * T, s = 5 + h(i + 9) * 6;
        c.beginPath(); c.moveTo(px, py - s); c.lineTo(px + s, py); c.lineTo(px, py + s * 0.7); c.lineTo(px - s * 0.8, py); c.closePath(); c.fill();
      }
      if (h(20) < 0.3) {
        c.strokeStyle = BB.rgba(Z.accent, 0.6); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x + h(21) * T, y); c.lineTo(x + h(22) * T, y + T * 0.5); c.lineTo(x + h(23) * T, y + T); c.stroke();
      }
    } else {
      // soil / loam with pebbles
      for (let i = 0; i < 4; i++) {
        c.fillStyle = BB.rgba(i % 2 ? Z.groundLight : Z.groundDark, 0.55);
        G.ellipse(x + h(i) * T, y + h(i + 4) * T, 1.5 + h(i + 8) * 2.5, 1.2 + h(i + 12) * 1.6, 0, c); c.fill();
      }
      if (Z.key === 'meadow' && h(30) < 0.35) {
        c.fillStyle = BB.rgba(Z.accent, 0.8);
        G.circle(x + h(31) * T, y + h(32) * T, 1.2, c); c.fill();
      }
    }
    // soft inner shading on exposed sides
    if (!m.s) { const g = c.createLinearGradient(0, y + T - 10, 0, y + T); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,30,0.25)'); c.fillStyle = g; c.fillRect(x, y + T - 10, T, 10); }
    if (!m.w) { const g = c.createLinearGradient(x, 0, x + 6, 0); g.addColorStop(0, 'rgba(20,10,30,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x, y, 6, T); }
    if (!m.e) { const g = c.createLinearGradient(x + T - 6, 0, x + T, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,30,0.18)'); c.fillStyle = g; c.fillRect(x + T - 6, y, 6, T); }
    c.restore();
  }

  // ──── Surfaces & decorations ────
  function paintTop(c, z, tx, ty, x, y, m) {
    const Z = BB.ZONES[z];
    const h = i => BB.hash(tx, ty, 100 + i);
    const ext = (m.w ? 0 : -2), ext2 = (m.e ? 0 : 2);
    if (Z.key === 'clouds') {
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { G.circle(x + 5 + i * 11, y + 3 + h(i) * 2, 7 + h(i + 3) * 3, c); c.fill(); }
      c.fillStyle = 'rgba(255,226,122,0.55)';
      for (let i = 0; i < 3; i++) { G.circle(x + 5 + i * 11, y - 3 + h(i) * 2 - h(i + 3) * 3, 1.3, c); c.fill(); }
      c.fillStyle = BB.rgba(Z.accent, 0.5);
      if (h(8) < 0.3) { G.twinkle(x + h(9) * T, y - 3, 3, c); c.fill(); }
      return;
    }
    // base band
    c.fillStyle = Z.topDark;
    c.beginPath();
    c.moveTo(x + ext, y - 2);
    c.lineTo(x + T + ext2, y - 2);
    for (let i = 4; i >= 0; i--) c.lineTo(x + i * 8, y + 7 + Math.sin(tx * 3 + i * 1.7) * 2.2);
    c.closePath(); c.fill();
    c.fillStyle = Z.top;
    G.rrect(x + ext, y - 3, T - ext + ext2, 6, 3, c); c.fill();
    c.fillStyle = BB.rgba(Z.topLight, 0.9);
    G.rrect(x + ext + 2, y - 3, T - ext + ext2 - 4, 2, 1, c); c.fill();

    if (Z.key === 'gardens' || Z.key === 'ruins') {
      // grass blades
      for (let i = 0; i < 6; i++) {
        const bx = x + h(i) * T, bh = 3 + h(i + 6) * 5;
        c.fillStyle = i % 2 ? Z.top : Z.topLight;
        c.beginPath(); c.moveTo(bx - 1.6, y - 1); c.lineTo(bx + (h(i + 12) - 0.5) * 3, y - 1 - bh); c.lineTo(bx + 1.6, y - 1); c.closePath(); c.fill();
      }
      if (Z.key === 'gardens' && h(20) < 0.2) flower(c, x + 6 + h(21) * 20, y - 2, ['#ff9ec7', '#ffe066', '#ffffff', '#c9a6ff', '#ff8c6b'][Math.floor(h(22) * 5)], 0.9 + h(23) * 0.5);
      if (Z.key === 'ruins' && h(24) < 0.12) flower(c, x + 6 + h(25) * 20, y - 2, '#bfe7ff', 0.8);
    } else if (Z.key === 'meadow') {
      if (h(30) < 0.28) {
        const mx = x + 6 + h(31) * 20, mh = 4 + h(32) * 5, col = h(33) < 0.5 ? '#ff9be0' : '#7cf5d4';
        c.fillStyle = '#e8dcff'; c.fillRect(mx - 1, y - mh, 2, mh);
        c.fillStyle = col; c.beginPath(); c.ellipse(mx, y - mh, 4, 3, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#ffffff'; G.circle(mx - 1.4, y - mh - 1.2, 0.8, c); c.fill();
      }
      for (let i = 0; i < 3; i++) {
        c.fillStyle = Z.topLight; G.circle(x + h(i + 40) * T, y - 2, 1.6, c); c.fill();
      }
    } else if (Z.key === 'caves') {
      if (h(50) < 0.26) crystalCluster(c, x + 6 + h(51) * 20, y - 1, h(52), 1);
    } else if (Z.key === 'hive') {
      if (h(60) < 0.35) {
        const dx = x + 4 + h(61) * 24, dl = 4 + h(62) * 8;
        c.fillStyle = Z.top;
        c.beginPath(); c.moveTo(dx - 3, y + 2); c.quadraticCurveTo(dx - 3, y + dl, dx, y + dl + 3); c.quadraticCurveTo(dx + 3, y + dl, dx + 3, y + 2); c.fill();
      }
    }
  }

  function paintBottom(c, z, tx, ty, x, y) {
    const Z = BB.ZONES[z];
    const h = i => BB.hash(tx, ty, 200 + i);
    const by = y + T;
    if (Z.key === 'gardens' && h(0) < 0.35) {
      c.strokeStyle = BB.rgba('#6b4a2e', 0.9); c.lineWidth = 1.3;
      const rx = x + 6 + h(1) * 20;
      c.beginPath(); c.moveTo(rx, by - 1); c.quadraticCurveTo(rx + 3, by + 4, rx - 1, by + 7 + h(2) * 5); c.stroke();
    } else if (Z.key === 'meadow' && h(0) < 0.4) {
      const rx = x + 6 + h(1) * 20, l = 6 + h(2) * 10;
      c.strokeStyle = BB.rgba(Z.accent, 0.7); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(rx, by - 1); c.quadraticCurveTo(rx + 3, by + l / 2, rx, by + l); c.stroke();
      c.fillStyle = Z.accent; G.circle(rx, by + l, 1.8, c); c.fill();
    } else if (Z.key === 'caves' && h(0) < 0.3) {
      const rx = x + 8 + h(1) * 16, l = 6 + h(2) * 10;
      c.fillStyle = BB.rgba('#bfe6ff', 0.85); c.strokeStyle = '#5a6fc0'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(rx - 4, by - 1); c.lineTo(rx, by + l); c.lineTo(rx + 4, by - 1); c.closePath(); c.fill(); c.stroke();
    } else if (Z.key === 'hive' && h(0) < 0.4) {
      const rx = x + 6 + h(1) * 20, l = 4 + h(2) * 8;
      c.fillStyle = Z.top;
      c.beginPath(); c.moveTo(rx - 3, by - 2); c.quadraticCurveTo(rx - 3, by + l, rx, by + l + 3); c.quadraticCurveTo(rx + 3, by + l, rx + 3, by - 2); c.fill();
    } else if (Z.key === 'ruins' && h(0) < 0.3) {
      c.strokeStyle = BB.rgba(Z.topDark, 0.9); c.lineWidth = 1.4;
      const rx = x + 6 + h(1) * 20, l = 10 + h(2) * 16;
      c.beginPath(); c.moveTo(rx, by - 1);
      for (let k = 0; k < l; k += 4) c.lineTo(rx + Math.sin(k * 0.4) * 2, by + k);
      c.stroke();
      c.fillStyle = Z.top;
      for (let k = 4; k < l; k += 7) { G.ellipse(rx + 2.5, by + k, 2.5, 1.5, 0.5, c); c.fill(); }
    } else if (Z.key === 'clouds') {
      c.fillStyle = BB.mix('#ffffff', Z.groundDark, 0.5);
      for (let i = 0; i < 3; i++) { G.circle(x + 5 + i * 11, by - 3, 6 + h(i) * 2, c); c.fill(); }
    }
  }

  // a soft lavender rim around cloud ground so it reads as solid
  function cloudOutline(c, tx, ty, x, y, m) {
    c.fillStyle = '#b9a8ee';
    tileShape(c, x - 2, y - 2, m); c.fill();
    const h = i => BB.hash(tx, ty, 100 + i);
    if (!m.n) for (let i = 0; i < 3; i++) { G.circle(x + 5 + i * 11, y + 3 + h(i) * 2, 9 + h(i + 3) * 3, c); c.fill(); }
    if (!m.w) for (let i = 0; i < 3; i++) { G.circle(x, y + 5 + i * 11, 8 + BB.hash(tx, ty, i - 1) * 2, c); c.fill(); }
    if (!m.e) for (let i = 0; i < 3; i++) { G.circle(x + T, y + 5 + i * 11, 8 + BB.hash(tx, ty, i + 1) * 2, c); c.fill(); }
    c.fillRect(x - 2, y - 2, T + 4, T + 4);
  }

  function cloudSide(c, z, tx, ty, x, y, side) {
    const Z = BB.ZONES[z];
    c.fillStyle = BB.mix('#ffffff', Z.groundDark, 0.2);
    const sx = side > 0 ? x + T : x;
    for (let i = 0; i < 3; i++) { G.circle(sx, y + 5 + i * 11, 6 + BB.hash(tx, ty, i + side) * 2, c); c.fill(); }
  }

  function flower(c, x, y, col, s) {
    c.strokeStyle = '#3f8f35'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 7 * s); c.stroke();
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; G.circle(x + Math.cos(a) * 2.4 * s, y - 7 * s + Math.sin(a) * 2.4 * s, 1.9 * s, c); c.fill(); }
    c.fillStyle = '#ffd34d'; G.circle(x, y - 7 * s, 1.4 * s, c); c.fill();
  }

  function crystalCluster(c, x, y, seed, s) {
    const cols = ['#bfe6ff', '#d7c2ff', '#9ff0ff'];
    for (let i = 0; i < 3; i++) {
      const cx = x + (i - 1) * 4 * s, hgt = (7 + ((seed * 10 + i * 3) % 1) * 7 + (i === 1 ? 4 : 0)) * s;
      const lean = (i - 1) * 0.25;
      c.fillStyle = BB.rgba(cols[i % 3], 0.92); c.strokeStyle = '#5a6fc0'; c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(cx - 2.5 * s, y + 1);
      c.lineTo(cx - 2.5 * s + lean * hgt, y - hgt * 0.8);
      c.lineTo(cx + lean * hgt, y - hgt);
      c.lineTo(cx + 2.5 * s + lean * hgt, y - hgt * 0.8);
      c.lineTo(cx + 2.5 * s, y + 1);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(cx - 1 + lean * hgt * 0.5, y - hgt * 0.6, 1, hgt * 0.4);
    }
  }

  // ──── One-way ledges ────
  function paintLedge(c, z, tx, ty, x, y) {
    const Z = BB.ZONES[z];
    const L = W().tile(tx - 1, ty) === '-', R = W().tile(tx + 1, ty) === '-';
    const h = i => BB.hash(tx, ty, 300 + i);
    if (Z.key === 'meadow') {
      // shelf fungus caps
      c.fillStyle = Z.ledgeDark;
      c.beginPath(); c.ellipse(x + 16, y + 3, 17, 8, 0, 0, Math.PI); c.fill();
      c.fillStyle = Z.ledge;
      c.beginPath(); c.ellipse(x + 16, y + 2, 17, 6, 0, Math.PI, TAU); c.lineTo(x + 33, y + 3); c.lineTo(x - 1, y + 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      G.circle(x + 8 + h(0) * 16, y - 1, 1.5, c); c.fill();
      c.strokeStyle = BB.rgba(Z.ledgeDark, 0.9); c.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x + 4 + i * 6, y + 4); c.lineTo(x + 5 + i * 6, y + 8); c.stroke(); }
      return;
    }
    if (Z.key === 'clouds') {
      c.fillStyle = '#b9a8ee';
      for (let i = 0; i < 3; i++) { G.circle(x + 5 + i * 11, y + 5, 8 + h(i) * 2.5, c); c.fill(); }
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { G.circle(x + 5 + i * 11, y + 4, 6.5 + h(i) * 2.5, c); c.fill(); }
      c.fillStyle = 'rgba(255,226,122,0.7)';
      G.circle(x + 16, y - 1, 1.3, c); c.fill();
      return;
    }
    const x0 = x - (L ? 1 : -1), x1 = x + T + (R ? 1 : -1);
    if (Z.key === 'caves') {
      c.fillStyle = BB.rgba('#b8d4ff', 0.85); c.strokeStyle = '#5a6fc0'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.lineTo(x1 - (R ? 0 : 4), y + 8); c.lineTo(x0 + (L ? 0 : 4), y + 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x0 + 2, y + 1, x1 - x0 - 4, 1.5);
      return;
    }
    // wooden / wax plank
    c.fillStyle = Z.ledgeDark;
    G.rrect(x0, y + 1, x1 - x0, 9, L && R ? 0 : 4, c); c.fill();
    c.fillStyle = Z.ledge;
    G.rrect(x0, y, x1 - x0, 6, L && R ? 0 : 3, c); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x0 + 2, y + 1, x1 - x0 - 4, 1.5);
    if (Z.key === 'hive') {
      c.strokeStyle = BB.rgba(Z.ledgeDark, 0.8); c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 5 + i * 11, y + 1); c.lineTo(x + 8 + i * 11, y + 5); c.lineTo(x + 5 + i * 11, y + 9); c.stroke(); }
    } else {
      c.fillStyle = BB.rgba(Z.ledgeDark, 0.9);
      if (!L) { G.circle(x + 4, y + 4, 1, c); c.fill(); }
      if (!R) { G.circle(x + T - 4, y + 4, 1, c); c.fill(); }
      if (Z.key === 'gardens') {
        // little leaves sprouting from the twig ends
        const leaf = (lx, dir) => {
          c.fillStyle = '#6cc24a'; c.strokeStyle = '#3f8f35'; c.lineWidth = 0.8;
          c.beginPath(); c.moveTo(lx, y + 2); c.quadraticCurveTo(lx + dir * 6, y - 6, lx + dir * 11, y - 3); c.quadraticCurveTo(lx + dir * 6, y + 2, lx, y + 2); c.fill(); c.stroke();
        };
        if (!L) leaf(x + 2, -1);
        if (!R) leaf(x + T - 2, 1);
        if (h(5) < 0.3) leaf(x + 16, h(6) < 0.5 ? 1 : -1);
      }
    }
  }

  // ──── Build a room's static canvases ────
  function build(room) {
    const z = room.zone;
    const off = G.offscreen(room.pw + 64, room.ph + 64);
    const shy = G.offscreen(room.pw + 64, room.ph + 64);
    let hasShy = false;
    // paint with a 32px margin so tops/overhangs at edges aren't clipped
    for (const layer of [off, shy]) layer.ctx.translate(32, 32);
    const tiles = [];
    for (let r = 0; r < room.h; r++) {
      for (let col = 0; col < room.w; col++) {
        const ch = room.grid[r][col];
        if (ch === '#' || ch === 'H') tiles.push([ch, room.x + col, room.y + r, col * T, r * T]);
        if (ch === 'H') hasShy = true;
      }
    }
    const cloudy = BB.ZONES[z].key === 'clouds';
    for (const pass of ['outline', 'body', 'sides', 'top', 'bottom']) {
      for (const [ch, tx, ty, x, y] of tiles) {
        const c = ch === 'H' ? shy.ctx : off.ctx;
        const m = maskAt(tx, ty);
        if (pass === 'outline') { if (cloudy) cloudOutline(c, tx, ty, x, y, m); }
        else if (pass === 'body') paintBody(c, z, tx, ty, x, y, m);
        else if (pass === 'sides' && BB.ZONES[z].key === 'clouds') {
          if (!m.w) cloudSide(c, z, tx, ty, x, y, -1);
          if (!m.e) cloudSide(c, z, tx, ty, x, y, 1);
        } else if (pass === 'top' && !m.n) paintTop(c, z, tx, ty, x, y, m);
        else if (pass === 'bottom' && !m.s) paintBottom(c, z, tx, ty, x, y);
      }
    }
    for (let r = 0; r < room.h; r++) {
      for (let col = 0; col < room.w; col++) {
        if (room.grid[r][col] === '-') paintLedge(off.ctx, z, room.x + col, room.y + r, col * T, r * T);
      }
    }
    return { canvas: off.canvas, shy: hasShy ? shy.canvas : null, version: room.version, scale: G.scale };
  }

  function get(room) {
    let e = cache.get(room.id);
    if (!e || e.version !== room.version || e.scale !== G.scale) {
      e = build(room);
      cache.set(room.id, e);
      // keep memory modest: only the most recent rooms stay cached
      if (cache.size > 6) cache.delete(cache.keys().next().value);
    }
    return e;
  }

  // ──── Per-frame drawing ────
  // mushrooms squash when bounced on
  const squash = new Map(); // "tx,ty" (left tile of run) → ticks

  // Draws a room's terrain; with `shyOnly`, just its shy walls at `shyAlpha`
  function drawStatic(c, room, cam, shyAlpha, shyOnly) {
    const e = get(room);
    const img = shyOnly ? e.shy : e.canvas;
    if (!img || (shyOnly && shyAlpha <= 0.01)) return;
    // only blit the part of the (large) room canvas that is on screen
    const ox = room.px - 32, oy = room.py - 32;
    const x0 = Math.max(ox, cam.x), y0 = Math.max(oy, cam.y);
    const x1 = Math.min(ox + room.pw + 64, cam.x + G.W), y1 = Math.min(oy + room.ph + 64, cam.y + G.H);
    if (x1 <= x0 || y1 <= y0) return;
    const k = e.scale;
    if (shyOnly) c.globalAlpha = shyAlpha;
    c.drawImage(img, (x0 - ox) * k, (y0 - oy) * k, (x1 - x0) * k, (y1 - y0) * k, x0 - cam.x, y0 - cam.y, x1 - x0, y1 - y0);
    c.globalAlpha = 1;
  }

  // front=false: breezes, petals, gates, mushrooms · front=true: water (over the kitten)
  function drawLive(c, room, cam, t, env, front) {
    const Z = BB.ZONES[room.zone];
    const x0 = Math.max(0, Math.floor(cam.x / T) - room.x - 1), x1 = Math.min(room.w, Math.ceil((cam.x + G.W) / T) - room.x + 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - room.y - 1), y1 = Math.min(room.h, Math.ceil((cam.y + G.H) / T) - room.y + 1);
    for (let r = y0; r < y1; r++) {
      for (let col = x0; col < x1; col++) {
        const ch = room.grid[r][col];
        if (ch === '.' || ch === '#' || ch === '-' || ch === 'H') continue;
        const tx = room.x + col, ty = room.y + r;
        const x = tx * T - cam.x, y = ty * T - cam.y;
        if (ch === '~') { if (front) drawWater(c, Z, tx, ty, x, y, t); }
        else if (front) continue;
        else if (ch === '^') drawUpdraft(c, tx, ty, x, y, t);
        else if (ch === ':') drawPetal(c, Z, tx, ty, x, y, t, env);
        else if (ch === 'G') drawGate(c, Z, tx, ty, x, y, t);
        else if (ch === 'M' && W().tile(tx - 1, ty) !== 'M') drawMushroom(c, Z, tx, ty, x, y, t);
      }
    }
  }

  function drawWater(c, Z, tx, ty, x, y, t) {
    const surface = W().tile(tx, ty - 1) !== '~';
    const honey = Z.key === 'hive', mist = Z.key === 'clouds';
    const col = Z.water;
    if (mist) {
      // lavender sky-fog: clearly *not* cloud ground
      const g = c.createLinearGradient(0, y, 0, y + T);
      g.addColorStop(0, surface ? 'rgba(160,140,240,0.15)' : 'rgba(140,120,225,0.55)');
      g.addColorStop(1, 'rgba(120,100,210,0.6)');
      c.fillStyle = g; c.fillRect(x, y + (surface ? 10 : 0), T, T - (surface ? 10 : 0));
      if (surface) {
        for (let i = 0; i < 3; i++) {
          const wx = x + ((i * 13 + t * 0.4 + tx * 7) % 40) - 4, wy = y + 12 + Math.sin(t * 0.04 + tx + i) * 3;
          c.fillStyle = 'rgba(235,225,255,0.5)';
          G.ellipse(wx, wy, 10, 3, 0, c); c.fill();
        }
        if (BB.hash(tx, Math.floor(t / 30), 3) < 0.2) { c.fillStyle = 'rgba(255,255,255,0.9)'; G.twinkle(x + BB.hash(tx, ty, 4) * T, y + 16, 2.5, c); c.fill(); }
      }
      return;
    }
    const top = surface ? y + 6 : y;
    const g = c.createLinearGradient(0, top, 0, y + T);
    g.addColorStop(0, BB.rgba(col, honey ? 0.92 : 0.7));
    g.addColorStop(1, BB.rgba(BB.mix(col, '#1a2050', honey ? 0.2 : 0.45), honey ? 0.95 : 0.85));
    c.fillStyle = g;
    if (surface) {
      c.beginPath();
      c.moveTo(x, y + T);
      for (let i = 0; i <= 8; i++) {
        const wx = x + i * 4;
        c.lineTo(wx, y + 6 + Math.sin((tx * T + i * 4) * 0.14 + t * (honey ? 0.03 : 0.07)) * (honey ? 1.2 : 2));
      }
      c.lineTo(x + T, y + T);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i <= 8; i++) {
        const wx = x + i * 4;
        const wy = y + 6 + Math.sin((tx * T + i * 4) * 0.14 + t * (honey ? 0.03 : 0.07)) * (honey ? 1.2 : 2);
        i ? c.lineTo(wx, wy) : c.moveTo(wx, wy);
      }
      c.stroke();
      if (BB.hash(tx, Math.floor(t / 40), 7) < 0.15) {
        c.fillStyle = 'rgba(255,255,255,0.9)';
        G.twinkle(x + BB.hash(tx, ty, 8) * T, y + 10, 2.5, c); c.fill();
      }
    } else {
      c.fillRect(x, y, T, T);
    }
  }

  function drawUpdraft(c, tx, ty, x, y, t) {
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5; c.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const sx = x + 8 + i * 16 + Math.sin(t * 0.05 + ty + i) * 3;
      const ph = ((t * 2.2 + BB.hash(tx, ty, i) * 64) % 48);
      const sy = y + T - ph;
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 3, sy - 6, sx, sy - 12); c.stroke();
    }
  }

  function drawPetal(c, Z, tx, ty, x, y, t, env) {
    const cx = x + T / 2, cy = y + 4;
    const L = W().tile(tx - 1, ty) === ':', R = W().tile(tx + 1, ty) === ':';
    if (!env.glow) {
      // sleepy, closed: only a faint dotted hint that *something* is here
      c.save();
      c.setLineDash([2, 4]);
      c.strokeStyle = 'rgba(255,240,180,0.5)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x + (L ? 0 : 4), y + 3); c.lineTo(x + T - (R ? 0 : 4), y + 3); c.stroke();
      c.restore();
      c.fillStyle = 'rgba(255,230,160,0.3)';
      c.beginPath(); c.ellipse(cx, cy - 2, 3, 5, 0, 0, TAU); c.fill();
      return;
    }
    const near = env.px != null ? BB.clamp(1 - Math.hypot(env.px - cx - (0), env.py - (ty * T + 4)) / 260, 0, 1) : 0.5;
    const pulse = 0.5 + near * 0.5 + Math.sin(t * 0.06 + tx) * 0.08;
    G.drawGlow(cx, cy, 30 + near * 16, '#fff3b0', 0.3 + near * 0.35, c);
    // a glowing lily-pad platform you can clearly stand on
    const x0 = x + (L ? -1 : 2), x1 = x + T + (R ? 1 : -2);
    const g = c.createLinearGradient(0, y, 0, y + 8);
    g.addColorStop(0, BB.mix('#fff6c8', '#ffd98a', 1 - pulse)); g.addColorStop(1, '#f2a94a');
    c.fillStyle = g; c.strokeStyle = 'rgba(190,120,40,0.8)'; c.lineWidth = 1.2;
    G.rrect(x0, y, x1 - x0, 7, L && R ? 1 : 4, c); c.fill(); c.stroke();
    // petals curling up from the pad
    for (const px of [x + 9, x + 23]) {
      c.save(); c.translate(px, y + 1);
      for (const a of [-0.5, 0, 0.5]) {
        c.save(); c.rotate(a * (0.7 + near * 0.3));
        c.fillStyle = BB.rgba(a ? '#ffc9e3' : '#ffe9a8', 0.95); c.strokeStyle = 'rgba(200,120,90,0.6)'; c.lineWidth = 0.8;
        c.beginPath(); c.ellipse(0, -5, 2.6, 5.5, 0, 0, TAU); c.fill(); c.stroke();
        c.restore();
      }
      c.restore();
    }
  }

  function drawGate(c, Z, tx, ty, x, y, t) {
    // a curtain of flowering vines, closed tight
    const sway = Math.sin(t * 0.04 + tx) * 1.5;
    c.strokeStyle = '#3f8f35'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const vx = x + 6 + i * 10;
      c.beginPath(); c.moveTo(vx, y); c.bezierCurveTo(vx + 4 + sway, y + 10, vx - 4 + sway, y + 22, vx, y + T); c.stroke();
    }
    c.fillStyle = '#6cc24a';
    for (let i = 0; i < 4; i++) { G.ellipse(x + 4 + i * 8, y + 8 + (i % 2) * 14, 4, 2.2, 0.6, c); c.fill(); }
    const bud = W().tile(tx, ty - 1) !== 'G';
    if (bud) {
      c.fillStyle = '#ff9ec7'; c.strokeStyle = '#b8407a'; c.lineWidth = 1;
      G.ellipse(x + 16, y + 6, 4, 5.5, 0, c); c.fill(); c.stroke();
    }
  }

  function drawMushroom(c, Z, tx, ty, x, y, t) {
    let n = 1;
    while (W().tile(tx + n, ty) === 'M') n++;
    const w = n * T, cx = x + w / 2;
    const k = squash.get(tx + ',' + ty) || 0;
    const sq = k > 0 ? 1 - Math.sin((k / 18) * Math.PI) * 0.35 : 1;
    const palette = {
      gardens: ['#ff5d6c', '#ffffff'], meadow: ['#c46ad8', '#7cf5d4'], caves: ['#6a8cff', '#dff6ff'],
      hive: ['#ffb52e', '#fff3c4'], ruins: ['#ff8c4b', '#fff0d0'], clouds: ['#ff9ec7', '#ffffff'],
    }[Z.key];
    // stem
    c.fillStyle = '#f5ead0'; c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.2;
    G.rrect(cx - 7, y + 10, 14, T - 10, 4, c); c.fill(); c.stroke();
    // cap
    c.save();
    c.translate(cx, y + 14);
    c.scale(1 + (1 - sq) * 0.6, sq);
    const g = c.createLinearGradient(0, -16, 0, 0);
    g.addColorStop(0, BB.mix(palette[0], '#ffffff', 0.25)); g.addColorStop(1, palette[0]);
    c.fillStyle = g; c.strokeStyle = BB.mix(palette[0], '#000000', 0.4); c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(0, 0, w / 2 + 2, 15, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = palette[1];
    for (let i = 0; i < n * 2 + 1; i++) {
      const sx = (i / (n * 2) - 0.5) * (w - 8);
      G.circle(sx, -7 - Math.cos(sx / w * 3) * 4, 2.6 + (i % 2), c); c.fill();
    }
    if (Z.key === 'meadow' || Z.key === 'caves') G.drawGlow(0, -6, 26, palette[1], 0.25 + Math.sin(t * 0.05 + tx) * 0.1, c);
    c.restore();
  }

  // Called by gameplay when the kitten bounces on a mushroom tile
  function bounce(tx, ty) {
    let x = tx;
    while (W().tile(x - 1, ty) === 'M') x--;
    squash.set(x + ',' + ty, 18);
  }
  function tick() {
    for (const [k, v] of squash) { if (v <= 1) squash.delete(k); else squash.set(k, v - 1); }
  }

  BB.Tiles = { drawStatic, drawLive, bounce, tick, flower, crystalCluster, clear: () => cache.clear() };
})(window.BB);
