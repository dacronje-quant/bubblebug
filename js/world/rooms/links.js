// ════════════════════════════════════════════════════════════════
//  LINKS — small plain rooms that join the zones in the compact
//  kingdom: the Golden Tower, turnaround shafts, little walkways.
//  Each is drawn in code: ground `#` round the edges, one-way ledges
//  `-` to climb on, and openings exactly where its neighbours' doors are.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  // a blank map: walls all round
  const box = (w, h) => Array.from({ length: h }, () => Array(w).fill('#'));
  const fill = (m, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y][x] = ch; };
  const ledge = (m, y, x0, x1) => fill(m, x0, y, x1, y, '-');
  const link = (def, m) => BB.room(Object.assign({ link: true }, def, { map: m.map(r => r.join('')) }));

  // a climbing shaft one cell wide: in through `from` and out through `to`
  // ({ side: 'L' | 'R', top: first open row, floor: the floor row under
  // it }), with ledges every four rows to hop or climb between
  function shaft(h, from, to) {
    const m = box(15, h);
    const lo = Math.max(from.floor, to.floor), hi = Math.min(from.top, to.top);
    fill(m, 1, hi, 13, lo - 1, '.');
    for (const d of [from, to]) fill(m, d.side === 'L' ? 0 : 14, d.top, d.side === 'L' ? 0 : 14, d.floor - 1, '.');
    // the landing by each door, then ledges zig-zagging between
    for (const d of [from, to]) if (d.floor < lo) ledge(m, d.floor, d.side === 'L' ? 1 : 6, d.side === 'L' ? 8 : 13);
    let left = true;
    for (let y = lo - 4; y > hi + 1; y -= 4) {
      if ([from, to].some(d => Math.abs(d.floor - y) < 2)) continue;
      ledge(m, y, left ? 1 : 6, left ? 8 : 13); left = !left;
    }
    return m;
  }

  // ── The Golden Tower: one shaft (columns 12–17) from the Crystal
  // Caverns' pillar (c5) up to the Hive (h1). Its walls are sheer: only
  // Sticky Paws climb them. The glen path and the garden path cross it
  // on one-way leaves, so walking across is safe and you can't fall in.
  const SHAFT = [12, 17];
  function tower(h, crossings) {
    const m = box(30, h);
    fill(m, 1, 0, 28, h - 1, '.');
    // the shaft's walls, broken only where a path crosses
    for (let y = 0; y < h; y++) { m[y][SHAFT[0] - 1] = '#'; m[y][SHAFT[1] + 1] = '#'; }
    for (const { top, floor, left, right } of crossings) {
      fill(m, left ? 0 : 1, top, right ? 29 : 28, floor - 1, '.');
      fill(m, 0, floor, 29, floor, '#');
      ledge(m, floor, SHAFT[0] - 1, SHAFT[1] + 1);
      fill(m, 1, floor + 1, 28, h - 1, '#');
      fill(m, SHAFT[0], floor + 1, SHAFT[1], h - 1, '.');
    }
    return m;
  }
  // tg ─ crosses the garden path (Root Hollow → Sunny Patch) and climbs on to the Hive
  {
    const m = tower(35, [{ top: 27, floor: 32, left: true, right: true }]);
    fill(m, SHAFT[0], 0, SHAFT[1], 0, '.');           // up into the Hive
    // a little sparkle trail along the path
    for (const x of [4, 8, 22, 26]) m[31][x] = '*';
    link({ id: 'tg', zone: 3, x: 0, y: -18, name: 'Golden Tower' }, m);
  }
  // tx ─ crosses the glen (Rainy Hollow ↔ Glowpond Cliffs) above the Caverns' pillar
  {
    const m = tower(17, [{ top: 9, floor: 14, left: true, right: true }]);
    fill(m, SHAFT[0], 0, SHAFT[1], 0, '.');
    fill(m, 1, 0, 28, 8, '.');
    for (let y = 0; y < 9; y++) { m[y][SHAFT[0] - 1] = '#'; m[y][SHAFT[1] + 1] = '#'; }
    for (const x of [4, 8, 22, 26]) m[13][x] = '*';
    link({ id: 'tx', zone: 1, x: 0, y: 17, name: 'Golden Tower' }, m);
  }

  // mg ─ a glowing mushroom stair up from Rainy Hollow to the glen path
  {
    const m = box(15, 34);
    fill(m, 0, 0, 13, 13, '.');                      // out west at the top, onto the glen path
    fill(m, 1, 14, 13, 30, '.');
    fill(m, 14, 17, 14, 30, '.');                    // in from Rainy Hollow at the bottom
    ledge(m, 14, 1, 9); ledge(m, 26, 7, 13); ledge(m, 22, 1, 7); ledge(m, 18, 6, 13);
    m[25][9] = '*'; m[21][3] = '*'; m[17][10] = '*'; m[13][4] = '*';
    link({ id: 'mg', zone: 1, x: 30, y: 17, name: 'Mushroom Stair' }, m);
  }
  // mh ─ a mossy walk from the Mushroom Canopy to the Mushroom Ring
  {
    const m = box(30, 17);
    fill(m, 0, 0, 29, 13, '.');
    fill(m, 15, 14, 29, 14, '.'); fill(m, 21, 15, 29, 15, '.');
    for (const x of [5, 10, 18, 25]) m[x < 15 ? 13 : x < 21 ? 14 : 15][x] = '*';
    link({ id: 'mh', zone: 1, x: -120, y: 17, name: 'Mossy Walk' }, m);
  }

  // gd ─ the leafy drop from the Tall Garden down into Goose Green
  {
    const m = box(15, 51);
    fill(m, 0, 0, 13, 13, '.');                      // in from the Tall Garden
    fill(m, 1, 14, 13, 47, '.');
    fill(m, 0, 34, 0, 47, '.');                      // out west into Goose Green
    ledge(m, 14, 6, 13); ledge(m, 22, 1, 8); ledge(m, 30, 6, 13); ledge(m, 39, 1, 8);
    m[13][10] = '*'; m[21][3] = '*'; m[29][10] = '*'; m[38][4] = '*'; m[47][9] = '*';
    link({ id: 'gd', zone: 0, x: 165, y: -17, name: 'Leafy Drop' }, m);
  }

  // hl ─ the Rainy Steps: up from the Queen Bee's hall to the Rainy Ruins
  link({ id: 'hl', zone: 4, x: 180, y: -69, name: 'Rainy Steps' }, shaft(34, { side: 'L', top: 27, floor: 31 }, { side: 'L', top: 10, floor: 14 }));
  // rl ─ the Cloud Ladder: up from the Elephant's courtyard to the Cloud Castles
  link({ id: 'rl', zone: 5, x: -75, y: -120, name: 'Cloud Ladder' }, shaft(51, { side: 'R', top: 44, floor: 48 }, { side: 'R', top: 10, floor: 14 }));
})(window.BB);
