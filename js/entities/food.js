// ════════════════════════════════════════════════════════════════
//  FOOD — cat snacks dotted around the kingdom.
//   e  fishy treat  a crunchy fish-shaped biscuit bobbing over the
//                   ground. Hard: one happy sun back. Easy: just yummy.
//   W  food bowl    a heaped bowl of kibble with a fish on top.
//                   Hard: every sun back. Easy: a happy little feast.
//  Snacks regrow: a treat pops back after a while (or as soon as you
//  leave the room), and an empty bowl slowly fills up again, so a hungry
//  kitten never runs out. Every gloom cloud a boss loses also bounces a
//  treat out onto the floor, right when a Hard-mode kitten needs one.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const W = () => BB.World;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;

  const TYPES = { e: 'treat', W: 'bowl' };
  const REGROW = { treat: 1800, bowl: 3600 }; // ticks: 30 s, 60 s
  const LAND = { glow: true };

  function floorBelow(tx, ty) {
    let y = ty;
    while (y < ty + 30) {
      if (BB.Physics.landKind(W().tile(tx, y + 1), LAND)) break;
      y++;
    }
    return (y + 1) * T;
  }

  function create(thing, room) {
    const type = TYPES[thing.ch];
    if (!type) return null;
    return {
      type, food: true, key: thing.tx + ',' + thing.ty, room: room.id, zone: room.zone, ch: thing.ch,
      x: thing.tx * T + T / 2, y: floorBelow(thing.tx, thing.ty), t: Math.floor(Math.random() * 1000),
      eaten: false, regrowT: 0, grow: 1,
    };
  }

  // is the kitten's body over the snack?
  function reaches(th, pb) {
    const cx = pb.x + pb.w / 2;
    const top = th.y - (th.type === 'bowl' ? 26 : 34);
    return Math.abs(cx - th.x) < (th.type === 'bowl' ? 24 : 20) && pb.y < th.y && pb.y + pb.h > top;
  }

  function update(th, ctx) {
    th.t++;
    if (th.eaten) {
      if (th.regrowT > 0 && --th.regrowT === 0) regrow(th, false);
      return;
    }
    if (th.grow < 1) th.grow = Math.min(1, th.grow + 0.07);
    if (ctx.pl.state === 'play' && reaches(th, ctx.pl.body)) eat(th, ctx);
  }

  function eat(th, ctx) {
    th.eaten = true;
    if (th.drop) th.dead = true;
    else th.regrowT = REGROW[th.type];
    ctx.onEat(th);
  }

  // back again: quietly when you weren't looking, with a twinkle when you are
  function regrow(th, quiet) {
    if (!th.eaten || th.drop) return;
    th.eaten = false; th.regrowT = 0;
    th.grow = quiet ? 1 : 0;
    if (!quiet) PT().burst('spark', th.x, th.y - 16, 7, { color: '#fff4c2', speed: 1.4, life: 26 });
  }

  // ──── Treats that bounce out of a boss when a gloom cloud pops ────
  const drops = [];
  function drop(x, y, towardX, room) {
    const side = towardX >= x ? 1 : -1;
    const x0 = (room.x + 2) * T, x1 = (room.x + room.w - 2) * T;
    // land on dry floor, a hop away from the boss (toward the kitten if possible)
    for (const off of [110, 150, 75, -110, -150, -75]) {
      const tx = Math.floor(BB.clamp(x + side * off, x0, x1) / T);
      let ty = Math.floor((y - 20) / T);
      for (let k = 0; k < 20 && W().tile(tx, ty) !== '.'; k++) ty--; // climb out of any wall
      const fy = floorBelow(tx, ty);
      const above = W().tile(tx, fy / T - 1);
      if (above === '~' || above === '%' || fy / T > room.y + room.h) continue;
      drops.push({ type: 'treat', food: true, drop: true, room: room.id, zone: room.zone, x, y, x0: x, y0: y, x1: tx * T + T / 2, y1: fy, dt: 0, dur: 44, t: 0, eaten: false, grow: 1, landed: false });
      S().bossLob();
      return;
    }
  }
  function updateDrops(ctx) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t++;
      if (!d.landed) {
        d.dt++;
        const k = Math.min(1, d.dt / d.dur);
        d.x = BB.lerp(d.x0, d.x1, k);
        d.y = BB.lerp(d.y0, d.y1, k) - Math.sin(k * Math.PI) * 110;
        if (k >= 1) {
          d.landed = true; d.x = d.x1; d.y = d.y1;
          PT().burst('dot', d.x, d.y - 4, 5, { color: '#f0b04a', speed: 1.4, life: 20, size: 2, up: 0.8 });
          S().land(false);
        }
      }
      if (ctx.pl.state === 'play' && reaches(d, ctx.pl.body)) eat(d, ctx);
      if (d.dead) drops.splice(i, 1);
    }
  }
  function clearDrops() { drops.length = 0; }

  // ──── Drawing ────
  function drawTreat(c, x, y, t, s, spin) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.rotate(spin != null ? spin : Math.sin(t * 0.05) * 0.14);
    c.fillStyle = '#f2b24c'; c.strokeStyle = '#8a5424'; c.lineWidth = 1.6; c.lineJoin = 'round';
    // tail
    c.beginPath(); c.moveTo(-7, 0); c.lineTo(-15, -6.5); c.quadraticCurveTo(-12, 0, -15, 6.5); c.closePath(); c.fill(); c.stroke();
    // body
    G().ellipse(1, 0, 10, 6.4, 0, c); c.fill(); c.stroke();
    // crunchy criss-cross, a little eye and a smile
    c.strokeStyle = 'rgba(138,84,36,0.55)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-4, -4.5); c.lineTo(1, 4.5); c.moveTo(1, -4.5); c.lineTo(-4, 4.5); c.stroke();
    c.fillStyle = '#5a3414'; G().circle(6.2, -1.6, 1.25, c); c.fill();
    c.strokeStyle = '#5a3414'; c.lineWidth = 0.9;
    c.beginPath(); c.arc(7.4, 1.4, 1.5, 0.2, Math.PI * 0.8); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.65)'; G().ellipse(0, -3.4, 4.2, 1.3, -0.15, c); c.fill();
    c.restore();
  }

  function drawBowl(c, x, y, t, zone, fill) {
    c.save();
    c.translate(x, y);
    c.scale(1.2, 1.2);
    const col = (BB.ZONES[zone] && BB.ZONES[zone].accent) || '#ff8fb8';
    c.fillStyle = 'rgba(0,0,0,0.18)'; G().ellipse(0, 0, 21, 4, 0, c); c.fill();
    // the inside of the bowl (back rim)
    c.fillStyle = BB.mix(col, '#3a2a3a', 0.35); G().ellipse(0, -13, 18, 3.6, 0, c); c.fill();
    // a heap of kibble with a fish on top (it grows back as the bowl refills)
    if (fill > 0) {
      c.save();
      c.translate(0, -12); c.scale(1, fill); c.translate(0, 12);
      const bits = [[-12, -13], [-7, -16], [-2, -18], [4, -17], [9, -15], [13, -13], [-9, -12], [-3, -14], [3, -13], [8, -12], [0, -21], [-5, -20], [6, -20]];
      bits.forEach(([bx, by], i) => {
        c.fillStyle = i % 3 === 0 ? '#8a4a1a' : i % 3 === 1 ? '#c07a3a' : '#e0a060';
        c.strokeStyle = 'rgba(70,35,10,0.6)'; c.lineWidth = 0.7;
        G().ellipse(bx, by, 3.4, 2.6, i * 0.7, c); c.fill(); c.stroke();
      });
      c.restore();
      if (fill >= 1) drawTreat(c, 2, -25 + Math.sin(t * 0.06) * 0.8, t, 0.75, -0.25);
    }
    // bowl front
    c.fillStyle = col; c.strokeStyle = '#4a2a3a'; c.lineWidth = 1.7; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-19, -13); c.quadraticCurveTo(0, -9, 19, -13);
    c.quadraticCurveTo(17, -1, 11, 0); c.lineTo(-11, 0); c.quadraticCurveTo(-17, -1, -19, -13);
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, -11); c.quadraticCurveTo(0, -7.5, 16, -11); c.stroke();
    // a white paw print on the front
    c.fillStyle = 'rgba(255,255,255,0.9)';
    G().ellipse(0, -4, 3.2, 2.5, 0, c); c.fill();
    for (const [px, py] of [[-3.6, -7.4], [-1.2, -8.6], [1.2, -8.6], [3.6, -7.4]]) { G().circle(px, py, 1.1, c); c.fill(); }
    c.restore();
    // a wisp of yummy steam
    if (fill >= 1) {
      for (let i = 0; i < 2; i++) {
        const ph = ((t * 0.01) + i * 0.5) % 1;
        c.strokeStyle = `rgba(255,255,255,${Math.sin(ph * Math.PI) * 0.55})`; c.lineWidth = 2; c.lineCap = 'round';
        const sx = x - 7 + i * 14, sy = y - 36 - ph * 22;
        c.beginPath(); c.moveTo(sx, sy + 8); c.quadraticCurveTo(sx + 4 * Math.sin(ph * 6 + i), sy + 4, sx, sy); c.stroke();
      }
    }
  }

  function drawOne(c, th, cam) {
    const x = th.x - cam.x, y = th.y - cam.y;
    if (x < -60 || x > G().W + 60 || y < -80 || y > G().H + 60) return;
    if (th.type === 'bowl') {
      const fill = th.eaten ? 1 - th.regrowT / REGROW.bowl : 1;
      drawBowl(c, x, y, th.t, th.zone, th.eaten ? Math.min(0.92, fill) : th.grow);
      return;
    }
    if (th.eaten) return;
    const bob = th.drop && !th.landed ? 0 : Math.sin(th.t * 0.07) * 3;
    const hy = y - 17 + bob;
    const s = th.grow < 1 ? BB.easeOutBack(th.grow) : 1;
    if (!th.drop || th.landed) {
      c.fillStyle = 'rgba(0,0,0,0.14)'; G().ellipse(x, y - 1, 9 - bob * 0.6, 2.4, 0, c); c.fill();
    }
    G().drawGlow(x, hy, 24, '#fff1c2', 0.4, c);
    drawTreat(c, x, hy, th.t, s, th.drop && !th.landed ? th.t * 0.3 : null);
    if (th.t % 90 < 22) {
      const k = (th.t % 90) / 22;
      c.fillStyle = `rgba(255,255,255,${Math.sin(k * Math.PI)})`;
      G().twinkle(x + 9, hy - 7, 2 + Math.sin(k * Math.PI) * 3, c); c.fill();
    }
  }

  function draw(c, th, cam) { drawOne(c, th, cam); }
  function drawDrops(c, cam) { for (const d of drops) drawOne(c, d, cam); }

  BB.Food = { TYPES, REGROW, create, update, draw, drop, updateDrops, drawDrops, clearDrops, regrow, drawTreat, drawBowl, drops };
})(window.BB);
