// Fill a region of cells with one zone's rooms, in story order.
// Rooms join where the room profiles say a doorway can go; a short
// straight link room (1 cell wide) may join two rooms instead.
'use strict';
const fs = require('fs');
const S = __dirname;
const P0 = JSON.parse(fs.readFileSync(S + '/prof0.json', 'utf8'));
const P1 = fs.existsSync(S + '/prof1.json') && fs.statSync(S + '/prof1.json').size ? JSON.parse(fs.readFileSync(S + '/prof1.json', 'utf8')) : P0;

// zone → [[id, nativeEntry, nativeExit, flags]], side rooms [id, host, dx, dy]
// flags: 'x' keep native exit (gate or boss), 'p' use the after-elder profile
const ZONES = {
  H: { chain: [['h1', 'B0', 'R0'], ['h2', 'L1', 'R0', 'x'], ['h3', 'L0', 'R0'], ['h4', 'L0', 'R0', 'p'], ['h6', 'L0', 'R0', 'xp']], sides: [['h5', 'h2', -2, 0]] },
  R: { chain: [['r1', 'L0', 'R0'], ['r2', 'L0', 'R0', 'x'], ['r3', 'L1', 'R0'], ['r4', 'L0', 'R0'], ['r5', 'L0', 'R0', 'p'], ['r7', 'L0', 'R0', 'xp']], sides: [['r6', 'r2', 0, -1]] },
  K: { chain: [['k1', 'L1', 'R0'], ['k2', 'L0', 'R0', 'x'], ['k3', 'L0', 'R0', 'x'], ['k4', 'L0', 'R0'], ['k5', 'L0', null]], sides: [['k6', 'k2', 0, -1]] },
  D: { chain: [['d1', 'R0', 'L0'], ['d2', 'R0', 'L0', 'x'], ['d3', 'R0', 'L0'], ['d4', 'R0', 'L1', 'p'], ['d5', 'R0', 'L0', 'p'], ['d6', 'R0', 'L0', 'xp']], sides: [['db', 'd3', 0, 1]] },
  F: { chain: [['f1', 'R0', 'L0', 'x'], ['f2', 'R1', 'L0'], ['f3', 'R0', 'L0'], ['f4', 'R0', 'L0', 'p'], ['f5', 'R0', 'L0', 'p'], ['f6', 'R0', 'L0', 'xp']], sides: [['fb', 'f4', 0, -1]] },
  A: { chain: [['a1', 'R0', 'L0', 'x'], ['a2', 'R0', 'L0'], ['a3', 'R0', 'L0'], ['a4', 'R0', 'L0', 'p'], ['a5', 'R0', 'L0', 'p'], ['a6', 'R0', null, 'xp']], sides: [] },
  S: { chain: [['s1', 'R0', 'L0', 'x'], ['s2', 'R0', 'L0'], ['s3', 'R0', 'L0'], ['s4', 'R0', 'L0', 'p'], ['s5', 'R0', 'L0', 'p'], ['s6', 'R0', 'L0', 'xp']], sides: [] },
  T: { chain: [['t1', 'R0', 'L0'], ['t2', 'R0', 'L0', 'x'], ['t3', 'R0', 'L0'], ['t4', 'R2', 'L0', 'p'], ['t6', 'R0', 'L0', 'xp'], ['t5', 'R0', null, 'p']], sides: [['tb', 't2', 0, -1]] },
};
for (const combo of ['DFA', 'HRK', 'ST', 'DF', 'FA', 'HR', 'RK']) ZONES[combo] = { chain: [].concat(...combo.split('').map(z => ZONES[z].chain)), sides: [].concat(...combo.split('').map(z => ZONES[z].sides)) };
const size = id => ({ w: P0[id].w, h: P0[id].h });
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const STEP = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const SIDE_DIR = { L: 'W', R: 'E', T: 'N', B: 'S' };
// a segment's world cell and facing, for a room at (x, y), maybe flipped
function segAt(id, seg, x, y, flip) {
  const { w, h } = size(id);
  let side = seg[0], i = +seg.slice(1);
  if (flip) { if (side === 'L') side = 'R'; else if (side === 'R') side = 'L'; else i = w - 1 - i; }
  const d = SIDE_DIR[side];
  if (side === 'L') return { c: x, r: y + i, d };
  if (side === 'R') return { c: x + w - 1, r: y + i, d };
  if (side === 'T') return { c: x + i, r: y, d };
  return { c: x + i, r: y + h - 1, d };
}
const segsOf = id => Object.keys(P0[id].reach);
const reach = (id, from, to, after) => ((after ? P1 : P0)[id].reach[from] || []).includes(to);
const starts = (id, seg) => (P0[id].starts[seg] || 0) > 0 || Object.values(P0[id].reach).some(l => l.includes(seg));
const K = (c, r) => c + ',' + r;

