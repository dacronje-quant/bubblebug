// ════════════════════════════════════════════════════════════════
//  THINGS — everything else that lives in the kingdom.
//   sparkle ✦   collectable star-sparkles (a rising chime scale)
//   bench       cozy bench + lantern: checkpoint, and a curled-up nap
//               if you stop and rest (the music turns to a lullaby)
//   sign        painted arrows pointing the way
//   firefly     guide lights that zip ahead in the right direction
//   toy         six hidden toys, one per zone, floating in a bubble
//   yarn        a ball of yarn to bat around, just for fun
//   flower      music flowers that sing a note when touched or bubbled
//   bud         sleepy buds: bubble them all to open a vine gate
//   elder       ancient bug elders who give a new power
//   finale      the rainbow party
//   family &    a member of the kittens' own family, napping somewhere
//               secret — find them all and they come to the party
//  (puzzle pieces live in puzzles.js, cat food in food.js and the golden
//  paw bubbles that teach cat tricks in gestures.js)
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

  const TYPE = { '*': 'sparkle', B: 'bench', R: 'sign', L: 'sign', U: 'sign', D: 'sign', f: 'firefly', T: 'toy', y: 'yarn', n: 'flower', o: 'bud', E: 'elder', F: 'finale', '&': 'family' };
  const DIR = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
  const FLOWER_TUNE = [72, 74, 76, 79, 81, 79, 76, 74];
  let flowerNote = 0;

  function floorBelow(tx, ty) {
    let y = ty;
    while (y < ty + 20) {
      const k = BB.Physics.landKind(W().tile(tx, y + 1), { glow: true });
      if (k) break;
      y++;
    }
    return (y + 1) * T;
  }

  function create(thing, room, save) {
    if (BB.Puzzles.TYPES[thing.ch]) return BB.Puzzles.create(thing, room, save);
    if (BB.Food.TYPES[thing.ch]) return BB.Food.create(thing, room);
    if (thing.ch === 'j') return BB.Gestures.create(thing, room, save);
    if ('huv'.includes(thing.ch)) return BB.Links.create(thing, room, save);
    const type = TYPE[thing.ch];
    if (!type) return null;
    const key = thing.tx + ',' + thing.ty;
    const th = { type, key, room: room.id, zone: room.zone, x: thing.tx * T + T / 2, y: thing.ty * T + T / 2, t: Math.random() * 1000, ch: thing.ch };
    switch (type) {
      case 'sparkle': if (save.sparkles[key]) return null; break;
      case 'toy': th.toy = room.def.toy; if (!th.toy || save.toys[th.toy]) return null; break;
      case 'bench': case 'sign': case 'flower': th.y = floorBelow(thing.tx, thing.ty); th.dir = DIR[thing.ch]; break;
      case 'bench_': break;
      case 'firefly': th.homeX = th.x; th.homeY = th.y; th.fly = 0; break;
      case 'yarn': th.vx = 0; th.vy = 0; th.r = 8; break;
      case 'bud': th.bloom = save.buds[key] ? 1 : 0; break;
      case 'elder': th.ability = room.def.elder; th.awake = 0; break;
      case 'family':
        th.fam = room.def.family; th.found = !!save.family[th.fam];
        if (th.found) return null; // already home on their cushion
        th.y = floorBelow(thing.tx, thing.ty); th.facing = 1; th.hop = 0; th.hopV = 0;
        break;
    }
    return th;
  }

  // Direction the fireflies should fly: toward the room's signpost, else onward (right)
  function guideDir(th) {
    const room = W().byId[th.room];
    const sign = room.things.find(s => DIR[s.ch]);
    return sign ? DIR[sign.ch] : [BB.zoneDir(room.zone), 0];
  }

  function update(th, ctx) {
    if (th.puzzle) return BB.Puzzles.update(th, ctx);
    if (th.food) return BB.Food.update(th, ctx);
    if (th.trick) return BB.Gestures.update(th, ctx);
    if (th.link) return BB.Links.update(th, ctx);
    th.t++;
    const pb = ctx.pl.body;
    const pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    const dx = pcx - th.x, dy = pcy - th.y, dist = Math.hypot(dx, dy);
    switch (th.type) {
      case 'sparkle':
        if (dist < 24 && ctx.pl.state !== 'rescue') { th.dead = true; ctx.onSparkle(th); }
        break;
      case 'bench': {
        const near = Math.abs(dx) < 34 && Math.abs(pb.y + pb.h - th.y) < 8 && pb.grounded;
        if (near && !th.lit) { th.lit = true; ctx.onBench(th, false); }
        if (near && ctx.pl.state === 'play' && ctx.pl.idleT > 45) {
          ctx.pl.state = 'bench'; ctx.pl.benchT = 0;
          pb.x = th.x - pb.w / 2; pb.vx = 0;
          ctx.onBench(th, true);
        }
        break;
      }
      case 'firefly': {
        if (!th.fly && dist < 110) {
          th.fly = 1; th.dir = guideDir(th); S().firefly();
        }
        if (th.fly) {
          th.fly++;
          const sp = Math.min(4, th.fly * 0.12);
          th.x += th.dir[0] * sp + Math.sin(th.fly * 0.2) * 0.8 * (th.dir[1] ? 1 : 0);
          th.y += th.dir[1] * sp + Math.sin(th.fly * 0.2) * 0.8 * (th.dir[0] ? 1 : 0) - (th.dir[1] ? 0 : 0.2);
          if (th.fly % 3 === 0) PT().trail('spark', th.x, th.y, '#fff3a0');
          if (th.fly > 150 && dist > 400) { th.fly = 0; th.x = th.homeX; th.y = th.homeY; }
        } else {
          th.x = th.homeX + Math.sin(th.t * 0.03) * 10;
          th.y = th.homeY + Math.sin(th.t * 0.05) * 6;
        }
        break;
      }
      case 'toy':
        if (dist < 30 && ctx.pl.state !== 'rescue') { th.dead = true; ctx.onToy(th); }
        break;
      case 'yarn': updateYarn(th, ctx, dx, dy); break;
      case 'flower':
        if (Math.abs(dx) < 20 && pcy > th.y - 50 && pcy < th.y + 4) {
          if (!th.touched) { th.touched = true; sing(th); }
        } else th.touched = false;
        if (th.sing > 0) th.sing--;
        break;
      case 'bud':
        if (th.bloom > 0 && th.bloom < 1) th.bloom = Math.min(1, th.bloom + 0.05);
        break;
      case 'elder': {
        th.awake = BB.lerp(th.awake, dist < 220 ? 1 : 0, 0.05);
        const given = ctx.save.abilities[th.ability];
        if (!given && dist < 60 && ctx.pl.state === 'play') ctx.onElder(th);
        if (given && dist < 120 && th.t % 40 === 0) PT().heart(th.x + (Math.random() - 0.5) * 30, th.y - 30);
        break;
      }
      case 'finale':
        // the Rainbow Slide: hop in and slide all the way home
        if (dist < 56 && ctx.pl.state === 'play') ctx.onSlide(th);
        break;
      case 'family':
        th.facing = dx > 0 ? 1 : -1;
        if (!th.found && dist < 110 && ctx.pl.state === 'play') { th.found = true; th.hopV = -4; ctx.onFamily(th); }
        if (th.found) {
          // a happy hello, then off home to their own cushion
          th.homeT = (th.homeT || 0) + 1;
          if (th.t % 20 === 0) PT().heart(th.x + (Math.random() - 0.5) * 20, th.y - 50);
          if (th.hop === 0 && th.homeT < 100 && Math.random() < 0.05) th.hopV = -3.5;
          if (th.hopV || th.hop < 0) { th.hop += th.hopV; th.hopV += 0.3; if (th.hop >= 0) { th.hop = 0; th.hopV = 0; } }
          if (th.homeT === 110) {
            th.dead = true;
            PT().burst('spark', th.x, th.y - 20, 18, { color: '#fff4c2', speed: 3, life: 36 });
            for (let i = 0; i < 8; i++) PT().heart(th.x + (Math.random() - 0.5) * 30, th.y - 20 - Math.random() * 30);
            S().whoosh();
          }
        }
        break;
    }
  }

  function sing(th) {
    const n = FLOWER_TUNE[flowerNote++ % FLOWER_TUNE.length];
    S().note(n);
    th.sing = 30;
    PT().burst('spark', th.x, th.y - 30, 5, { color: '#ffd6f0', speed: 1.6, life: 30 });
  }

  function updateYarn(th, ctx, dx, dy) {
    const pb = ctx.pl.body;
    if (Math.abs(dx) < th.r + 10 && Math.abs(dy) < th.r + 12) {
      th.vx += pb.vx * 0.5 + (dx > 0 ? -0.8 : 0.8);
      if (!th.cd) { S().yarn(); th.cd = 12; }
    }
    if (th.cd) th.cd--;
    th.vy += 0.4;
    th.vx *= 0.985;
    const solid = (x, y) => BB.Physics.solidSide(W().tile(Math.floor(x / T), Math.floor(y / T))) || BB.Physics.landKind(W().tile(Math.floor(x / T), Math.floor(y / T)), {}) === 2 && th.vy > 0 && ((y - th.vy) % T) < 4;
    if (solid(th.x + th.vx + Math.sign(th.vx) * th.r, th.y)) th.vx *= -0.6;
    else th.x += th.vx;
    if (solid(th.x, th.y + th.vy + th.r)) {
      th.y = Math.floor((th.y + th.vy + th.r) / T) * T - th.r;
      th.vy = Math.abs(th.vy) > 2 ? -th.vy * 0.4 : 0;
      th.vx *= 0.96;
    } else th.y += th.vy;
    th.spin = (th.spin || 0) + th.vx / th.r;
  }

  // Bubble targets for this thing (or null)
  function target(th, ctx) {
    if (th.puzzle) return BB.Puzzles.target(th, ctx);
    if (th.food || th.trick || th.link) return null;
    switch (th.type) {
      case 'bud': return th.bloom ? null : { x: th.x, y: th.y, r: 14, homing: true, hit: () => { bloomBud(th, ctx); return true; } };
      case 'flower': return { x: th.x, y: th.y - 30, r: 16, homing: false, hit: () => { sing(th); return true; } };
      case 'elder': return ctx.save.abilities[th.ability] ? null : { x: th.x, y: th.y, r: 36, homing: true, hit: () => { if (ctx.pl.state === 'play') ctx.onElder(th); return true; } };
      case 'yarn': return { x: th.x, y: th.y, r: th.r, homing: false, hit: b => { th.vx += b.vx * 0.8; th.vy -= 2; S().yarn(); return true; } };
      default: return null;
    }
  }

  function bloomBud(th, ctx) {
    th.bloom = 0.05;
    ctx.save.buds[th.key] = 1;
    const room = W().byId[th.room];
    const buds = room.things.filter(t => t.ch === 'o');
    const done = buds.filter(b => ctx.save.buds[b.tx + ',' + b.ty]).length;
    S().bloom(done);
    PT().burst('spark', th.x, th.y, 12, { color: '#ffd6f0', speed: 2.5, life: 32 });
    if (done >= buds.length) ctx.openGates(room);
  }

  // ──── Drawing ────
  function draw(c, th, cam, ctx) {
    if (th.puzzle) return BB.Puzzles.draw(c, th, cam, ctx);
    if (th.food) return BB.Food.draw(c, th, cam);
    if (th.trick) return BB.Gestures.draw(c, th, cam);
    if (th.link) return BB.Links.draw(c, th, cam, ctx);
    const x = th.x - cam.x, y = th.y - cam.y;
    if (x < -100 || x > G().W + 100 || y < -140 || y > G().H + 140) return;
    const t = th.t;
    switch (th.type) {
      case 'sparkle': {
        const by = Math.sin(t * 0.06) * 3;
        G().drawGlow(x, y + by, 18, '#fff1a8', 0.7, c);
        c.fillStyle = '#ffd84a'; c.strokeStyle = '#d99a14'; c.lineWidth = 1.2;
        G().star(x, y + by, 8, 5, 0.48, -Math.PI / 2 + Math.sin(t * 0.04) * 0.25, c); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)';
        G().twinkle(x + 5, y + by - 6, 2 + Math.abs(Math.sin(t * 0.08)) * 2.5, c); c.fill();
        ctx.light(x, y + by, 60, '#fff1a8', 0.5);
        break;
      }
      case 'bench': drawBench(c, x, y, th, ctx); break;
      case 'sign': drawSign(c, x, y, th); break;
      case 'firefly': {
        const a = th.fly ? Math.max(0, 1 - th.fly / 150) : 1;
        if (a <= 0) break;
        G().drawGlow(x, y, 26, '#fff38a', 0.8 * a, c);
        c.fillStyle = `rgba(255,255,220,${a})`; G().circle(x, y, 2.6, c); c.fill();
        c.fillStyle = `rgba(200,230,255,${0.6 * a})`;
        const fl = Math.sin(t * 0.8) * 2;
        G().ellipse(x - 2, y - 3 - fl * 0.3, 3, 1.6 + fl * 0.2, -0.5, c); c.fill();
        G().ellipse(x + 2, y - 3 - fl * 0.3, 3, 1.6 + fl * 0.2, 0.5, c); c.fill();
        ctx.light(x, y, 90, '#fff38a', 0.8 * a);
        break;
      }
      case 'toy': {
        const by = Math.sin(t * 0.05) * 5;
        G().drawGlow(x, y + by, 40, '#ffe8a8', 0.7, c);
        BB.HUD.toyIcon(c, th.toy, x, y + by, 1.3, t);
        G().bubble(x, y + by, 20, '#d8f4ff', 0.8, c);
        if (t % 20 === 0) PT().burst('spark', x + cam.x + (Math.random() - 0.5) * 30, y + cam.y + by + (Math.random() - 0.5) * 30, 1, { color: '#ffffff', speed: 0.3, life: 30 });
        ctx.light(x, y + by, 110, '#ffe8a8', 0.8);
        break;
      }
      case 'yarn':
        c.save(); c.translate(x, y); c.rotate(th.spin || 0);
        BB.HUD.toyIcon(c, 'yarn', 0, 0, 0.9, t);
        c.restore();
        break;
      case 'flower': drawFlower(c, x, y, th, ctx); break;
      case 'bud': drawBud(c, x, y, th, ctx); break;
      case 'elder': {
        const given = ctx.save.abilities[th.ability];
        const glow = given ? 0.5 : 0.35 + th.awake * 0.4;
        G().drawGlow(x, y - 10, 90, '#fff4c2', glow, c);
        // a mossy mound to sit on
        c.fillStyle = BB.ZONES[th.zone].topDark;
        c.beginPath(); c.ellipse(x, y + 16, 34, 10, 0, Math.PI, 0); c.fill();
        BB.Critters.drawElder(c, th.ability, x, y - 16, { t, awake: given ? 1 : th.awake });
        if (!given && th.awake > 0.5) {
          // a floating bubble hint: "come say hello!"
          const k = (t % 90) / 90;
          G().bubble(x + 30, y - 60 - k * 20, 7 + k * 3, '#d8f4ff', 1 - k, c);
        }
        ctx.light(x, y - 10, 200, '#fff4c2', 1);
        break;
      }
      case 'family': {
        const m = BB.CATS[th.fam];
        if (!m) break;
        // a cushion to curl up on
        c.fillStyle = m.cushion || '#ffb3d1';
        G().ellipse(x, y - 3, 30 * (m.size || 1.4) / 1.4, 7, 0, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; G().ellipse(x - 6, y - 6, 16, 3, 0, c); c.fill();
        const near = ctx.pl ? Math.hypot(ctx.pl.body.x - th.x, ctx.pl.body.y - th.y) : 999;
        let pose;
        if (!th.found) pose = { mode: 'sleep', t: th.t, ear: near < 260 && th.t % 90 < 12 ? Math.sin((th.t % 90) / 12 * Math.PI * 2) : 0 };
        else pose = { mode: th.hop < 0 ? 'air' : near < 140 ? 'stand' : 'sit', vy: -2, happy: true, t: th.t };
        BB.Kittens.draw(c, th.fam, pose, x, y - 4 + th.hop, m.size || 1.4, th.found ? th.facing : 1);
        if (!th.found) {
          // sleepy "z" bubbles drifting up
          const k = (th.t % 100) / 100;
          G().bubble(x + 18 + k * 8, y - 40 - k * 30, 3 + k * 4, '#ffffff', 1 - k, c);
        }
        ctx.light(x, y - 20, 120, '#ffe0b0', 0.7);
        break;
      }
      case 'finale': {
        // the Rainbow Slide: a rainbow arch, and a slide swooping down
        // toward home (the Cat House is right below, in the middle)
        c.save();
        c.globalAlpha = 0.85;
        c.lineWidth = 9;
        const cols = ['#ff7b9c', '#ffcf5c', '#fff27a', '#8fe388', '#7cc8ff', '#b99cff'];
        cols.forEach((col, i) => {
          c.strokeStyle = col;
          c.beginPath(); c.arc(x, y + 16, 120 - i * 9, Math.PI, 0); c.stroke();
        });
        c.lineWidth = 7;
        cols.forEach((col, i) => {
          c.strokeStyle = col;
          c.beginPath(); c.moveTo(x - 30 + i * 7, y + 4); c.quadraticCurveTo(x - 10 + i * 7, y + 60, x + 60 + i * 7, y + 120); c.stroke();
        });
        c.restore();
        G().drawGlow(x, y - 30, 120, '#fff4c2', 0.45 + Math.sin(t * 0.08) * 0.15, c);
        // a tiny house with a heart: "home is this way"
        const hy = y - 70 + Math.sin(t * 0.06) * 4;
        c.fillStyle = '#fff4e6'; c.strokeStyle = '#8a5a34'; c.lineWidth = 2;
        c.fillRect(x - 14, hy - 8, 28, 20); c.strokeRect(x - 14, hy - 8, 28, 20);
        c.fillStyle = '#e8706a'; c.beginPath(); c.moveTo(x - 19, hy - 6); c.lineTo(x, hy - 22); c.lineTo(x + 19, hy - 6); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#ff7eb6'; G().heart(x, hy + 3, 6, c); c.fill();
        break;
      }
    }
  }

  function drawBench(c, x, y, th, ctx) {
    const Z = BB.ZONES[th.zone];
    if (Z.key === 'home') {
      // the kitten's own round cat bed, with a soft pink cushion
      c.fillStyle = '#9a5a8a'; c.strokeStyle = '#5a2a4a'; c.lineWidth = 2;
      G().ellipse(x, y - 8, 30, 12, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#ffc6e0'; G().ellipse(x, y - 11, 23, 7, 0, c); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.45)'; G().ellipse(x - 7, y - 13, 10, 2.5, 0, c); c.fill();
      return;
    }
    // lantern post
    const lx = x + 30;
    c.strokeStyle = '#5a4030'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(lx, y); c.lineTo(lx, y - 44); c.quadraticCurveTo(lx, y - 50, lx - 8, y - 50); c.stroke();
    const lit = th.lit ? 1 : 0.15;
    if (th.lit) { G().drawGlow(lx - 8, y - 42, 50, '#ffd98a', 0.8 + Math.sin(th.t * 0.1) * 0.1, c); ctx.light(lx - 8, y - 42, 170, '#ffd98a', 1); }
    c.fillStyle = `rgba(255,${200 + lit * 40},${120 + lit * 40},${0.4 + lit * 0.6})`; c.strokeStyle = '#5a4030'; c.lineWidth = 1.5;
    G().rrect(lx - 13, y - 48, 10, 13, 3, c); c.fill(); c.stroke();
    // bench
    c.fillStyle = '#b07a4a'; c.strokeStyle = '#5a3a24'; c.lineWidth = 1.5;
    c.fillRect(x - 22, y - 12, 4, 12); c.fillRect(x + 18, y - 12, 4, 12);
    G().rrect(x - 26, y - 16, 52, 6, 3, c); c.fill(); c.stroke();
    G().rrect(x - 24, y - 30, 48, 5, 2, c); c.fill(); c.stroke();
    c.fillRect(x - 22, y - 30, 3, 16); c.fillRect(x + 19, y - 30, 3, 16);
    // cushion
    c.fillStyle = Z.key === 'gardens' ? '#ff9ec7' : BB.mix(Z.accent, '#ff9ec7', 0.5);
    G().rrect(x - 20, y - 21, 40, 7, 4, c); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x - 16, y - 20, 30, 1.5);
  }

  function drawSign(c, x, y, th) {
    c.fillStyle = '#8a5a34'; c.strokeStyle = '#4a3020'; c.lineWidth = 1.5;
    c.fillRect(x - 2.5, y - 30, 5, 30);
    G().rrect(x - 17, y - 44, 34, 20, 5, c); c.fill(); c.stroke();
    const [dx, dy] = th.dir;
    const bob = Math.sin(th.t * 0.1) * 2;
    c.save(); c.translate(x + dx * bob, y - 34 + dy * bob);
    c.rotate(Math.atan2(dy, dx));
    c.fillStyle = '#fff6d6';
    c.beginPath(); c.moveTo(-10, -3); c.lineTo(2, -3); c.lineTo(2, -7); c.lineTo(11, 0); c.lineTo(2, 7); c.lineTo(2, 3); c.lineTo(-10, 3); c.closePath(); c.fill();
    c.restore();
  }

  function drawFlower(c, x, y, th, ctx) {
    const s = th.sing > 0 ? 1 + Math.sin((th.sing / 30) * Math.PI) * 0.25 : 1;
    const sway = Math.sin(th.t * 0.04) * 0.08;
    c.save(); c.translate(x, y); c.rotate(sway);
    c.strokeStyle = '#4f9e3a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -16, 0, -30); c.stroke();
    c.fillStyle = '#6cc24a';
    c.beginPath(); c.ellipse(6, -12, 7, 3, -0.5, 0, TAU); c.fill();
    c.translate(0, -32); c.scale(s, s);
    const cols = ['#ff9ec7', '#ffd166', '#9fd6ff', '#c9a6ff'];
    const col = cols[Math.abs(Math.floor(th.x / T)) % cols.length];
    for (let i = 0; i < 6; i++) {
      c.save(); c.rotate(i / 6 * TAU + th.t * 0.004);
      c.fillStyle = col; c.strokeStyle = BB.mix(col, '#000', 0.3); c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, -8, 4.5, 8, 0, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
    c.fillStyle = '#fff3a0'; G().circle(0, 0, 4.5, c); c.fill();
    // a little musical note hint
    if (th.sing > 0) {
      c.fillStyle = '#ffffff';
      G().circle(10, -16 - (30 - th.sing), 2.2, c); c.fill();
      c.fillRect(11.6, -24 - (30 - th.sing), 1.2, 8);
    }
    c.restore();
    ctx.light(x, y - 32, 50, '#ffd6f0', 0.4);
  }

  function drawBud(c, x, y, th, ctx) {
    const b = th.bloom;
    c.strokeStyle = '#4f9e3a'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x, y + 2); c.stroke();
    if (b <= 0) {
      // sleepy closed bud, gently breathing, with a tiny bubble hint
      const br = 1 + Math.sin(th.t * 0.05) * 0.05;
      c.fillStyle = '#b894c8'; c.strokeStyle = '#6a4a7a'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(x, y - 4, 7 * br, 10 * br, 0, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#6a4a7a'; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x, y + 4); c.stroke();
      const k = (th.t % 120) / 120;
      G().bubble(x + 10, y - 16 - k * 14, 3 + k * 2, '#d8f4ff', 1 - k, c);
    } else {
      const k = BB.easeOutBack(b);
      G().drawGlow(x, y - 4, 40 * k, '#ffd6f0', 0.7, c);
      for (let i = 0; i < 6; i++) {
        c.save(); c.translate(x, y - 4); c.rotate(i / 6 * TAU);
        c.fillStyle = '#ffb3d9'; c.strokeStyle = '#c0508a'; c.lineWidth = 1;
        c.beginPath(); c.ellipse(0, -8 * k, 5 * k, 9 * k, 0, 0, TAU); c.fill(); c.stroke();
        c.restore();
      }
      c.fillStyle = '#fff3a0'; G().circle(x, y - 4, 4 * k, c); c.fill();
      ctx.light(x, y - 4, 90, '#ffd6f0', 0.7);
    }
  }

  BB.Things = { create, update, draw, target };
})(window.BB);
