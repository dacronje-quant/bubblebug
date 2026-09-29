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
  const room = (id, x, name, map, detail) => BB.room({
    id, zone: 0, x, y: -17, name,
    neighbourhood: detail, cameraGroup: 'home-neighbourhood',
    map: map.map(row => row.join('')),
  });

  const garden = blank();
  // Keep the upper edge against the house closed; the open lower path
  // lines up exactly with the living-room floor (world row 14).
  for (let y = 0; y < 26; y++) garden[y][0] = garden[y][1] = '#';
  ledge(garden, 16, 3, 27);
  for (const [y, x] of [[28, 5], [25, 10], [22, 5], [19, 10]]) ledge(garden, y, x);
  for (const x of [9, 14, 20, 26]) put(garden, x, 30, '*');
  for (const [x, y] of [[7, 27], [12, 24], [7, 21], [12, 18]]) put(garden, x, y, '*');
  put(garden, 22, 30, 'n'); put(garden, 26, 29, 'f'); put(garden, 28, 30, 'R');
  room('ng', -90, 'Front Garden', garden, 'garden');

  const pond = blank();
  ledge(pond, 16, 0, 30);
  for (const x of [4, 10, 20, 26]) { put(pond, x, 30, '*'); put(pond, x, 15, '*'); }
  put(pond, 7, 30, 'n'); put(pond, 22, 15, 'n'); put(pond, 27, 30, 'R');
  // The pond is painted below a walkable timber bridge. Children can
  // cross the neighbourhood with movement alone, before learning jump.
  room('np', -60, 'Pond Walk', pond, 'pond');

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
  room('nr', -30, 'Root Hollow', roots, 'roots');

  // A garden maze beside the house: three switchback terraces with a
  // few short branches, rather than a dark labyrinth. Its lower exit is
  // always open; paw pads only open the optional treasure nook above.
  const maze = Array.from({ length: H }, (_, y) => Array(W).fill(y >= 32 || y === 0 ? '#' : '.'));
  for (let y = 0; y < 32; y++) {
    maze[y][0] = '#';
    if (y < 28) maze[y][29] = '#';
  }
  for (const [y, from, to] of [[25, 0, 24], [18, 5, 30], [11, 0, 24]])
    for (let x = from; x < to; x++) maze[y][x] = '#';
  for (const [y, x] of [[29, 24], [26, 21], [22, 3], [15, 24], [12, 21]]) ledge(maze, y, x, 4);
  ledge(maze, 19, 2, 3); // leave column 1 clear for the walk back down
  // A three-pad picture sign on the gate explains the whole challenge.
  for (let x = 0; x <= 9; x++) maze[7][x] = '#';
  for (let y = 8; y < 11; y++) maze[y][9] = 'G';
  for (const [x, y] of [[7, 31], [12, 24], [21, 17]]) put(maze, x, y, 'P');
  for (const [x, y] of [[12, 31], [18, 31], [25, 31], [6, 24], [16, 24], [22, 24], [8, 17], [15, 17], [26, 17], [3, 10], [5, 10], [7, 10]]) put(maze, x, y, '*');
  put(maze, 27, 31, 'R'); put(maze, 25, 28, 'U');
  put(maze, 5, 21, 'f'); put(maze, 26, 14, 'f');
  BB.room({ id: 'nm', zone: 0, x: -180, y: -18, name: 'Pawprint Maze',
    neighbourhood: 'maze', cameraGroup: 'home-neighbourhood', map: maze.map(row => row.join('')) });
})(window.BB);
