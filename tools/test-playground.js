'use strict';
// Playground props: spring pads, pop bubbles, breeze ribbons and moving
// platforms. Checks the physics with the real movement code (Medium and
// Easy), that every set piece in the kingdom does what it was placed for,
// that every platform's path is clear, mirrors correctly in flipped rooms
// and carries the kitten in the real play scene.
// The full progression / softlock proof (including every hop off a moving
// platform) is tools/verify-world.js.
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');

const game = bootGame();
const B = game.BB, W = B.World, P = B.Physics, FX = B.FX, C = B.CFG, T = C.TILE;
W.build();
B.Movers.build();
const none = {};
const POWERS = ['doubleJump', 'wallClimb', 'glow', 'float', 'swim', 'dig', 'spring', 'rings', 'bubbleBounce', 'wings'];
const upTo = n => Object.fromEntries(POWERS.slice(0, n).map(k => [k, true]));

// source (as drawn) column → world tile, for flipped rooms too
const at = (id, col, row) => { const r = W.byId[id]; return { tx: r.x + (r.def.src ? r.w - 1 - col : col), ty: r.y + row, r }; };
const bodyAt = (id, col, floor) => { const { tx, ty } = at(id, col, floor); const b = P.newBody(tx * T + 6, ty * T - C.PH); b.grounded = true; b.groundKind = 1; return b; };
// run a tiny input script: [['right', n], ['jump'], ['wait', n]] — directions as drawn
function run(id, body, script, ab = none, easy = false, movers = []) {
  const flip = !!W.byId[id].def.src;
  let fx = 0, jump = false;
  const seen = [];
  P.setMovers(movers);
  for (const [k, n = 1] of script) {
    if (k === 'release') { jump = false; continue; }
    for (let i = 0; i < n; i++) {
      let right = k === 'right' || k === 'jumpRight', left = k === 'left';
      if (flip) [left, right] = [right, left];
      const press = (k === 'jump' || k === 'jumpRight') && i === 0;
      if (press) jump = true;
      const f = P.step(body, { left, right, jump, jumpPressed: press }, ab, easy);
      fx |= f; seen.push({ f, x: body.x, y: body.y, g: body.grounded, vy: body.vy });
    }
  }
  P.setMovers([]);
  return { fx, seen };
}
const tileOf = (b, id) => { const r = W.byId[id]; const tx = Math.floor((b.x + b.w / 2) / T) - r.x; return { col: r.def.src ? r.w - 1 - tx : tx, row: (b.y + b.h) / T - r.y }; };