function solve(opt) {
  const Z = ZONES[opt.zone];
  const region = new Set(opt.region), occ0 = new Set(opt.occupied || []);
  const free = (c, r, occ) => region.has(K(c, r)) && !occ.has(K(c, r)) && !occ0.has(K(c, r));
  const sideOf = Object.fromEntries(Z.sides.map(s => [s[1], s]));
  const totalCells = Z.chain.concat(Z.sides).reduce((n, [id]) => n + size(id).w * size(id).h, 0);
  let best = null, tried = 0;
  const maxLinks = opt.maxLinks == null ? 3 : opt.maxLinks;
  function roomCells(id, x, y, flip) {
    const { w, h } = size(id), cs = [[id, x, y, w, h]];
    const s = sideOf[id];
    if (s) {
      const sw = size(s[0]).w, sh = size(s[0]).h;
      const dx = flip ? w - s[2] - sw : s[2];
      cs.push([s[0], x + dx, y + s[3], sw, sh]);
    }
    return cs;
  }
  function tryPlace(occ, id, x, y, flip) {
    if (opt.pin && opt.pin[id] && (opt.pin[id][0] !== x || opt.pin[id][1] !== y)) return null;
    const cs = roomCells(id, x, y, flip), cells = [];
    for (const [, rx, ry, w, h] of cs) for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      if (!free(rx + i, ry + j, occ)) return null;
      cells.push(K(rx + i, ry + j));
    }
    return { cs, cells };
  }
  // all ways to put room `k` so its entry faces the cell (c, r) from direction d
  function candidates(k, c, r, d) {
    const [id, natIn, natOut, fl = ''] = Z.chain[k];
    const out = [];
    const { w, h } = size(id);
    for (const flip of opt.noFlip ? [false] : [false, true]) for (const e of segsOf(id)) {
      if (!starts(id, e)) continue;
      if (opt.nativeIn && opt.nativeIn.includes(id) && e !== natIn) continue;
      // the exits this entry allows
      const exits = natOut == null ? [null] : fl.includes('x') ? [natOut] : segsOf(id);
      const okExits = exits.filter(x => x == null || (x !== e && reach(id, e, x, fl.includes('p'))));
      if (!okExits.length) continue;
      // origin so that entry segment e sits at (c, r) facing back towards d
      const probe = segAt(id, e, 0, 0, flip);
      if (probe.d !== OPP[d]) continue;
      okExits.sort((a, b) => (b === natOut) - (a === natOut));
      out.push({ id, flip, e, x: c - probe.c, y: r - probe.r, okExits, natIn, natOut, w, h });
    }
    return out.sort((a, b) => (b.e === b.natIn) - (a.e === a.natIn));
  }
  const restCells = []; // room cells still to place from chain step k on
  for (let k = Z.chain.length; k >= 0; k--) restCells[k] = (restCells[k + 1] || 0) + (k < Z.chain.length ? roomCells(Z.chain[k][0], 0, 0, false).reduce((n, c) => n + c[3] * c[4], 0) : 0);
  function dfs(k, occ, plan, prevExit, links, cost) {
    tried++;
    if (tried > (opt.budget || 3e6)) return;
    {
      let freeN = 0; for (const c of region) if (!occ.has(c) && !occ0.has(c)) freeN++;
      if (freeN < restCells[k]) return;
      const lb = Math.max(0, freeN - restCells[k] - (maxLinks - links) * (opt.maxLinkLen || 3));
      if (best && lb * (opt.wLeft == null ? 1 : opt.wLeft) + links * 4 + cost * 6 >= best.score) return;
    }
    if (k === Z.chain.length) {
      if (opt.exit && !plan.exitOk) return;
      if (opt.exitInto) { const ex = plan.lastExit; if (!ex) return; const n = K(ex.c + STEP[ex.d][0], ex.r + STEP[ex.d][1]); if (!opt.exitInto.includes(n)) return; }
      const left = [...region].filter(c => !occ.has(c) && !occ0.has(c)).length;
      const score = left * (opt.wLeft == null ? 1 : opt.wLeft) + links * 4 + cost * 6;
      if (!best || score < best.score) best = { score, left, links, cost, plan: JSON.parse(JSON.stringify(plan)), occ: new Set(occ) };
      return;
    }
    // where the next room may be entered from: right outside the exit, or along a link
    const spots = [];
    const n = { c: prevExit.c + STEP[prevExit.d][0], r: prevExit.r + STEP[prevExit.d][1] };
    spots.push({ c: n.c, r: n.r, d: prevExit.d, link: [] });
    if (links < maxLinks && free(n.c, n.r, occ)) {
      for (const t of ['N', 'S', 'E', 'W']) {
        if (t === OPP[prevExit.d]) continue;
        const cells = [[n.c, n.r]];
        for (let L = 1; L <= (opt.maxLinkLen || 3); L++) {
          const last = cells[cells.length - 1];
          // step off the last link cell into a room, any way but back
          for (const d of ['N', 'S', 'E', 'W']) {
            if (d === OPP[t] && cells.length > 1) continue;
            if (cells.length === 1 && d === OPP[prevExit.d]) continue;
            const nc = last[0] + STEP[d][0], nr = last[1] + STEP[d][1];
            if (cells.some(([a, b]) => a === nc && b === nr)) continue;
            spots.push({ c: nc, r: nr, d, link: cells.slice() });
          }
          const nx = last[0] + STEP[t][0], ny = last[1] + STEP[t][1];
          if (!free(nx, ny, occ)) break;
          cells.push([nx, ny]);
        }
      }
    }
    for (const sp of spots) {
      const occL = new Set(occ);
      let ok = true;
      for (const [a, b] of sp.link) { if (!free(a, b, occL)) { ok = false; break; } occL.add(K(a, b)); }
      if (!ok) continue;
      for (const cand of candidates(k, sp.c, sp.r, sp.d)) {
        const pl = tryPlace(occL, cand.id, cand.x, cand.y, cand.flip);
        if (!pl) continue;
        const occ2 = new Set(occL); pl.cells.forEach(c => occ2.add(c));
        const extra = (cand.e !== cand.natIn ? 1 : 0) + (cand.flip ? 0.2 : 0);
        for (const x of cand.okExits) {
          const ex = x && segAt(cand.id, x, cand.x, cand.y, cand.flip);
          const step = { id: cand.id, x: cand.x, y: cand.y, flip: cand.flip, in: cand.e, out: x, link: sp.link };
          plan.rooms.push(step);
          const wasEx = plan.lastExit; plan.lastExit = ex;
          const was = plan.exitOk;
          if (k === Z.chain.length - 1 && opt.exit) plan.exitOk = !!ex && ex.c === opt.exit.c && ex.r === opt.exit.r && ex.d === opt.exit.d;
          if (k === Z.chain.length - 1 || ex) dfs(k + 1, occ2, plan, ex, links + (sp.link.length ? 1 : 0), cost + extra + (x && x !== cand.natOut ? 1 : 0) + sp.link.length * 0.5);
          plan.exitOk = was; plan.lastExit = wasEx;
          plan.rooms.pop();
        }
      }
    }
  }
  // first room: entered from outside the region at opt.entry {c, r, d} (d = direction of travel)
  if (opt.entry) dfs(0, new Set(), { rooms: [] }, { c: opt.entry.c - STEP[opt.entry.d][0], r: opt.entry.r - STEP[opt.entry.d][1], d: opt.entry.d }, 0, 0);
  else {
    // free start (a ride lands here): try every spot in the region for room 0
    const [id] = Z.chain[0];
    for (const key of region) {
      const [c, r] = key.split(',').map(Number);
      for (const flip of [false, true]) {
        const pl = tryPlace(new Set(), id, c, r, flip);
        if (!pl) continue;
        const natOut = Z.chain[0][2];
        const ex = segAt(id, natOut, c, r, flip);
        dfs(1, new Set(pl.cells), { rooms: [{ id, x: c, y: r, flip, in: null, out: natOut, link: [] }] }, ex, 0, flip ? 0.2 : 0);
      }
    }
  }
  return { best, tried, totalCells, sides: Z.sides.map(([id, host, dx, dy]) => ({ id, host, dx, dy })) };
}

