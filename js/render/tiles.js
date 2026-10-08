// ════════════════════════════════════════════════════════════════
//  TILES — procedural terrain art.
//
//  Static terrain (ground, ledges) is painted once per room into an
//  offscreen canvas: rounded, auto-tiled shapes with zone-specific
//  surfaces (grass & flowers, glowing moss, crystal clusters, honey
//  glaze, mossy bricks, puffy clouds). Decoration is seeded from world
//  coordinates so a room looks identical on every visit.
//
//  Ice / sugar-glass walls are painted into the static layer too.
//
//  Living terrain — water, mist, updrafts, glow-petals, bud gates, bouncy
//  mushrooms, cracked sandstone, fairy rings and shy walls — is drawn
//  every frame so it can move (or crumble).
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const T = BB.CFG.TILE;
  const TAU = Math.PI * 2;
  const W = () => BB.World;

  const solidCh = ch => ch === '#' || ch === 'H' || ch === 'I' || ch === null;
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
    } else if (Z.key === 'dunes') {
      // layered sandstone, striped by a thousand sunny years
      for (let i = 0; i < 3; i++) {
        const by = y + 5 + i * 10 + Math.sin(tx * 0.9 + ty * 2 + i) * 2;
        c.fillStyle = BB.rgba(i % 2 ? Z.groundLight : Z.groundDark, 0.3);
        c.fillRect(x, by, T, 4);
      }
      if (h(9) < 0.25) { c.fillStyle = BB.rgba(Z.groundDark, 0.55); G.circle(x + h(10) * T, y + h(11) * T, 1.6, c); c.fill(); }
    } else if (Z.key === 'springs') {
      // smooth river stones
      for (let i = 0; i < 3; i++) {
        c.fillStyle = BB.rgba(i % 2 ? Z.groundLight : Z.groundDark, 0.5);
        G.ellipse(x + h(i) * T, y + h(i + 4) * T, 6 + h(i + 8) * 4, 4 + h(i + 12) * 2, h(i + 16), c); c.fill();
      }
      if (h(30) < 0.3) { c.fillStyle = BB.rgba(Z.top, 0.5); G.ellipse(x + h(31) * T, y + h(32) * T, 4, 2.5, 0, c); c.fill(); }
    } else if (Z.key === 'starlight') {
      // night-sky rock with starry specks
      for (let i = 0; i < 3; i++) {
        c.fillStyle = BB.rgba(i % 2 ? Z.groundLight : Z.groundDark, 0.45);
        G.ellipse(x + h(i) * T, y + h(i + 4) * T, 3 + h(i + 8) * 3, 2 + h(i + 12) * 2, 0, c); c.fill();
      }
      if (h(20) < 0.45) { c.fillStyle = BB.rgba(h(21) < 0.5 ? '#ffe9a8' : '#e8e0ff', 0.9); G.twinkle(x + h(22) * T, y + h(23) * T, 1.6 + h(24) * 1.4, c); c.fill(); }
    } else if (Z.key === 'frost') {
      // cold blue rock with frosty flecks
      for (let i = 0; i < 3; i++) {
        c.fillStyle = BB.rgba(i % 2 ? Z.groundLight : Z.groundDark, 0.4);
        const px = x + h(i) * T, py = y + h(i + 5) * T, sz = 4 + h(i + 9) * 5;
        c.beginPath(); c.moveTo(px, py - sz); c.lineTo(px + sz, py); c.lineTo(px, py + sz * 0.7); c.lineTo(px - sz * 0.8, py); c.closePath(); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 2; i++) { G.circle(x + h(30 + i) * T, y + h(32 + i) * T, 1.1, c); c.fill(); }
    } else if (Z.key === 'home') {
      // the house's timber walls and floorboards
      c.strokeStyle = BB.rgba(Z.groundDark, 0.7); c.lineWidth = 1.2;
      for (let row = 0; row < 4; row++) {
        const by = y + row * 8;
        c.beginPath(); c.moveTo(x, by + 0.5); c.lineTo(x + T, by + 0.5); c.stroke();
        const j = x + ((tx * 13 + row * 7 + ty * 5) % 4) * 8 + 4;
        c.beginPath(); c.moveTo(j + 0.5, by); c.lineTo(j + 0.5, by + 8); c.stroke();
      }
      if (h(9) < 0.2) { c.fillStyle = BB.rgba(Z.groundDark, 0.5); G.ellipse(x + h(10) * T, y + h(11) * T, 2.5, 1.5, 0, c); c.fill(); }
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
      if (Z.key === 'lagoon' && h(30) < 0.18) shell(c, x + 6 + h(31) * 20, y + 8 + h(32) * 18, h(33) < 0.5 ? '#ffd0dc' : '#fff0d0', 0.8, h(34) * TAU);
      if (Z.key === 'autumn' && h(30) < 0.2) leaf(c, x + h(31) * T, y + h(32) * T, ['#e8783a', '#ffb060', '#d8442a'][Math.floor(h(33) * 3)], 0.8, h(34) * TAU, 0.5);
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
    if (Z.key === 'home') {
      // a soft carpet runner along the floor
      c.fillStyle = '#c85a7a'; c.fillRect(x + ext, y - 3, T - ext + ext2, 7);
      c.fillStyle = '#e88aa8'; c.fillRect(x + ext, y - 3, T - ext + ext2, 3);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 4; i++) c.fillRect(x + 3 + i * 8, y + 1, 3, 1.5);
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
    } else if (Z.key === 'lagoon') {
      if (W().tile(tx, ty - 1) === '~') {
        // under the sea: swaying kelp and little corals
        if (h(70) < 0.4) {
          const kx = x + 4 + h(71) * 24, kh = 10 + h(72) * 16;
          c.strokeStyle = '#3fae7a'; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.moveTo(kx, y); c.bezierCurveTo(kx + 5, y - kh * 0.35, kx - 5, y - kh * 0.7, kx + 1, y - kh); c.stroke();
        }
        if (h(73) < 0.3) coral(c, x + 6 + h(74) * 20, y, ['#ff8fa8', '#ffb07a', '#c9a6ff'][Math.floor(h(75) * 3)], 0.8 + h(76) * 0.5);
      } else {
        if (h(70) < 0.16) shell(c, x + 6 + h(71) * 20, y - 2, h(72) < 0.5 ? '#ffd0dc' : '#fff6e0', 1, 0);
        else if (h(70) < 0.26) starfish(c, x + 6 + h(71) * 20, y - 1, '#ff9a7a', 0.9);
        c.fillStyle = BB.rgba(Z.topDark, 0.5);
        for (let i = 0; i < 2; i++) { G.circle(x + h(80 + i) * T, y + 1, 1, c); c.fill(); }
      }
    } else if (Z.key === 'dunes') {
      // wind ripples in the sand
      c.strokeStyle = BB.rgba(Z.topDark, 0.6); c.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const rx = x + 4 + h(i + 70) * 18;
        c.beginPath(); c.moveTo(rx, y + 1); c.quadraticCurveTo(rx + 4, y - 1.5, rx + 8, y + 1); c.stroke();
      }
      if (h(75) < 0.1) cactus(c, x + 8 + h(76) * 16, y - 1, 0.8 + h(77) * 0.4);
      else if (h(75) < 0.22) tuft(c, x + 6 + h(76) * 20, y - 1, '#9ab84a');
    } else if (Z.key === 'frost') {
      // soft snow drifts and the odd baby pine
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { G.ellipse(x + 5 + i * 11, y - 1 - h(i + 70) * 2, 7 + h(i + 73) * 2, 3.5, 0, c); c.fill(); }
      if (h(78) < 0.1) pine(c, x + 8 + h(79) * 16, y - 1, 0.7 + h(80) * 0.4);
      if (h(81) < 0.3) { c.fillStyle = 'rgba(160,220,255,0.9)'; G.twinkle(x + h(82) * T, y - 3, 2, c); c.fill(); }
    } else if (Z.key === 'autumn') {
      // crunchy fallen leaves (and sometimes an acorn)
      for (let i = 0; i < 3; i++) {
        if (h(70 + i) < 0.55) leaf(c, x + h(73 + i) * T, y - 1, ['#e8783a', '#ffb060', '#d8442a', '#ffd04a'][Math.floor(h(76 + i) * 4)], 0.9, h(79 + i) * TAU, 1);
      }
      if (h(85) < 0.08) acorn(c, x + 8 + h(86) * 16, y - 2);
      else if (h(85) < 0.16) toadstool(c, x + 8 + h(86) * 16, y - 1, '#d8442a');
    } else if (Z.key === 'springs') {
      // mossy grass, bamboo shoots and tiny pink blossoms
      for (let i = 0; i < 5; i++) {
        const bx = x + h(i + 70) * T, bh = 3 + h(i + 75) * 4;
        c.fillStyle = i % 2 ? Z.top : Z.topLight;
        c.beginPath(); c.moveTo(bx - 1.5, y - 1); c.lineTo(bx + (h(i + 80) - 0.5) * 3, y - 1 - bh); c.lineTo(bx + 1.5, y - 1); c.closePath(); c.fill();
      }
      if (h(86) < 0.09) bambooShoot(c, x + 8 + h(87) * 16, y - 1, 0.8 + h(88) * 0.5);
      else if (h(86) < 0.2) flower(c, x + 6 + h(87) * 20, y - 2, '#ffb0c0', 0.8);
    } else if (Z.key === 'starlight') {
      // crystal grass with glowing tips
      for (let i = 0; i < 5; i++) {
        const bx = x + h(i + 70) * T, bh = 4 + h(i + 75) * 6;
        c.fillStyle = BB.rgba(i % 2 ? Z.top : Z.topLight, 0.9);
        c.beginPath(); c.moveTo(bx - 1.4, y - 1); c.lineTo(bx + (h(i + 80) - 0.5) * 2, y - 1 - bh); c.lineTo(bx + 1.4, y - 1); c.closePath(); c.fill();
        if (i % 2 === 0) { c.fillStyle = '#fff6d0'; G.circle(bx + (h(i + 80) - 0.5) * 2, y - 1 - bh, 1, c); c.fill(); }
      }
      if (h(86) < 0.14) crystalCluster(c, x + 8 + h(87) * 16, y - 1, h(88), 0.8);
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
    } else if (Z.key === 'frost' && h(0) < 0.45) {
      icicle(c, x + 6 + h(1) * 20, by - 1, 6 + h(2) * 10);
      if (h(3) < 0.4) icicle(c, x + 6 + h(4) * 20, by - 1, 4 + h(5) * 5);
    } else if ((Z.key === 'autumn' || Z.key === 'lagoon') && h(0) < 0.3) {
      c.strokeStyle = BB.rgba(Z.key === 'lagoon' ? '#3fae7a' : '#5a3a1a', 0.9); c.lineWidth = 1.3;
      const rx = x + 6 + h(1) * 20;
      c.beginPath(); c.moveTo(rx, by - 1); c.quadraticCurveTo(rx + 3, by + 4, rx - 1, by + 7 + h(2) * 5); c.stroke();
    } else if (Z.key === 'springs' && h(0) < 0.35) {
      const rx = x + 6 + h(1) * 20, l = 5 + h(2) * 8;
      c.fillStyle = Z.topDark;
      c.beginPath(); c.moveTo(rx - 3, by - 2); c.quadraticCurveTo(rx - 3, by + l, rx, by + l + 2); c.quadraticCurveTo(rx + 3, by + l, rx + 3, by - 2); c.fill();
    } else if (Z.key === 'starlight' && h(0) < 0.35) {
      const rx = x + 6 + h(1) * 20, l = 4 + h(2) * 8;
      c.strokeStyle = BB.rgba(Z.top, 0.7); c.lineWidth = 1;
      c.beginPath(); c.moveTo(rx, by - 1); c.lineTo(rx, by + l); c.stroke();
      c.fillStyle = '#fff6d0'; G.twinkle(rx, by + l + 2, 2.2, c); c.fill();
    }
  }

  // ──── Ice / sugar-glass (solid, far too slippery to climb) ────
  const ICE = {
    frost: ['#eef9ff', '#a8d8f4', '#5e9ed0'],
    springs: ['#eafff6', '#a6e6d6', '#4f9e8e'],
    starlight: ['#f2ecff', '#bfb0ff', '#6e5cc8'],
  };
  function paintIce(c, z, tx, ty, x, y, m) {
    const Z = BB.ZONES[z];
    const pal = ICE[Z.key] || ICE.frost;
    // a gentle top-to-bottom sheen over each 4-tile block, so big glass
    // walls read as one smooth sheet rather than a grid of little tiles
    const by = y - (((ty % 4) + 4) % 4) * T;
    const g = c.createLinearGradient(0, by, 0, by + T * 4);
    g.addColorStop(0, pal[0]); g.addColorStop(0.5, BB.mix(pal[0], pal[1], 0.6)); g.addColorStop(1, pal[0]);
    c.fillStyle = g; tileShape(c, x, y, m); c.fill();
    c.save(); tileShape(c, x, y, m); c.clip();
    // glassy diagonal shine — the "whee, slippery!" look
    const o = BB.hash(tx, ty, 1) * 22 - 4;
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineCap = 'round';
    c.lineWidth = 3; c.beginPath(); c.moveTo(x + o - 6, y + T + 2); c.lineTo(x + o + 12, y - 2); c.stroke();
    c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + o + 3, y + T + 2); c.lineTo(x + o + 21, y - 2); c.stroke();
    if (Z.key === 'starlight' && BB.hash(tx, ty, 2) < 0.35) { c.fillStyle = 'rgba(255,246,208,0.9)'; G.twinkle(x + BB.hash(tx, ty, 3) * T, y + BB.hash(tx, ty, 4) * T, 2, c); c.fill(); }
    // crisp edges where the glass meets the air
    c.strokeStyle = pal[2]; c.lineWidth = 3;
    c.beginPath();
    if (!m.n) { c.moveTo(x - 1, y); c.lineTo(x + T + 1, y); }
    if (!m.s) { c.moveTo(x - 1, y + T); c.lineTo(x + T + 1, y + T); }
    if (!m.w) { c.moveTo(x, y - 1); c.lineTo(x, y + T + 1); }
    if (!m.e) { c.moveTo(x + T, y - 1); c.lineTo(x + T, y + T + 1); }
    c.stroke();
    c.restore();
    if (!m.n && Z.key === 'frost') {
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { G.ellipse(x + 5 + i * 11, y, 7, 3.2, 0, c); c.fill(); }
    }
  }

  // ──── Little decorations ────
  function shell(c, x, y, col, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.fillStyle = col; c.strokeStyle = 'rgba(150,90,80,0.8)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(0, 1); c.arc(0, 1, 4.5, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); for (const a of [-0.9, -0.3, 0.3, 0.9]) { c.moveTo(0, 1); c.lineTo(Math.sin(a) * 4.5, 1 - Math.cos(a) * 4.5); } c.stroke();
    c.restore();
  }
  function starfish(c, x, y, col, s) {
    c.fillStyle = col; c.strokeStyle = 'rgba(160,70,50,0.8)'; c.lineWidth = 0.8;
    G.star(x, y - 3 * s, 4.5 * s, 5, 0.45, -Math.PI / 2, c); c.fill(); c.stroke();
  }
  function coral(c, x, y, col, s) {
    c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 2.6 * s;
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x, y - 9 * s);
    c.moveTo(x, y - 4 * s); c.quadraticCurveTo(x - 5 * s, y - 5 * s, x - 5 * s, y - 10 * s);
    c.moveTo(x, y - 6 * s); c.quadraticCurveTo(x + 5 * s, y - 7 * s, x + 4 * s, y - 12 * s);
    c.stroke();
  }
  function cactus(c, x, y, s) {
    c.fillStyle = '#6cb04a'; c.strokeStyle = '#3f7a2e'; c.lineWidth = 1;
    G.rrect(x - 2.5 * s, y - 13 * s, 5 * s, 13 * s, 2.5 * s, c); c.fill(); c.stroke();
    G.rrect(x - 7 * s, y - 9 * s, 3.4 * s, 6 * s, 1.7 * s, c); c.fill(); c.stroke();
    G.rrect(x + 3.6 * s, y - 11 * s, 3.4 * s, 6 * s, 1.7 * s, c); c.fill(); c.stroke();
    c.fillStyle = '#ff9ec7'; G.circle(x, y - 13 * s, 1.6 * s, c); c.fill();
  }
  function tuft(c, x, y, col) {
    c.strokeStyle = col; c.lineWidth = 1.2; c.lineCap = 'round';
    c.beginPath();
    for (const a of [-0.5, -0.2, 0.1, 0.4]) { c.moveTo(x, y); c.lineTo(x + Math.sin(a) * 7, y - Math.cos(a) * 7); }
    c.stroke();
  }
  function pine(c, x, y, s) {
    c.fillStyle = '#6a4a34'; c.fillRect(x - 1.2 * s, y - 4 * s, 2.4 * s, 4 * s);
    for (let i = 0; i < 3; i++) {
      const w = (8 - i * 2) * s, ty = y - 3 * s - i * 5 * s;
      c.fillStyle = '#3f8a6a';
      c.beginPath(); c.moveTo(x - w, ty); c.lineTo(x, ty - 7 * s); c.lineTo(x + w, ty); c.closePath(); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(x - w * 0.5, ty - 3.5 * s); c.lineTo(x, ty - 7 * s); c.lineTo(x + w * 0.5, ty - 3.5 * s); c.closePath(); c.fill();
    }
  }
  function icicle(c, x, y, l) {
    c.fillStyle = 'rgba(220,244,255,0.95)'; c.strokeStyle = '#7ab0d8'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x, y + l); c.lineTo(x + 3, y); c.closePath(); c.fill(); c.stroke();
  }
  function leaf(c, x, y, col, s, rot, alpha) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha *= alpha;
    c.fillStyle = col;
    c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(0, -4, 4, 0); c.quadraticCurveTo(0, 4, -4, 0); c.fill();
    c.strokeStyle = 'rgba(90,40,20,0.5)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke();
    c.restore();
  }
  function acorn(c, x, y) {
    c.fillStyle = '#c0843a'; G.ellipse(x, y, 3, 3.6, 0, c); c.fill();
    c.fillStyle = '#6a4a24'; c.beginPath(); c.ellipse(x, y - 2, 3.6, 2, 0, Math.PI, 0); c.fill();
    c.fillRect(x - 0.5, y - 5.5, 1, 2);
  }
  function toadstool(c, x, y, col) {
    c.fillStyle = '#f5ead0'; c.fillRect(x - 1.5, y - 5, 3, 5);
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 5, 5, 4, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#ffffff'; G.circle(x - 2, y - 7, 0.9, c); c.fill(); G.circle(x + 1.6, y - 6.4, 0.8, c); c.fill();
  }
  function bambooShoot(c, x, y, s) {
    c.fillStyle = '#8ac86a'; c.strokeStyle = '#4a8a3a'; c.lineWidth = 1;
    G.rrect(x - 2.5 * s, y - 18 * s, 5 * s, 18 * s, 2 * s, c); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 2.5 * s, y - 9 * s); c.lineTo(x + 2.5 * s, y - 9 * s); c.stroke();
    c.fillStyle = '#6cb04a';
    c.beginPath(); c.moveTo(x, y - 12 * s); c.quadraticCurveTo(x + 6 * s, y - 16 * s, x + 9 * s, y - 13 * s); c.quadraticCurveTo(x + 5 * s, y - 12 * s, x, y - 12 * s); c.fill();
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
    if (Z.key === 'home') {
      // a cat-tree shelf: wood underneath, cosy carpet on top
      c.fillStyle = Z.ledgeDark;
      G.rrect(x0, y + 1, x1 - x0, 10, L && R ? 0 : 4, c); c.fill();
      c.fillStyle = '#b8a0e8';
      G.rrect(x0, y - 1, x1 - x0, 6, L && R ? 0 : 3, c); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x0 + 2, y, x1 - x0 - 4, 1.5);
      return;
    }
    if (Z.key === 'frost') {
      // a shelf of blue ice with a cap of snow
      c.fillStyle = BB.rgba('#cdeeff', 0.92); c.strokeStyle = '#6a9ad0'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0, y + 1); c.lineTo(x1, y + 1); c.lineTo(x1 - (R ? 0 : 4), y + 8); c.lineTo(x0 + (L ? 0 : 4), y + 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { G.ellipse(x + 5 + i * 11, y + 1, 6.5, 2.8, 0, c); c.fill(); }
      if (h(2) < 0.5) icicle(c, x + 8 + h(3) * 16, y + 7, 4 + h(4) * 4);
      return;
    }
    if (Z.key === 'starlight') {
      // a golden plank studded with little stars
      c.fillStyle = Z.ledgeDark;
      G.rrect(x0, y + 1, x1 - x0, 9, L && R ? 0 : 4, c); c.fill();
      c.fillStyle = Z.ledge;
      G.rrect(x0, y, x1 - x0, 6, L && R ? 0 : 3, c); c.fill();
      c.fillStyle = '#fffbe8';
      G.star(x + 16, y + 3.5, 2.6, 5, 0.45, -Math.PI / 2, c); c.fill();
      return;
    }
    if (Z.key === 'springs') {
      // a red lacquered footbridge
      c.fillStyle = Z.ledgeDark;
      G.rrect(x0, y + 1, x1 - x0, 9, L && R ? 0 : 4, c); c.fill();
      c.fillStyle = Z.ledge;
      G.rrect(x0, y, x1 - x0, 6, L && R ? 0 : 3, c); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x0 + 2, y + 1, x1 - x0 - 4, 1.5);
      c.fillStyle = Z.ledgeDark;
      if (!L) { c.fillRect(x + 3, y - 7, 3, 8); G.circle(x + 4.5, y - 8, 2, c); c.fill(); }
      if (!R) { c.fillRect(x + T - 6, y - 7, 3, 8); G.circle(x + T - 4.5, y - 8, 2, c); c.fill(); }
      return;
    }
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
        const sprout = (lx, dir) => {
          c.fillStyle = '#6cc24a'; c.strokeStyle = '#3f8f35'; c.lineWidth = 0.8;
          c.beginPath(); c.moveTo(lx, y + 2); c.quadraticCurveTo(lx + dir * 6, y - 6, lx + dir * 11, y - 3); c.quadraticCurveTo(lx + dir * 6, y + 2, lx, y + 2); c.fill(); c.stroke();
        };
        if (!L) sprout(x + 2, -1);
        if (!R) sprout(x + T - 2, 1);
        if (h(5) < 0.3) sprout(x + 16, h(6) < 0.5 ? 1 : -1);
      }
      if (Z.key === 'autumn' && h(5) < 0.45) leaf(c, x + 6 + h(6) * 20, y - 1, ['#e8783a', '#ffb060', '#d8442a'][Math.floor(h(7) * 3)], 0.9, h(8) * TAU, 1);
      if (Z.key === 'lagoon' && h(5) < 0.2) shell(c, x + 8 + h(6) * 16, y - 1, '#ffd0dc', 0.8, 0);
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
        if (ch === '#' || ch === 'H' || ch === 'I') tiles.push([ch, room.x + col, room.y + r, col * T, r * T]);
        if (ch === 'H') hasShy = true;
      }
    }
    const cloudy = BB.ZONES[z].key === 'clouds';
    for (const pass of ['outline', 'body', 'sides', 'top', 'bottom']) {
      for (const [ch, tx, ty, x, y] of tiles) {
        const c = ch === 'H' ? shy.ctx : off.ctx;
        const m = maskAt(tx, ty);
        if (pass === 'outline') { if (cloudy) cloudOutline(c, tx, ty, x, y, m); }
        else if (pass === 'body') { if (ch === 'I') paintIce(c, z, tx, ty, x, y, m); else paintBody(c, z, tx, ty, x, y, m); }
        else if (ch === 'I') continue;
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
        const tx = room.x + col, ty = room.y + r;
        const x = tx * T - cam.x, y = ty * T - cam.y;
        if (ch === '-') { if (front && submergedLedge(tx, ty)) drawWater(c, Z, tx, ty, x, y, t); continue; }
        if (ch === '.' || ch === '#' || ch === 'H' || ch === 'I') continue;
        if (ch === '~') { if (front) drawWater(c, Z, tx, ty, x, y, t); }
        else if (ch === '%') { if (front) drawMist(c, Z, tx, ty, x, y, t); }
        else if (front) continue;
        else if (ch === 'X') drawSandstone(c, Z, tx, ty, x, y, t, env);
        else if (ch >= '1' && ch <= '9') drawRing(c, tx, ty, x, y, t, env, ch);
        else if (ch === '^') drawUpdraft(c, tx, ty, x, y, t);
        else if (ch === ':') drawPetal(c, Z, tx, ty, x, y, t, env);
        else if (ch === 'G') drawGate(c, Z, tx, ty, x, y, t);
        else if (ch === 'M' && W().tile(tx - 1, ty) !== 'M') drawMushroom(c, Z, tx, ty, x, y, t);
      }
    }
  }

  // Translucent fills snapped to whole device pixels, so neighbouring
  // water / mist tiles meet exactly (no faint grid where edges overlap)
  function snapRect(c, x, y, w, h) {
    const k = G.scale;
    const x0 = Math.round(x * k) / k, y0 = Math.round(y * k) / k;
    c.fillRect(x0, y0, Math.round((x + w) * k) / k - x0, Math.round((y + h) * k) / k - y0);
  }

  // `%` — sky-mist, hot-spring steam or the starry void: never a fail,
  // a dandelion puff always floats you back to safety
  function drawMist(c, Z, tx, ty, x, y, t) {
    const surface = W().tile(tx, ty - 1) !== '%';
    if (Z.key === 'springs') {
      // warm, rosy steam rising from a very hot spring
      if (surface) {
        const g = c.createLinearGradient(0, y + 8, 0, y + T);
        g.addColorStop(0, 'rgba(255,220,230,0.25)'); g.addColorStop(1, 'rgba(240,190,210,0.65)');
        c.fillStyle = g;
      } else c.fillStyle = 'rgba(240,190,210,0.65)';
      snapRect(c, x, y + (surface ? 8 : 0), T, T - (surface ? 8 : 0));
      if (surface) {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.6 + BB.hash(tx, ty, i) * 60) % 60;
          c.fillStyle = `rgba(255,245,250,${0.55 * (1 - ph / 60)})`;
          G.circle(x + 8 + i * 16 + Math.sin(t * 0.05 + tx + i) * 4, y + 10 - ph, 6 + ph * 0.15, c); c.fill();
        }
      }
      return;
    }
    if (Z.key === 'starlight') {
      // a soft, deep pool of night sky with stars far below
      if (surface) {
        const g = c.createLinearGradient(0, y + 8, 0, y + T);
        g.addColorStop(0, 'rgba(40,24,110,0.3)'); g.addColorStop(1, 'rgba(22,14,78,0.82)');
        c.fillStyle = g;
      } else c.fillStyle = 'rgba(22,14,78,0.82)';
      snapRect(c, x, y + (surface ? 8 : 0), T, T - (surface ? 8 : 0));
      if (surface) {
        c.strokeStyle = 'rgba(200,180,255,0.6)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, y + 9 + Math.sin(t * 0.04 + tx) * 1.5); c.lineTo(x + T, y + 9 + Math.sin(t * 0.04 + tx + 1) * 1.5); c.stroke();
      }
      if (BB.hash(tx, ty + Math.floor(t / 45), 5) < 0.3) { c.fillStyle = 'rgba(255,246,208,0.9)'; G.twinkle(x + BB.hash(tx, ty, 6) * T, y + 14 + BB.hash(tx, ty, 7) * 14, 2, c); c.fill(); }
      return;
    }
    {
      // lavender sky-fog: clearly *not* cloud ground
      if (surface) {
        const g = c.createLinearGradient(0, y + 10, 0, y + T);
        g.addColorStop(0, 'rgba(160,140,240,0.15)'); g.addColorStop(1, 'rgba(130,110,218,0.58)');
        c.fillStyle = g;
      } else c.fillStyle = 'rgba(130,110,218,0.58)';
      snapRect(c, x, y + (surface ? 10 : 0), T, T - (surface ? 10 : 0));
      if (surface) {
        for (let i = 0; i < 3; i++) {
          const wx = x + ((i * 13 + t * 0.4 + tx * 7) % 40) - 4, wy = y + 12 + Math.sin(t * 0.04 + tx + i) * 3;
          c.fillStyle = 'rgba(235,225,255,0.5)';
          G.ellipse(wx, wy, 10, 3, 0, c); c.fill();
        }
        if (BB.hash(tx, Math.floor(t / 30), 3) < 0.2) { c.fillStyle = 'rgba(255,255,255,0.9)'; G.twinkle(x + BB.hash(tx, ty, 4) * T, y + 16, 2.5, c); c.fill(); }
      }
    }
  }

  // Open air above water makes a surface; anything else (a ledge, a rock,
  // a ceiling) just sits in the water, so the water runs right up to it.
  // Air pockets (like the ones the lost family hide in) keep their surface.
  const airy = ch => ch === '.' || ch === '^' || ch === null;
  // a one-way ledge out in the water is drawn with water around it
  function submergedLedge(tx, ty) {
    const w = W();
    return w.tile(tx, ty + 1) === '~' && !airy(w.tile(tx, ty - 1)) &&
      (w.tile(tx, ty - 1) === '~' || w.tile(tx - 1, ty) === '~' || w.tile(tx + 1, ty) === '~' || w.tile(tx, ty - 1) === '-');
  }

  function drawWater(c, Z, tx, ty, x, y, t) {
    const surface = airy(W().tile(tx, ty - 1)) ||
      (W().tile(tx, ty - 1) === '-' && !submergedLedge(tx, ty - 1));
    const honey = Z.key === 'hive';
    const col = Z.water;
    if (surface && Z.key === 'springs') {
      // a lazy curl of steam over the warm pools
      const ph = (t * 0.5 + BB.hash(tx, ty, 9) * 80) % 80;
      c.fillStyle = `rgba(255,250,250,${0.35 * (1 - ph / 80)})`;
      G.circle(x + 16 + Math.sin(t * 0.04 + tx) * 5, y + 4 - ph * 0.6, 5 + ph * 0.12, c); c.fill();
    }
    const top = surface ? y + 6 : y;
    if (surface) {
      const g = c.createLinearGradient(0, top, 0, y + T);
      g.addColorStop(0, BB.rgba(col, honey ? 0.92 : 0.62));
      g.addColorStop(1, BB.rgba(BB.mix(col, '#1a2050', honey ? 0.2 : 0.14), honey ? 0.95 : 0.37));
      c.fillStyle = g;
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
      // deep water: one flat, see-through tint per tile (darker the deeper
      // you go) so swimmers and sparkles stay easy to see — no banding
      let d = 1;
      while (d < 14 && (W().tile(tx, ty - d) === '~' || W().tile(tx, ty - d) === '-')) d++;
      c.fillStyle = BB.rgba(BB.mix(col, '#1a2050', Math.min(0.45, 0.12 + d * 0.025)), honey ? 0.92 : Math.min(0.5, 0.36 + d * 0.01));
      snapRect(c, x, y, T, T);
    }
  }

  // cracked sandstone: solid until Mighty Paws crumble it at a touch
  function drawSandstone(c, Z, tx, ty, x, y, t, env) {
    const is = (dx, dy) => W().tile(tx + dx, ty + dy) === 'X';
    const m = { n: is(0, -1), s: is(0, 1), e: is(1, 0), w: is(-1, 0) };
    const g = c.createLinearGradient(0, y, 0, y + T);
    g.addColorStop(0, BB.mix(Z.groundLight, '#ffe0a8', 0.3)); g.addColorStop(1, Z.ground);
    c.fillStyle = g; tileShape(c, x, y, m); c.fill();
    c.save(); tileShape(c, x, y, m); c.clip();
    c.fillStyle = BB.rgba(Z.groundDark, 0.25);
    c.fillRect(x, y + 10 + (ty % 2) * 4, T, 3); c.fillRect(x, y + 22, T, 2);
    // the cracks — they twinkle once your paws are mighty enough
    const glowy = env.dig ? 0.5 + Math.sin(t * 0.08 + tx + ty) * 0.3 : 0;
    c.strokeStyle = glowy ? `rgba(255,236,170,${0.6 + glowy * 0.4})` : BB.rgba(Z.groundDark, 0.9);
    c.lineWidth = 1.8; c.lineJoin = 'round';
    const h = i => BB.hash(tx, ty, 400 + i);
    c.beginPath();
    c.moveTo(x + 4 + h(0) * 10, y); c.lineTo(x + 10 + h(1) * 8, y + 10); c.lineTo(x + 6 + h(2) * 8, y + 18); c.lineTo(x + 14 + h(3) * 8, y + T);
    c.moveTo(x + 10 + h(1) * 8, y + 10); c.lineTo(x + T, y + 8 + h(4) * 10);
    c.stroke();
    c.restore();
    c.strokeStyle = BB.rgba(Z.groundDark, 0.8); c.lineWidth = 1.2;
    tileShape(c, x + 0.5, y + 0.5, m); c.stroke();
  }

  // fairy rings: a circle of toadstools; each pair shares a colour so you
  // can spot the twins. Asleep until the Badger Elder wakes them.
  const RING_COLS = { 1: '#ff9ec7', 2: '#8fd8ff', 3: '#ffd84a', 4: '#9ff08a', 5: '#d7a6ff', 6: '#ffb07a', 7: '#7cf5d4', 8: '#ff8c8c', 9: '#fff6d0' };
  function drawRing(c, tx, ty, x, y, t, env, ch) {
    const col = RING_COLS[ch] || '#fff';
    const cx = x + T / 2, fy = y + T - 2;
    const awake = !!env.rings;
    if (awake) {
      G.drawGlow(cx, fy - 10, 40, col, 0.45 + Math.sin(t * 0.08) * 0.15, c);
      c.strokeStyle = BB.rgba(col, 0.8); c.lineWidth = 2;
      c.beginPath(); c.ellipse(cx, fy - 2, 22, 6, 0, 0, TAU); c.stroke();
      // a gentle swirl of motes rising out of the ring
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.8 + i * 16) % 64;
        const a = t * 0.06 + i * 1.6;
        c.fillStyle = BB.rgba('#ffffff', 0.9 * (1 - ph / 64));
        G.twinkle(cx + Math.cos(a) * 16, fy - 4 - ph * 0.7, 2.2, c); c.fill();
      }
    }
    // toadstools round the edge (back row first, front row last)
    const caps = 7;
    for (let k = 0; k < caps; k++) {
      const a = Math.PI + (k / (caps - 1)) * Math.PI;
      const sx = cx + Math.cos(a) * 20, sy = fy - 2 + Math.sin(a) * 5;
      toadstool(c, sx, sy + 2, awake ? col : BB.mix(col, '#8a7a6a', 0.65));
    }
    for (let k = 1; k < caps - 1; k++) {
      const a = (k / (caps - 1)) * Math.PI;
      const sx = cx + Math.cos(a) * 20, sy = fy - 2 + Math.sin(a) * 5;
      toadstool(c, sx, sy + 2, awake ? col : BB.mix(col, '#8a7a6a', 0.65));
    }
    if (!awake) {
      // sleepy: a little "zz"-less hint — three dim dots drifting up
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 3; i++) { G.circle(cx + (i - 1) * 6, fy - 12 - ((t * 0.3 + i * 10) % 14), 1.4, c); c.fill(); }
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
      autumn: ['#d8442a', '#fff0d0'], starlight: ['#8a7aff', '#fff6d0'],
    }[Z.key] || ['#ff5d6c', '#ffffff'];
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