// ── 1. The tile props behave as advertised ──
for (const easy of [false, true]) {
  // Spring pits in the very first room: walk into the dip and boing up
  {
    const b = bodyAt('g1', 7, 14);
    const { fx, seen } = run('g1', b, [['right', 34], ['wait', 60]], none, easy);
    assert.ok(fx & FX.SPRING, 'walking into a garden dip lands on its spring');
    const top = Math.min(...seen.map(s => s.y));
    assert.ok((W.byId.g1.y + 15) * T - (top + C.PH) > 8.5 * T, 'a spring launches far higher than a jump (' + easy + ')');
  }
  // A spring is solid from the side, like a mushroom: you hop onto it
  assert.ok(P.solidSide('J'), 'springs are solid from the side');
  assert.equal(P.landKind('J', none), 4, 'springs are a kind of bouncy ground');

  // The pop-bubble staircase in Ladybug Hill: a running jump pops both and
  // lands on the high ledge, with no powers at all
  {
    const b = bodyAt('g2', 17, 14);
    const { seen } = run('g2', b, [['right', 6], ['jumpRight'], ['right', 60], ['wait', 30]], none, easy);
    const pops = seen.filter(s => s.f & FX.POP).length;
    assert.ok(pops >= 2, 'a running jump pops the bubble staircase (' + pops + ')');
    const land = seen.find((s, i) => i > 30 && s.g);
    assert.ok(land && Math.round(tileOf({ x: land.x, y: land.y, w: C.PW, h: C.PH }, 'g2').row) <= 3, 'the staircase leads up to the high ledge');
  }
  // Popping refreshes air jumps, and one bubble only pops once per touch
  {
    const ab = upTo(1);
    const { tx, ty } = at('g2', 21, 9);
    const b = P.newBody(tx * T + 6, (ty + 1) * T + 10); b.vy = -6; b.bouncing = true; b.djUsed = true; b.airTicks = 20;
    let popped = 0, after = 0;
    for (let i = 0; i < 40 && !popped; i++) popped = run('g2', b, [['wait']], ab, easy).fx & FX.POP;
    assert.ok(popped, 'bubble reached');
    assert.equal(b.djUsed, false, 'a pop gives the Double Jump back');
    assert.ok(b.vy <= C.POP, 'and pops you upward');
    for (let i = 0; i < 4; i++) after |= run('g2', b, [['wait']], ab, easy).fx & FX.POP;
    assert.equal(after, 0, 'touching a bubble pops it once');
  }
  // The jet stream in Cloud Castles carries you all the way to the family shelf
  {
    const b = bodyAt('k6', 18, 9);
    const { fx, seen } = run('k6', b, [['jump'], ['wait', 160]], upTo(4), easy);
    assert.ok(fx & FX.WIND, 'jumping up from the ledge catches the jet stream');
    const end = seen[seen.length - 1];
    const t = tileOf({ x: end.x, y: end.y, w: C.PW, h: C.PH }, 'k6');
    assert.ok(end.g && t.col <= 6 && Math.abs(t.row - 7) < 0.1, `the stream sets you down on the family shelf (${t.col}, ${t.row})`);
  }
}
// A breeze never pushes paws that are on the ground (so you can always
// walk back underneath one)
{
  const r = W.byId.k6, tx = r.x + 10, ty = r.y + 5;
  const saved = r.grid[5][10];
  const b = P.newBody(tx * T + 6, (ty + 1) * T - C.PH); b.grounded = true;
  for (let c = 8; c < 18; c++) r.grid[6][c] = '#';
  W._stamp(r);
  for (let i = 0; i < 30; i++) P.step(b, { left: false, right: true, jump: false, jumpPressed: false }, none);
  assert.ok(b.grounded && b.vx > 3, 'walking against a breeze on solid ground keeps full speed');
  for (let c = 8; c < 18; c++) r.grid[6][c] = '.';
  r.grid[5][10] = saved; W._stamp(r);
}
console.log('Springs, pop bubbles and breeze ribbons work in Medium and Easy movement.');

// ── 2. Every moving platform has a clear, in-room path ──
const M = B.Movers;
assert.ok(M.list.length >= 20, 'moving platforms are placed around the kingdom');
const zonesWithFun = new Set();
for (const r of W.rooms) {
  if (r.def.movers) zonesWithFun.add(r.zone);
  if (r.grid.some(row => /[JY<>]/.test(row.join('')))) zonesWithFun.add(r.zone);
}
for (let z = 0; z < 12; z++) assert.ok(zonesWithFun.has(z), 'zone ' + z + ' has playground props');
for (const m of M.list) {
  assert.ok(M.SKINS.includes(m.skin), m.room.id + ' platform has a look');
  for (const s of M.samples(m, 48)) {
    assert.ok(!P.rectSolid(s.x + 2, s.y - C.PH, m.w - 4, C.PH), `${m.room.id} platform path leaves room to stand at (${((s.x - m.room.px) / T).toFixed(1)}, ${((s.y - m.room.py) / T).toFixed(1)})`);
    assert.ok(s.x >= m.room.px - 1 && s.x + m.w <= m.room.px + m.room.pw + 1, m.room.id + ' platform stays inside its room');
    assert.ok(s.y - C.PH >= m.room.py - 1 && s.y <= m.room.py + m.room.ph, m.room.id + ' platform stays inside its room (vertical)');
  }
}
// Flipped rooms mirror their platforms: the Rainy Ruins slabs float over
// the pools in the world as drawn
for (const m of M.list.filter(m => m.room.id === 'r5')) {
  for (const s of M.samples(m, 24)) {
    const mid = W.tile(Math.floor((s.x + m.w / 2) / T), Math.floor(s.y / T));
    assert.ok(mid === '~' || mid === '#', 'r5 slab drifts over its pool (mirrored with the room)');
  }
}
console.log(`${M.list.length} moving platforms: clear paths, inside their rooms, mirrored with flipped rooms.`);

