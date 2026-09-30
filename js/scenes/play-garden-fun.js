// Free outdoor play with invited friends. These are momentary games;
// they never collect a critter again or change saved adventure progress.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, G = () => BB.G, S = () => BB.Audio.sfx;
  const PLACES = { ng: { col: 8.5, kind: 'ball' }, np: { col: 14.5, kind: 'bubbles' }, nr: { col: 10.5, kind: 'dance' } };
  const spot = room => {
    const p = PLACES[room.id];
    return p ? { room: room.id, kind: p.kind, x: (room.x + p.col) * T, y: (room.y + 31) * T } : null;
  };
  const colors = ['#ff9ec7', '#ffe27a', '#90d9df', '#b5a1ec'];
  function ball(c, x, y, t, size = 14) {
    c.save(); c.translate(x, y); c.rotate(t * 0.07);
    c.fillStyle = '#ffe27a'; c.strokeStyle = '#d99753'; c.lineWidth = 2;
    G().circle(0, 0, size, c); c.fill(); c.stroke(); c.clip();
    c.fillStyle = '#ff9ec7'; c.fillRect(-size, -5, size * 2, 10);
    c.fillStyle = '#90d9df'; c.fillRect(-4, -size, 8, size * 2);
    c.restore();
  }
  BB.GardenFun = { spot };

  Object.assign(BB.Play, {
    startGardenFun() {
      const q = spot(this.room);
      if (!q || this.pl.state !== 'play' || this.gardenFun) return false;
      this.gardenFun = { ...q, t: 0, duration: 480, ball: { x: q.x, y: q.y - 16, vx: (this.pl.body.facing || 1) * 3.4, vy: -3.6 },
        friends: this.homeVisitors.filter(v => v.room === q.room) };
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
        v.x = v.homeX; v.y = v.homeY; v.hop = v.hopV = 0; v.danceT = 0;
        if (v.behavior === 'dangle') v.anchorY = v.homeY - 65;
      }
      this.gardenFun = null;
      if (f.kind === 'dance' && !this.party && !this.celebrationT) BB.Music.play(BB.ZONES[this.room.zone].key);
    },
    updateGardenFun() {
      let f = this.gardenFun;
      if (f && (this.room.id !== f.room || ++f.t >= f.duration || this.traveling)) { this.endGardenFun(); f = null; }
      if (f) {
        const r = this.room, toy = f.ball;
        if (f.kind === 'ball') {
          toy.x += toy.vx; toy.y += toy.vy; toy.vy += 0.18;
          if (toy.y > f.y - 14) { toy.y = f.y - 14; toy.vy = -3.8; }
          const lo = r.px + 3 * T, hi = r.px + r.pw - 3 * T;
          if (toy.x < lo || toy.x > hi) { toy.x = BB.clamp(toy.x, lo, hi); toy.vx *= -1; }
          const b = this.pl.body;
          if (Math.abs(b.x + b.w / 2 - toy.x) < 26 && Math.abs(b.y + b.h - toy.y) < 34 && f.t % 18 === 0) {
            toy.vx = (b.facing || 1) * 4; toy.vy = -4.6; S().toySound('yarn');
          }
        }
        f.friends.forEach((v, i) => {
          const returning = f.t >= f.duration - 60;
          let x, y;
          if (f.kind === 'ball') { x = toy.x + Math.sin(i * 2.4) * 70; y = f.y - 16; }
          else if (f.kind === 'bubbles') { x = f.x + Math.sin(f.t * 0.014 + i * 2.4) * 130; y = f.y - 18 - (v.behavior === 'hover' ? 48 : 0); }
          else { const a = f.t * 0.025 + i * Math.PI * 2 / Math.max(1, f.friends.length); x = f.x + Math.cos(a) * 125; y = f.y - 23 - Math.sin(a) * 14; }
          if (returning) { x = v.homeX; y = v.homeY; }
          v.x = BB.lerp(v.x, BB.clamp(x, r.px + 3 * T, r.px + r.pw - 3 * T), returning ? 0.12 : 0.035);
          v.y = BB.lerp(v.y, y, returning ? 0.12 : 0.06); v.facing = x > v.x ? 1 : -1;
          if (v.behavior === 'dangle') v.anchorY = v.y - 65;
          v.danceT = returning ? 0 : 30; v.hop = returning ? 0 : -Math.max(0, Math.sin(f.t * 0.13 + i)) * (f.kind === 'bubbles' ? 12 : 5);
          if ((f.t + i * 13) % 90 === 0) BB.Particles.heart(v.x, v.y - 25, colors[i % colors.length]);
          if (f.kind === 'ball' && Math.abs(v.x - toy.x) < 22 && f.t % 24 === i % 24) {
            toy.vx = (toy.x > f.x ? -1 : 1) * 3.6; toy.vy = -4.2; S().toySound('yarn');
          }
        });
        if (f.kind === 'bubbles' && f.t % 45 === 0) S().pop(1);
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
        if (f) ball(c, f.ball.x - cam.x, f.ball.y - cam.y, f.t);
        else ball(c, x, y - 18, 0);
        G().text('Ball play', x, y - 53, 14, '#786080', null, 'center', c);
      } else if (q.kind === 'bubbles') {
        c.strokeStyle = '#bc8ed1'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 8, y - 13); c.lineTo(x + 4, y - 40); c.stroke();
        G().circle(x + 8, y - 49, 11, c); c.stroke();
        for (let i = 0; i < (f ? 12 : 3); i++) {
          const u = ((t + i * 39) % 180) / 180;
          G().bubble(x + Math.sin(t * 0.013 + i * 2) * (f ? 150 : 30), y - 65 - u * (f ? 150 : 45), 7 + i % 4 * 2, colors[i % colors.length], (1 - u) * 0.8, c);
        }
        G().text('Bubble play', x, y - 86, 14, '#786080', null, 'center', c);
      } else {
        BB.Gestures.drawPaw(c, x, y - 11, 1.3, '#bc8ed1', '#9468b0');
        for (const d of [-1, 1]) {
          const a = f ? Math.sin(t * 0.08) * 5 : 0;
          G().text('♪', x + d * 45, y - 37 + a * d, 24, '#bc8ed1', null, 'center', c);
        }
        G().text('Dance together', x, y - 66, 14, '#786080', null, 'center', c);
      }
      if (!f) BB.Links.hintRing(c, x, y - 4, t);
      if (this.room === room && this.funHold > 0) BB.Links.holdRing(c, x, y - 35, this.funHold / BB.Links.HOLD);
      c.restore();
    },
  });
})(window.BB);
