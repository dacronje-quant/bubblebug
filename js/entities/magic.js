// ════════════════════════════════════════════════════════════════
//  MAGIC — little surprises that make poking around fun.
//
//  Bubble blooms: a friendship bubble that pops against the ground, a
//  wall or a ceiling leaves something behind where it touched: a flower
//  in the gardens, a glowing crystal in the caves, a snowflake in the
//  peaks, a seashell on the beach… each with a chime that climbs a
//  little scale as you keep bubbling. They last until you leave the room.
//
//  Peekaboo spots: a bush (or snowdrift, leaf pile, shell…) that rustles
//  when a kitten comes close or a bubble lands in it, and out pops a
//  silly animal to say hello. Now and then it has a fishy treat to share.
//  Purely for fun: nothing is ever needed from them.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const G = () => BB.G;
  const W = () => BB.World;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;
  const TAU = Math.PI * 2;
  // its own random stream, so decoration never shifts the gameplay's randomness
  const rand = BB.rng(0x5ce7e);

  // what grows where a bubble pops, per zone
  const BLOOM = {
    gardens: 'flower', meadow: 'mushroom', caves: 'crystal', hive: 'honeyflower', ruins: 'flower', clouds: 'rainbow',
    lagoon: 'shell', dunes: 'cactusflower', frost: 'snowflake', autumn: 'leaf', springs: 'lotus', starlight: 'crystal', home: 'flower',
  };
  const PETALS = ['#ff9ec8', '#ffd66b', '#9fd8ff', '#c8a8ff', '#ffb38a', '#ff8a8a'];
  const blooms = [];
  let chime = 0, chimeT = 0;

  // A bubble popped against solid ground at (x, y) moving (vx, vy)
  function onWall(b, room) {
    if (!room) return;
    const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
    const solid = (x, y) => BB.Physics.solidSide(W().tile(x, y));
    const air = (x, y) => { const ch = W().tile(x, y); return ch !== null && !solid(x, y) && ch !== '~' && ch !== '%'; };
    // which face of the tile did it touch? (try the way it was travelling first)
    let face = null;
    const faces = [];
    if (b.vx > 0) faces.push('left'); else faces.push('right');
    if (b.vy < -0.3) faces.unshift('bottom'); else if (b.vy > 0.3) faces.unshift('top');
    faces.push('top', 'bottom', 'left', 'right');
    for (const f of faces) {
      if (f === 'top' && air(tx, ty - 1)) { face = f; break; }
      if (f === 'bottom' && air(tx, ty + 1)) { face = f; break; }
      if (f === 'left' && air(tx - 1, ty)) { face = f; break; }
      if (f === 'right' && air(tx + 1, ty)) { face = f; break; }
    }
    if (!face) return;
    const k = BB.clamp(face === 'top' || face === 'bottom' ? b.x - tx * T : b.y - ty * T, 6, T - 6);
    const pos = {
      top: [tx * T + k, ty * T, 0], bottom: [tx * T + k, (ty + 1) * T, Math.PI],
      left: [tx * T, ty * T + k, -Math.PI / 2], right: [(tx + 1) * T, ty * T + k, Math.PI / 2],
    }[face];
    // don't stack them up in one spot
    if (blooms.some(o => Math.hypot(o.x - pos[0], o.y - pos[1]) < 14)) { sparkle(pos[0], pos[1], room); return; }
    const kind = BLOOM[BB.ZONES[room.zone].key] || 'flower';
    blooms.push({ x: pos[0], y: pos[1], rot: pos[2], kind, t: 0, room: room.id, col: PETALS[(rand() * PETALS.length) | 0], seed: rand() * 10 });
    if (blooms.length > 40) blooms.shift();
    sparkle(pos[0], pos[1], room);
  }

  function sparkle(x, y, room) {
    const now = BB.Play.t;
    chime = now - chimeT < 120 ? chime + 1 : 0;
    chimeT = now;
    S().bloomChime(chime);
    PT().burst('spark', x, y, 6, { color: BB.ZONES[room.zone].light || '#fff4c2', speed: 1.8, life: 26 });
  }

  function drawBloom(c, o, x, y, t) {
    const grow = BB.easeOutBack(Math.min(1, o.t / 18));
    const sway = Math.sin(t * 0.05 + o.seed) * 0.12;
    c.save();
    c.translate(x, y); c.rotate(o.rot); c.scale(grow * 1.45, grow * 1.45);
    switch (o.kind) {
      case 'flower': case 'honeyflower': case 'cactusflower': case 'lotus': {
        c.rotate(sway);
        const stem = o.kind === 'lotus' ? 3 : o.kind === 'cactusflower' ? 6 : 11;
        if (o.kind === 'cactusflower') { c.fillStyle = '#6aa84f'; G().rrect(-3.5, -stem - 4, 7, stem + 4, 3, c); c.fill(); }
        else { c.strokeStyle = '#4e9a3a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -stem); c.stroke(); }
        if (o.kind !== 'cactusflower' && o.kind !== 'lotus') { c.fillStyle = '#6cc24a'; G().ellipse(3, -4, 3.5, 1.6, -0.5, c); c.fill(); }
        const col = o.kind === 'honeyflower' ? '#ffd04a' : o.kind === 'lotus' ? '#ffb8d4' : o.col;
        c.fillStyle = col;
        const n = o.kind === 'lotus' ? 6 : 5;
        for (let i = 0; i < n; i++) { const a = i / n * TAU + o.seed; G().ellipse(Math.cos(a) * 3.6, -stem + Math.sin(a) * 3.6, 3.4, 2.2, a, c); c.fill(); }
        c.fillStyle = o.kind === 'honeyflower' ? '#8a5a1a' : '#fff4a8'; G().circle(0, -stem, 2, c); c.fill();
        break;
      }
      case 'mushroom': {
        c.fillStyle = '#f4e8d8'; G().rrect(-2, -8, 4, 8, 2, c); c.fill();
        c.fillStyle = o.col; G().ellipse(0, -8, 7, 4.5, 0, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.85)'; G().circle(-2.5, -9.5, 1.2, c); c.fill(); G().circle(2.5, -8.5, 1, c); c.fill();
        G().drawGlow(0, -8, 14, o.col, 0.35 + Math.sin(t * 0.08 + o.seed) * 0.15, c);
        break;
      }
      case 'crystal': {
        const col = o.kind === 'crystal' ? ['#9fd8ff', '#c8a8ff', '#ff9ec8'][Math.floor(o.seed) % 3] : o.col;
        G().drawGlow(0, -6, 16, col, 0.4 + Math.sin(t * 0.07 + o.seed) * 0.2, c);
        c.fillStyle = col; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8;
        for (const [dx, h, w] of [[-3, 9, 3], [2, 13, 3.5], [5.5, 7, 2.5]]) {
          c.beginPath(); c.moveTo(dx - w, 0); c.lineTo(dx - w * 0.6, -h * 0.75); c.lineTo(dx, -h); c.lineTo(dx + w * 0.6, -h * 0.75); c.lineTo(dx + w, 0); c.closePath(); c.fill(); c.stroke();
        }
        break;
      }
      case 'snowflake': {
        c.translate(0, -8); c.rotate(t * 0.01 + o.seed);
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.4; c.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          c.rotate(TAU / 6);
          c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -7); c.moveTo(0, -4); c.lineTo(-2, -6); c.moveTo(0, -4); c.lineTo(2, -6); c.stroke();
        }
        break;
      }
      case 'shell': {
        c.fillStyle = ['#ffd0dc', '#ffe8b8', '#d8f0ff'][Math.floor(o.seed) % 3]; c.strokeStyle = '#c88a9a'; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(-6, -1); c.quadraticCurveTo(0, -12, 6, -1); c.closePath(); c.fill(); c.stroke();
        for (const d of [-3, 0, 3]) { c.beginPath(); c.moveTo(d * 0.6, -1); c.lineTo(d, -7.5); c.stroke(); }
        break;
      }
      case 'leaf': {
        c.rotate(sway * 2);
        c.fillStyle = ['#e8783a', '#ffb060', '#d8442a', '#ffd04a'][Math.floor(o.seed) % 4];
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-6, -6, 0, -12); c.quadraticCurveTo(6, -6, 0, 0); c.fill();
        c.strokeStyle = 'rgba(120,50,20,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -11); c.stroke();
        break;
      }
      case 'rainbow': BB.Critters.rainbow(c, 0, -2, 1, 0.5); break;
    }
    c.restore();
  }

  // ──── Peekaboo spots ────
  const HIDE = {
    gardens: 'bush', meadow: 'mushrooms', caves: 'rock', hive: 'pot', ruins: 'fern', clouds: 'cloud', lagoon: 'bigshell',
    dunes: 'rock', frost: 'drift', autumn: 'leafpile', springs: 'reeds', starlight: 'crystals',
  };
  const spotCache = new Map();

  function spotsFor(room) {
    if (spotCache.has(room.id)) return spotCache.get(room.id);
    const out = [];
    const key = BB.ZONES[room.zone].key;
    if (!room.def.home && !room.def.arena && !room.def.neighbourhood && !room.def.maze && !room.def.walkOut && HIDE[key]) {
      const near = (c, r) => room.things.some(t => Math.abs(t.tx - room.x - c) <= 2 && Math.abs(t.ty - room.y - r) <= 2);
      const cands = [];
      for (let r = 2; r < room.h - 1; r++) {
        for (let c = 3; c < room.w - 3; c++) {
          const g = room.grid;
          if (g[r][c] !== '.' || g[r - 1][c] !== '.' || g[r][c - 1] !== '.' || g[r][c + 1] !== '.') continue;
          if (g[r + 1][c] !== '#' || g[r + 1][c - 1] !== '#' || g[r + 1][c + 1] !== '#') continue;
          if (near(c, r)) continue;
          cands.push([c, r]);
        }
      }
      // one or two per room, picked the same way every visit, nicely apart
      const want = 1 + (BB.hash(room.x, room.y, 71) < 0.5 ? 1 : 0);
      cands.sort((a, b) => BB.hash(room.x + a[0], room.y + a[1], 72) - BB.hash(room.x + b[0], room.y + b[1], 72));
      for (const [c, r] of cands) {
        if (out.length >= want) break;
        if (out.some(s => Math.abs(s.c - c) < 9)) continue;
        const cast = BB.ZONES[room.zone].cast;
        const kinds = (cast.b || []).concat(cast.c || []);
        out.push({
          c, r, x: (room.x + c) * T + T / 2, y: (room.y + r + 1) * T, kind: HIDE[key], critter: kinds[Math.floor(BB.hash(room.x + c, r, 73) * kinds.length)] || 'bunny',
          t: 0, pop: 0, rustle: 0, cd: 0, treat: BB.hash(room.x + c, room.y + r, 74) < 0.4, given: false, seed: BB.hash(c, r, 75) * 10,
        });
      }
    }
    spotCache.set(room.id, out);
    return out;
  }

  function peek(s, ctx, fromX) {
    if (s.cd > 0) { s.rustle = 14; return; }
    s.pop = 1; s.cd = 360; s.rustle = 20; s.facing = fromX < s.x ? -1 : 1;
    S().rustle();
    ctx.later(10, () => {
      S().peekaboo();
      for (let i = 0; i < 4; i++) PT().heart(s.x + (rand() - 0.5) * 24, s.y - 40);
      PT().burst('confetti', s.x, s.y - 30, 10, { speed: 2.5, g: 0.08, life: 50 });
      if (s.treat && !s.given) { s.given = true; ctx.dropFood(s.x, s.y - 30); }
    });
  }

  function update(room, ctx) {
    for (const s of spotsFor(room)) {
      s.t++;
      if (s.cd > 0) s.cd--;
      if (s.rustle > 0) s.rustle--;
      if (s.pop > 0) { s.pop++; if (s.pop > 140) s.pop = 0; }
      for (const k of ctx.kittens) {
        const b = k.body;
        const dx = b.x + b.w / 2 - s.x, dy = b.y + b.h - s.y;
        const close = Math.abs(dx) < 44 && Math.abs(dy) < 40 && k.state === 'play';
        if (close && !s.near) peek(s, ctx, b.x + b.w / 2);
        s.near = close;
      }
    }
  }

  function targets(room, ctx) {
    return spotsFor(room).map(s => ({ x: s.x, y: s.y - 14, r: 18, homing: false, hit: () => { peek(s, ctx, ctx.pl.body.x); return true; } }));
  }

  function drawHide(c, s, x, y, t) {
    const wob = s.rustle > 0 ? Math.sin(s.rustle * 1.4) * 0.08 : Math.sin(t * 0.02 + s.seed) * 0.015;
    c.save(); c.translate(x, y); c.rotate(wob);
    const blob = (col, pts) => { c.fillStyle = col; for (const [px, py, r] of pts) { G().circle(px, py, r, c); c.fill(); } };
    switch (s.kind) {
      case 'bush':
        blob('#3f8f35', [[-14, -10, 12], [0, -16, 15], [14, -10, 12]]);
        blob('#6cc24a', [[-12, -12, 9], [0, -19, 11], [12, -12, 9]]);
        c.fillStyle = '#ff9ec8'; G().circle(-8, -18, 2.4, c); c.fill(); G().circle(9, -22, 2.4, c); c.fill(); G().circle(2, -12, 2, c); c.fill();
        break;
      case 'fern': case 'reeds': {
        const col = s.kind === 'fern' ? '#4a8a6a' : '#5a8a4a';
        c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round';
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 3, 0); c.quadraticCurveTo(i * 6, -20, i * 9, -30 + Math.abs(i) * 3); c.stroke(); }
        if (s.kind === 'reeds') { c.fillStyle = '#8a5a3a'; for (const i of [-2, 1, 3]) { G().ellipse(i * 8, -28 + Math.abs(i) * 2, 2.5, 6, 0, c); c.fill(); } }
        break;
      }
      case 'mushrooms':
        for (const [dx, h, r, col] of [[-10, 14, 10, '#c86ad8'], [9, 20, 13, '#8affd9'], [0, 9, 7, '#ff8ac8']]) {
          c.fillStyle = '#f4e8f8'; c.fillRect(dx - 3, -h, 6, h);
          c.fillStyle = col; G().ellipse(dx, -h, r, r * 0.6, 0, c); c.fill();
        }
        break;
      case 'rock':
        c.fillStyle = s.kind === 'rock' && BB.Play.room && BB.ZONES[BB.Play.room.zone].key === 'dunes' ? '#c89060' : '#6a6aa0';
        G().ellipse(0, -11, 22, 13, 0, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; G().ellipse(-6, -17, 9, 4, -0.2, c); c.fill();
        break;
      case 'pot':
        c.fillStyle = '#d8902a'; G().ellipse(0, -12, 15, 13, 0, c); c.fill();
        c.fillStyle = '#ffd04a'; G().rrect(-12, -26, 24, 6, 3, c); c.fill();
        c.fillStyle = '#ffd04a'; G().ellipse(6, -6, 3, 6, 0, c); c.fill();
        break;
      case 'cloud': blob('#ffffff', [[-14, -10, 11], [0, -15, 14], [14, -10, 11]]); break;
      case 'bigshell':
        c.fillStyle = '#ffd0dc'; c.strokeStyle = '#c88a9a'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(0, -36, 20, 0); c.closePath(); c.fill(); c.stroke();
        for (const d of [-12, -6, 0, 6, 12]) { c.beginPath(); c.moveTo(d * 0.5, 0); c.lineTo(d, -22 + Math.abs(d) * 0.6); c.stroke(); }
        break;
      case 'drift': blob('#ffffff', [[-14, -6, 11], [0, -12, 14], [14, -6, 11]]); c.fillStyle = 'rgba(170,200,240,0.4)'; G().ellipse(0, -3, 22, 4, 0, c); c.fill(); break;
      case 'leafpile':
        for (let i = 0; i < 9; i++) {
          c.fillStyle = ['#e8783a', '#ffb060', '#d8442a', '#ffd04a'][i % 4];
          const a = i * 0.7 + s.seed, px = Math.cos(a) * (6 + i * 1.5), py = -6 - (i % 3) * 6;
          G().ellipse(px, py, 7, 4, a, c); c.fill();
        }
        break;
      case 'crystals':
        for (const [dx, h, col] of [[-9, 18, '#c8a8ff'], [3, 26, '#9fd8ff'], [11, 14, '#ffe27a']]) {
          c.fillStyle = col; c.beginPath(); c.moveTo(dx - 5, 0); c.lineTo(dx, -h); c.lineTo(dx + 5, 0); c.fill();
        }
        break;
    }
    c.restore();
  }

  function drawSpot(c, s, cam, t) {
    const x = s.x - cam.x, y = s.y - cam.y;
    if (x < -60 || x > G().W + 60 || y < -80 || y > G().H + 60) return;
    // the peeker (behind the bush), then the bush
    if (s.pop > 0) {
      const k = s.pop < 16 ? BB.easeOutBack(s.pop / 16) : s.pop > 110 ? Math.max(0, 1 - (s.pop - 110) / 30) : 1;
      const wave = s.pop > 20 && s.pop < 100 ? Math.sin(s.pop * 0.3) * 0.25 : 0;
      BB.Critters.drawBug(c, s.critter, x, y - 6 - k * 26, { t: s.t, mood: 0, facing: s.facing || 1, joy: true, spin: wave, scale: 0.95, noCloud: true, blink: 0 });
    }
    drawHide(c, s, x, y, t);
  }

  function draw(c, rooms, cam, t) {
    for (const o of blooms) {
      const x = o.x - cam.x, y = o.y - cam.y;
      if (x < -30 || x > G().W + 30 || y < -30 || y > G().H + 30) continue;
      drawBloom(c, o, x, y, t);
    }
    for (const r of rooms) for (const s of spotsFor(r)) drawSpot(c, s, cam, t);
  }

  function tick() { for (const o of blooms) o.t++; }

  function leaveRoom(room) {
    for (let i = blooms.length - 1; i >= 0; i--) if (blooms[i].room === room.id) blooms.splice(i, 1);
  }

  BB.Magic = { onWall, update, targets, draw, tick, leaveRoom, spotsFor, clear: () => { blooms.length = 0; } };
})(window.BB);
