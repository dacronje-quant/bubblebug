// An unlockable hedge labyrinth. Four-direction walking has no
// enemies, timers or jumps. Old star/pad keys
// remain valid; maze position never replaces the adventure checkpoint.
(function (BB) {
  'use strict';
  const W = 29, H = 15, TILE = 28, X = 74, Y = 57;
  const START = { x: 27, y: 13 }, PRIZE = { x: 1, y: 1 };
  const CATS = ['marshmallow', 'phoebe', 'rainbow'];
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const CONTROLS = ['left', 'up', 'down', 'right'];
  const PADS = [{ x: 1, y: 13, key: '-173,13' }, { x: 13, y: 1, key: '-168,6' }, { x: 11, y: 7, key: '-159,-1' }];
  const STARS = [[3,1],[7,3],[21,3],[25,5],[1,7],[9,7],[19,7],[27,9],[5,11],[17,11],[23,13],[9,13]];
  // Fixed seed gives every child the same garden, including after reload.
  // The spanning maze has side branches; extra passages create loops.
  const MAP = Array.from({ length: H }, () => Array(W).fill('#'));
  let seed = 73;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const stack = [[1, 1]]; MAP[1][1] = '.';
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = Object.values(DIRS).map(([dx, dy]) => [x + dx * 2, y + dy * 2])
      .filter(([nx, ny]) => nx > 0 && nx < W - 1 && ny > 0 && ny < H - 1 && MAP[ny][nx] === '#');
    if (!next.length) { stack.pop(); continue; }
    const [nx, ny] = next[random(next.length)];
    MAP[(y + ny) / 2][(x + nx) / 2] = MAP[ny][nx] = '.'; stack.push([nx, ny]);
  }
  const loops = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (MAP[y][x] === '#' &&
    ((MAP[y][x - 1] === '.' && MAP[y][x + 1] === '.' && y % 2) ||
     (MAP[y - 1][x] === '.' && MAP[y + 1][x] === '.' && x % 2))) loops.push([x, y]);
  for (let i = 0; i < 9; i++) { const [x, y] = loops.splice(random(loops.length), 1)[0]; MAP[y][x] = '.'; }
  const walkable = (x, y) => Number.isInteger(x) && Number.isInteger(y) && !!MAP[y] && MAP[y][x] === '.';
  const available = save => !!save && BB.World.rooms.filter(r => r.def.family).length === 12 &&
    BB.World.rooms.filter(r => r.def.family).every(r => save.family[r.def.family]);
  const starKey = i => { const r = BB.World.byId.nm, p = r.def.mazeStars[i]; return (r.x + p[0]) + ',' + (r.y + p[1]); };
  const ready = save => PADS.every(p => save.pads[p.key]);
  const G = () => BB.G, S = () => BB.Audio.sfx;
  BB.GardenMaze = { MAP, START, PRIZE, PADS, STARS, CATS, walkable, available, starKey, ready };

  Object.assign(BB.Play, {
    openMaze() {
      if (!available(this.save)) return false;
      const pos = this.save.mazePosition;
      this.maze = { x: pos && walkable(pos.x, pos.y) ? pos.x : START.x,
        y: pos && walkable(pos.x, pos.y) ? pos.y : START.y, t: 0, moving: null, facing: -1, choice: false, sel: 0, rewardLock: false };
      this.save.mazeReturn = this.save.mazeReturn || { x: this.pl.body.x, y: this.pl.body.y };
      this.save.inMaze = true;
      this.pl.state = 'maze'; this.pl.body.vx = this.pl.body.vy = 0;
      this.checkpoint = { x: this.pl.body.x, y: this.pl.body.y }; this.pendingCP = false;
      this.save.visited.nm = 1; this.mapOn = false; this.zoneCard = 0;
      this.wardrobe = null; this.gardenChoice = null; this.portalChoice = null;
      document.body.classList.add('in-maze');
      BB.Input.takePointers(); BB.Bubbles.clear(); BB.Particles.clear();
      BB.Music.play(BB.ZONES[0].key); S().secret(); this.writeSave();
      return true;
    },
    closeMaze() {
      this.maze = null; this.save.mazePosition = null;
      document.body.classList.remove('in-maze');
      const back = this.save.mazeReturn, fallback = BB.RainbowJourney.spot('rainbow');
      const valid = back && BB.World.roomAtPx(back.x + 10, back.y + 12);
      const room = valid || BB.World.byId.nm;
      this.room = room; this.prevRoom = null; this.pl.state = 'play';
      this.pl.body = BB.Physics.newBody(valid ? back.x : fallback.x - BB.CFG.PW / 2, valid ? back.y : fallback.y - BB.CFG.PH);
      this.pl.body.grounded = true; this.pl.body.groundKind = 1;
      this.checkpoint = { x: this.pl.body.x, y: this.pl.body.y }; this.pendingCP = false;
      this.trail = [];
      this.save.inMaze = false; this.save.mazeReturn = null;
      this.journeyLock = 'rainbow'; this.journeyHold = 0;
      BB.Camera.snap(room, this.pl.body); this.lastCam = { x: BB.Camera.x, y: BB.Camera.y };
      this.enterZone(room.zone); this.zoneCard = 0;
      BB.Music.play(this.party || this.celebrationT ? 'party' : BB.ZONES[room.zone].key);
      this.writeSave(); BB.Input.clearAll();
    },
    mazeCell() {
      const m = this.maze;
      let changed = false;
      STARS.forEach(([x, y], i) => {
        const key = starKey(i);
        if (x === m.x && y === m.y && !this.save.sparkles[key]) { this.save.sparkles[key] = 1; changed = true; S().sparkle(); }
      });
      for (const pad of PADS) if (pad.x === m.x && pad.y === m.y && !this.save.pads[pad.key]) {
        this.save.pads[pad.key] = 1; changed = true; S().confirm();
      }
      this.save.mazePosition = { x: m.x, y: m.y };
      if (m.x !== PRIZE.x || m.y !== PRIZE.y) m.rewardLock = false;
      else if (ready(this.save) && !m.rewardLock) {
        this.save.mazeSolved = true; this.save.rainbowUnlocked = true; this.save.gates.nm = 1;
        m.choice = true; m.choiceT = 0; m.rewardLock = true;
        m.sel = Math.max(0, CATS.indexOf(this.save.cat)); S().party();
      }
      if (changed) BB.Economy.milestones(this.save);
      BB.Save.write();
    },
    chooseMazeCat(id) {
      if (!this.save.rainbowUnlocked || !CATS.includes(id)) return false;
      this.save.cat = id; this.pl.cat = id;
      BB.Save.write(); S().befriend(); return true;
    },
    updateMaze() {
      const m = this.maze, I = BB.Input;
      m.t++;
      if (m.choice) {
        m.choiceT++;
        if (m.choiceT < 8) { I.takePointers(); return; }
        // A gamepad's B button is both bubble and back. Close the picker
        // before handling confirm so backing out never changes the kitten.
        if (I.pressed.back || I.pressed.pause) { m.choice = false; I.takePointers(); return; }
        if (I.pressed.left) { m.sel = (m.sel + 2) % 3; S().select(); }
        if (I.pressed.right) { m.sel = (m.sel + 1) % 3; S().select(); }
        if (!I.pressed.up && (I.pressed.confirm || I.pressed.bubble || I.pressed.jump)) { this.chooseMazeCat(CATS[m.sel]); m.choice = false; }
        for (const p of I.takePointers()) {
          if (Math.hypot(p.x - 762, p.y - 136) < 26) { m.choice = false; continue; }
          for (let i = 0; i < 3; i++) if (Math.hypot(p.x - (300 + i * 180), p.y - 270) < 75) {
            if (m.sel === i) { this.chooseMazeCat(CATS[i]); m.choice = false; }
            else { m.sel = i; S().select(); }
          }
          if (Math.hypot(p.x - 480, p.y - 399) < 30) { this.chooseMazeCat(CATS[m.sel]); m.choice = false; }
        }
        return;
      }
      if (I.pressed.pause || I.pressed.back) { BB.Main.go('pause'); return; }
      let dir = null;
      for (const p of I.takePointers()) {
        if (Math.hypot(p.x - 850, p.y - 30) < 25) return this.closeMaze();
        CONTROLS.forEach((d, i) => { if (Math.hypot(p.x - (386 + i * 62), p.y - 506) < 25) dir = d; });
      }
      const pd = I.pointerDown;
      if (pd) CONTROLS.forEach((d, i) => { if (Math.hypot(pd.x - (386 + i * 62), pd.y - 506) < 25) dir = d; });
      for (const d of CONTROLS) if (I.pressed[d]) m.buffer = d;
      if (dir) m.buffer = dir;
      if (m.moving) {
        if (++m.moving.t >= 8) { m.x = m.moving.x; m.y = m.moving.y; m.moving = null; this.mazeCell(); }
        return;
      }
      // Keep a requested turn buffered until its corridor opens, while
      // continuing a held direction. No diagonal corner cutting.
      const held = CONTROLS.find(d => I.held[d]);
      for (const d of [m.buffer, dir, held]) {
        if (!d) continue;
        const [dx, dy] = DIRS[d], nx = m.x + dx, ny = m.y + dy;
        if (m.x === START.x && m.y === START.y && d === 'right') return this.closeMaze();
        if (walkable(nx, ny)) {
          m.moving = { x: nx, y: ny, t: 0 };
          if (dx) m.facing = dx;
          if (d === m.buffer) m.buffer = null;
          break;
        }
      }
    },
    drawMaze(c) {
      const m = this.maze, t = m.t;
      c.save(); c.fillStyle = '#e9f2d4'; c.fillRect(0, 0, G().W, G().H);
      G().text('Secret Garden', 197, 28, 23, '#326452', null, 'center', c);
      for (let i = 0; i < 3; i++) BB.Gestures.drawPaw(c, 448 + i * 40, 28, 0.85,
        this.save.pads[PADS[i].key] ? '#ffcb65' : '#b2c4ac', '#628567');
      G().text('Find the three paw stones', 688, 28, 16, '#527760', null, 'center', c);
      c.fillStyle = '#79b87c'; G().circle(850, 30, 23, c); c.fill(); BB.HUD.zoneIcon(c, BB.HOME_ZONE, 850, 30, 0.7);
      c.fillStyle = '#617857'; G().rrect(X - 5, Y - 5, W * TILE + 10, H * TILE + 10, 16, c); c.fill();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = X + x * TILE, py = Y + y * TILE, n = x * 17 + y * 13;
        if (MAP[y][x] === '#') {
          c.fillStyle = '#397957'; c.fillRect(px, py, TILE, TILE);
          c.fillStyle = n % 3 ? '#55945b' : '#65a464'; G().rrect(px + 1, py + 1, TILE - 2, TILE - 3, 7, c); c.fill();
          for (let i = 0; i < 3; i++) {
            c.fillStyle = i % 2 ? '#7bb874' : '#8dc37c';
            G().ellipse(px + 6 + i * 8, py + 6 + (n + i * 7) % 15, 5, 2.7, i - 0.8, c); c.fill();
          }
          if (n % 11 === 0) BB.Cosmetics.flower(c, px + 13, py + 9, 4, '#eeb5dd');
          if (n % 7 === 0 && y < H - 1 && MAP[y + 1][x] === '.') {
            c.strokeStyle = '#63a369'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(px + 21, py + 18); c.quadraticCurveTo(px + 26, py + 35, px + 17, py + 32); c.stroke();
          }
        } else {
          c.fillStyle = (x + y) % 2 ? '#e4d9aa' : '#eaddb4'; c.fillRect(px, py, TILE, TILE);
          c.fillStyle = '#cbbd91'; G().circle(px + 7, py + 19, 1.2, c); c.fill();
        }
      }
      STARS.forEach(([x, y], i) => { if (!this.save.sparkles[starKey(i)]) {
        c.fillStyle = '#ffd34d'; c.strokeStyle = '#b98228'; c.lineWidth = 0.8;
        G().star(X + (x + 0.5) * TILE, Y + (y + 0.5) * TILE, 6 + Math.sin(t * 0.08 + i), 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
      } });
      for (const p of PADS) {
        const px = X + (p.x + 0.5) * TILE, py = Y + (p.y + 0.5) * TILE;
        c.fillStyle = '#ced7be'; G().circle(px, py, 11, c); c.fill();
        BB.Gestures.drawPaw(c, px, py, 0.55, this.save.pads[p.key] ? '#ffcb65' : '#8b9b88', '#72866c');
      }
      const rx = X + 1.5 * TILE, ry = Y + 1.5 * TILE;
      if (ready(this.save)) G().drawGlow(rx, ry, 33, '#ffeab5', 0.5 + Math.sin(t * 0.06) * 0.15, c);
      c.fillStyle = ready(this.save) ? '#f6c9ea' : '#8d9c94'; G().circle(rx, ry, 11, c); c.fill();
      BB.Kittens.draw(c, 'rainbow', { mode: 'sit', t }, rx, ry + 9, 0.52, 1);
      if (!ready(this.save)) {
        c.strokeStyle = '#7c9981'; c.lineWidth = 1.5;
        for (const dx of [-8, 0, 8]) { c.beginPath(); c.moveTo(rx + dx, ry - 16); c.lineTo(rx + dx, ry + 12); c.stroke(); }
        c.beginPath(); c.arc(rx, ry - 10, 15, Math.PI, 0); c.stroke();
      }
      BB.HUD.zoneIcon(c, BB.HOME_ZONE, X + (START.x + 0.5) * TILE, Y + (START.y + 0.5) * TILE, 0.52);
      const step = m.moving, k = step ? step.t / 8 : 0;
      const px = X + (m.x + 0.5 + (step ? (step.x - m.x) * k : 0)) * TILE;
      const py = Y + (m.y + 0.5 + (step ? (step.y - m.y) * k : 0)) * TILE;
      BB.Kittens.draw(c, this.pl.cat, { mode: step ? 'run' : 'sit', phase: t * 0.3, happy: true, t }, px, py + 10, 0.72, m.facing);
      G().text('← ↑ ↓ →  or WASD', 193, 510, 16, '#527760', null, 'center', c);
      CONTROLS.forEach((d, i) => {
        const bx = 386 + i * 62;
        c.fillStyle = '#80b984'; G().circle(bx, 506, 23, c); c.fill();
        c.save(); c.translate(bx, 506); c.rotate({ left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2, right: 0 }[d]);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-8, 0); c.lineTo(9, 0); c.moveTo(2, -7); c.lineTo(9, 0); c.lineTo(2, 7); c.stroke(); c.restore();
      });
      G().text('Home is always open →', 747, 510, 16, '#527760', null, 'center', c);
      if (m.choice) this.drawMazeCatChoice(c, t);
      c.restore();
    },
    drawMazeCatChoice(c, t) {
      const m = this.maze;
      c.fillStyle = 'rgba(35,61,46,0.6)'; c.fillRect(0, 0, G().W, G().H);
      c.fillStyle = '#fff8ee'; c.strokeStyle = '#dbadf1'; c.lineWidth = 5;
      G().rrect(180, 106, 600, 337, 40, c); c.fill(); c.stroke();
      G().text('Rainbow is safe!', 480, 151, 25, '#82629c', null, 'center', c);
      G().text('Choose your kitten', 480, 184, 17, '#998097', null, 'center', c);
      CATS.forEach((id, i) => {
        const x = 300 + i * 180;
        c.fillStyle = '#f5e7f9'; c.strokeStyle = m.sel === i ? '#f3b24b' : '#d7c4de'; c.lineWidth = m.sel === i ? 5 : 2;
        G().circle(x, 270, 65, c); c.fill(); c.stroke();
        BB.Kittens.draw(c, id, { mode: 'sit', happy: true, t }, x, 302, 2.2, 1);
        G().text(BB.CATS[id].name, x, 354, 19, '#82629c', null, 'center', c);
      });
      c.fillStyle = '#7dbf8a'; G().circle(480, 399, 27, c); c.fill();
      BB.Gestures.drawPaw(c, 480, 399, 1.1, '#ffffff', '#ffffff');
      c.strokeStyle = '#aa94b5'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(754, 128); c.lineTo(770, 144); c.moveTo(770, 128); c.lineTo(754, 144); c.stroke();
    },
  });
})(window.BB);
