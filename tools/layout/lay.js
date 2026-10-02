// Trial layout for the kingdom map rebuild (see docs/kingdom-map-plan.md).
// node tools/layout/lay.js > /tmp/lay.json && node tools/layout-check.js --layout /tmp/lay.json --picture
// Trial layout: room id → { x, y, flip } ; new link rooms → { x, y, w, h, zone }
const L = {};
const at = (id, x, y, extra = {}) => { L[id] = Object.assign({ x, y }, extra); };
const link = (id, x, y, w, h, zone) => { L[id] = { x, y, w, h, zone }; };

// ── Sparkle Gardens: east of the Golden Tower, on the ground floor
at('g1', 30, 0); at('g2', 60, 0); at('g3', 90, 0); at('g4', 135, -17); at('g5', 30, -17);
link('gd', 165, -17, 15, 51, 0);          // the leafy drop from the Tall Garden into the glen
at('g6', 135, 17, { flip: true });        // Goose Green, down in the glen
// ── Golden Tower
link('tg', 0, -18, 30, 35, 3);            // crosses the garden path
link('tx', 0, 17, 30, 17, 1);             // crosses the glen
// ── Mushroom Meadow: the glowing glen under the gardens and the house
at('m1', 105, 17, { flip: true }); at('m2', 75, 17); at('m3', 45, 34);   // Rainy Hollow sits a floor down
link('mg', 30, 17, 15, 34, 1);            // the mushroom stair back up to the glen path
// the Mushroom Canopy now sits beside Glowpond Cliffs
at('m4', -60, 17); at('m6', -90, 17); link('mh', -120, 17, 30, 17, 1); at('m7', -150, 17, { flip: true });
at('m5', -180, 17);
// ── Crystal Caverns: under the house
at('c1', -180, 51); at('c6', -150, 51); at('c2', -150, 34); at('c3', -90, 34);
at('c4', -60, 51); at('c7', -30, 51); at('c5', 0, 34);

// ── Coral Lagoon: the bottom-left shore. Beach row (y 17), kelp below.
//   l7 l6 l3 l2 l1   (beach, westward)   l5 l4 lb (under it)
const LX = -345;                           // l7's x
at('l7', LX, 17); at('l6', LX + 30, 17); at('l3', LX + 60, 17); at('l2', LX + 90, 17); at('l1', LX + 135, 17);
at('l5', LX, 34); at('l4', LX + 30, 34); at('lb', LX + 90, 34);

// ── The rest, placed on plan cells: col c → x = -315 + 15c, row r → y = 17r - 102
const X = c => -315 + 15 * c, Y = r => r <= 4 ? 17 * r - 103 : 17 * r - 102;   // above the house the grid sits one tile higher, like the house
const cell = (id, c, r, flip) => at(id, X(c), Y(r), flip ? { flip: true } : {});
const lnk = (id, c, r, w, h, zone) => link(id, X(c), Y(r), 15 * w, 17 * h, zone);
// Sunny Dunes: up from Octopus Cove, east along the cliff
cell('d1', -4, 7); link('dl', X(-5), Y(5), 15, 51, 7); cell('d2', -4, 5, 1); cell('d3', -1, 5, 1); cell('db', -1, 6, 1);
cell('d4', 1, 5, 1); cell('d5', 3, 6, 1); cell('d6', 6, 6, 1);
// Frosty Peaks: back west along the next ledge up
lnk('fl', 8, 5, 1, 2, 8); cell('f1', 6, 5); cell('f2', 4, 4); cell('f3', 2, 4); cell('f4', -1, 4); cell('fb', -1, 3);
cell('f5', -3, 4); cell('f6', -5, 4);
// Autumn Woods: up the west edge and east again, then back west a floor higher
lnk('al', -6, 2, 1, 3, 9); cell('a1', -5, 2, 1); cell('a2', -3, 2, 1); cell('a3', 0, 2, 1); lnk('am', 2, 2, 1, 1, 9);
cell('a4', 2, 1); cell('a5', 0, 1); cell('a6', -2, 1);
// Moonlit Springs: along the very top, east towards the Starfall Shaft
lnk('sl', -3, 0, 1, 2, 10); cell('s1', -2, 0, 1); cell('s2', 0, 0, 1); cell('s3', 3, 0, 1); cell('s4', 5, 0, 1);
cell('s5', 8, 0, 1); cell('s6', 10, 0, 1);
// Starlight Sky: a sky path, down to the shaft's foot, up the shaft, west to the Moon Rabbit
lnk('tl', 12, 0, 1, 1, 11); cell('t1', 13, 0, 1); lnk('tm', 15, 0, 1, 3, 11); cell('t2', 12, 2); cell('tb', 12, 1);
lnk('tn', 11, 2, 1, 2, 11); cell('t3', 11, 4); cell('t4', 9, 2); cell('t6', 7, 2); cell('t5', 5, 2);
// Honeycomb Hive: east from the top of the Golden Tower
cell('h1', 21, 4); cell('h5', 21, 3); cell('h2', 23, 3); cell('h3', 25, 3); cell('h4', 27, 3); cell('h6', 31, 3);
// Rainy Ruins: up the east edge and back west
lnk('hl', 33, 2, 1, 2, 4); cell('r1', 31, 2, 1); cell('r2', 27, 2, 1); cell('r6', 27, 1, 1); cell('r3', 25, 1, 1);
cell('r4', 23, 1, 1); cell('r5', 19, 1, 1); cell('r7', 17, 1, 1);
// Cloud Castles: up again and east along the top
lnk('rl', 16, -1, 1, 3, 5); cell('k1', 17, -2); cell('k6', 19, -3); cell('k2', 19, -2); cell('k3', 23, -2);
cell('k4', 25, -2); cell('k5', 27, -2);
// fairy-ring rooms
cell('sb', 17, 2); cell('ab', 20, 2);
console.log(JSON.stringify(L));
