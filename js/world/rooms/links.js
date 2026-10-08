// ════════════════════════════════════════════════════════════════
//  LINKS — winding trails that join the zones in the compact
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
  // signs: [[col, row, arrow], …] — R L U D signposts pointing onward
  const link = (def, m) => {
    for (const [x, y, ch] of def.signs || []) m[y][x] = ch;
    const out = Object.assign({ link: true, climb: true }, def, { map: m.map(r => r.join('')) });
    delete out.signs;
    BB.room(out);
  };

  // a climbing shaft one cell wide: in through `from` and out through `to`
  // ({ side: 'L' | 'R', top: first open row, floor: the floor row under
  // it }), with overlapping terraces three rows apart
  function shaft(h, from, to, rhythm = 0) {
    const m = box(15, h);
    const lo = Math.max(from.floor, to.floor), hi = Math.min(from.top, to.top);
    fill(m, 1, hi, 13, lo - 1, '.');
    for (const d of [from, to]) fill(m, d.side === 'L' ? 0 : 14, d.top, d.side === 'L' ? 0 : 14, d.floor - 1, '.');
    // the landing by each door, then ledges zig-zagging between
    for (const d of [from, to]) if (d.floor < lo) ledge(m, d.floor, d.side === 'L' ? 1 : 6, d.side === 'L' ? 8 : 13);
    // Overlapping terraces turn through the room rather than alternating
    // two identical ladders. Three-row rises leave generous jump margin.
    const terraces = [[2, 8], [5, 12], [3, 10], [1, 7], [6, 13]];
    let step = rhythm;
    for (let y = lo - 3; y > hi + 1; y -= 3) {
      if ([from, to].some(d => Math.abs(d.floor - y) < 2)) continue;
      const [a, b] = terraces[step++ % terraces.length];
      ledge(m, y, a, b);
      m[y - 1][step % 2 ? a + 1 : b - 1] = '*';
    }
    return m;
  }

  // ── The Golden Tower: one shaft (columns 12–17) from the Crystal
  // Caverns' pillar (c5) up to the Hive (h1). Its open trails finish at
  // a short sheer neck that needs Sticky Paws. The glen and garden cross it
  // on one-way leaves, so walking across is safe and you can't fall in.
  const SHAFT = [12, 17];
  function tower(h, crossings) {
    const m = box(30, h);
    fill(m, 1, 0, 28, h - 1, '.');
    for (const { top, floor, left, right } of crossings) {
      fill(m, left ? 0 : 1, top, right ? 29 : 28, floor - 1, '.');
      fill(m, 0, floor, 29, floor, '#');
      ledge(m, floor, SHAFT[0] - 1, SHAFT[1] + 1);
      fill(m, 1, floor + 1, 28, h - 1, '#');
      fill(m, SHAFT[0], floor + 1, SHAFT[1], h - 1, '.');
    }
    return m;
  }
  // tg ─ the Golden Tower above the garden path, climbing on to the Hive
  // tw ─ the Golden Gate: the garden path right outside the front door,
  //      with the tower rising out of it (one room with the gardens)
  {
    const m = tower(35, [{ top: 27, floor: 32, left: true, right: true }]);
    fill(m, SHAFT[0], 0, SHAFT[1], 0, '.');           // up into the Hive
    // A single short sheer neck, above BOTH early crossings, still needs
    // Sticky Paws. Double Jump cannot skip it. All of the lower tower is
    // an open trail with balconies rather than inaccessible side shafts.
    for (let y = 0; y <= 10; y++) { m[y][11] = '#'; m[y][18] = '#'; }
    for (const [y, a, b] of [[29, 6, 13], [26, 13, 21], [23, 6, 14], [20, 13, 23], [17, 5, 13], [14, 11, 20], [12, 8, 20]]) {
      ledge(m, y, a, b);
      m[y - 1][Math.floor((a + b) / 2)] = '*';
    }
    // Side trails meet the next landing: exploring earns both stars and height.
    for (const [y, a, b] of [[29, 23, 28], [26, 24, 28], [23, 2, 7], [20, 2, 7], [17, 2, 6]]) ledge(m, y, a, b);
    for (const [x, y] of [[26, 28], [26, 25], [4, 22], [4, 16]]) m[y][x] = '*';
    m[19][4] = 'B'; m[19][6] = 'W';
    for (const x of [4, 8, 22, 26]) m[31][x] = '*';  // a little sparkle trail along the path
    link({ id: 'tg', zone: 3, x: 0, y: -18, name: 'Golden Tower', signs: [[14, 11, 'U']] }, m.slice(0, 17));
    link({ id: 'tw', zone: 0, x: 0, y: -1, name: 'Golden Gate', cameraGroup: 'home-neighbourhood',
      hatch: { id: 'gardenMushroom', row: 15, left: 12, right: 14, approachLeft: 12, approachRight: 17 },
      signs: [[3, 14, 'R']] }, m.slice(17));
  }
  // tx ─ crosses the glen (Rainy Hollow ↔ Glowpond Cliffs) above the Caverns' pillar
  {
    const m = tower(17, [{ top: 9, floor: 14, left: true, right: true }]);
    fill(m, SHAFT[0], 0, SHAFT[1], 0, '.');
    fill(m, 1, 0, 28, 8, '.');
    // Mushroom terraces cross the full width; the walking floor stays intact.
    for (const [y, a, b] of [[11, 4, 10], [8, 13, 21], [5, 5, 13], [2, 12, 21]]) {
      ledge(m, y, a, b); m[y - 1][Math.floor((a + b) / 2)] = '*';
    }
    ledge(m, 5, 23, 28); m[4][26] = '*';
    for (const x of [4, 8, 22, 26]) m[13][x] = '*';
    link({ id: 'tx', zone: 1, x: 0, y: 17, name: 'Golden Tower', ceilingPeek: 5, signs: [[24, 13, 'L']] }, m);
  }

  // mg ─ a glowing mushroom stair up from Rainy Hollow to the glen path
  {
    const m = box(15, 34);
    fill(m, 0, 0, 13, 13, '.');                      // out west at the top, onto the glen path
    fill(m, 1, 14, 13, 30, '.');
    fill(m, 14, 17, 14, 30, '.');                    // in from Rainy Hollow at the bottom
    for (const [y, a, b] of [[27, 5, 12], [24, 2, 9], [21, 6, 13], [18, 3, 10], [14, 1, 9], [11, 5, 12], [8, 1, 8]]) ledge(m, y, a, b);
    m[25][9] = '*'; m[21][3] = '*'; m[17][10] = '*'; m[13][4] = '*';
    m[23][4] = '*'; m[10][9] = '*'; m[7][3] = '*';
    link({ id: 'mg', zone: 1, x: 30, y: 17, name: 'Mushroom Stair', signs: [[11, 30, 'U'], [3, 13, 'L']] }, m);
  }
  // mh ─ a mossy walk from the Mushroom Canopy to the Mushroom Ring
  {
    const m = box(30, 17);
    fill(m, 0, 0, 29, 13, '.');
    fill(m, 15, 14, 29, 14, '.'); fill(m, 21, 15, 29, 15, '.');
    for (const x of [5, 10, 18, 25]) m[x < 15 ? 13 : x < 21 ? 14 : 15][x] = '*';
    link({ id: 'mh', zone: 1, x: -120, y: 17, name: 'Mossy Walk', signs: [[26, 15, 'L']] }, m);
  }

  // gd ─ the leafy drop from the Tall Garden down into Goose Green
  {
    const m = box(15, 51);
    fill(m, 0, 0, 13, 13, '.');                      // in from the Tall Garden
    fill(m, 1, 14, 13, 47, '.');
    fill(m, 0, 34, 0, 47, '.');                      // out west into Goose Green
    for (const [y, a, b] of [[14, 6, 13], [17, 3, 10], [20, 1, 8], [23, 5, 12], [26, 3, 10], [29, 6, 13], [32, 2, 9], [35, 5, 12], [38, 1, 8], [41, 4, 11], [44, 6, 13]]) ledge(m, y, a, b);
    m[13][10] = '*'; m[21][3] = '*'; m[29][10] = '*'; m[38][4] = '*'; m[47][9] = '*';
    m[16][6] = '*'; m[25][7] = '*'; m[34][9] = '*'; m[43][10] = '*';
    link({ id: 'gd', zone: 0, x: 165, y: -17, name: 'Leafy Drop', signs: [[8, 13, 'D']] }, m);
  }

  // hl ─ the Rainy Steps: up from the Queen Bee's hall to the Rainy Ruins
  link({ id: 'hl', zone: 4, x: 180, y: -69, name: 'Rainy Steps', signs: [[3, 30, 'U'], [2, 13, 'L']] }, shaft(34, { side: 'L', top: 27, floor: 31 }, { side: 'L', top: 10, floor: 14 }));
  // rl ─ the Cloud Ladder: up from the Elephant's courtyard to the Cloud Castles
  link({ id: 'rl', zone: 5, x: -75, y: -120, name: 'Cloud Ladder', signs: [[11, 47, 'U'], [12, 13, 'R']] }, shaft(51, { side: 'R', top: 44, floor: 48 }, { side: 'R', top: 10, floor: 14 }, 2));

  // a plain link room: walls all round, air inside, then the openings
  // ({ side: 'L' | 'R', top, floor } doors, and holes in the top or bottom)
  function plain(w, h, doors, holes = []) {
    const m = box(w, h);
    fill(m, 1, 1, w - 2, h - 2, '.');
    for (const d of doors) fill(m, d.side === 'L' ? 0 : w - 1, d.top, d.side === 'L' ? 0 : w - 1, d.floor - 1, '.');
    for (const [row, x0, x1] of holes) fill(m, x0, row, x1, row, '.');
    return m;
  }

  // dl ─ Shore Cliff: from Octopus Cove up through the floor of the Dune Gate
  {
    const m = shaft(34, { side: 'R', top: 27, floor: 31 }, { side: 'R', top: 27, floor: 31 });
    fill(m, 1, 1, 13, 30, '.'); fill(m, 3, 0, 5, 0, '.');
    for (const [y, a, b] of [[28, 7, 13], [25, 3, 10], [22, 1, 8], [19, 5, 12], [16, 3, 10], [13, 6, 13], [10, 2, 9], [7, 5, 12], [4, 3, 9], [2, 1, 5]]) ledge(m, y, a, b);
    m[25][10] = '*'; m[20][3] = '*'; m[15][10] = '*'; m[10][3] = '*'; m[5][6] = '*';
    link({ id: 'dl', zone: 7, x: -390, y: 0, name: 'Shore Cliff', signs: [[11, 30, 'U']] }, m);
  }
  // fl ─ Frost Steps: up from the Camel's oasis to the foot of the Frosty Peaks
  link({ id: 'fl', zone: 8, x: -195, y: -17, name: 'Frost Steps', signs: [[3, 30, 'U'], [3, 13, 'L']] }, shaft(34, { side: 'L', top: 27, floor: 31 }, { side: 'L', top: 0, floor: 14 }, 3));
  // al ─ Leafy Climb: up the west edge from the Walrus's pond to the Autumn Woods
  link({ id: 'al', zone: 9, x: -405, y: -69, name: 'Leafy Climb', signs: [[11, 48, 'U'], [12, 13, 'R']] }, shaft(52, { side: 'R', top: 45, floor: 49 }, { side: 'R', top: 10, floor: 14 }, 1));
  // am ─ Root Tunnel: under the great old tree, then up into the Ring Grove
  {
    const m = plain(45, 17, [{ side: 'L', top: 0, floor: 14 }]);
    fill(m, 1, 0, 43, 0, '#'); fill(m, 30, 0, 32, 0, '.');
    fill(m, 1, 14, 43, 16, '#');
    for (const [y, a, b] of [[10, 34, 40], [6, 26, 32], [3, 33, 38]]) ledge(m, y, a, b);
    ledge(m, 13, 28, 35); ledge(m, 9, 25, 32); m[8][28] = '*';
    m[13][8] = '*'; m[13][14] = '*'; m[13][20] = '*'; m[9][37] = '*'; m[5][29] = '*';
    link({ id: 'am', zone: 9, x: -285, y: -69, name: 'Root Tunnel', signs: [[4, 13, 'R'], [31, 13, 'U']] }, m);
  }
  // sl ─ Moon Steps: up from the Moose's clearing to the Moonlit Springs
  // (a cozy bench and a full bowl at the top: a breather after the long west climb)
  {
    const m = shaft(34, { side: 'R', top: 27, floor: 31 }, { side: 'R', top: 10, floor: 14 }, 4);
    fill(m, 5, 14, 13, 14, '#');
    link({ id: 'sl', zone: 10, x: -360, y: -103, name: 'Moon Steps', signs: [[11, 30, 'U'], [12, 13, 'R'], [7, 13, 'B'], [10, 13, 'W']] }, m);
  }
  // tl ─ Star Bridge: from the Panda's grove onto the Starlight path
  {
    const m = plain(15, 17, [{ side: 'L', top: 10, floor: 14 }, { side: 'R', top: 0, floor: 14 }]);
    fill(m, 1, 0, 13, 0, '.'); fill(m, 1, 14, 13, 16, '#');
    m[13][5] = '*'; m[13][7] = '*'; m[13][10] = '*';
    link({ id: 'tl', zone: 11, x: -135, y: -103, name: 'Star Bridge', signs: [[3, 13, 'R']] }, m);
  }
  // tm ─ Comet Chute: a long drop down to the Comet Nook's path
  {
    const m = plain(15, 51, [{ side: 'L', top: 0, floor: 14 }, { side: 'L', top: 34, floor: 48 }]);
    fill(m, 1, 0, 13, 0, '.');
    fill(m, 1, 48, 13, 50, '#');
    for (const [y, a, b] of [[14, 1, 7], [17, 4, 11], [21, 7, 13], [25, 3, 10], [29, 1, 8], [33, 5, 12], [37, 7, 13], [41, 3, 10], [45, 1, 8]]) ledge(m, y, a, b);
    m[21][10] = '*'; m[29][4] = '*'; m[38][10] = '*'; m[47][5] = '*';
    m[16][8] = '*'; m[24][6] = '*'; m[32][9] = '*'; m[44][3] = '*';
    link({ id: 'tm', zone: 11, x: -90, y: -103, name: 'Comet Chute', signs: [[3, 13, 'D']] }, m);
  }
  // tn ─ Star Well: from the Comet Nook's path, down to the Star Whale
  {
    const m = plain(15, 34, [{ side: 'R', top: 10, floor: 14 }], [[33, 1, 13]]);
    ledge(m, 14, 8, 13); ledge(m, 22, 1, 6);
    ledge(m, 18, 4, 11); ledge(m, 26, 5, 12); ledge(m, 30, 1, 8);
    m[21][3] = '*'; m[28][9] = '*';
    m[17][7] = '*'; m[25][10] = '*';
    link({ id: 'tn', zone: 11, x: -150, y: -69, name: 'Star Well', signs: [[11, 13, 'D']] }, m);
  }
})(window.BB);
