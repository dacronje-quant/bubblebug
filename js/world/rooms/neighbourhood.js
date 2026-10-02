// ════════════════════════════════════════════════════════════════
//  HOME NEIGHBOURHOOD — three adjoining outdoor rooms, walked through
//  without a fade or frozen camera slide. The broad lower path leads
//  from home to the tutorial; gentle leaf steps reach an optional upper
//  root walk and loop back down. No elder power or boss can be skipped.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const W = 30, H = 34;
  const blank = () => Array.from({ length: H }, (_, y) => Array(W).fill(y >= 31 ? '#' : '.'));
  const ledge = (map, y, x, length = 5) => { for (let i = x; i < x + length; i++) map[y][i] = '-'; };
  const put = (map, x, y, ch) => { map[y][x] = ch; };
  const room = (id, x, name, map, detail, extras = {}) => BB.room({
    id, zone: 0, x, y: -17, name,
    neighbourhood: detail, cameraGroup: 'home-neighbourhood',
    map: map.map(row => row.join('')),
    ...extras,
  });

  const garden = blank();
  // Keep the upper edge against the house closed; the open lower path
  // lines up exactly with the living-room floor (world row 14).
  for (let y = 0; y < 26; y++) garden[y][0] = garden[y][1] = '#';
  // Broad overlapping leaf steps leave room to turn and jump. The
  // three-tile opening above the last step gives the climb a clear exit.
  for (const [x, length] of [[3, 11], [17, 6], [25, 5]]) ledge(garden, 16, x, length);
  for (const [y, x] of [[28, 4], [25, 9], [22, 4], [19, 9]]) ledge(garden, y, x, y === 19 ? 9 : 8);
  // Flush with the main path: walking across never meets a raised wall.
  for (let x = 5; x < 8; x++) put(garden, x, 31, 'M');
  for (const x of [9, 14, 20, 26]) put(garden, x, 30, '*');
  for (const [x, y] of [[7, 27], [12, 24], [7, 21], [12, 18]]) put(garden, x, y, '*');
  put(garden, 22, 30, 'n'); put(garden, 26, 29, 'f'); put(garden, 28, 30, 'R');
  room('ng', -90, 'Front Garden', garden, 'garden', { trampoline: { col: 5, row: 31, width: 3 } });

  const pond = blank();
  // Short, forgiving hops break up the long upper bridge. The entire
  // lower walk stays open for kittens who have not learned to jump yet.
  for (const [x, length] of [[0, 7], [9, 6], [17, 6], [25, 5]]) ledge(pond, 16, x, length);
  for (const x of [4, 10, 20, 26]) { put(pond, x, 30, '*'); put(pond, x, 15, '*'); }
  put(pond, 7, 30, 'n'); put(pond, 22, 15, 'n'); put(pond, 27, 30, 'R');
  // The pond is painted below a walkable timber bridge. Children can
  // cross the neighbourhood with movement alone, before learning jump.
  room('np', -60, 'Pond Walk', pond, 'pond', { kin: [{ id: 'rbGrandpa', x: 13, y: 15 }] });

  const roots = blank();
  ledge(roots, 16, 0, 19);
  for (let y = 0; y < 26; y++) roots[y][29] = '#';
  // Two familiar sleepy buds open a little nook off the optional path.
  // A solid roof and floor contain its prize; the main path stays open.
  for (let x = 19; x < 30; x++) roots[12][x] = roots[16][x] = '#';
  for (let y = 13; y < 16; y++) roots[y][19] = 'G';
  put(roots, 7, 15, 'o'); put(roots, 12, 15, 'o');
  for (const [y, x] of [[19, 23], [22, 19], [25, 23], [28, 19]]) ledge(roots, y, x);
  for (const [x, y] of [[5, 30], [14, 30], [25, 24], [21, 27], [4, 15], [15, 15], [23, 15], [26, 15]]) put(roots, x, y, '*');
  put(roots, 16, 29, 'n'); put(roots, 25, 30, 'R');
  room('nr', -30, 'Root Hollow', roots, 'roots', { glasses: [{ id: 'googly', x: 25, y: 15 }] });

  // A quiet path left of home. Once all 12 cats are found a rainbow
  // appears here; its picture choice opens the separate maze game.
  const maze = Array.from({ length: H }, () => Array(W).fill('#'));
  for (let y = 28; y < 32; y++) for (let x = 1; x < 30; x++) maze[y][x] = '.';
  BB.room({ id: 'nm', zone: 0, x: -180, y: -18, name: 'Pawprint Maze',
    neighbourhood: 'maze', maze: true, cameraGroup: 'home-neighbourhood',
    mazeStars: [[12,31],[18,31],[25,31],[6,24],[16,24],[22,24],[8,17],[15,17],[26,17],[3,10],[5,10],[7,10]],
    map: maze.map(row => row.join('')) });
})(window.BB);
