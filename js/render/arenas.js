// ════════════════════════════════════════════════════════════════
//  ARENAS — the scenery that makes each boss's room its own place.
//  Every arena room has an `arena:` with its name and the columns of
//  anything the boss uses (the goose's mud puddle, the octopus's deck
//  holes, the walrus's thin ice, the moose's big oak…). The back layer is
//  painted behind the tiles; the front layer sits on the floor.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE;
  const G = () => BB.G;
  const A = () => BB.Backdrops.art;

  const bossOf = (room, play) => (play.ents[room.id] || { bosses: [] }).bosses[0] || null;

  function drawBack(c, room, cam, t, play) {
    // a mirror-image room paints its scenery as drawn, then flips the picture
    const flip = !!room.def.flip;
    const ad = flip ? room.def.src.arena : room.def.arena;
    const X = col => (room.x + col) * T - cam.x, Y = row => (room.y + row) * T - cam.y;
    const floor = Y(14);
    c.save();
    c.beginPath(); c.rect(X(0), Y(0), room.w * T, room.h * T); c.clip();
    if (flip) { c.translate(2 * X(0) + room.w * T, 0); c.scale(-1, 1); }
    switch (ad.name) {
      case 'Pond Garden': {
        // a lily pond and a picket fence behind the flowerbeds
        c.fillStyle = 'rgba(111,208,240,0.55)'; G().ellipse(X(15), floor - 6, 7 * T, 22, 0, c); c.fill();
        for (const [px, py] of [[11, -8], [17, -4], [19, -10]]) { c.fillStyle = '#6cc24a'; G().ellipse(X(px), floor + py, 12, 4, 0, c); c.fill(); }
        c.fillStyle = 'rgba(255,248,236,0.8)';
        for (let col = 1; col < 29; col += 1) { c.fillRect(X(col) + 12, floor - 58, 8, 58); c.beginPath(); c.moveTo(X(col) + 11, floor - 58); c.lineTo(X(col) + 16, floor - 66); c.lineTo(X(col) + 21, floor - 58); c.fill(); }
        c.fillRect(X(1), floor - 48, 28 * T, 6);
        c.strokeStyle = '#4e9a3a'; c.lineWidth = 3;
        for (const col of [9, 10, 20, 21]) { c.beginPath(); c.moveTo(X(col), floor); c.quadraticCurveTo(X(col) + 6, floor - 30, X(col) + 2, floor - 52); c.stroke(); c.fillStyle = '#8a5a34'; G().ellipse(X(col) + 2, floor - 52, 3, 8, 0, c); c.fill(); }
        break;
      }
      case 'Mushroom Ring': {
        for (const [col, h, w, cap] of [[5, 240, 90, '#c46ad8'], [15, 300, 120, '#e08ad0'], [25, 230, 90, '#9a6ae0']]) A().giantMushroom(c, X(col), floor, h, w, BB.rgba(cap, 0.45), '#7cf5d4', 0.6);
        break;
      }
      case 'Crystal Bowl': {
        for (const [col, h, w] of [[4, 150, 40], [9, 220, 54], [15, 180, 46], [21, 240, 58], [26, 140, 36]]) A().crystalPillar(c, X(col), floor + 60, w, h, 'rgba(120,140,220,0.45)', 0.8);
        break;
      }
      case 'Honeycomb Tower': {
        // a great wall of honeycomb, dripping
        c.strokeStyle = 'rgba(200,140,40,0.45)'; c.lineWidth = 4;
        const s = 26;
        for (let row = 0; row < 18; row++) for (let col = 0; col < 22; col++) {
          const cx = X(4) + col * s * 1.732 + (row % 2 ? s * 0.866 : 0), cy = Y(0) + row * s * 1.5;
          c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; c.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } c.closePath();
          if (BB.hash(row, col, 5) < 0.25) { c.fillStyle = 'rgba(255,200,70,0.35)'; c.fill(); }
          c.stroke();
        }
        for (const col of [3, 12, 22]) A().honeyCurtain(c, X(col), 90 + (col % 5) * 20, 60, 'rgba(255,195,74,0.6)', () => 0.5);
        break;
      }
      case 'Rainy Courtyard': {
        for (const col of [5, 15, 25]) A().arch(c, X(col), floor, 150, 230, 'rgba(120,140,150,0.5)');
        // the elephant fountain
        c.fillStyle = 'rgba(150,165,175,0.8)'; G().rrect(X(13), floor - 34, 4 * T, 34, 8, c); c.fill();
        c.fillStyle = 'rgba(111,200,240,0.7)'; G().ellipse(X(15), floor - 34, 2 * T - 6, 8, 0, c); c.fill();
        c.strokeStyle = 'rgba(160,220,255,0.8)'; c.lineWidth = 3;
        for (let i = 0; i < 3; i++) { const k = ((t * 0.02) + i / 3) % 1; c.beginPath(); c.arc(X(15), floor - 34 - 20, 18 + k * 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        break;
      }
      case 'Windy Cloud Top': {
        // swirly wind curls and a big cloud throne
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 5; c.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const x = X(4 + i * 7) + Math.sin(t * 0.01 + i) * 20, y = Y(3 + (i % 2) * 4);
          c.beginPath(); c.moveTo(x - 60, y); c.quadraticCurveTo(x, y - 20, x + 20, y); c.arc(x + 10, y + 10, 12, -0.5, Math.PI * 1.5); c.stroke();
        }
        BB.Backdrops.cloud(c, X(11), floor - 30, 1.4, 'rgba(255,255,255,0.8)');
        break;
      }
      case 'Shipwreck': {
        // the old ship's hull, a broken mast and round portholes
        c.fillStyle = 'rgba(110,70,40,0.55)';
        c.beginPath(); c.moveTo(X(2), floor); c.lineTo(X(3), Y(6)); c.lineTo(X(27), Y(5)); c.lineTo(X(28), floor); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(70,40,20,0.5)'; c.lineWidth = 2;
        for (let row = 6; row < 14; row++) { c.beginPath(); c.moveTo(X(3), Y(row)); c.lineTo(X(27), Y(row) - 4); c.stroke(); }
        for (const col of [8, 15, 22]) { c.fillStyle = 'rgba(40,80,110,0.7)'; G().circle(X(col), Y(8.5), 16, c); c.fill(); c.strokeStyle = 'rgba(210,170,90,0.9)'; c.lineWidth = 4; G().circle(X(col), Y(8.5), 16, c); c.stroke(); }
        const mc = ad.holes && ad.holes.length ? (ad.holes[0] + ad.holes[ad.holes.length - 1]) / 2 : 15;
        c.fillStyle = 'rgba(120,80,45,0.8)'; c.save(); c.translate(X(mc), Y(5)); c.rotate(0.18); c.fillRect(-7, -150, 14, 160); c.fillRect(-60, -110, 120, 8); c.restore();
        break;
      }
      case 'Oasis Dunes': {
        c.fillStyle = 'rgba(111,208,240,0.6)'; G().ellipse(X(15), floor - 4, 5 * T, 14, 0, c); c.fill();
        for (const [col, h] of [[4, 190], [12, 240], [19, 210], [26, 180]]) A().palm(c, X(col), floor - 40, h, 'rgba(90,140,90,0.7)');
        break;
      }
      case 'Frozen Pond': {
        // an igloo and snowy pines
        for (const col of [4, 26]) A().bigPine(c, X(col), floor + 20, 220, 'rgba(80,120,160,0.5)');
        const ix = X(ad.crack > 15 ? 6 : 23);
        c.fillStyle = 'rgba(240,250,255,0.95)'; c.beginPath(); c.arc(ix, floor, 58, Math.PI, 0); c.fill();
        c.strokeStyle = 'rgba(150,190,230,0.9)'; c.lineWidth = 2;
        for (let r = 1; r < 4; r++) { c.beginPath(); c.arc(ix, floor, 58, Math.PI, 0); c.stroke(); c.beginPath(); c.moveTo(ix - 58 + r * 4, floor - r * 15); c.lineTo(ix + 58 - r * 4, floor - r * 15); c.stroke(); }
        c.fillStyle = 'rgba(60,90,130,0.8)'; c.beginPath(); c.arc(ix, floor, 20, Math.PI, 0); c.fill();
        break;
      }
      case 'Great Oak Clearing': {
        // the great oak the moose keeps bumping into (it shakes when he does)
        const b = bossOf(room, play);
        const shake = b && b.state === 'sniffle' && b.stuck === 'antlers' && b.stT % 50 < 12 ? Math.sin(t * 2) * 3 : 0;
        const tx = X(ad.tree) + shake;
        c.fillStyle = '#6a4a2a';
        c.beginPath(); c.moveTo(tx - 34, floor); c.quadraticCurveTo(tx - 22, Y(8), tx - 18, Y(4)); c.lineTo(tx + 18, Y(4)); c.quadraticCurveTo(tx + 22, Y(8), tx + 34, floor); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(40,24,10,0.5)'; c.lineWidth = 2;
        for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(tx - 16 + i * 8, Y(5)); c.quadraticCurveTo(tx - 14 + i * 7, Y(9), tx - 18 + i * 9, floor); c.stroke(); }
        c.fillStyle = '#e8783a';
        for (const [dx, dy, r] of [[0, 2.5, 90], [-80, 4, 60], [80, 3.5, 66], [-30, 0.5, 60], [40, 1, 56]]) { G().circle(tx + dx, Y(dy), r, c); c.fill(); }
        c.fillStyle = '#ffb060';
        for (const [dx, dy, r] of [[-20, 1.6, 34], [50, 2.6, 30], [-70, 3.4, 26]]) { G().circle(tx + dx, Y(dy), r, c); c.fill(); }
        break;
      }
      case 'Bamboo Grove': {
        for (const col of ad.bamboo || []) A().bamboo(c, X(col), floor + 10, 14 * T, 14, 'rgba(80,140,90,0.7)');
        for (const col of [7, 18]) A().lantern(c, X(col), Y(3.5), 'rgba(80,60,60,0.7)');
        break;
      }
      case 'Moon Garden': {
        // a big friendly Earth hanging in the sky
        G().drawGlow(X(8), Y(3), 120, '#9fd8ff', 0.4, c);
        c.fillStyle = '#5fb8ff'; G().circle(X(8), Y(3), 46, c); c.fill();
        c.fillStyle = '#6fcf8a';
        G().ellipse(X(8) - 14, Y(3) - 12, 16, 10, 0.4, c); c.fill(); G().ellipse(X(8) + 16, Y(3) + 12, 14, 9, -0.3, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)'; G().ellipse(X(8) + 4, Y(3) - 30, 20, 5, 0, c); c.fill();
        break;
      }
    }
    c.restore();
  }

  // things that lie on the floor, drawn over the tiles
  function drawFront(c, room, cam, t) {
    const ad = room.def.arena;
    const X = col => (room.x + col) * T - cam.x, Y = row => (room.y + row) * T - cam.y;
    // (the solid floor, not a one-way ledge above it)
    const floorAt = col => { for (let r = 0; r < room.h; r++) { const k = BB.Physics.landKind(room.grid[r][col], { glow: true }); if (k === 1 || k === 3) return Y(r); } return Y(14); };
    if (ad.mud != null) {
      const x = X(ad.mud) + T / 2, y = floorAt(ad.mud);
      c.fillStyle = '#7a5030'; G().ellipse(x, y + 2, 34, 8, 0, c); c.fill();
      c.fillStyle = '#9a6a42'; G().ellipse(x - 6, y, 20, 4, 0, c); c.fill();
      const k = (t * 0.015) % 1; c.strokeStyle = `rgba(90,60,30,${1 - k})`; c.lineWidth = 1.5; G().circle(x + 12, y - k * 5, 2 + k * 3, c); c.stroke();
    }
    if (ad.holes) for (const col of ad.holes) {
      const x = X(col) + T / 2, y = floorAt(col);
      c.fillStyle = '#3a2418'; G().ellipse(x, y + 1, 17, 5, 0, c); c.fill();
      c.strokeStyle = '#8a5a34'; c.lineWidth = 2; G().ellipse(x, y + 1, 19, 6, 0, c); c.stroke();
    }
    if (ad.icy) {
      // a glassy sheen on the frozen floor, and the thin ice (look — cracks!)
      c.fillStyle = 'rgba(220,240,255,0.35)'; c.fillRect(X(2), Y(14) - 2, 26 * T, 6);
      const x = X(ad.crack) + T / 2, y = Y(14) + 1;
      c.strokeStyle = 'rgba(80,120,170,0.9)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 14, y + 3); c.lineTo(x - 4, y - 1); c.lineTo(x + 8, y + 4); c.lineTo(x + 18, y); c.lineTo(x + 32, y + 2); c.stroke();
      c.beginPath(); c.moveTo(x - 4, y - 1); c.lineTo(x - 2, y + 8); c.moveTo(x + 8, y + 4); c.lineTo(x + 14, y + 10); c.stroke();
    }
    if (ad.name === 'Mushroom Ring') {
      // a fairy ring of tiny glowing mushrooms
      for (let i = 0; i < 9; i++) {
        const col = 4 + i * 2.6, x = X(col), y = Y(14);
        c.fillStyle = '#f5ead0'; c.fillRect(x - 1.5, y - 7, 3, 7);
        c.fillStyle = '#7cf5d4'; c.beginPath(); c.ellipse(x, y - 7, 6, 4, 0, Math.PI, 0); c.fill();
        G().drawGlow(x, y - 8, 12, '#7cf5d4', 0.4 + 0.2 * Math.sin(t * 0.05 + i), c);
      }
    }
    if (ad.craters) for (const [a, b] of ad.craters) {
      c.fillStyle = 'rgba(40,30,90,0.35)'; G().ellipse((X(a) + X(b + 1)) / 2, Y(15) - 2, (b - a + 1) * T / 2, 8, 0, c); c.fill();
    }
  }

  BB.Arenas = { drawBack, drawFront };
})(window.BB);