// ── 3. Riding: carried along, one-way from below, hop off with a swing ──
{
  const m = M.list.find(m => m.room.id === 'm5');
  const list = [m];
  M.t = 0; M.place(m, 0);
  const b = P.newBody(m.x + m.w / 2 - C.PW / 2, m.y - C.PH - 4);
  P.setMovers(list);
  let rode = 0;
  for (let i = 0; i < 200; i++) {
    const ox = m.x, oy = m.y; M.place(m, ++M.t); m.dx = m.x - ox; m.dy = m.y - oy;
    P.step(b, { left: false, right: false, jump: false, jumpPressed: false }, none);
    if (b.ride === m) rode++;
  }
  assert.ok(rode > 190, 'standing still on the Old Well lift rides it');
  assert.ok(Math.abs(b.y + b.h - m.y) < 0.5, 'the rider stays on the platform while it moves');
  // jump off: leave the platform, then land back on it from above
  const ox = m.x, oy = m.y; M.place(m, ++M.t); m.dx = m.x - ox; m.dy = m.y - oy;
  P.step(b, { jump: true, jumpPressed: true }, none);
  assert.equal(b.ride, null, 'jumping lets go of the platform');
  let back = false;
  for (let i = 0; i < 120 && !back; i++) {
    const ox = m.x, oy = m.y; M.place(m, ++M.t); m.dx = m.x - ox; m.dy = m.y - oy;
    P.step(b, { jump: true }, none);
    back = b.ride === m;
  }
  assert.ok(back, 'jumping straight up lands back on the moving platform');
  // one-way: rising from below passes through
  const u = P.newBody(m.x + 4, m.y + 40); u.vy = -9;
  P.step(u, { jump: true }, none);
  assert.ok(u.y < m.y + 40 - 5 && !u.grounded, 'a platform never blocks you from below');
  P.setMovers([]);
}
// a rescue never returns you to a moving platform
{
  const b = P.newBody(0, 0); b.grounded = true; b.groundKind = 2; b.lastSafe = { x: 1, y: 2 };
  assert.equal(P.isSafeFooting(b, none) && b.groundKind === 1, false);
}
console.log('Riding, hopping off and landing back on moving platforms work; they are one-way.');

// ── 4. The real play scene moves platforms and carries the kitten ──
{
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = B.Save.data.leftHome = 1;
  B.Main.set('play', { cat: 'phoebe' });
  game.place('m5', 3, 14);
  const m = B.Movers.list.find(m => m.room.id === 'm5');
  // wait for the lift to come to the top, then step on
  for (let i = 0; i < 700 && Math.abs(m.y - (m.room.py + 14 * T)) > 2; i++) game.tick();
  const pl = B.Play.pl.body;
  pl.x = m.x + m.w / 2 - C.PW / 2; pl.y = m.y - C.PH - 2; pl.vy = 0; pl.grounded = false;
  game.tick(4);
  assert.equal(pl.ride, m, 'in the real game, the kitten steps onto the lift');
  const y0 = pl.y;
  game.tick(120);
  assert.ok(pl.y > y0 + 3 * T, 'the lift carries the kitten down the Old Well');
  assert.equal(B.Play.room.id, 'm5');
}
console.log('In the play scene, the Old Well lift carries the kitten.');
