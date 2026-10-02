// ════════════════════════════════════════════════════════════════
//  THE CLOUD MAZE — Mama's maze, once Rainbow's other six relatives are
//  home. A sunset maze of clouds, different from the green hedge maze:
//  the six relatives have come back to help, each waiting somewhere in
//  the clouds with their own colour. Touch one and their colour joins
//  Rainbow's rainbow; every bridge of that colour turns solid and can be
//  crossed. The family follows along in a little parade, and the last
//  bridge, a whole rainbow, needs all six colours to reach Mama.
//  Colours are kept (also when leaving early), so nobody can get stuck,
//  and each bridge's colour matches the relative who opens it, so it
//  needs no reading. Same four-direction walking as the hedge maze.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G, S = () => BB.Audio.sfx;
  const MAP = [
    '#########################',
    '#M.#....#t...#..#....#.y#',
    '#..R.##.B..#.#..G..#.#..#',
    '#.##....#..#....#..#....#',
    '####B###G.....##......#.#',
    '#g.......###.###.########',
    '#..#..#..#.....#.#......#',
    '#..#..#..#.....#.#..###.#',
    '#.#...#..#.....#.#.....b#',
    '#####Y##########O####T###',
    '#.....#...#....#........#',
    '#..#..#.#.#..#.....##...#',
    '#..#......V..#...#....#.#',
    '#o.....#..#......#v....S#',
    '#########################',
  ];
  const W = 25, H = 15, TILE = 28, X = 130, Y = 56;
  const POTS = 'oygtbv', GATES = 'OYGTBV', ALL = 63;
  // each colour's relative: orange Pumpkin, yellow Papa, green Grandpa,
  // teal Splash, blue Granny, purple Twinkle
  const WHO = { o: 'rbPumpkin', y: 'rbPapa', g: 'rbGrandpa', t: 'rbSplash', b: 'rbGranny', v: 'rbTwinkle' };
  const CONTROLS = ['left', 'up', 'down', 'right'];
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const EXIT_HOLD = BB.CFG.MAZE_EXIT_HOLD;
  const find = ch => { for (let y = 0; y < H; y++) { const x = MAP[y].indexOf(ch); if (x >= 0) return { x, y }; } return null; };
  const START = find('S'), MAMA = find('M');
  const colour = i => BB.CATS[WHO[POTS[i]]].trailColor;
  const bit = ch => 1 << (POTS.includes(ch) ? POTS.indexOf(ch) : GATES.indexOf(ch));
  function walkable(x, y, mask) {
    const ch = MAP[y] && MAP[y][x];
    if (!ch || ch === '#') return false;
    if (GATES.includes(ch)) return !!(mask & bit(ch));
    if (ch === 'R') return mask === ALL;
    return true;
  }
  const potAt = (x, y) => POTS.includes(MAP[y][x]) ? MAP[y][x] : null;
  // gathered colours, in the order they were gathered (for the parade)
  const gathered = mask => POTS.split('').filter(ch => mask & bit(ch));
  // the shortest walk to the next relative who can be reached now (or to
  // Mama once every colour is gathered): a sparkly trail shows it when the
  // kitten stands still a moment or bumps into a closed bridge
  function route(x0, y0, mask) {
    const goal = (x, y) => mask === ALL ? x === MAMA.x && y === MAMA.y : !!potAt(x, y) && !(mask & bit(potAt(x, y)));
    const from = { [x0 + ',' + y0]: null }, q = [[x0, y0]];
    while (q.length) {
      const [x, y] = q.shift();
      if (goal(x, y)) { const path = []; for (let k = x + ',' + y; k; k = from[k]) path.unshift(k.split(',').map(Number)); return path; }
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (k in from || !walkable(nx, ny, mask)) continue;
        from[k] = x + ',' + y; q.push([nx, ny]);
      }
    }
    return [];
  }

  // a soft puffy cloud tile
  function puff(c, px, py, n, t) {
    c.fillStyle = '#f7f1ff';
    G().rrect(px + 1, py + 2, TILE - 2, TILE - 4, 9, c); c.fill();
    c.fillStyle = '#ffffff';
    const w = Math.sin(t * 0.02 + n) * 0.8;
    G().circle(px + 8, py + 10 + w, 7, c); c.fill(); G().circle(px + 17, py + 8 - w, 8, c); c.fill(); G().circle(px + 22, py + 14 + w, 5, c); c.fill();
  }
  // a little picture for the choice card: a cloud with three colour bridges
  function picture(c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#f7d9e8'; G().rrect(-62, -48, 124, 96, 16, c); c.fill();
    BB.Backdrops.cloud(c, -40, -12, 0.42, '#ffffff'); BB.Backdrops.cloud(c, 4, 20, 0.36, '#ffffff');
    ['#ffa870', '#91e6a6', '#849fff'].forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(-34 + i * 34, 30, 13, Math.PI, 0); c.stroke();
    });
    c.restore();
  }
  BB.CloudMaze = { MAP, START, MAMA, WHO, POTS, GATES, ALL, walkable, potAt, picture, route };

  Object.assign(BB.Play, {
    openCloud() {
      if (!BB.RainbowFamily.mamaReady(this.save)) return false;
      BB.Voice.stop();
      this.portalChoice = null;
      this.cloud = { x: START.x, y: START.y, t: 0, moving: null, facing: -1, buffer: null, trail: [], armed: false, exitHold: 0, done: 0, pops: [] };
      this.pl.state = 'maze'; this.pl.body.vx = this.pl.body.vy = 0;
      // Continue (or leaving) always comes back to the courtyard doorway
      const q = BB.RainbowJourney.spot('rainbow');
      this.checkpoint = { x: q.x - BB.CFG.PW / 2, y: q.y - BB.CFG.PH }; this.pendingCP = false;
      document.body.classList.add('in-maze');
      BB.Input.takePointers(); BB.Bubbles.clear(); BB.Particles.clear();
      BB.Music.play(BB.ZONES[5].key); S().secret();
      this.sayStory('kin_cloud_maze', 500);
      this.writeSave();
      return true;
    },
    closeCloud(rescued) {
      BB.Voice.stop();
      this.cloud = null;
      document.body.classList.remove('in-maze');
      const room = BB.World.byId.nm, q = BB.RainbowJourney.spot('rainbow');
      this.room = room; this.prevRoom = null; this.pl.state = 'play';
      this.pl.body = BB.Physics.newBody(q.x - BB.CFG.PW / 2, q.y - BB.CFG.PH);
      this.pl.body.grounded = true; this.pl.body.groundKind = 1;
      this.checkpoint = { x: this.pl.body.x, y: this.pl.body.y }; this.pendingCP = false;
      this.trail = []; this.journeyLock = 'rainbow'; this.journeyHold = 0;
      BB.Camera.snap(room, this.pl.body); this.lastCam = { x: BB.Camera.x, y: BB.Camera.y };
      this.enterZone(room.zone); this.zoneCard = 0;
      BB.Music.play(BB.ZONES[room.zone].key);
      if (rescued) {
        // the whole rainbow family is together: a big rainbow over the courtyard
        S().party(); this.pl.happyT = 300;
        for (let i = 0; i < 8; i++) this.later(i * 16, () => BB.Particles.firework(q.x + (Math.random() - 0.5) * 520, q.y - 200 - Math.random() * 160));
      }
      this.writeSave(); BB.Input.clearAll();
    },
    cloudStep(x, y) {
      const m = this.cloud, save = this.save;
      m.trail.unshift({ x: m.x, y: m.y }); m.trail.length = Math.min(m.trail.length, 8);
      m.x = x; m.y = y; m.path = null;
      if (x !== START.x || y !== START.y) m.armed = true;
      const pot = potAt(x, y);
      if (pot && !(save.cloudMask & bit(pot))) {
        save.cloudMask |= bit(pot);
        const id = WHO[pot], n = gathered(save.cloudMask).length;
        m.pops.push({ x, y, t: 0, col: BB.CATS[id].trailColor });
        S().bloom(n); S().meow(id);
        if (save.cloudMask === ALL) { S().gate(); m.pops.push({ x: 3, y: 2, t: 0, col: '#fff6c2' }); }
        BB.Save.write();
      }
      if (x === MAMA.x && y === MAMA.y && !save.kin.rbMama) {
        m.done = 1; S().party();
        this.foundKin('rbMama', this.pl.body.x, this.pl.body.y, 600);
      }
    },
    updateCloud() {
      const m = this.cloud, I = BB.Input;
      m.t++;
      for (const p of m.pops) p.t++;
      m.pops = m.pops.filter(p => p.t < 50);
      if (m.done) {
        I.takePointers();
        if (++m.done > 420 || (m.done > 150 && (I.pressed.confirm || I.pressed.bubble || I.pressed.jump))) this.closeCloud(true);
        return;
      }
      if (I.pressed.pause || I.pressed.back) { m.buffer = null; m.exitHold = 0; BB.Main.go('pause'); return; }
      let dir = null;
      for (const p of I.takePointers()) {
        if (Math.hypot(p.x - 850, p.y - 30) < 25) { this.closeCloud(false); return; }
        CONTROLS.forEach((d, i) => { if (Math.hypot(p.x - (386 + i * 62), p.y - 506) < 25) dir = d; });
      }
      const pd = I.pointerDown;
      if (pd) CONTROLS.forEach((d, i) => { if (Math.hypot(pd.x - (386 + i * 62), pd.y - 506) < 25) dir = d; });
      for (const d of CONTROLS) if (I.pressed[d]) m.buffer = d;
      if (dir) m.buffer = dir;
      if (m.moving) {
        m.exitHold = 0; m.still = 0;
        if (++m.moving.t >= 8) { const to = m.moving; m.moving = null; this.cloudStep(to.x, to.y); }
        return;
      }
      const held = CONTROLS.find(d => I.held[d]);
      for (const d of [m.buffer, dir, held]) {
        if (!d) continue;
        const [dx, dy] = DIRS[d], nx = m.x + dx, ny = m.y + dy;
        if (dx) m.facing = dx;
        if (walkable(nx, ny, this.save.cloudMask)) {
          m.exitHold = 0; m.moving = { x: nx, y: ny, t: 0 };
          if (d === m.buffer) m.buffer = null;
          break;
        } else if (d === m.buffer) {
          // a closed bridge wobbles: its colour shows who opens it
          const ch = MAP[ny] && MAP[ny][nx];
          if (ch && (GATES.includes(ch) || ch === 'R') && !m.nudge) { m.nudge = { x: nx, y: ny, t: 0 }; S().wobble(); m.still = Math.max(m.still || 0, 120); }
          m.buffer = null;
        }
      }
      if (m.nudge && ++m.nudge.t > 24) m.nudge = null;
      if (!m.moving) m.still = (m.still || 0) + 1;
      // standing back on the start cloud for two seconds goes home
      if (!m.moving && m.armed && m.x === START.x && m.y === START.y && ++m.exitHold >= EXIT_HOLD) this.closeCloud(false);
    },

    drawCloud(c) {
      const m = this.cloud, t = m.t, save = this.save, mask = save.cloudMask || 0;
      c.save();
      // a warm sunset sky with slow clouds
      const sky = c.createLinearGradient(0, 0, 0, G().H);
      sky.addColorStop(0, '#c9b6f2'); sky.addColorStop(0.55, '#ffd2df'); sky.addColorStop(1, '#ffe7c4');
      c.fillStyle = sky; c.fillRect(0, 0, G().W, G().H);
      for (let i = 0; i < 6; i++) BB.Backdrops.cloud(c, ((i * 190 + t * 0.15 * (1 + i % 3)) % (G().W + 200)) - 160, 40 + (i * 83) % 460, 0.5 + (i % 3) * 0.15, 'rgba(255,255,255,0.45)');
      // header: the six colours (filled when gathered) and the way home
      G().text('Cloud Maze', 220, 28, 23, '#7a5aa0', null, 'center', c);
      POTS.split('').forEach((ch, i) => {
        const x = 418 + i * 30, on = !!(mask & bit(ch));
        if (on) G().drawGlow(x, 28, 16, colour(i), 0.5, c);
        c.fillStyle = on ? colour(i) : 'rgba(255,255,255,0.55)'; c.strokeStyle = on ? '#ffffff' : colour(i); c.lineWidth = 2.5;
        G().circle(x, 28, 10, c); c.fill(); c.stroke();
      });
      c.fillStyle = '#b39ad6'; G().circle(850, 30, 23, c); c.fill(); BB.HUD.zoneIcon(c, BB.HOME_ZONE, 850, 30, 0.7);
      // the maze
      c.fillStyle = 'rgba(255,255,255,0.35)'; G().rrect(X - 6, Y - 6, W * TILE + 12, H * TILE + 12, 18, c); c.fill();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ch = MAP[y][x], px = X + x * TILE, py = Y + y * TILE;
        if (ch === '#') { puff(c, px, py, x * 7 + y * 3, t); continue; }
        c.fillStyle = (x + y) % 2 ? '#bfe4f7' : '#c9e9f9'; c.fillRect(px, py, TILE, TILE);
        if ((x * 13 + y * 7) % 9 === 0) { c.fillStyle = 'rgba(255,255,255,0.8)'; G().twinkle(px + 9, py + 9, 2.2, c); c.fill(); }
        if (GATES.includes(ch) || ch === 'R') this.drawCloudGate(c, ch, px, py, mask, t);
      }
      // the sparkly way to the next relative
      if (!m.done && !m.moving && m.still > 110) {
        if (!m.path) m.path = route(m.x, m.y, mask);
        const a = Math.min(1, (m.still - 110) / 30);
        m.path.slice(1, -1).forEach(([x, y], i) => {
          const pulse = Math.max(0, Math.sin(t * 0.12 - i * 0.6));
          const px = X + (x + 0.5) * TILE, py = Y + (y + 0.5) * TILE;
          c.globalAlpha = a * (0.6 + pulse * 0.4);
          G().drawGlow(px, py, 12, '#ffe27a', 0.5, c);
          c.fillStyle = '#ffc93c'; G().twinkle(px, py, 4.5 + pulse * 3, c); c.fill();
          c.fillStyle = '#ffffff'; G().circle(px, py, 1.6, c); c.fill();
        });
        c.globalAlpha = 1;
      }
      // Mama, grey and sad until everyone reaches her
      const mx = X + (MAMA.x + 0.5) * TILE, my = Y + (MAMA.y + 0.5) * TILE;
      const rescued = !!save.kin.rbMama;
      G().drawGlow(mx, my, 26, rescued ? '#ffb3d6' : '#d9d2e6', 0.5, c);
      BB.Kittens.draw(c, BB.Kittens.fadedId('rbMama', rescued ? 0 : 1), { mode: 'sit', sad: rescued ? 0 : 0.9, happy: rescued, t }, mx, my + 11, 0.68, 1);
      if (!rescued) BB.Critters.moodCloud(c, mx + 4, my - 22, 1, t, 0.6);
      // the six helpers, each on a little cloud with their colour
      POTS.split('').forEach((ch, i) => {
        const p = find(ch), px = X + (p.x + 0.5) * TILE, py = Y + (p.y + 0.5) * TILE;
        if (mask & bit(ch)) { BB.Backdrops.cloud(c, px - 11, py + 6, 0.18, 'rgba(255,255,255,0.8)'); return; }
        G().drawGlow(px, py, 34 + Math.sin(t * 0.08 + i) * 5, colour(i), 0.7, c);
        BB.Kittens.draw(c, WHO[ch], { mode: 'sit', happy: true, t: t + i * 30 }, px, py + 11 + Math.sin(t * 0.06 + i) * 1.5, 0.7, 1);
      });
      // the parade: gathered relatives follow along behind
      const cell = p => ({ x: X + (p.x + 0.5) * TILE, y: Y + (p.y + 0.5) * TILE });
      gathered(mask).forEach((ch, i) => {
        const p = m.trail[i]; if (!p) return;
        const q = cell(p);
        BB.Kittens.draw(c, WHO[ch], { mode: 'sit', happy: true, t: t + i * 17 }, q.x, q.y + 10 - Math.abs(Math.sin(t * 0.15 + i)) * 3, 0.58, m.facing);
      });
      // the kitten
      const step = m.moving, k = step ? step.t / 8 : 0;
      const kx = X + (m.x + 0.5 + (step ? (step.x - m.x) * k : 0)) * TILE, ky = Y + (m.y + 0.5 + (step ? (step.y - m.y) * k : 0)) * TILE;
      BB.Kittens.draw(c, this.pl.cat, { mode: step ? 'run' : 'sit', phase: t * 0.3, happy: true, t }, kx, ky + 10, 0.72, m.facing);
      BB.HUD.zoneIcon(c, BB.HOME_ZONE, X + (START.x + 0.5) * TILE, Y + (START.y + 0.5) * TILE - 18, 0.36);
      for (const p of m.pops) {
        const q = cell(p), a = 1 - p.t / 50;
        c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = 4;
        G().circle(q.x, q.y, 10 + p.t * 1.4, c); c.stroke(); c.globalAlpha = 1;
      }
      if (m.exitHold > 0) BB.Links.holdRing(c, X + (START.x + 0.5) * TILE, Y + (START.y + 0.5) * TILE - 4, m.exitHold / EXIT_HOLD);
      if (!m.done) CONTROLS.forEach((d, i) => {
        const bx = 386 + i * 62;
        c.fillStyle = '#b39ad6'; G().circle(bx, 506, 23, c); c.fill();
        c.save(); c.translate(bx, 506); c.rotate({ left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2, right: 0 }[d]);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-8, 0); c.lineTo(9, 0); c.moveTo(2, -7); c.lineTo(9, 0); c.lineTo(2, 7); c.stroke(); c.restore();
      });
      if (m.done) this.drawCloudFamily(c, t, Math.min(1, m.done / 30));
      c.restore();
    },
    // a bridge between clouds: dashed and see-through until its colour is
    // gathered, then a bright solid arch. The last one is the whole rainbow.
    drawCloudGate(c, ch, px, py, mask, t) {
      const m = this.cloud, cx = px + TILE / 2, cy = py + TILE / 2;
      const cols = ch === 'R' ? BB.RAINBOW.slice(1) : [colour(GATES.indexOf(ch))];
      const open = ch === 'R' ? mask === ALL : !!(mask & bit(ch));
      const wob = m.nudge && m.nudge.x === (px - X) / TILE && m.nudge.y === (py - Y) / TILE ? Math.sin(m.nudge.t * 0.8) * 3 : 0;
      c.save(); c.translate(wob, 0);
      c.lineCap = 'round';
      if (!open) {
        // closed: a fluffy cloud tinted in the colour that opens it
        const tint = ch === 'R' ? '#f3e9ff' : BB.mix(cols[0], '#ffffff', 0.62);
        c.fillStyle = tint; G().rrect(px + 1, py + 1, TILE - 2, TILE - 2, 10, c); c.fill();
        c.strokeStyle = ch === 'R' ? '#c9b6e6' : cols[0]; c.lineWidth = 2.5; c.setLineDash([4, 3]);
        G().rrect(px + 2, py + 2, TILE - 4, TILE - 4, 9, c); c.stroke(); c.setLineDash([]);
        if (ch !== 'R') { const k = BB.CATS[WHO[POTS[GATES.indexOf(ch)]]]; BB.MapView.catFace(c, cx, cy - 2, 0.62, k.fur, k.pointDark || k.stripe || k.trailColor); }
      } else G().drawGlow(cx, cy, 20, ch === 'R' ? '#fff6c2' : cols[0], 0.45, c);
      cols.forEach((col, i) => {
        c.strokeStyle = col; c.globalAlpha = open ? 1 : 0.9; c.lineWidth = ch === 'R' ? 2.6 : open ? 7 : 4;
        c.beginPath(); c.arc(cx, cy + 9, (ch === 'R' ? 13 : 10) - i * 2.4, Math.PI, 0); c.stroke();
      });
      c.globalAlpha = 1;
      if (open) { c.fillStyle = 'rgba(255,255,255,0.9)'; G().twinkle(cx + Math.sin(t * 0.07 + px) * 7, cy - 5, 2.6, c); c.fill(); }
      c.restore();
    },
    // everyone together: the whole rainbow family with Mama in the middle
    drawCloudFamily(c, t, a) {
      const cx = G().W / 2, cy = G().H / 2;
      c.save(); c.globalAlpha = a;
      c.fillStyle = 'rgba(60,40,90,0.45)'; c.fillRect(0, 0, G().W, G().H);
      c.fillStyle = '#fff8ee'; c.strokeStyle = '#ffb3d6'; c.lineWidth = 5;
      G().rrect(cx - 300, cy - 150, 600, 300, 40, c); c.fill(); c.stroke();
      c.lineWidth = 8; c.lineCap = 'round';
      BB.RAINBOW.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(cx, cy + 70, 230 - i * 9, Math.PI, 0); c.stroke(); });
      const seats = ['rbGrandpa', 'rbPumpkin', 'rbPapa', 'rbMama', 'rbTwinkle', 'rbSplash', 'rbGranny'];
      seats.forEach((id, i) => {
        const x = cx - 225 + i * 75, hop = Math.abs(Math.sin(t * 0.12 + i)) * 8, s = (BB.CATS[id].size || 1.4) * (id === 'rbMama' ? 1.35 : 1.15);
        BB.Kittens.draw(c, id, { mode: 'sit', happy: true, t: t + i * 20 }, x, cy + 110 - hop, s, i < 3 ? 1 : -1);
      });
      for (let i = 0; i < 10; i++) {
        const k = ((t * 0.01) + i / 10) % 1;
        c.fillStyle = '#ff8fb8'; G().heart(cx - 260 + i * 58, cy - 120 + Math.sin(k * Math.PI * 2) * 10, 6, c); c.fill();
      }
      c.restore();
    },
  });
})(window.BB);
