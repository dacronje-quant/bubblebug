// Small biome details make a winding trail read as branches, terraces,
// coral shelves or resting perches. They never add collision or obscure
// the platform top. Reuse the terrain palette and cache the shelf scan.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, cache = new WeakMap();
  function hatch(c, room, cam) {
    const h = room.def.hatch;
    if (!h) return;
    const W = BB.World, floor = (room.y + h.row) * T;
    const rim = (room.y + room.h) * T;
    const left = (room.x + h.left) * T - cam.x;
    const right = (room.x + h.right + 1) * T - cam.x;
    const middle = (left + right) / 2, y = floor - cam.y;
    const open = W.tile(room.x + h.left, room.y + h.row) === '.';
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    // Follow the actual solid underside, including its opening. The pale
    // stone edge and roots make blocked soil legible against the glen sky.
    for (let col = 1; col < room.w - 1; col++) {
      const tx = room.x + col, ty = room.y + room.h - 1;
      if (W.tile(tx, ty) !== '#' || W.tile(tx, ty + 1) === '#') continue;
      const x = tx * T - cam.x, bottom = rim - cam.y;
      c.fillStyle = '#423624'; c.fillRect(x, bottom - 7, T, 9);
      c.fillStyle = '#e5c78b'; c.fillRect(x, bottom - 4, T, 3);
      c.strokeStyle = '#756344'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 7, bottom + 1); c.lineTo(x + 11, bottom + 12);
      c.moveTo(x + 11, bottom + 8); c.lineTo(x + 16, bottom + 12); c.stroke();
    }
    // Fixed posts flank the pass-through shaft, never inside its collision gap.
    for (const col of [h.approachLeft, h.approachRight + 1]) {
      const x = (room.x + col) * T - cam.x;
      c.strokeStyle = '#fff0b0'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, rim - cam.y - 5); c.lineTo(x, rim - cam.y + 27); c.stroke();
    }
    c.strokeStyle = '#75502b'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(left, y - 9); c.lineTo(left, y + 10);
    c.moveTo(right, y - 9); c.lineTo(right, y + 10); c.stroke();
    if (!open) {
      // A golden slatted hatch is visibly different from the solid soil.
      c.fillStyle = '#9c6c35'; c.fillRect(left + 2, y + 2, right - left - 4, 7);
      c.fillStyle = '#ffe9a0'; c.fillRect(left + 2, y, right - left - 4, 3);
      for (let x = left + 12; x < right; x += 20) { c.fillStyle = '#efd398'; c.fillRect(x, y + 3, 3, 6); }
    } else {
      // Folded leaves hang below the rim; the landing surface stays clear.
      c.fillStyle = '#b38145'; c.fillRect(left - 9, y + 2, 7, 24); c.fillRect(right + 2, y + 2, 7, 24);
      c.fillStyle = '#ffe9a0'; c.fillRect(left - 9, y + 2, 3, 24); c.fillRect(right + 6, y + 2, 3, 24);
    }
    // Simple arrows above and below show the usable aperture in both rooms.
    const arrow = (ax, ay, down) => {
      c.strokeStyle = '#fff0b0'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(ax, ay + (down ? -9 : 9)); c.lineTo(ax, ay + (down ? 9 : -9));
      c.moveTo(ax - 6, ay + (down ? 2 : -2)); c.lineTo(ax, ay + (down ? 9 : -9));
      c.lineTo(ax + 6, ay + (down ? 2 : -2)); c.stroke();
    };
    const up = (room.x + h.approachRight - 0.5) * T - cam.x;
    arrow(up, rim - cam.y + 20, false);
    if (open) arrow(middle, y - 33, true);
    // Picture cues only: a little hinged hatch below, and a mushroom
    // over the return arrow. Young kittens never need to read a label.
    const badgeY = rim - cam.y + 43;
    c.fillStyle = 'rgba(45,31,64,0.8)';
    c.beginPath(); c.arc(middle, badgeY, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = open ? '#a3ef94' : '#ffe9a0'; c.lineWidth = 2;
    c.beginPath(); c.arc(middle, badgeY, 17, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#ffe9a0'; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(middle - 12, badgeY + 5); c.lineTo(middle - 12, badgeY - 4);
    c.lineTo(middle - (open ? 17 : 1), badgeY - (open ? 13 : 4));
    c.moveTo(middle + 12, badgeY + 5); c.lineTo(middle + 12, badgeY - 4);
    c.lineTo(middle + (open ? 17 : -1), badgeY - (open ? 13 : 4)); c.stroke();
    if (open) {
      c.strokeStyle = '#a3ef94';
      c.beginPath(); c.moveTo(middle - 6, badgeY + 3); c.lineTo(middle - 1, badgeY + 8); c.lineTo(middle + 7, badgeY - 1); c.stroke();
      const my = y - 56;
      c.fillStyle = '#f5ead0'; c.fillRect(middle - 3, my - 1, 6, 12);
      c.fillStyle = '#e88aa8'; c.strokeStyle = '#6a3d66'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(middle, my - 2, 13, 9, 0, Math.PI, Math.PI * 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff4ce';
      for (const [dx, dy] of [[-6, -5], [0, -8], [6, -4]]) { c.beginPath(); c.arc(middle + dx, my + dy, 2, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
  function shelves(room) {
    const old = cache.get(room);
    if (old && old.version === room.version) return old.list;
    const list = [];
    for (let row = 0; row < room.h; row++) {
      for (let col = 0; col < room.w; col++) {
        if (room.grid[row][col] !== '-') continue;
        const a = col;
        while (col + 1 < room.w && room.grid[row][col + 1] === '-') col++;
        if (col - a >= 3) list.push({ row, a, b: col });
      }
    }
    cache.set(room, { version: room.version, list });
    return list;
  }
  function draw(c, room, cam) {
    if (!room.def.climb) return;
    const Z = BB.ZONES[room.zone], key = Z.key;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of shelves(room)) {
      if (room.def.hatch && s.row === room.def.hatch.row) continue;
      const x = room.px + (s.a + 0.5) * T - cam.x;
      const end = room.px + (s.b + 0.5) * T - cam.x;
      const y = room.py + s.row * T - cam.y;
      if (y < -40 || y > BB.G.H + 40 || end < -40 || x > BB.G.W + 40) continue;
      const middle = (x + end) / 2;
      c.strokeStyle = BB.rgba(Z.ledgeDark, 0.85); c.fillStyle = Z.top; c.lineWidth = 2;
      if (key === 'gardens' || key === 'autumn' || key === 'ruins') {
        // Short trailing vines under the shelf, with foliage at their tips.
        for (const px of [x + 8, end - 8]) {
          c.beginPath(); c.moveTo(px, y + 7);
          c.bezierCurveTo(px - 4, y + 14, px + 5, y + 19, px, y + 27); c.stroke();
          c.beginPath(); c.ellipse(px - 3, y + 19, 6, 3, -0.5, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.ellipse(px + 3, y + 25, 5, 2.5, 0.5, 0, Math.PI * 2); c.fill();
        }
        if (key === 'ruins') {
          c.fillStyle = BB.rgba(Z.groundLight, 0.8);
          c.fillRect(middle - 14, y + 8, 28, 5);
          c.fillRect(middle - 9, y + 14, 18, 4);
        }
      } else if (key === 'meadow') {
        // A little cluster of fungus beneath the existing walkable cap.
        c.strokeStyle = BB.rgba(Z.top, 0.7); c.lineWidth = 1.5;
        for (const dx of [-9, 0, 9]) {
          c.beginPath(); c.moveTo(middle + dx, y + 9); c.lineTo(middle + dx, y + 23); c.stroke();
          c.fillStyle = BB.rgba(Z.ledge, 0.85);
          c.beginPath(); c.ellipse(middle + dx, y + 16, 6, 3, 0, Math.PI, Math.PI * 2); c.fill();
        }
      } else if (key === 'hive') {
        // Wax pendants beneath a terrace; its walking surface stays clear.
        c.fillStyle = BB.rgba(Z.top, 0.8);
        for (const px of [x + 12, end - 12]) {
          c.beginPath(); c.moveTo(px - 6, y + 8); c.lineTo(px - 4, y + 18);
          c.quadraticCurveTo(px, y + 25, px + 4, y + 18); c.lineTo(px + 6, y + 8); c.fill();
        }
      } else if (key === 'lagoon') {
        c.strokeStyle = BB.rgba(Z.top, 0.8); c.lineWidth = 2;
        for (const dx of [-10, 10]) {
          c.beginPath(); c.moveTo(middle + dx, y + 7);
          c.quadraticCurveTo(middle + dx - 5, y + 18, middle + dx + 2, y + 27); c.stroke();
        }
      } else if (key === 'springs' || key === 'starlight') {
        // Lanterns identify a resting perch without looking like obstacles.
        if (s.row % 2) {
          c.strokeStyle = Z.ledgeDark; c.lineWidth = 1;
          c.beginPath(); c.moveTo(middle, y + 9); c.lineTo(middle, y + 16); c.stroke();
          c.fillStyle = Z.light; c.beginPath(); c.ellipse(middle, y + 22, 6, 7, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = Z.ledgeDark; c.fillRect(middle - 5, y + 15, 10, 2); c.fillRect(middle - 4, y + 28, 8, 2);
        }
      } else if (key === 'caves' || key === 'frost') {
        c.fillStyle = BB.rgba(Z.topLight, 0.8);
        c.beginPath(); c.moveTo(middle - 7, y + 8); c.lineTo(middle, y + 26); c.lineTo(middle + 7, y + 8); c.fill();
      } else if (key === 'dunes') {
        c.fillStyle = BB.rgba(Z.groundLight, 0.8);
        c.beginPath(); c.moveTo(middle - 15, y + 8); c.lineTo(middle, y + 20); c.lineTo(middle + 15, y + 8); c.fill();
      }
    }
    c.restore();
  }
  const terrain = BB.Tiles.drawStatic;
  BB.Tiles.drawStatic = function (c, room, cam, shyAlpha, shyOnly) {
    terrain(c, room, cam, shyAlpha, shyOnly);
    if (!shyOnly) { draw(c, room, cam); hatch(c, room, cam); }
  };
  BB.ClimbArt = { draw, hatch };
})(window.BB);
