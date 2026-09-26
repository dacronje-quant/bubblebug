// ════════════════════════════════════════════════════════════════
//  BUGS — gloomy critters and the Cloud King.
//
//  A gloomy bug wanders, sighs, and gives a silly "hmph" boing if you
//  bump into it (a soft push — never damage). Each friendship bubble
//  shrinks its rain-cloud; the last one wraps it in a big bubble that
//  floats up and pops into a rainbow — and a new friend who dances,
//  hops when you pass by and sends little hearts your way.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const W = () => BB.World;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;

  const BEHAVIOR = {
    ladybug: 'walk', beetle: 'walk', caterpillar: 'walk', pillbug: 'walk', snailet: 'walk',
    bee: 'hover', moth: 'hover', spider: 'dangle',
  };
  const SPEED = { ladybug: 0.5, beetle: 0.55, caterpillar: 0.3, pillbug: 0.45, snailet: 0.22 };

  function landable(tx, ty) { const k = BB.Physics.landKind(W().tile(tx, ty), { glow: true }); return k === 1 || k === 2 || k === 3; }

  function create(thing, room, save) {
    const Z = BB.ZONES[room.zone];
    const key = thing.tx + ',' + thing.ty;
    const isKing = thing.ch === 'K';
    const kind = isKing ? 'king' : Z.bugs[thing.ch];
    const friend = !!save.friends[key];
    const b = {
      type: 'bug', kind, key, room: room.id, king: isKing,
      behavior: isKing ? 'king' : BEHAVIOR[kind] || 'walk',
      x: thing.tx * T + T / 2, y: thing.ty * T + T / 2,
      homeX: thing.tx * T + T / 2, homeY: thing.ty * T + T / 2,
      facing: Math.random() < 0.5 ? -1 : 1,
      need: isKing ? C.KING_MOOD : C.BUG_MOOD, hits: 0,
      mood: friend ? 0 : 1,
      state: friend ? 'happy' : 'gloomy',
      t: Math.floor(Math.random() * 1000), pauseT: 0, shake: 0, bumpCd: 0,
      hop: 0, hopV: 0, rainbow: 0, danceT: 0, bubbledT: 0, blink: 0, blinkT: 60,
      r: isKing ? 34 : 15,
    };
    if (b.behavior === 'walk') {
      // settle onto the floor below the placement tile
      let ty = thing.ty;
      while (ty < thing.ty + 20 && !landable(thing.tx, ty + 1)) ty++;
      b.y = b.homeY = (ty + 1) * T - 9;
    }
    if (b.behavior === 'dangle') {
      let ty = thing.ty;
      while (ty > thing.ty - 12 && !BB.Physics.solidSide(W().tile(thing.tx, ty - 1))) ty--;
      b.anchorY = ty * T;
    }
    return b;
  }

  function update(b, ctx) {
    b.t++;
    if (b.shake > 0) b.shake--;
    if (b.bumpCd > 0) b.bumpCd--;
    if (b.rainbow > 0) b.rainbow--;
    if (b.danceT > 0) b.danceT--;
    if (--b.blinkT <= 0) { b.blinkT = 80 + Math.random() * 160; b.blink = 1; }
    b.blink = Math.max(0, b.blink - 0.2);
    const pb = ctx.pl.body;
    const pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    const dx = pcx - b.x, dy = pcy - b.y, dist = Math.hypot(dx, dy);
    const happy = b.state === 'happy';

    if (b.state === 'bubbled') {
      b.bubbledT++;
      b.y -= 0.7;
      if (b.bubbledT > 50) befriend(b, ctx);
      return;
    }

    // ── movement ──
    if (b.behavior === 'walk') {
      if (b.pauseT > 0) b.pauseT--;
      else {
        const sp = (SPEED[b.kind] || 0.4) * (happy ? 1.3 : 1);
        const nx = b.x + b.facing * sp;
        const aheadX = Math.floor((nx + b.facing * 14) / T);
        const footY = Math.floor((b.y + 12) / T);
        const bodyY = Math.floor(b.y / T);
        if (BB.Physics.solidSide(W().tile(aheadX, bodyY)) || !landable(aheadX, footY) || Math.abs(nx - b.homeX) > 150) {
          b.facing *= -1;
          b.pauseT = 30 + Math.random() * 60;
        } else b.x = nx;
        if (Math.random() < 0.004) b.pauseT = 60 + Math.random() * 90; // a little sigh
      }
      // happy hop when the kitten is near
      if (happy && dist < 90 && b.hop === 0 && Math.random() < 0.04) b.hopV = -3.2;
      if (b.hopV || b.hop < 0) { b.hop += b.hopV; b.hopV += 0.3; if (b.hop >= 0) { b.hop = 0; b.hopV = 0; } }
      if (happy && dist < 110) b.facing = dx > 0 ? 1 : -1;
    } else if (b.behavior === 'hover') {
      const k = happy ? 1.5 : 1;
      b.x = b.homeX + Math.sin(b.t * 0.015 * k) * 60;
      b.y = b.homeY + Math.sin(b.t * 0.033 * k) * 16 + (happy ? Math.sin(b.t * 0.1) * 4 : 0);
      b.facing = Math.cos(b.t * 0.015 * k) > 0 ? 1 : -1;
    } else if (b.behavior === 'dangle') {
      b.y = b.homeY + (Math.sin(b.t * 0.018) * 0.5 + 0.5) * 60 - 20;
      b.x = b.homeX + Math.sin(b.t * 0.03) * (happy ? 8 : 2);
      b.facing = dx > 0 ? 1 : -1;
    } else if (b.behavior === 'king') {
      if (!happy) {
        b.x = b.homeX + Math.sin(b.t * 0.012) * 190;
        b.y = b.homeY + Math.sin(b.t * 0.024) * 55 - 10;
      } else {
        b.x = BB.lerp(b.x, b.homeX, 0.02);
        b.y = BB.lerp(b.y, b.homeY - 20 + Math.sin(b.t * 0.05) * 6, 0.03);
      }
      b.facing = dx > 0 ? 1 : -1;
    }

    // ── gentle bump (gloomy only) ──
    if (!happy && ctx.pl.state === 'play' && b.bumpCd <= 0 && Math.abs(dx) < b.r + 8 && Math.abs(dy) < b.r + 10) {
      b.bumpCd = 45;
      pb.vx = (dx >= 0 ? 1 : -1) * 3.4;
      pb.vy = Math.min(pb.vy, -3.8);
      S().hmph();
      b.shake = 10;
      PT().burst('dot', b.x, b.y - 12, 5, { color: '#d8dce8', speed: 1, life: 24, size: 3, up: 0.6 });
    }

    // ── friends share the love ──
    if (happy && dist < 120 && b.t % 50 === 0) PT().heart(b.x, b.y - 16);
    if (happy && b.t % 240 === 0 && Math.random() < 0.5) {
      // friends blow their own tiny bubbles now and then
      PT().burst('dot', b.x + b.facing * 12, b.y - 4, 2, { color: '#e8fbff', speed: 0.6, life: 50, size: 3, up: 0.4 });
    }
  }

  function hit(b, ctx) {
    if (b.state === 'happy') {
      // friends giggle at bubbles
      for (let i = 0; i < 3; i++) PT().heart(b.x, b.y - 10);
      b.hopV = -3;
      return true;
    }
    if (b.state !== 'gloomy') return false;
    b.hits++;
    b.mood = 1 - b.hits / b.need;
    b.shake = 12;
    S().cheerHit(b.hits);
    PT().burst('spark', b.x, b.y - 10, 7, { color: '#fff6c2', speed: 2.4, life: 26 });
    if (b.hits >= b.need) {
      b.state = 'bubbled';
      b.bubbledT = 0;
      b.mood = 0;
      S().whoosh();
    }
    return true;
  }

  function befriend(b, ctx) {
    b.state = 'happy';
    b.rainbow = 200;
    b.danceT = 90;
    b.homeX = b.x;
    if (b.behavior !== 'walk') b.homeY = b.y;
    else b.y = b.homeY;
    S().befriend();
    PT().ring(b.x, b.y, '#ffffff', 30);
    PT().burst('confetti', b.x, b.y, 24, { speed: 4, life: 60, g: 0.08, size: 3 });
    for (let i = 0; i < 8; i++) PT().heart(b.x + (Math.random() - 0.5) * 30, b.y - Math.random() * 20);
    ctx.onFriend(b);
  }

  function draw(c, b, cam) {
    const x = b.x - cam.x, y = b.y - cam.y + (b.hop || 0);
    if (x < -120 || x > BB.G.W + 120 || y < -140 || y > BB.G.H + 120) return;
    if (b.behavior === 'dangle') {
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, b.anchorY - cam.y); c.lineTo(x, y - 8); c.stroke();
    }
    const dance = b.danceT > 0 ? Math.sin(b.danceT * 0.35) * 0.3 : 0;
    const st = {
      t: b.t, mood: b.mood, facing: b.facing, blink: b.blink, joy: b.state === 'happy' && (b.danceT > 0 || b.t % 200 < 40),
      shake: b.shake ? Math.sin(b.shake * 2) * 2.5 : 0, walk: b.behavior === 'walk' && !b.pauseT, spin: dance,
      rainbow: b.rainbow > 0 ? Math.min(1, b.rainbow / 40) : 0, squash: b.hopV < 0 ? 1.12 : 1,
      lookX: BB.clamp(((b.lookAt || 0) - b.x) / 100, -1, 1),
    };
    if (b.king) {
      st.scale = 1;
      BB.Critters.drawKing(c, x, y, st);
    } else {
      BB.Critters.drawBug(c, b.kind, x, y, st);
    }
    if (b.state === 'bubbled') {
      const k = b.bubbledT / 50;
      BB.G.bubble(x, y, (b.king ? 48 : 22) * (0.8 + k * 0.3), '#d8b8ff', 0.9, c);
    }
  }

  BB.Bugs = { create, update, hit, draw };
})(window.BB);
