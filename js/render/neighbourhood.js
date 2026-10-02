// A shared fence, stream and root canopy tie the walk outside home
// together. These are scenery; the room grids own every landing surface.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE;
  const G = () => BB.G;
  const TAU = Math.PI * 2;

  function tree(c, x, floor, top, apples, t) {
    c.fillStyle = '#8a5a37';
    G().rrect(x - 14, top + 35, 28, floor - top - 35, 12, c); c.fill();
    c.strokeStyle = '#ad7745'; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, top + 100); c.lineTo(x - 64, top + 53);
    c.moveTo(x, top + 94); c.lineTo(x + 64, top + 42); c.stroke();
    for (let i = 0; i < 5; i++) {
      c.fillStyle = ['#4f9e6c', '#6fbf72', '#83cd7c'][i % 3];
      G().ellipse(x + (i - 2) * 35, top + Math.abs(i - 2) * 12, 57, 46, 0, c); c.fill();
    }
    if (apples) for (let i = 0; i < 4; i++) {
      const ax = x + (i - 1.5) * 33, ay = top + 16 + Math.sin(t * 0.025 + i) * 2;
      c.fillStyle = '#ed7b79'; G().ellipse(ax, ay, 8, 9, 0, c); c.fill();
      c.fillStyle = '#c9e88a'; G().ellipse(ax + 3, ay - 10, 5, 2.5, -0.5, c); c.fill();
    }
  }

  function drawBack(c, room, cam, t) {
    const X = col => (room.x + col) * T - cam.x;
    const Y = row => (room.y + row) * T - cam.y;
    const kind = room.def.neighbourhood;
    if (kind === 'maze') return; // the grand Rainbow courtyard owns its scenery
    c.save();
    // A single fence and flowering hedge continue across all three rooms.
    c.strokeStyle = '#d8b589'; c.lineWidth = 6; c.lineCap = 'round';
    const floor = kind === 'maze' ? 32 : 31;
    for (let col = 1; col < 30; col += 2) {
      c.beginPath(); c.moveTo(X(col), Y(floor)); c.lineTo(X(col), Y(floor - 1.5)); c.stroke();
    }
    c.beginPath(); c.moveTo(X(0), Y(floor - 1)); c.lineTo(X(30), Y(floor - 1)); c.stroke();
    for (let col = 0; col <= 30; col += 3) {
      c.fillStyle = '#77b77b'; G().ellipse(X(col), Y(floor - 0.2), 34, 13, 0, c); c.fill();
    }
    // Branches follow the actual platforms so the new jumping gaps
    // look open, rather than painting a false bridge across empty air.
    if (kind !== 'maze') {
      c.strokeStyle = '#8a5a37'; c.lineWidth = 15; c.lineCap = 'round';
      const row = room.grid[16];
      for (let start = 0; start < room.w;) {
        if (!BB.Physics.landKind(row[start], { glow: true })) { start++; continue; }
        let end = start + 1;
        while (end < room.w && BB.Physics.landKind(row[end], { glow: true })) end++;
        const length = end - start;
        c.beginPath(); c.moveTo(X(start) + 4, Y(16) + 9);
        c.bezierCurveTo(X(start + length / 3), Y(16) + 16, X(start + length * 2 / 3), Y(16) + 3, X(end) - 4, Y(16) + 9); c.stroke();
        start = end;
      }
    }
    if (kind === 'maze') {
      for (const col of [4, 10, 15]) {
        c.fillStyle = '#82bc8d'; G().ellipse(X(col), Y(32) - 24, 54, 25, 0, c); c.fill();
        BB.Tiles.flower(c, X(col), Y(32) - 32, '#fff1c2', 0.8);
      }
    } else tree(c, X(kind === 'garden' ? 21 : kind === 'pond' ? 19 : 15), Y(31), Y(13.5), kind === 'roots', t);
    if (kind !== 'maze') {
      // Flower beds, little flags and spinning pinwheels make the walk
      // feel like a shared garden even before its first friend arrives.
      for (let col = 3; col < 29; col += 3) {
        c.fillStyle = '#85c27a'; G().ellipse(X(col), Y(31) - 5, 29, 10, 0, c); c.fill();
        for (let i = -1; i <= 1; i++) BB.Tiles.flower(c, X(col) + i * 14, Y(31) - 16 - (i === 0 ? 6 : 0), ['#ffe5a1', '#ffb3d1', '#cec0f4'][(col + i + 3) % 3], 0.7);
      }
      c.strokeStyle = '#c3a486'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(10), Y(17.3)); c.quadraticCurveTo(X(18), Y(19.3), X(26), Y(17.3)); c.stroke();
      for (let i = 0; i < 7; i++) {
        const u = (i + 0.5) / 7, px = X(10 + u * 16), py = Y(17.3 + 4 * u * (1 - u));
        c.fillStyle = ['#ffb3d1', '#ffe5a1', '#a8dce3', '#cec0f4'][i % 4];
        c.beginPath(); c.moveTo(px - 8, py); c.lineTo(px + 8, py); c.lineTo(px + Math.sin(t * 0.025 + i) * 3, py + 15); c.closePath(); c.fill();
      }
      const px = X(kind === 'garden' ? 5 : kind === 'pond' ? 4 : 26), py = Y(31) - 55;
      c.strokeStyle = '#c3a486'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px, Y(31)); c.stroke();
      c.save(); c.translate(px, py); c.rotate(t * 0.014);
      for (let i = 0; i < 4; i++) {
        c.rotate(TAU / 4); c.fillStyle = ['#ffb3d1', '#ffe5a1', '#a8dce3', '#cec0f4'][i];
        c.beginPath(); c.moveTo(0, 0); c.lineTo(17, -7); c.lineTo(12, 13); c.closePath(); c.fill();
      }
      c.fillStyle = '#fff8ef'; G().circle(0, 0, 4, c); c.fill(); c.restore();
    }
    if (kind === 'garden') {
      // The porch belongs to the real house on this room's left edge.
      c.fillStyle = '#d8b68c'; G().rrect(X(0), Y(27), 34, 4 * T, 6, c); c.fill();
      c.fillStyle = '#c56d58';
      c.beginPath(); c.moveTo(X(0) - 5, Y(27)); c.lineTo(X(0) + 17, Y(26)); c.lineTo(X(0) + 42, Y(27)); c.closePath(); c.fill();
      G().drawGlow(X(0) + 17, Y(28.2), 38, '#fff2b0', 0.45, c);
      c.fillStyle = '#fff2b0'; G().circle(X(0) + 17, Y(28.2), 5, c); c.fill();
      for (const col of [18, 25]) {
        c.fillStyle = '#c96a4a'; G().rrect(X(col) - 16, Y(31) - 17, 32, 17, 5, c); c.fill();
        BB.Tiles.flower(c, X(col), Y(31) - 20, '#ff9ec7', 1.3);
      }
    } else if (kind === 'roots') {
      // A root arch surrounds the sleepy-bud nook; the live gate remains
      // visible so its two flower pictures explain how to open it.
      c.strokeStyle = '#705039'; c.lineWidth = 18;
      c.beginPath(); c.moveTo(X(29.4), Y(16)); c.lineTo(X(29.4), Y(12.5));
      c.quadraticCurveTo(X(24), Y(10.8), X(19.2), Y(12.5)); c.stroke();
    }
    c.restore();
  }

  function drawFront(c, room, cam, t) {
    if (room.def.neighbourhood === 'maze') return;
    const X = col => (room.x + col) * T - cam.x;
    const Y = row => (room.y + row) * T - cam.y;
    c.save();
    if (room.def.neighbourhood === 'pond') {
      // The bridge surface matches the solid row in the map. Water is
      // below it, so the first walk outside never requires a jump.
      const x = X(8), y = Y(31) + 8, w = 14 * T;
      c.fillStyle = '#6fd0f0'; G().ellipse(x + w / 2, y + 26, w / 2, 34, 0, c); c.fill();
      c.strokeStyle = '#d6f4ff'; c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const rx = x + 36 + i * 77 + Math.sin(t * 0.03 + i) * 8;
        c.beginPath(); c.ellipse(rx, y + 20 + (i % 2) * 12, 14, 3, 0, 0, TAU); c.stroke();
      }
      c.fillStyle = '#ad7745'; c.fillRect(x, Y(31), w, 9);
      c.strokeStyle = '#704b31'; c.lineWidth = 2;
      for (let col = 8; col < 22; col++) {
        c.beginPath(); c.moveTo(X(col), Y(31)); c.lineTo(X(col), Y(31) + 9); c.stroke();
      }
    }
    // A few petals sit at the feet, clear of the kitten and touch buttons.
    for (const col of [3, 9, 17, 27]) BB.Tiles.flower(c, X(col), Y(room.def.neighbourhood === 'maze' ? 32 : 31) + 4, '#ffd1e8', 0.65);
    c.restore();
  }

  BB.Neighbourhood = { drawBack, drawFront };
})(window.BB);
