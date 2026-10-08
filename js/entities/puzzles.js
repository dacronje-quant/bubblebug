// ════════════════════════════════════════════════════════════════
//  PUZZLES — little brain-teasers a five-year-old can crack, all told
//  in pictures. Each one opens its room's vine gate, and the gate wears a
//  picture sign showing exactly what it's waiting for:
//
//   P  paw pads      step on every glowing pad (each one lights a paw on
//                    the gate's sign)
//   d / A  lost babies   touch a lost baby and it hops along behind you;
//                    bring them all home to Mama (her thought-bubble
//                    shows who's still missing)
//   k / Z  key & keyhole  the key floats after you; bring it to the
//                    keyhole with the same shape
//   V / O  song bells    the bluebird on the singing stone sings a tune —
//                    a coloured note flies to each bell in turn. Bubble
//                    the bells in the same order! (A wrong bell just
//                    makes the bird sing it again.)
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const G = () => BB.G;
  const W = () => BB.World;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;

  const TYPES = { P: 'pad', d: 'baby', A: 'mama', k: 'key', Z: 'lock', V: 'bell', O: 'stone' };
  const BABY = { 0: 'bunny', 1: 'frog', 4: 'duckling', 5: 'lamb', 6: 'turtle', 7: 'meerkat', 8: 'penguin', 9: 'squirrel', 10: 'capybara', 11: 'unicorn' };
  const LIFT = { bunny: 12, frog: 10, duckling: 11, lamb: 12, turtle: 9, meerkat: 12, penguin: 13, squirrel: 12, capybara: 12, unicorn: 14 };
  const BELL_COL = ['#ff8fb8', '#ffd84a', '#7cc8ff', '#8fe388'];
  const BELL_NOTE = [72, 76, 79, 84];
  const PERMS = [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

  function floorBelow(tx, ty) {
    let y = ty;
    while (y < ty + 20) {
      if (BB.Physics.landKind(W().tile(tx, y + 1), { glow: true })) break;
      y++;
    }
    return (y + 1) * T;
  }
  const zoneThings = (zone, ch) => {
    const out = [];
    for (const r of W().rooms) if (r.zone === zone) for (const th of r.things) if (th.ch === ch) out.push({ room: r, ...th });
    return out;
  };
  const hashStr = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

  function create(thing, room, save) {
    const type = TYPES[thing.ch];
    if (!type) return null;
    const key = thing.tx + ',' + thing.ty;
    const base = { type, key, room: room.id, zone: room.zone, ch: thing.ch, x: thing.tx * T + T / 2, y: floorBelow(thing.tx, thing.ty), t: Math.floor(Math.random() * 1000), puzzle: true };
    switch (type) {
      case 'pad': return Object.assign(base, { pressed: !!save.pads[key], glow: save.pads[key] ? 1 : 0, sink: 0 });
      case 'baby': {
        if (save.babies[key]) return null; // already home with Mama
        const kind = BABY[room.zone] || 'bunny';
        return Object.assign(base, { kind, follow: false, order: 0, hop: 0, hopV: 0, facing: 1, feetY: base.y, homeX: base.x });
      }
      case 'mama': {
        const kind = BABY[room.zone] || 'bunny';
        const kids = zoneThings(room.zone, 'd').map(b => b.tx + ',' + b.ty);
        return Object.assign(base, { kind, kids, facing: -1, hop: 0, hopV: 0, cheer: 0 });
      }
      case 'key': {
        const lock = zoneThings(room.zone, 'Z')[0];
        const lockKey = lock ? lock.tx + ',' + lock.ty : null;
        if (!lockKey || save.keys[lockKey]) return null;
        return Object.assign(base, { lockKey, y: thing.ty * T + T / 2, homeX: base.x, homeY: thing.ty * T + T / 2, follow: false, fly: null });
      }
      case 'lock': return Object.assign(base, { open: !!save.keys[key], near: 0, flash: 0 });
      case 'bell': {
        const bells = room.things.filter(t => t.ch === 'V').sort((a, b) => a.tx - b.tx);
        const idx = bells.findIndex(b => b.tx === thing.tx && b.ty === thing.ty);
        return Object.assign(base, { idx, ring: 0, lit: !!save.songs[room.id] });
      }
      case 'stone': {
        const n = room.things.filter(t => t.ch === 'V').length;
        const seq = n === 3 ? PERMS[hashStr(room.id) % PERMS.length].slice() : [...Array(n).keys()].reverse();
        return Object.assign(base, { seq, phase: save.songs[room.id] ? 'done' : 'idle', i: 0, pt: 0, sing: 0 });
      }
    }
    return null;
  }

  // ──── Update ────
  function update(th, ctx) {
    th.t++;
    const pb = ctx.pl.body;
    const pcx = pb.x + pb.w / 2, feet = pb.y + pb.h, pcy = pb.y + pb.h / 2;
    const dx = pcx - th.x, dist = Math.hypot(dx, pcy - (th.y - 12));
    switch (th.type) {
      case 'pad': {
        const on = Math.abs(dx) < 20 && Math.abs(feet - th.y) < 6 && ctx.pl.state === 'play';
        th.sink = BB.lerp(th.sink, on ? 1 : 0, 0.3);
        if (on && !th.pressed) {
          th.pressed = true;
          ctx.save.pads[th.key] = 1;
          const room = W().byId[th.room];
          const n = room.things.filter(p => p.ch === 'P' && ctx.save.pads[p.tx + ',' + p.ty]).length;
          S().padPress(n);
          PT().burst('spark', th.x, th.y - 4, 14, { color: BB.ZONES[th.zone].accent, speed: 2.6, life: 30 });
          PT().ring(th.x, th.y - 2, '#ffffff', 16);
          ctx.sendOrb(th.x, th.y - 6, th.room);
          BB.Save.write();
        }
        th.glow = BB.lerp(th.glow, th.pressed ? 1 : 0, 0.08);
        break;
      }
      case 'baby': {
        if (th.follow) { followTrail(th, ctx); break; }
        th.facing = dx > 0 ? 1 : -1;
        // lost and worried: little hops and peeps when you come close
        if (th.hop === 0 && th.hopV === 0 && (dist < 170 ? Math.random() < 0.05 : Math.random() < 0.008)) th.hopV = dist < 170 ? -3.4 : -2.2;
        if (th.hopV || th.hop < 0) { th.hop += th.hopV; th.hopV += 0.3; if (th.hop >= 0) { th.hop = 0; th.hopV = 0; } }
        if (dist < 170 && th.t % 50 === 0) { S().peep(); PT().burst('dot', th.x, th.y - 22, 2, { color: '#fff6c2', speed: 0.8, life: 24, size: 2.2, up: 0.8 }); }
        if (dist < 30 && ctx.pl.state === 'play') ctx.follow(th);
        break;
      }
      case 'mama': {
        th.facing = dx > 0 ? 1 : -1;
        const done = th.kids.filter(k => ctx.save.babies[k]).length;
        th.done = done;
        if (th.hopV || th.hop < 0) { th.hop += th.hopV; th.hopV += 0.3; if (th.hop >= 0) { th.hop = 0; th.hopV = 0; } }
        if (done >= th.kids.length && th.hop === 0 && Math.random() < 0.03) th.hopV = -3.4;
        // babies following you hop home to Mama one by one
        if (dist < 120 && ctx.pl.state === 'play' && th.t % 14 === 0) {
          const kid = ctx.followers.find(f => f.type === 'baby' && f.zone === th.zone);
          if (kid) {
            ctx.deliver(kid, th);
            const n = th.kids.filter(k => ctx.save.babies[k]).length;
            S().babyHome(n);
            th.hopV = -3.8;
            for (let i = 0; i < 5; i++) PT().heart(th.x + (Math.random() - 0.5) * 40, th.y - 50);
            if (n >= th.kids.length) {
              th.cheer = 180;
              S().befriend();
              PT().burst('confetti', th.x, th.y - 60, 30, { speed: 3.5, g: 0.08, life: 70 });
              ctx.tryOpen(W().byId[th.room]);
            }
          }
        }
        if (th.cheer > 0) th.cheer--;
        break;
      }
      case 'key': {
        if (th.fly) {
          const f = th.fly;
          f.t++;
          const k = BB.easeInOut(Math.min(1, f.t / 34));
          th.x = BB.lerp(f.x0, f.lock.x, k);
          th.y = BB.lerp(f.y0, f.lock.y - 26, k) - Math.sin(k * Math.PI) * 50;
          if (f.t % 3 === 0) PT().trail('spark', th.x, th.y, '#ffe27a');
          if (f.t >= 34) ctx.unlock(th, f.lock);
          break;
        }
        if (th.follow) {
          // floats just over the kitten's head, bobbing happily
          const tx = pcx - pb.facing * 16, ty = pb.y - 22 + Math.sin(th.t * 0.1) * 4;
          th.x = BB.lerp(th.x, tx, 0.15); th.y = BB.lerp(th.y, ty, 0.15);
          if (th.t % 8 === 0) PT().trail('spark', th.x, th.y, '#fff3b0');
          const lock = ctx.findLock(th.lockKey);
          if (lock && Math.hypot(lock.x - pcx, lock.y - 20 - pcy) < 90) th.fly = { t: 0, x0: th.x, y0: th.y, lock };
          break;
        }
        th.x = th.homeX; th.y = th.homeY + Math.sin(th.t * 0.06) * 5;
        if (dist < 34 && ctx.pl.state === 'play') ctx.follow(th);
        break;
      }
      case 'lock': {
        const carried = ctx.followers.some(f => f.type === 'key' && f.lockKey === th.key);
        th.near = BB.lerp(th.near, carried ? 1 : 0, 0.08);
        if (th.flash > 0) th.flash--;
        break;
      }
      case 'bell':
        if (th.ring > 0) th.ring--;
        break;
      case 'stone': updateStone(th, ctx, dist); break;
    }
  }

  function followTrail(th, ctx) {
    const p = ctx.trailPoint((th.order + 1) * 11);
    if (!p) return;
    const d = Math.hypot(p.x - th.x, p.y - th.feetY);
    if (d > 360) { th.x = p.x; th.feetY = p.y; }
    const moving = d > 3;
    th.x = BB.lerp(th.x, p.x, 0.22);
    th.feetY = BB.lerp(th.feetY, p.y, 0.3);
    th.y = th.feetY;
    if (Math.abs(p.x - th.x) > 1) th.facing = p.x > th.x ? 1 : -1;
    if (moving && th.hop === 0 && th.hopV === 0) th.hopV = -2.6;
    if (th.hopV || th.hop < 0) { th.hop += th.hopV; th.hopV += 0.35; if (th.hop >= 0) { th.hop = 0; th.hopV = 0; } }
  }

  // ── Singing stone: sing → listen → (done | sing again) ──
  function updateStone(th, ctx, dist) {
    const room = W().byId[th.room];
    const bells = ctx.entsOf(room).filter(b => b.type === 'bell').sort((a, b) => a.idx - b.idx);
    if (th.sing > 0) th.sing--;
    if (th.phase === 'idle' && dist < 220 && ctx.pl.state === 'play') startSong(th);
    if (th.phase === 'wait') { if (--th.pt <= 0) startSong(th); return; }
    if (th.phase === 'sing') {
      th.pt++;
      const step = 46, i = Math.floor(th.pt / step);
      if (th.pt % step === 1 && i < th.seq.length) {
        const bell = bells[th.seq[i]];
        th.sing = 30;
        if (bell) {
          ctx.noteOrb(th.x, th.y - 44, bell.x, bell.y - 30, BELL_COL[bell.idx]);
          setTimeoutTicks(ctx, 18, () => ringBell(bell, false));
        }
      }
      if (th.pt > step * th.seq.length + 20) { th.phase = 'listen'; th.i = 0; }
    }
  }
  function startSong(th) { th.phase = 'sing'; th.pt = 0; th.i = 0; S().birdSong(); }
  // a tiny tick-based delay (so notes land on bells in time)
  function setTimeoutTicks(ctx, n, fn) { ctx.later(n, fn); }

  function ringBell(bell, lit) {
    bell.ring = 40;
    if (lit) bell.lit = true;
    S().bell(BELL_NOTE[bell.idx]);
    PT().burst('spark', bell.x, bell.y - 34, 8, { color: BELL_COL[bell.idx], speed: 2, life: 26 });
  }

  // Bubbles ring bells (and nudge the singing stone into singing again)
  function target(th, ctx) {
    if (th.type === 'bell') {
      const room = W().byId[th.room];
      const stone = ctx.entsOf(room).find(s => s.type === 'stone');
      if (!stone || stone.phase === 'sing') return null;
      return {
        x: th.x, y: th.y - 30, r: 16, homing: stone.phase === 'listen',
        hit: () => {
          if (stone.phase === 'done' || stone.phase === 'idle' || stone.phase === 'wait') { ringBell(th, false); if (stone.phase === 'idle') startSong(stone); return true; }
          const want = stone.seq[stone.i];
          if (th.idx === want) {
            ringBell(th, true);
            stone.i++;
            if (stone.i >= stone.seq.length) {
              stone.phase = 'done';
              ctx.save.songs[th.room] = 1;
              BB.Save.write(); // save the song/reward before its delayed gate celebration
              const bells = ctx.entsOf(room).filter(b => b.type === 'bell');
              bells.forEach((b, k) => ctx.later(10 + k * 8, () => ringBell(b, true)));
              ctx.later(40, () => { S().songDone(); ctx.tryOpen(room); });
            }
          } else {
            // not quite! the bells wobble and the bird sings it again
            S().wobble();
            for (const b of ctx.entsOf(room)) if (b.type === 'bell') { b.lit = false; b.ring = 24; }
            stone.phase = 'wait'; stone.pt = 70; stone.i = 0;
          }
          return true;
        },
      };
    }
    if (th.type === 'stone' && th.phase !== 'sing' && th.phase !== 'done') {
      return { x: th.x, y: th.y - 30, r: 18, homing: false, hit: () => { startSong(th); return true; } };
    }
    return null;
  }

  // ──── Gate picture-signs: what is this gate waiting for? ────
  function needs(room, save, ents) {
    const out = [];
    for (const th of room.things) {
      const key = th.tx + ',' + th.ty;
      if (th.ch === 'o') out.push({ icon: 'bud', done: !!save.buds[key] });
      else if (th.ch === 'P') out.push({ icon: 'paw', done: !!save.pads[key] });
      else if (th.ch === 'Z') out.push({ icon: 'key', done: !!save.keys[key] });
      else if (th.ch === 'A') {
        const kind = BABY[room.zone] || 'bunny';
        for (const k of zoneThings(room.zone, 'd')) out.push({ icon: 'baby', kind, done: !!save.babies[k.tx + ',' + k.ty] });
      } else if (th.ch === 'Q' || th.ch === 'K') out.push({ icon: 'boss', done: !!save.bosses[room.id] });
    }
    if (room.things.some(t => t.ch === 'V')) out.push({ icon: 'song', done: !!save.songs[room.id] });
    return out;
  }

  function gateSpot(room) {
    // the top of the gate furthest along the way onward (east, or west on
    // the return half of the ring)
    const dir = BB.roomDir(room);
    const isG = (r, c) => c >= 0 && c < room.w && (room.grid[r][c] === 'G' || room.grid[r][c] === 'g');
    let best = null;
    for (let r = 0; r < room.h; r++) for (let c = 0; c < room.w; c++) {
      if (!isG(r, c)) continue;
      if (!best || c * dir > best.c * dir || (c === best.c && r < best.r)) best = { r, c };
    }
    if (!best) return null;
    // centre over a two-wide gate
    const two = isG(best.r, best.c - dir);
    const x = two ? (dir > 0 ? best.c : best.c + 1) : best.c + 0.5;
    return { x: (room.x + x) * T, y: (room.y + best.r) * T - 22 };
  }

  function drawSign(c, room, save, cam, t, opened) {
    const spot = gateSpot(room);
    if (!spot) return;
    const list = needs(room, save);
    if (!list.length) return;
    const n = list.length, w = Math.max(40, n * 24 + 14);
    const sxw = BB.clamp(spot.x, room.px + w / 2 + 6, room.px + room.pw - w / 2 - 6);
    const x = sxw - cam.x, y = spot.y - cam.y;
    if (x < -200 || x > G().W + 200 || y < -100 || y > G().H + 100) return;
    const k = opened ? Math.max(0, 1 - opened / 50) : 1;
    if (k <= 0) return;
    c.save();
    c.globalAlpha = k;
    const bob = Math.sin(t * 0.05) * 2;
    c.translate(x, y + bob);
    // a little wooden sign on a post
    c.fillStyle = '#8a5a34'; c.fillRect(-2, 8, 4, 14);
    c.fillStyle = 'rgba(255,248,230,0.95)'; c.strokeStyle = '#8a5a34'; c.lineWidth = 3;
    G().rrect(-w / 2, -14, w, 26, 12, c); c.fill(); c.stroke();
    list.forEach((it, i) => {
      const ix = -w / 2 + 19 + i * 24;
      needIcon(c, it, ix, -1, t);
    });
    c.restore();
  }

  function needIcon(c, it, x, y, t) {
    c.save();
    c.translate(x, y);
    const on = it.done;
    if (on) G().drawGlow(0, 0, 14, '#fff2a0', 0.8, c);
    c.globalAlpha *= on ? 1 : 0.45;
    switch (it.icon) {
      case 'paw': {
        c.fillStyle = on ? '#ff8fb8' : '#9a8aa0';
        G().ellipse(0, 2.5, 4.5, 3.6, 0, c); c.fill();
        for (const [px, py] of [[-4.4, -2.6], [-1.5, -5], [1.5, -5], [4.4, -2.6]]) { G().circle(px, py, 1.7, c); c.fill(); }
        break;
      }
      case 'bud':
        c.fillStyle = on ? '#ff9ec7' : '#9a8aa0';
        G().ellipse(0, 0, 4.5, 6, 0, c); c.fill();
        c.fillStyle = '#6cc24a'; c.fillRect(-0.8, 5, 1.6, 4);
        break;
      case 'key':
        c.strokeStyle = on ? '#e0a020' : '#9a8aa0'; c.lineWidth = 2.4;
        G().circle(-3, 0, 3.6, c); c.stroke();
        c.beginPath(); c.moveTo(0.5, 0); c.lineTo(8, 0); c.moveTo(6, 0); c.lineTo(6, 3); c.moveTo(3.5, 0); c.lineTo(3.5, 2.5); c.stroke();
        break;
      case 'song':
        c.fillStyle = on ? '#5a6ab8' : '#9a8aa0';
        for (const [nx, ny] of [[-4, 2], [4, 0]]) { G().ellipse(nx, ny, 3, 2.3, -0.3, c); c.fill(); c.fillRect(nx + 2, ny - 9, 1.4, 9); }
        c.fillRect(-2, -9, 7.4, 1.8);
        break;
      case 'boss':
        if (on) BB.Critters.rainbow(c, 0, 2, 1, 0.9);
        else BB.Critters.moodCloud(c, 0, -2, 1, t, 0.8);
        break;
      case 'baby':
        BB.Critters.drawBug(c, it.kind, 0, 1, { t, mood: on ? 0 : 0.6, facing: 1, scale: 0.42, noCloud: true, joy: on });
        break;
    }
    c.restore();
  }

  // ──── Drawing ────
  function draw(c, th, cam, ctx) {
    const x = th.x - cam.x, y = th.y - cam.y;
    if (x < -120 || x > G().W + 120 || y < -160 || y > G().H + 120) return;
    const t = th.t;
    switch (th.type) {
      case 'pad': {
        const Z = BB.ZONES[th.zone];
        const col = Z.accent;
        const sink = th.sink * 2.5;
        if (th.glow > 0.02) G().drawGlow(x, y - 4, 26, col, 0.55 * th.glow, c);
        c.fillStyle = '#8a8298'; c.strokeStyle = '#4a4058'; c.lineWidth = 1.5;
        G().ellipse(x, y - 1, 17, 6, 0, c); c.fill(); c.stroke();
        c.fillStyle = th.pressed ? BB.mix('#ffffff', col, 0.5) : '#c8c0d4';
        G().ellipse(x, y - 4 + sink, 14, 4.6, 0, c); c.fill(); c.stroke();
        // the paw print on top
        c.fillStyle = th.pressed ? BB.mix(col, '#ff6fa8', 0.4) : '#8a7a98';
        G().ellipse(x, y - 3.4 + sink, 4.2, 1.8, 0, c); c.fill();
        for (const [px, py] of [[-5.5, -1.2], [-2, -2.4], [2, -2.4], [5.5, -1.2]]) { G().ellipse(x + px, y - 4.6 + py * 0.5 + sink, 1.4, 0.8, 0, c); c.fill(); }
        if (!th.pressed && Math.floor(t / 30) % 2 === 0) {
          // a soft "step here" twinkle
          c.fillStyle = 'rgba(255,255,255,0.8)'; G().twinkle(x + 10, y - 14 - Math.sin(t * 0.1) * 2, 2.5, c); c.fill();
        }
        break;
      }
      case 'baby': {
        const s = 0.85;
        const cy = y - (LIFT[th.kind] || 11) * s + th.hop;
        BB.Critters.drawBug(c, th.kind, x, cy, { t, mood: th.follow ? 0 : 0.55, facing: th.facing, scale: s, noCloud: true, joy: th.follow && th.hop < -1, squash: th.hopV < 0 ? 1.12 : 1 });
        if (!th.follow && Math.floor(t / 40) % 3 === 0) {
          // a worried little "peep" bubble
          c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.5;
          G().circle(x + th.facing * 14, cy - 18, 4 + Math.sin(t * 0.2), c); c.stroke();
        }
        break;
      }
      case 'mama': {
        const s = 1.9;
        const cy = y - (LIFT[th.kind] || 11) * s + th.hop;
        const done = th.done || 0, all = th.kids.length;
        const happy = done >= all;
        BB.Critters.drawBug(c, th.kind, x, cy, { t, mood: happy ? 0 : 0.45, facing: th.facing, scale: s, noCloud: true, joy: happy && (th.cheer > 0 || t % 200 < 60), squash: th.hopV < 0 ? 1.1 : 1 });
        // a Mama bow
        c.fillStyle = '#ff7eb6'; c.strokeStyle = '#8a3a5a'; c.lineWidth = 1.2;
        const bx = x - th.facing * 6, by = cy - 22 * s * 0.7;
        for (const d of [-1, 1]) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + d * 7, by - 4); c.lineTo(bx + d * 7, by + 4); c.closePath(); c.fill(); c.stroke(); }
        G().circle(bx, by, 2.2, c); c.fill();
        // thought bubble: which babies are still missing?
        if (!happy) {
          const tw = all * 26 + 16, tx = x, ty = cy - 30 * s - 20 + Math.sin(t * 0.04) * 2;
          c.fillStyle = 'rgba(255,255,255,0.92)'; c.strokeStyle = 'rgba(120,110,150,0.7)'; c.lineWidth = 1.5;
          G().circle(x + th.facing * 10, cy - 24 * s, 3, c); c.fill(); c.stroke();
          G().circle(x + th.facing * 5, cy - 27 * s, 4.5, c); c.fill(); c.stroke();
          G().rrect(tx - tw / 2, ty - 17, tw, 32, 16, c); c.fill(); c.stroke();
          for (let i = 0; i < all; i++) {
            const ix = tx - tw / 2 + 21 + i * 26;
            const home = i < done;
            c.save(); c.globalAlpha = home ? 1 : 0.3;
            BB.Critters.drawBug(c, th.kind, ix, ty + 1, { t, mood: home ? 0 : 0.5, facing: 1, scale: 0.5, noCloud: true, joy: home });
            c.restore();
          }
        } else if (th.cheer > 0) {
          BB.Critters.rainbow(c, x, cy - 30 * s, Math.min(1, th.cheer / 40), 2.4);
        }
        break;
      }
      case 'key': drawKey(c, x, y, t, th.follow); break;
      case 'lock': {
        const glow = th.open ? 1 : th.near;
        if (glow > 0.02) G().drawGlow(x, y - 26, 40, '#ffe27a', 0.5 * glow, c);
        c.fillStyle = '#9a90a8'; c.strokeStyle = '#4a4058'; c.lineWidth = 1.6;
        G().rrect(x - 13, y - 44, 26, 44, 8, c); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.18)'; G().rrect(x - 10, y - 41, 8, 36, 4, c); c.fill();
        // golden rim & keyhole
        c.fillStyle = '#ffd34d'; c.strokeStyle = '#a8740e'; c.lineWidth = 1.4;
        G().circle(x, y - 27, 9, c); c.fill(); c.stroke();
        c.fillStyle = th.open ? '#fff6c2' : '#3a2a3a';
        G().circle(x, y - 29, 3.4, c); c.fill();
        c.beginPath(); c.moveTo(x - 2.2, y - 28); c.lineTo(x + 2.2, y - 28); c.lineTo(x + 3, y - 20); c.lineTo(x - 3, y - 20); c.closePath(); c.fill();
        if (th.open) { c.save(); c.translate(x, y - 27); c.rotate(Math.PI / 2); drawKey(c, 0, 0, t, false, 0.6); c.restore(); }
        break;
      }
      case 'bell': {
        const col = BELL_COL[th.idx] || '#ffd84a';
        const sw = th.ring > 0 ? Math.sin(th.ring * 0.5) * (th.ring / 40) * 0.6 : Math.sin(t * 0.03) * 0.04;
        // a little wooden post with a crossbar
        c.fillStyle = '#8a5a34'; c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.2;
        c.fillRect(x - 2.5, y - 52, 5, 52);
        G().rrect(x - 12, y - 56, 24, 6, 3, c); c.fill(); c.stroke();
        if (th.lit || th.ring > 0) G().drawGlow(x, y - 34, 30, col, th.lit ? 0.6 : 0.4 * th.ring / 40, c);
        c.save(); c.translate(x, y - 50); c.rotate(sw);
        c.fillStyle = col; c.strokeStyle = BB.mix(col, '#3a2a3a', 0.45); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-3, 2); c.quadraticCurveTo(-10, 4, -11, 20); c.lineTo(11, 20); c.quadraticCurveTo(10, 4, 3, 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = BB.mix(col, '#3a2a3a', 0.3); G().circle(0, 21, 3, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)'; G().ellipse(-5, 10, 2, 5, 0.2, c); c.fill();
        c.restore();
        break;
      }
      case 'stone': {
        // a mossy round stone with a singing bluebird on top
        c.fillStyle = '#a8a0b8'; c.strokeStyle = '#4a4058'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(x, y - 13, 20, 14, 0, Math.PI, 0); c.lineTo(x + 20, y); c.lineTo(x - 20, y); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#7cc26a'; G().ellipse(x - 8, y - 24, 8, 3, -0.2, c); c.fill();
        const singing = th.sing > 0;
        BB.Critters.drawBug(c, 'bluebird', x + 2, y - 36 + (singing ? -2 : 0), { t, mood: 0, facing: -1, scale: 1.1, noCloud: true, joy: singing });
        if (singing && t % 8 === 0) PT().burst('dot', x - 8, y - 46, 1, { color: '#ffffff', speed: 0.6, life: 30, size: 2, up: 0.8 });
        if (th.phase === 'done') BB.Critters.rainbow(c, x, y - 58, 0.9, 1.5);
        break;
      }
    }
  }

  function drawKey(c, x, y, t, carried, s = 1) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.rotate(Math.sin(t * 0.05) * 0.2);
    G().drawGlow(0, 0, 22, '#fff2a0', carried ? 0.8 : 0.6, c);
    c.fillStyle = '#ffd34d'; c.strokeStyle = '#a8740e'; c.lineWidth = 1.6;
    G().circle(-8, 0, 7, c); c.fill(); c.stroke();
    c.fillStyle = '#ff7eb6'; G().circle(-8, 0, 3, c); c.fill();
    c.fillStyle = '#ffd34d';
    G().rrect(-2, -2.2, 16, 4.4, 2, c); c.fill(); c.stroke();
    c.fillRect(9, 1, 3, 5); c.strokeRect(9, 1, 3, 5);
    c.fillRect(4, 1, 2.6, 4); c.strokeRect(4, 1, 2.6, 4);
    c.fillStyle = 'rgba(255,255,255,0.7)'; G().twinkle(-10, -4, 2.2, c); c.fill();
    c.restore();
  }

  BB.Puzzles = { TYPES, create, update, draw, target, needs, gateSpot, drawSign, BABY };
})(window.BB);
