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
link('tg', 0, -17, 30, 34, 3);            // crosses the garden path
link('tx', 0, 17, 30, 17, 1);             // crosses the glen
// ── Mushroom Meadow: the glowing glen under the gardens and the house
at('m1', 105, 17, { flip: true }); at('m2', 75, 17); at('m3', 45, 17);
link('mg', 30, 17, 15, 17, 1);
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
link('lt', LX - 15, -17, 15, 51, 6);       // turnaround: up from Octopus Cove
console.log(JSON.stringify(L));