function draw(res, region, occupied, labels = {}) {
  const cells = [...region, ...(occupied || [])].map(k => k.split(',').map(Number));
  const c0 = Math.min(...cells.map(a => a[0])) - 1, c1 = Math.max(...cells.map(a => a[0])) + 1;
  const r0 = Math.min(...cells.map(a => a[1])) - 1, r1 = Math.max(...cells.map(a => a[1])) + 1;
  const g = {};
  for (const k of region) g[k] = '··';
  for (const k of occupied || []) g[k] = labels[k] || '##';
  if (res && res.best) for (const st of res.best.plan.rooms) {
    for (const [a, b] of st.link) g[K(a, b)] = '++';
    for (const sd of res.sides || []) if (sd.host === st.id) { const sw = size(sd.id).w, sh = size(sd.id).h, hw = size(st.id).w; const dx = st.flip ? hw - sd.dx - sw : sd.dx; for (let i = 0; i < sw; i++) for (let j = 0; j < sh; j++) g[K(st.x + dx + i, st.y + sd.dy + j)] = i + j ? sd.id[0] + '_' : sd.id.padEnd(2).slice(0, 2); }
    const { w, h } = size(st.id);
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) g[K(st.x + i, st.y + j)] = (i === 0 && j === 0) ? st.id.padEnd(2).slice(0, 2) : st.id[0] + (st.flip ? "'" : ' ');
  }
  const lines = [];
  for (let r = r0; r <= r1; r++) { let s = ''; for (let c = c0; c <= c1; c++) s += g[K(c, r)] || '  '; lines.push(String(r).padStart(3) + ' ' + s); }
  return 'cols ' + c0 + '..' + c1 + '\n' + lines.join('\n');
}
module.exports = { solve, draw, ZONES, size, segAt };
