// ════════════════════════════════════════════════════════════════
//  HAPPY MAZES — one little maze for each of Rainbow's lost relatives.
//  Walk up to a lost relative and a small maze opens: they sit grey and
//  sad in a corner, and three of their favourite things are hidden in it.
//  Gather all three, then reach them: their colour comes back, they say
//  hello, and back in the kingdom they ride a rainbow home.
//  Every maze has its own place and its own little twist:
//    Grandpa  — a lily pond: flowers, a plain first maze
//    Papa     — a honeycomb: honey pots, and friendly bees buzzing to and
//               fro along two corridors (wait a moment for one to buzz past)
//    Granny   — a knitting basket: yarn balls, and slippery wool you slide
//               across until something stops you
//    Splash   — a coral reef: shells, and currents that carry you along
//    Pumpkin  — a misty autumn wood: acorns, and only the path near you
//               can be seen (paths you've walked stay lit)
//    Twinkle  — the night sky: stars, and each star you gather makes a
//               starry bridge appear
//  No enemies and no way to lose: bees only wait, slides always stop on
//  safe ground, and leaving keeps the relative waiting for another try.
//  tools/test-rainbow-family.js solves every maze with real key presses
//  and proves that no maze has a stuck state.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G, S = () => BB.Audio.sfx;
  const TILE = 40, X = 180, Y = 92, STEP = 7;
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const ARROW = { '<': 'left', '>': 'right', '^': 'up', 'v': 'down' };
  const CONTROLS = ['left', 'up', 'down', 'right'];
  const MAZES = {
    rbGrandpa: { name: "Grandpa's Lily Pond", item: 'flower', map: [
      '###############',
      '#S....#...#..a#',
      '#.###.#.#.#.###',
      '#.#...#.#...#K#',
      '#.#.###.#####.#',
      '#.#......b....#',
      '#.#####.#.###.#',
      '#c......#...#.#',
      '###############'],
      sky: ['#bfe8d0', '#eaf7d9'], path: ['#dff1c6', '#d5ecbb'], wall: '#7fc6dc' },
    rbPapa: { name: "Papa's Honeycomb", item: 'honey', map: [
      '###############',
      '#S....#.....a.#',
      '####..#.#####.#',
      '#.......#...#.#',
      '#.#####.#.#.#.#',
      '#b....#...#...#',
      '#####.#####.###',
      '#K..........c.#',
      '###############'],
      bees: [[[1, 3], [7, 3]], [[2, 7], [11, 7]]],
      sky: ['#ffd77a', '#fff0c2'], path: ['#fff3cf', '#ffecbd'], wall: '#f0aa36' },
    rbGranny: { name: "Granny's Knitting Basket", item: 'yarn', map: [
      '###############',
      '#S...#.......a#',
      '#.#..iiiii.####',
      '#.#.#.....#...#',
      '#.#.#.iii.#.#.#',
      '#.#...#b#...#.#',
      '#.#####.#####.#',
      '#c.iiiiiii...K#',
      '###############'],
      sky: ['#c9d3ff', '#eef0ff'], path: ['#f4efff', '#ebe5fb'], wall: '#9aaaf0' },
    rbSplash: { name: "Splash's Coral Reef", item: 'shell', map: [
      '###############',
      '#S..>>>>....#a#',
      '###.###.###.#.#',
      '#c..#...^.#...#',
      '#.###.###.#.###',
      '#...<<<<..#...#',
      '###.###.#.###.#',
      '#K..#...vb....#',
      '###############'],
      sky: ['#5fc3d6', '#b9eef0'], path: ['#c8f0f2', '#bdeaee'], wall: '#ff9a8a' },
    rbPumpkin: { name: "Pumpkin's Misty Wood", item: 'acorn', fog: true, map: [
      '###############',
      '#S..#........a#',
      '##..#.###.#.###',
      '#...#.#...#...#',
      '#.###.#.#####.#',
      '#.#...#.#...#.#',
      '#.#.###.#.#.#.#',
      '#b..#.....#c#K#',
      '###############'],
      sky: ['#e99a5a', '#ffe2b8'], path: ['#f8dcae', '#f2d3a0'], wall: '#c4612a' },
    rbTwinkle: { name: "Twinkle's Starry Sky", item: 'star', map: [
      '###############',
      '#S.a#....#...b#',
      '###1#.##.#.####',
      '#......#...2..#',
      '#.####.#####..#',
      '#.#c.....#....#',
      '#.#####.#.###.#',
      '#..........3.K#',
      '###############'],
      sky: ['#2d2660', '#5b4a9a'], path: ['#4a3f86', '#43397c'], wall: '#1d1846' },
  };
  const W = 15, H = 9;
  const at = (def, x, y) => (def.map[y] && def.map[y][x]) || '#';
  const find = (def, ch) => { for (let y = 0; y < H; y++) { const x = def.map[y].indexOf(ch); if (x >= 0) return { x, y }; } return null; };
  function walkable(def, x, y, mask) {
    const c = at(def, x, y);
    if (c === '#') return false;
    if ('123'.includes(c)) return !!(mask >> (Number(c) - 1) & 1);
    if (c === 'K') return mask === 7;
    return true;
  }
  // after arriving on a cell: wool keeps you sliding the same way, a
  // current pushes you its way; both stop before anything solid
  function next(def, x, y, mask, dir) {
    const c = at(def, x, y);
    const d = ARROW[c] || (c === 'i' ? dir : null);
    if (!d) return null;
    const [dx, dy] = DIRS[d];
    return walkable(def, x + dx, y + dy, mask) ? { x: x + dx, y: y + dy, dir: d } : null;
  }
  const itemBit = c => 'abc'.includes(c) ? 1 << 'abc'.indexOf(c) : 0;
  // one whole move, as the solver sees it (the game animates each cell)
  function move(def, x, y, mask, dir) {
    const [dx, dy] = DIRS[dir];
    if (!walkable(def, x + dx, y + dy, mask)) return null;
    let p = { x: x + dx, y: y + dy, dir };
    for (let i = 0; i < 60; i++) {
      mask |= itemBit(at(def, p.x, p.y));
      const n = next(def, p.x, p.y, mask, p.dir);
      if (!n) break;
      p = n;
    }
    return { x: p.x, y: p.y, mask };
  }

  // ──── favourite things ────
  function item(c, kind, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (kind === 'flower') BB.Cosmetics.flower(c, 0, 0, 9, '#ff9ec7');
    else if (kind === 'honey') {
      c.fillStyle = '#f5a623'; G().ellipse(0, 3, 9, 8, 0, c); c.fill();
      c.fillStyle = '#c97a12'; G().rrect(-7, -8, 14, 5, 2, c); c.fill();
      c.fillStyle = '#ffe07a'; G().ellipse(-3, 1, 3, 4, -0.4, c); c.fill();
    } else if (kind === 'yarn') BB.HUD.toyIcon(c, 'yarn', 0, 0, 1, t);
    else if (kind === 'shell') BB.HUD.toyIcon(c, 'shell', 0, 0, 1, t);
    else if (kind === 'acorn') {
      c.fillStyle = '#b8742f'; G().ellipse(0, 3, 7, 8, 0, c); c.fill();
      c.fillStyle = '#7a4a1e'; G().ellipse(0, -4, 9, 5, 0, c); c.fill(); c.fillRect(-1, -12, 2, 5);
    } else { c.fillStyle = '#ffe36e'; G().star(0, 0, 10, 5, 0.48, -Math.PI / 2 + Math.sin(t * 0.05) * 0.2, c); c.fill(); }
    c.restore();
  }
  function wallTile(c, def, id, px, py, n, t) {
    c.fillStyle = def.wall; G().rrect(px + 1, py + 1, TILE - 2, TILE - 2, 8, c); c.fill();
    c.save(); c.globalAlpha = 0.45;
    if (id === 'rbGrandpa') { c.fillStyle = '#5aa86a'; G().ellipse(px + 14, py + 15, 9, 5, n, c); c.fill(); if (n % 3 === 0) BB.Cosmetics.flower(c, px + 26, py + 26, 5, '#ffd1e4'); }
    else if (id === 'rbPapa') { c.strokeStyle = '#ffd77a'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(px + 20 + Math.cos(a) * 11, py + 20 + Math.sin(a) * 11); } c.closePath(); c.stroke(); }
    else if (id === 'rbGranny') { c.strokeStyle = '#ffffff'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + 6, py + 10 + i * 10); c.lineTo(px + 14, py + 15 + i * 10); c.lineTo(px + 22, py + 10 + i * 10); c.lineTo(px + 30, py + 15 + i * 10); c.stroke(); } }
    else if (id === 'rbSplash') { c.fillStyle = '#ffd1c8'; G().circle(px + 12, py + 14, 4, c); c.fill(); G().circle(px + 26, py + 24, 5, c); c.fill(); }
    else if (id === 'rbPumpkin') { c.fillStyle = '#ffb066'; G().ellipse(px + 13, py + 13, 7, 4, 0.6 + n, c); c.fill(); G().ellipse(px + 27, py + 26, 6, 3.5, -0.4 + n, c); c.fill(); }
    else { c.fillStyle = '#ffffff'; G().twinkle(px + 12 + (n % 3) * 6, py + 12 + (n % 2) * 12, 2 + Math.sin(t * 0.1 + n) * 0.8, c); c.fill(); }
    c.restore();
  }

  BB.HappyMaze = { MAZES, walkable, move, next, find, at, W, H };

  Object.assign(BB.Play, {
    // a lost relative was reached in the kingdom: their own maze opens
    openMini(th) {
      const def = MAZES[th.kin];
      if (!def || this.mini) return false;
      BB.Voice.stop();
      const s = find(def, 'S');
      this.mini = { id: th.kin, def, th, x: s.x, y: s.y, mask: 0, t: 0, moving: null, facing: 1, buffer: null, seen: {}, done: 0, pops: [],
        bees: (def.bees || []).map(([a, b]) => ({ a, b, x: a[0], y: a[1], d: 1, t: 0 })), nudge: null };
      this.pl.state = 'maze'; this.pl.body.vx = this.pl.body.vy = 0;
      this.miniReveal();
      document.body.classList.add('in-maze');
      BB.Input.takePointers(); BB.Bubbles.clear();
      S().secret();
      this.sayStory('kin_minimaze', 500, false);
      return true;
    },
    closeMini(happy) {
      const m = this.mini;
      if (!m) return;
      BB.Voice.stop();
      this.mini = null;
      document.body.classList.remove('in-maze');
      this.pl.state = 'play'; this.pl.idleT = 0;
      BB.Input.clearAll();
      if (happy) {
        // back in the kingdom: the relative is happy and off home
        m.th.found = true; m.th.hopV = -4.5;
        this.foundKin(m.id, m.th.x, m.th.y, 400);
      } else m.th.wait = true; // (step away and come back to try again)
    },
    miniReveal() {
      const m = this.mini;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) m.seen[(m.x + dx) + ',' + (m.y + dy)] = 1;
    },
    miniArrive(x, y) {
      const m = this.mini, def = m.def;
      m.x = x; m.y = y; this.miniReveal();
      const b = itemBit(at(def, x, y));
      if (b && !(m.mask & b)) {
        m.mask |= b; m.pops.push({ x, y, t: 0 });
        const n = [1, 2, 4].filter(v => m.mask & v).length;
        S().bloom(n);
        if (m.mask === 7) { S().gate(); this.later(20, () => S().meow(m.id)); }
      }
      if (at(def, x, y) === 'K') { m.done = 1; S().party(); S().meow(m.id); }
    },
    updateMini() {
      const m = this.mini, I = BB.Input, def = m.def;
      m.t++;
      for (const p of m.pops) p.t++;
      m.pops = m.pops.filter(p => p.t < 40);
      // timers keep running (meows, music cues)
      for (let i = this.timers.length - 1; i >= 0; i--) if (--this.timers[i].n <= 0) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
      if (m.done) {
        I.takePointers();
        if (++m.done > 130) this.closeMini(true);
        return;
      }
      // friendly bees buzz to and fro (they wait rather than bump you)
      for (const bee of m.bees) if (++bee.t >= 16) {
        bee.t = 0;
        const [tx, ty] = bee.d > 0 ? bee.b : bee.a;
        const sx = Math.sign(tx - bee.x), sy = Math.sign(ty - bee.y);
        const nx = bee.x + sx, ny = bee.y + sy;
        // (bees fly over the kitten, so they never get stuck; the kitten
        // waits a moment for one to buzz past)
        bee.x = nx; bee.y = ny;
        if (bee.x === tx && bee.y === ty) bee.d = -bee.d;
      }
      if (I.pressed.pause || I.pressed.back) { m.buffer = null; BB.Main.go('pause'); return; }
      let dir = null;
      for (const p of I.takePointers()) {
        if (Math.hypot(p.x - 850, p.y - 30) < 25) { this.closeMini(false); return; }
        CONTROLS.forEach((d, i) => { if (Math.hypot(p.x - (386 + i * 62), p.y - 506) < 25) dir = d; });
      }
      const pd = I.pointerDown;
      if (pd) CONTROLS.forEach((d, i) => { if (Math.hypot(pd.x - (386 + i * 62), pd.y - 506) < 25) dir = d; });
      for (const d of CONTROLS) if (I.pressed[d]) m.buffer = d;
      if (dir) m.buffer = dir;
      if (m.moving) {
        if (++m.moving.t >= STEP) {
          const to = m.moving; m.moving = null;
          this.miniArrive(to.x, to.y);
          if (m.done) return;
          // wool and currents carry the kitten on by themselves
          const n = next(def, to.x, to.y, m.mask, to.dir);
          if (n && !m.bees.some(b => b.x === n.x && b.y === n.y)) {
            m.moving = { x: n.x, y: n.y, t: 0, dir: n.dir, slide: true };
            if (DIRS[n.dir][0]) m.facing = DIRS[n.dir][0];
          }
        }
        return;
      }
      const held = CONTROLS.find(d => I.held[d]);
      for (const d of [m.buffer, dir, held]) {
        if (!d) continue;
        const [dx, dy] = DIRS[d], nx = m.x + dx, ny = m.y + dy;
        if (dx) m.facing = dx;
        if (walkable(def, nx, ny, m.mask) && !m.bees.some(b => b.x === nx && b.y === ny)) {
          m.moving = { x: nx, y: ny, t: 0, dir: d };
          if (d === m.buffer) m.buffer = null;
          break;
        }
        if (d === m.buffer) {
          const c = at(def, nx, ny);
          if (('123K'.includes(c)) && !m.nudge) { m.nudge = { x: nx, y: ny, t: 0 }; S().wobble(); }
          m.buffer = null;
        }
      }
      if (m.nudge && ++m.nudge.t > 24) m.nudge = null;
    },

    drawMini(c) {
      const m = this.mini, def = m.def, t = m.t, id = m.id;
      c.save();
      const sky = c.createLinearGradient(0, 0, 0, G().H);
      sky.addColorStop(0, def.sky[0]); sky.addColorStop(1, def.sky[1]);
      c.fillStyle = sky; c.fillRect(0, 0, G().W, G().H);
      const dark = id === 'rbTwinkle';
      G().text(def.name, 250, 30, 22, dark ? '#efe6ff' : '#5a3f7a', null, 'center', c);
      // the three favourite things, filling in as they're found
      for (let i = 0; i < 3; i++) {
        const x = 446 + i * 44, on = !!(m.mask & 1 << i);
        c.fillStyle = 'rgba(255,255,255,0.55)'; G().circle(x, 30, 18, c); c.fill();
        c.save(); if (!on) c.globalAlpha = 0.28; item(c, def.item, x, 31, 1, t); c.restore();
      }
      c.fillStyle = 'rgba(120,90,160,0.75)'; G().circle(850, 30, 23, c); c.fill(); BB.HUD.zoneIcon(c, BB.HOME_ZONE, 850, 30, 0.7);
      c.fillStyle = 'rgba(255,255,255,0.3)'; G().rrect(X - 8, Y - 8, W * TILE + 16, H * TILE + 16, 18, c); c.fill();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ch = def.map[y][x], px = X + x * TILE, py = Y + y * TILE, n = x * 7 + y * 3;
        if (ch === '#') { wallTile(c, def, id, px, py, n, t); continue; }
        c.fillStyle = (x + y) % 2 ? def.path[0] : def.path[1]; c.fillRect(px, py, TILE, TILE);
        const cx = px + TILE / 2, cy = py + TILE / 2;
        if (ch === 'i') {
          // slippery wool
          c.fillStyle = 'rgba(190,205,255,0.8)'; G().rrect(px + 3, py + 3, TILE - 6, TILE - 6, 10, c); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.8)'; G().ellipse(cx - 6, cy - 6, 8, 3, -0.5, c); c.fill();
        } else if (ARROW[ch]) {
          // a current, with bubbles drifting its way
          const [dx, dy] = DIRS[ARROW[ch]], k = (t * 0.04 + x * 0.3 + y * 0.3) % 1;
          c.fillStyle = 'rgba(80,170,210,0.35)'; c.fillRect(px, py, TILE, TILE);
          c.save(); c.translate(cx, cy); c.rotate(Math.atan2(dy, dx));
          c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-8, -6); c.lineTo(2, 0); c.lineTo(-8, 6); c.stroke(); c.restore();
          G().bubble(cx + dx * (k - 0.5) * TILE, cy + dy * (k - 0.5) * TILE - 6, 3, '#ffffff', 1 - k, c);
        } else if ('123'.includes(ch)) {
          // a starry bridge: dotted until its star is found
          const open = walkable(def, x, y, m.mask), wob = m.nudge && m.nudge.x === x && m.nudge.y === y ? Math.sin(m.nudge.t * 0.8) * 3 : 0;
          if (!open) { c.fillStyle = def.wall; c.fillRect(px, py, TILE, TILE); }
          c.fillStyle = open ? '#ffe36e' : 'rgba(255,240,170,0.45)';
          for (let i = 0; i < 3; i++) { G().star(px + 8 + i * 12 + wob, cy + (i % 2 ? -4 : 4), open ? 6 : 4, 5, 0.5, -Math.PI / 2, c); c.fill(); }
          if (open) G().drawGlow(cx, cy, 22, '#fff1a8', 0.4, c);
        }
        if ('abc'.includes(ch) && !(m.mask & itemBit(ch))) {
          G().drawGlow(cx, cy, 22, '#fff4c2', 0.55 + Math.sin(t * 0.1 + n) * 0.15, c);
          item(c, def.item, cx, cy + Math.sin(t * 0.08 + n) * 2, 1.15, t);
        }
      }
      // the relative: sad and grey until everything is found, then hopeful
      const k = find(def, 'K'), kx = X + (k.x + 0.5) * TILE, ky = Y + (k.y + 0.5) * TILE;
      const ready = m.mask === 7, happy = m.done > 0;
      const wob = m.nudge && m.nudge.x === k.x && m.nudge.y === k.y ? Math.sin(m.nudge.t * 0.8) * 3 : 0;
      G().drawGlow(kx, ky, 30, ready ? BB.CATS[id].trailColor : '#d9d2e6', ready ? 0.7 : 0.35, c);
      BB.Kittens.draw(c, BB.Kittens.fadedId(id, happy ? 0 : ready ? 0.5 : 1), { mode: 'sit', sad: happy ? 0 : ready ? 0.3 : 0.9, happy, t }, kx + wob, ky + 15, 0.85, -1);
      if (!happy) BB.Critters.moodCloud(c, kx, ky - 30, ready ? 0.4 : 1, t, 0.8);
      for (const b of m.bees) {
        const bx = X + (b.x + 0.5) * TILE, by = Y + (b.y + 0.5) * TILE + Math.sin(t * 0.3 + b.x) * 3;
        BB.Critters.drawBug(c, 'bee', bx, by, { t, mood: 0, facing: b.d, joy: true, noCloud: true, scale: 0.9 });
      }
      // the kitten
      const st = m.moving, f = st ? st.t / STEP : 0;
      const px = X + (m.x + 0.5 + (st ? (st.x - m.x) * f : 0)) * TILE, py = Y + (m.y + 0.5 + (st ? (st.y - m.y) * f : 0)) * TILE;
      BB.Kittens.draw(c, this.pl.cat, { mode: st ? (st.slide ? 'air' : 'run') : 'sit', vy: -1, phase: t * 0.3, happy: true, t }, px, py + 14, 0.95, m.facing);
      // Pumpkin's mist: only nearby paths (and ones walked) can be seen
      if (def.fog) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const d = Math.hypot(x - m.x, y - m.y);
          const a = m.seen[x + ',' + y] ? Math.min(0.45, Math.max(0, (d - 2.2) * 0.25)) : Math.min(0.92, Math.max(0, (d - 1.6) * 0.45));
          if (a > 0) { c.fillStyle = `rgba(245,232,214,${a})`; c.fillRect(X + x * TILE, Y + y * TILE, TILE, TILE); }
        }
        // (acorns and Pumpkin still twinkle through the mist, so you know where to head)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const ch = def.map[y][x];
          if (!(('abc'.includes(ch) && !(m.mask & itemBit(ch))) || ch === 'K')) continue;
          c.fillStyle = ch === 'K' ? '#ffb3d6' : '#ffd36e';
          G().twinkle(X + (x + 0.5) * TILE, Y + (y + 0.5) * TILE - 14, 3.5 + Math.sin(t * 0.12 + x) * 1.5, c); c.fill();
        }
      }
      for (const p of m.pops) {
        const q = { x: X + (p.x + 0.5) * TILE, y: Y + (p.y + 0.5) * TILE };
        c.globalAlpha = 1 - p.t / 40; c.strokeStyle = '#fff1a8'; c.lineWidth = 4;
        G().circle(q.x, q.y, 10 + p.t * 1.3, c); c.stroke(); c.globalAlpha = 1;
      }
      if (happy) {
        const a = Math.min(1, m.done / 25);
        c.globalAlpha = a; c.lineWidth = 7; c.lineCap = 'round';
        BB.RAINBOW.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(kx, ky + 10, 60 - i * 6, Math.PI, 0); c.stroke(); });
        for (let i = 0; i < 6; i++) { c.fillStyle = '#ff8fb8'; G().heart(kx - 50 + i * 20, ky - 50 - ((m.done * 1.5 + i * 13) % 50), 6, c); c.fill(); }
        c.globalAlpha = 1;
      }
      if (!happy) CONTROLS.forEach((d, i) => {
        const bx = 386 + i * 62;
        c.fillStyle = 'rgba(120,90,160,0.8)'; G().circle(bx, 506, 23, c); c.fill();
        c.save(); c.translate(bx, 506); c.rotate({ left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2, right: 0 }[d]);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-8, 0); c.lineTo(9, 0); c.moveTo(2, -7); c.lineTo(9, 0); c.lineTo(2, 7); c.stroke(); c.restore();
      });
      c.restore();
    },
  });
})(window.BB);
