// Free outdoor play with invited friends. These are momentary games;
// they never collect a critter again or change saved adventure progress.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, G = () => BB.G, S = () => BB.Audio.sfx;
  const PLACES = { ng: { col: 11.5, kind: 'ball' }, np: { col: 14.5, kind: 'bubbles' }, nr: { col: 10.5, kind: 'dance' } };
  const spot = room => {
    const p = PLACES[room.id];
    return p ? { room: room.id, kind: p.kind, x: (room.x + p.col) * T, y: (room.y + 31) * T } : null;
  };
  const colors = ['#ff9ec7', '#ffe27a', '#90d9df', '#b5a1ec'];
  function ball(c, x, y, angle = 0, size = 14) {
    c.save(); c.translate(x, y); c.rotate(angle);
    c.fillStyle = '#ffe27a'; c.strokeStyle = '#d99753'; c.lineWidth = 2;
    G().circle(0, 0, size, c); c.fill(); c.stroke(); c.clip();
    c.fillStyle = '#ff9ec7'; c.fillRect(-size, -5, size * 2, 10);
    c.fillStyle = '#90d9df'; c.fillRect(-4, -size, 8, size * 2);
    c.restore();
  }
  function steer(v, x, y) {
    const dx = x - v.x, dy = y - v.y, distance = Math.hypot(dx, dy);
    const k = distance ? Math.min(0.055, 1.15 / distance) : 0;
    v.x += dx * k; v.y += dy * k;
    v.moving = Math.abs(dx * k) > 0.08; v.stepT += Math.abs(dx * k) * 0.4;
    if (Math.abs(dx) > 6) v.facing = dx > 0 ? 1 : -1;
    if (v.behavior === 'dangle') v.anchorY = v.y - 65;
  }
  const GARDENS = ['ng', 'np', 'nr'];
  function ballBounds() {
    const first = BB.World.byId.ng, last = BB.World.byId.nr;
    return { lo: first.px + 14, hi: last.px + last.pw - 14, floor: (first.y + 31) * T };
  }
  const wall = ch => ch === '#' || ch === 'G' || ch === 'I' || ch === 'M';
  function stepBall(toy) {
    const r = 14, bounds = ballBounds(), W = BB.World;
    if (toy.kickCd > 0) toy.kickCd--;
    toy.vx = BB.clamp(toy.vx, -8, 8);
    toy.vy = BB.clamp(toy.vy + 0.28, -10, 12);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(toy.vx), Math.abs(toy.vy)) / 4));
    toy.grounded = false;
    for (let i = 0; i < steps; i++) {
      let nx = toy.x + toy.vx / steps;
      if (nx < bounds.lo || nx > bounds.hi) { nx = BB.clamp(nx, bounds.lo, bounds.hi); toy.vx *= -0.65; }
      const edge = nx + (toy.vx > 0 ? r : -r), tx = Math.floor(edge / T);
      if (toy.vx && [toy.y - r + 1, toy.y, toy.y + r - 1].some(y => wall(W.tile(tx, Math.floor(y / T))))) {
        nx = toy.vx > 0 ? tx * T - r : (tx + 1) * T + r; toy.vx *= -0.65;
      }
      toy.x = BB.clamp(nx, bounds.lo, bounds.hi);
      let ny = toy.y + toy.vy / steps;
      const xs = [toy.x - r * 0.65, toy.x, toy.x + r * 0.65];
      if (toy.vy >= 0) {
        const ty = Math.floor((ny + r) / T), top = ty * T;
        const tiles = xs.map(x => W.tile(Math.floor(x / T), ty));
        if (toy.y + r <= top + 0.1 && ny + r >= top && tiles.some(ch => wall(ch) || ch === '-')) {
          const speed = toy.vy; ny = top - r;
          if (tiles.includes('M')) toy.vy = -Math.max(6.2, speed * 0.75);
          else if (speed > 1.1) toy.vy = -speed * 0.58;
          else { toy.vy = 0; toy.grounded = true; }
        }
      } else {
        const ty = Math.floor((ny - r) / T);
        if (xs.some(x => wall(W.tile(Math.floor(x / T), ty)))) { ny = (ty + 1) * T + r; toy.vy *= -0.58; }
      }
      toy.y = ny;
    }
    // Rolling slows naturally; airborne movement retains its momentum.
    toy.vx *= toy.grounded ? 0.996 : 0.999;
    if (toy.grounded && Math.abs(toy.vx) < 0.035) toy.vx = 0;
    toy.angle = (toy.angle || 0) + toy.vx / r;
    if (toy.y > bounds.floor + r) { toy.y = bounds.floor - r; toy.vy = 0; }
  }
  BB.GardenFun = { spot, steer, GARDENS, ballBounds, stepBall };

  Object.assign(BB.Play, {
    startGardenFun() {
      const q = spot(this.room);
      if (!q || this.pl.state !== 'play' || this.gardenFun) return false;
      const friends = this.homeVisitors.filter(v => v.room === q.room && Math.abs(v.gardenFloor - q.y) < 1)
        .sort((a, b) => Math.abs(a.x - q.x) - Math.abs(b.x - q.x)).slice(0, 6).sort((a, b) => a.x - b.x);
      const half = (friends.length - 1) * 32;
      const centre = BB.clamp(q.x, this.room.px + 3 * T + half, this.room.px + this.room.pw - 3 * T - half);
      const toy = q.kind === 'ball' ? (this.gardenBall || (this.gardenBall = {
        x: q.x + (this.pl.body.facing || 1) * 26, y: q.y - 16, vx: (this.pl.body.facing || 1) * 2.8, vy: -2.6, angle: 0, kickCd: 0,
      })) : { x: q.x, y: q.y - 16, vx: 0, vy: 0 };
      this.gardenFun = { ...q, t: 0, duration: 480, ball: toy,
        friends, slots: friends.map((v, i) => ({ x: centre + i * 64 - half,
          y: ['walk', 'hop'].includes(v.behavior) ? q.y - (v.footOffset - 1) : q.y - 64 - i % 2 * 22 })) };
      for (const v of friends) { v.hopV = 0; v.gardenReturning = false; v.danceT = 0; }
      this.funLock = q; this.funHold = 0; this.pl.happyT = 90;
      if (q.kind === 'dance') { BB.Music.play('party'); S().party(); }
      else S().toySound(q.kind === 'ball' ? 'yarn' : 'bell');
      BB.Particles.burst('spark', q.x, q.y - 35, 10, { color: '#fff1c2', speed: 2, life: 35 });
      return true;
    },
    endGardenFun() {
      const f = this.gardenFun;
      if (!f) return;
      for (const v of f.friends) {
        v.gardenReturning = true; v.hop = v.hopV = 0; v.danceT = 0;
      }
      this.gardenFun = null;
      if (f.kind === 'dance' && !this.party && !this.celebrationT) BB.Music.play(BB.ZONES[this.room.zone].key);
    },
    updateGardenBall() {
      const toy = this.gardenBall;
      if (!toy || !GARDENS.includes(this.room.id) || this.traveling || this.pl.state !== 'play') return;
      stepBall(toy);
      const b = this.pl.body, cx = b.x + b.w / 2;
      const px = BB.clamp(toy.x, b.x, b.x + b.w), py = BB.clamp(toy.y, b.y, b.y + b.h);
      const touch = Math.hypot(toy.x - px, toy.y - py) < 17;
      const tap = BB.Input.pressed.bubble && Math.hypot(toy.x - cx, toy.y - b.y - b.h / 2) < 58;
      if (!toy.kickCd && (tap || touch && Math.abs(b.vx) > 0.45 && (toy.x - cx) * Math.sign(b.vx) >= -12)) {
        const dir = tap ? (b.facing || 1) : Math.sign(b.vx);
        if (touch) { const bounds = ballBounds(); toy.x = BB.clamp(cx + dir * (b.w / 2 + 14), bounds.lo, bounds.hi); }
        toy.vx = dir * Math.min(8, (tap ? 4.5 : 2.7) + Math.abs(b.vx) * 0.9);
        toy.vy = -3.4; toy.kickCd = 18; S().toySound('yarn');
      }
    },
    updateGardenFun() {
      this.updateGardenBall();
      let f = this.gardenFun;
      if (f && (this.room.id !== f.room || ++f.t >= f.duration || this.traveling)) { this.endGardenFun(); f = null; }
      if (f) {
        const toy = f.ball;
        f.friends.forEach((v, i) => {
          const returning = f.t >= f.duration - 120, slot = f.slots[i];
          const x = returning ? v.homeX : slot.x + Math.sin(f.t * 0.018 + i) * 4;
          const y = returning ? v.homeY : slot.y + (v.behavior === 'hover' ? Math.sin(f.t * 0.022 + i) * 4 : 0);
          steer(v, x, y);
          v.danceT = !returning && f.kind === 'dance' ? 30 : 0;
          v.hop = Math.min(0, v.hop + 0.6); v.hopV = 0;
          if (!returning && (f.t + i * 29) % 180 === 0) BB.Particles.heart(v.x, v.y - 25, colors[i % colors.length]);
          if (!returning && f.kind === 'ball' && !toy.kickCd && Math.hypot(v.x - toy.x, v.y - toy.y) < 32 && f.t % 50 === i * 7) {
            const dir = Math.sign(toy.vx) || Math.sign(toy.x - v.x) || 1;
            toy.vx = dir * Math.max(2.6, Math.abs(toy.vx)); toy.vy = -2.4; toy.kickCd = 18; S().toySound('yarn');
          }
        });
        if (f.kind === 'bubbles' && f.t % 90 === 0) S().pop(1);
        if (f.kind === 'dance' && f.t % 36 === 0) S().bell([72, 76, 79, 84][Math.floor(f.t / 36) % 4]);
      }
      const q = spot(this.room), b = this.pl.body;
      if (this.funLock && (this.room.id !== this.funLock.room || Math.hypot(b.x + b.w / 2 - this.funLock.x, b.y + b.h - this.funLock.y) > 64)) this.funLock = null;
      if (!q || f || this.funLock || this.mapOn || this.iris || this.party || this.traveling || this.pl.state !== 'play') { this.funHold = 0; return; }
      const near = b.grounded && Math.abs(b.vx) < 0.3 && Math.abs(b.x + b.w / 2 - q.x) < 18 && Math.abs(b.y + b.h - q.y) < 6;
      this.funHold = near ? this.funHold + 1 : 0;
      if (near && (this.funHold >= BB.Links.HOLD || BB.Input.pressed.confirm || BB.Input.pressed.bubble)) this.startGardenFun();
    },
    drawGardenFun(c, room, cam, t) {
      const q = spot(room);
      if (!q) return;
      const x = q.x - cam.x, y = q.y - cam.y, f = this.gardenFun && this.gardenFun.room === room.id ? this.gardenFun : null;
      c.save();
      c.fillStyle = q.kind === 'dance' ? '#f1d5ed' : '#d5e9bd'; c.strokeStyle = '#a8c494'; c.lineWidth = 2;
      G().ellipse(x, y - 3, 71, 14, 0, c); c.fill(); c.stroke();
      if (q.kind === 'ball') {
        if (!this.gardenBall) ball(c, x, y - 18);
      } else if (q.kind === 'bubbles') {
        c.strokeStyle = '#bc8ed1'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 8, y - 13); c.lineTo(x + 4, y - 40); c.stroke();
        G().circle(x + 8, y - 49, 11, c); c.stroke();
        for (let i = 0; i < (f ? 12 : 3); i++) {
          const u = ((t + i * 39) % 180) / 180;
          G().bubble(x + Math.sin(t * 0.013 + i * 2) * (f ? 150 : 30), y - 65 - u * (f ? 150 : 45), 7 + i % 4 * 2, colors[i % colors.length], (1 - u) * 0.8, c);
        }
      } else {
        BB.Gestures.drawIcon(c, x, y - 11, 1.3, '#bc8ed1', '#72518d');
        for (const d of [-1, 1]) {
          const a = f ? Math.sin(t * 0.08) * 5 : 0;
          G().text('♪', x + d * 45, y - 37 + a * d, 24, '#bc8ed1', null, 'center', c);
        }
      }
      const toy = this.gardenBall;
      if (toy && toy.x >= room.px && toy.x < room.px + room.pw) {
        const height = Math.max(0, q.y - 14 - toy.y);
        c.fillStyle = 'rgba(77,99,66,0.16)'; G().ellipse(toy.x - cam.x, q.y - cam.y - 2, Math.max(5, 14 - height * 0.025), 3, 0, c); c.fill();
        ball(c, toy.x - cam.x, toy.y - cam.y, toy.angle);
      }
      if (!f) BB.Links.hintRing(c, x, y - 4, t);
      c.restore();
    },
  });
})(window.BB);
