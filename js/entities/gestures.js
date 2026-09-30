// ════════════════════════════════════════════════════════════════
//  GESTURES — twelve little cat tricks hidden around the kingdom, one
//  per zone, each in a smiling-cat music bubble (j on the map). Touch one and
//  your kitten learns that trick; then press ▼ (S, a gamepad's D-pad
//  down, or the smiling-cat button on a touchscreen) to do it. Each press does
//  the next trick you know, round and round. Tricks are just for fun:
//  moving, jumping or blowing a bubble stops one straight away.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;

  const LIST = [
    { id: 'wave', zone: 0, len: 110 },      // hello! a big paw wave
    { id: 'pounce', zone: 1, len: 96 },     // wiggle wiggle… pounce!
    { id: 'blink', zone: 2, len: 130 },     // a slow blink: a cat's kiss
    { id: 'knead', zone: 3, len: 160 },     // making biscuits, purring
    { id: 'sneeze', zone: 4, len: 110 },    // ah… ah… achoo!
    { id: 'roll', zone: 5, len: 76 },       // a roly-poly roll
    { id: 'blep', zone: 6, len: 120 },      // blep (the tongue stays out)
    { id: 'chase', zone: 7, len: 110 },     // chasing its own tail
    { id: 'loaf', zone: 8, len: 170 },      // a cozy bread-loaf tuck
    { id: 'wash', zone: 9, len: 150 },      // a paw-lick face wash
    { id: 'stretch', zone: 10, len: 140 },  // a big stretch and a yawn
    { id: 'dance', zone: 11, len: 160 },    // a hoppy happy dance
    { id: 'twirl', zone: -1, len: 120 },    // optional heart-fountain celebration
  ];
  const BY = Object.fromEntries(LIST.map(g => [g.id, g]));
  const forZone = zone => LIST.find(g => g.zone === zone);
  // 0 → 1 over [0, a], stays 1 until b, back to 0 by the end
  const env = (k, a, b) => (k < a ? k / a : k > b ? Math.max(0, (1 - k) / (1 - b)) : 1);
  const ramp = (k, a, b) => BB.clamp((k - a) / (b - a), 0, 1);

  // ──── The cat-trick bubble you find ────
  function create(thing, room, save) {
    const g = forZone(room.zone);
    if (!g || (save.gestures || {})[g.id]) return null;
    return {
      type: 'trick', trick: true, gid: g.id, key: thing.tx + ',' + thing.ty, room: room.id, zone: room.zone, ch: thing.ch,
      x: thing.tx * T + T / 2, y: thing.ty * T + T / 2, t: Math.floor(Math.random() * 1000),
    };
  }

  function update(th, ctx) {
    th.t++;
    const b = ctx.pl.body;
    const d = Math.hypot(b.x + b.w / 2 - th.x, b.y + b.h / 2 - th.y + Math.sin(th.t * 0.05) * 4);
    if (d < 32 && ctx.pl.state === 'play') { th.dead = true; ctx.onTrick(th); }
    else if (th.t % 12 === 0) PT().trail('spark', th.x + (Math.random() - 0.5) * 30, th.y + (Math.random() - 0.5) * 30, '#ffe27a');
  }

  function drawPaw(c, x, y, s, col, line) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = col; c.strokeStyle = line; c.lineWidth = 1.6;
    G().ellipse(0, 4, 7.5, 6, 0, c); c.fill(); c.stroke();
    for (const [tx, ty, r] of [[-7.5, -4, 3], [-2.8, -8.5, 3.2], [2.8, -8.5, 3.2], [7.5, -4, 3]]) { G().circle(tx, ty, r, c); c.fill(); c.stroke(); }
    c.restore();
  }

  // A happy performing kitten and music note distinguish tricks from
  // the paw prints used for paths, entrances and menu selection.
  function drawIcon(c, x, y, s = 1, col = '#ffd84a', line = '#9b6a29') {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = col; c.strokeStyle = line; c.lineWidth = 1.5; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-12, -3); c.lineTo(-12, -11); c.lineTo(-6, -7);
    c.quadraticCurveTo(-3, -8, 0, -7); c.lineTo(6, -11); c.lineTo(6, -3); c.closePath(); c.fill(); c.stroke();
    G().ellipse(-3, 2, 10, 8.5, 0, c); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-7, -3, -5, 0);
    c.moveTo(-1, 0); c.quadraticCurveTo(1, -3, 3, 0);
    c.moveTo(-7, 4); c.quadraticCurveTo(-3, 9, 1, 4); c.stroke();
    c.strokeStyle = col; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(12, -2); c.lineTo(12, -13); c.quadraticCurveTo(17, -12, 17, -8); c.stroke();
    G().ellipse(10, -1, 3, 2.2, -0.25, c); c.fill();
    c.restore();
  }

  function draw(c, th, cam) {
    const x = th.x - cam.x, y = th.y - cam.y + Math.sin(th.t * 0.05) * 4;
    if (x < -60 || x > G().W + 60 || y < -60 || y > G().H + 60) return;
    G().drawGlow(x, y, 46, '#ffe9a0', 0.55 + Math.sin(th.t * 0.08) * 0.15, c);
    // a rainbow-rimmed bubble…
    const r = 19 + Math.sin(th.t * 0.07) * 1;
    G().bubble(x, y, r, '#ffe6a8', 0.95, c);
    c.save();
    c.lineWidth = 2; c.globalAlpha = 0.6;
    ['#ff9ec7', '#ffd84a', '#8fe388', '#7cc8ff'].forEach((col, i) => {
      c.strokeStyle = col; c.beginPath(); c.arc(x, y, r - 1.5 - i * 1.6, th.t * 0.02 + i, th.t * 0.02 + i + 1.4); c.stroke();
    });
    c.restore();
    // …with the same smiling-cat symbol as the gesture button and HUD
    drawIcon(c, x - 1, y + 1, 0.92 + Math.sin(th.t * 0.1) * 0.04);
    if (th.t % 70 < 20) {
      const k = (th.t % 70) / 20;
      c.fillStyle = `rgba(255,255,255,${Math.sin(k * Math.PI)})`;
      G().twinkle(x + 13, y - 13, 2 + Math.sin(k * Math.PI) * 4, c); c.fill();
    }
  }

  // ──── Doing a trick ────
  function start(pl, id) {
    const g = BY[id];
    if (!g) return false;
    pl.gesture = { id, t: 0, len: g.len };
    pl.idleT = 0; pl.yawn = 0; pl.lick = 0;
    return true;
  }

  // once per tick, before the kitten moves; any real input stops the trick
  function tick(pl, input) {
    const g = pl.gesture, b = pl.body;
    if (!g) return;
    if (input.left || input.right || input.jumpPressed || input.bubblePressed || pl.state !== 'play' || b.inWater || b.climbing) { pl.gesture = null; return; }
    g.t++;
    pl.idleT = 0; // (no spontaneous yawns in the middle of a trick)
    const cx = b.x + b.w / 2, top = b.y, f = b.facing;
    switch (g.id) {
      case 'wave': if (g.t === 14) S().meow(pl.cat); break;
      case 'pounce':
        if (g.t === 60 && b.grounded) { b.vy = -6.2; b.vx = f * 1.6; b.grounded = false; S().jump(pl.cat); }
        break;
      case 'blink': if (g.t === 72) { S().sparkle(); PT().heart(cx + f * 8, top - 6); PT().heart(cx - f * 4, top - 14); } break;
      case 'knead':
        if (g.t % 45 === 5) S().purr();
        if (g.t % 34 === 0) PT().heart(cx + (Math.random() - 0.5) * 16, top - 6);
        break;
      case 'sneeze':
        if (g.t === 58) {
          S().sneeze(pl.cat); pl.squash = 0.78;
          PT().burst('dot', cx + f * 14, top + 9, 9, { color: '#ffffff', speed: 2.4, life: 28, size: 2.6, up: 0.3 });
        }
        break;
      case 'roll':
        if (g.t === 2) S().whoosh();
        if (g.t === g.len - 4) { S().bounce(); PT().burst('spark', cx, top + 20, 8, { color: '#fff4c2', speed: 2, life: 24 }); }
        break;
      case 'blep': if (g.t === 16) S().peep(); break;
      case 'chase':
        if (g.t % 12 === 1) { S().step(); PT().dust(cx, top + b.h, 1); }
        if (g.t % 40 === 20 && b.grounded) { b.vy = -3.2; b.grounded = false; }
        break;
      case 'loaf': if (g.t === 40) S().purr(); break;
      case 'wash': if (g.t % 24 === 10) S().lick(); break;
      case 'stretch': if (g.t === 52) S().mrrow(pl.cat); break;
      case 'dance':
        if (g.t === 2) S().befriend();
        if (g.t % 32 === 8 && b.grounded) { b.vy = -4.4; b.grounded = false; }
        if (g.t % 16 === 0) PT().burst('confetti', cx, top - 8, 3, { speed: 2, g: 0.06, life: 50 });
        break;
      case 'twirl':
        if (g.t === 2) S().outfit();
        if (g.t % 20 === 0) PT().burst('confetti', cx, top - 8, 4, { speed: 2, g: 0.06, life: 45 });
        break;
    }
    if (g.t >= g.len) { pl.gesture = null; pl.happyT = Math.max(pl.happyT, 30); }
  }

  // Pose overrides for trick `id` at tick `t`. Returns true when the trick
  // chose the whole pose (otherwise the kitten's normal pose is kept, e.g.
  // mid-air during a pounce or a dance hop).
  function pose(id, t, grounded, p) {
    const g = BY[id];
    if (!g) return false;
    const k = Math.min(1, t / g.len);
    switch (id) {
      case 'wave': p.mode = 'sit'; p.wave = env(k, 0.14, 0.86); p.happy = k > 0.12 && k < 0.9; return true;
      case 'pounce':
        if (!grounded || k > 0.62) return false;
        p.mode = 'stand'; p.wiggle = true; p.look = 0.4; p.squash = 0.92;
        return true;
      case 'blink':
        p.mode = 'sit';
        p.blink = k < 0.25 ? 0 : k < 0.45 ? ramp(k, 0.25, 0.45) : k < 0.62 ? 1 : 1 - ramp(k, 0.62, 0.82);
        p.happy = k > 0.84;
        return true;
      case 'knead': p.mode = 'sit'; p.knead = env(k, 0.1, 0.9); p.happy = true; return true;
      case 'sneeze':
        p.mode = 'sit';
        if (k < 0.52) { const a = ramp(k, 0.05, 0.52); p.puff = a; p.blink = a * 0.7; p.tilt = -0.2 * a; }
        else if (k < 0.66) { p.blink = 1; p.tilt = 0.22; p.surprised = true; }
        else { p.happy = true; p.ear = Math.sin(t * 0.5) * 0.6; }
        return true;
      case 'roll': p.mode = 'sleep'; p.happy = true; return true;
      case 'blep': p.mode = 'sit'; p.blep = env(k, 0.12, 0.9); p.look = -0.3; return true;
      case 'chase':
        if (!grounded) return false;
        p.mode = 'run'; p.phase = t * 0.5; p.happy = true;
        return true;
      case 'loaf':
        p.mode = 'loaf';
        p.blink = k > 0.4 && k < 0.7 ? Math.sin(ramp(k, 0.4, 0.7) * Math.PI) : 0;
        p.happy = k > 0.75;
        return true;
      case 'wash':
        p.mode = 'sit'; p.lick = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.11)); p.happy = true; p.tilt = Math.sin(t * 0.06) * 0.14;
        return true;
      case 'stretch': {
        p.mode = 'stand';
        p.stretch = env(k, 0.28, 0.66);
        const y = ramp(k, 0.3, 0.72);
        p.yawn = y > 0 && y < 1 ? Math.sin(y * Math.PI) : 0;
        p.happy = k > 0.75;
        return true;
      }
      case 'dance':
        p.happy = true;
        if (!grounded) return false;
        p.mode = 'stand'; p.squash = 1 + Math.sin(t * 0.4) * 0.06;
        return true;
      case 'twirl': p.mode = 'stand'; p.happy = true; p.squash = 1 + Math.sin(t * 0.3) * 0.06; return true;
    }
    return false;
  }

  // Whole-body moves the pose can't do on its own: rolling over, spinning
  // round after its tail, twirling in the dance
  function transform(id, t) {
    const g = BY[id];
    if (!g) return null;
    if (id === 'roll') return { rot: BB.easeInOut(Math.min(1, t / g.len)) * TAU, flip: 1 };
    if (id === 'chase') return { rot: 0, flip: Math.floor(t / 9) % 2 ? -1 : 1 };
    if (id === 'dance') return { rot: Math.sin(t * 0.2) * 0.12, flip: Math.floor((t + 8) / 32) % 2 ? -1 : 1 };
    if (id === 'twirl') return { rot: Math.sin(t * 0.2) * 0.18, flip: Math.floor(t / 18) % 2 ? -1 : 1 };
    return null;
  }

  BB.Gestures = { LIST, BY, forZone, create, update, draw, drawPaw, drawIcon, start, tick, pose, transform };
})(window.BB);
