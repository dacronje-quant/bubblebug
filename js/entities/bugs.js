// ════════════════════════════════════════════════════════════════
//  CRITTERS — gloomy animals, bugs and the Cloud King.
//  (The module keeps its original name, BB.Bugs.)
//
//  A gloomy critter wanders, hops or flutters about and sighs. Bumping
//  into one makes the kitten a little sadder (one happy sun) and gives a
//  soft push — so hop over them, or better, cheer them up! Each friendship bubble
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
    hedgehog: 'walk', mouse: 'walk', mole: 'walk', bearcub: 'walk', turtle: 'walk', duckling: 'walk', lamb: 'walk',
    bunny: 'hop', frog: 'hop',
    bee: 'hover', moth: 'hover', bluebird: 'hover', bat: 'hover', owl: 'hover',
    spider: 'dangle',
    crab: 'walk', seal: 'walk', fennec: 'walk', lizard: 'walk', scarab: 'walk', penguin: 'walk', polarcub: 'walk',
    arcticfox: 'walk', fawn: 'walk', raccoon: 'walk', capybara: 'walk', monkey: 'walk', unicorn: 'walk',
    meerkat: 'hop', squirrel: 'hop',
    jellyfish: 'hover', fish: 'hover', koi: 'hover', dragon: 'hover',
  };
  const SPEED = {
    ladybug: 0.5, beetle: 0.55, caterpillar: 0.3, pillbug: 0.45, snailet: 0.22,
    hedgehog: 0.45, mouse: 0.7, mole: 0.4, bearcub: 0.45, turtle: 0.2, duckling: 0.55, lamb: 0.4,
    bunny: 1.3, frog: 1.1,
    crab: 0.6, seal: 0.35, fennec: 0.6, lizard: 0.5, scarab: 0.45, penguin: 0.35, polarcub: 0.4, arcticfox: 0.6,
    fawn: 0.5, raccoon: 0.5, capybara: 0.25, monkey: 0.5, unicorn: 0.5, meerkat: 1.2, squirrel: 1.3,
  };
  // how far the body centre sits above the ground, and the hit radius
  const LIFT = {
    bearcub: 14, lamb: 12, bunny: 12, hedgehog: 11, duckling: 11, mouse: 10, mole: 10, turtle: 9, frog: 10,
    crab: 10, seal: 10, fennec: 12, lizard: 9, penguin: 13, polarcub: 13, arcticfox: 12, fawn: 14, raccoon: 12,
    capybara: 12, monkey: 12, unicorn: 14, meerkat: 12, squirrel: 12,
  };
  const RADIUS = { bearcub: 19, owl: 17, lamb: 17, bat: 17, bunny: 16, polarcub: 18, capybara: 18, unicorn: 18, fawn: 17, seal: 17 };
  const LOOK = 1.3;      // critters are drawn a little larger than life so small eyes can read their faces
  const KING_LOOK = 1.4;

  function landable(tx, ty) { const k = BB.Physics.landKind(W().tile(tx, ty), { glow: true }); return k === 1 || k === 2 || k === 3; }

  // `n` = how many critters of this map character came before in the zone,
  // so each zone's cast takes turns
  function create(thing, room, save, n = 0, kindOverride = null) {
    const Z = BB.ZONES[room.zone];
    const key = thing.tx + ',' + thing.ty;
    const isKing = thing.ch === 'K';
    const list = Z.cast[thing.ch];
    const kind = kindOverride || (isKing ? 'king' : list[n % list.length]);
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
      visualMood: friend ? 0 : 1, stepT: 0, landT: 0, greetT: 0, noticed: false, moving: false,
      r: isKing ? 40 : (RADIUS[kind] || 15) * 1.15,
    };
    if (b.behavior === 'walk') {
      // settle onto the floor below the placement tile
      let ty = thing.ty;
      while (ty < thing.ty + 20 && !landable(thing.tx, ty + 1)) ty++;
      b.y = b.homeY = (ty + 1) * T - (LIFT[kind] || 9) * LOOK;
    }
    if (b.behavior === 'hover' && landable(thing.tx, thing.ty + 1)) b.homeY -= 26; // flyers keep off the ground
    if (b.behavior === 'dangle') {
      let ty = thing.ty;
      while (ty > thing.ty - 12 && !BB.Physics.solidSide(W().tile(thing.tx, ty - 1))) ty--;
      b.anchorY = ty * T;
    }
    return b;
  }

  // Visual time advances once, even when a garden game owns movement.
  function animate(b, ctx) {
    b.t++;
    b.visualMood = BB.lerp(b.visualMood == null ? b.mood : b.visualMood, b.mood, 0.12);
    if (b.landT > 0) b.landT--;
    if (b.greetT > 0) b.greetT--;
    if (b.shake > 0) b.shake--;
    if (b.bumpCd > 0) b.bumpCd--;
    if (b.rainbow > 0) b.rainbow--;
    if (b.danceT > 0) b.danceT--;
    if (--b.blinkT <= 0) { b.blinkT = 80 + Math.random() * 160; b.blink = 1; }
    b.blink = Math.max(0, b.blink - 0.2);
    const pb = ctx.pl.body;
    const pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    const dx = pcx - b.x, dy = pcy - b.y, dist = Math.hypot(dx, dy);
    b.lookAt = dist < 180 ? pcx : b.x;
    const happy = b.state === 'happy';
    if (happy && dist < 105 && !b.noticed) { b.greetT = 66; b.noticed = true; }
    else if (dist > 150) b.noticed = false;
    return { dx, dy, dist, happy };
  }

  function update(b, ctx) {
    const startX = b.x, { dx, dy, dist, happy } = animate(b, ctx);
    const calm = !!ctx.garden;

    if (b.state === 'bubbled') {
      b.moving = false;
      b.bubbledT++;
      b.y -= 0.7;
      if (b.bubbledT > 50) befriend(b, ctx);
      return;
    }

    // ── movement ──
    if (b.behavior === 'hop') {
      // bunnies and frogs travel in happy little bounces
      if (b.pauseT > 0) b.pauseT--;
      else if (b.hop === 0 && b.hopV === 0) {
        const aheadX = Math.floor((b.x + b.facing * 30) / T);
        if (BB.Physics.solidSide(W().tile(aheadX, Math.floor(b.y / T))) || !landable(aheadX, Math.floor((b.y + (b.footOffset || 14)) / T)) || Math.abs(b.x - b.homeX) > 140) b.facing *= -1;
        b.hopV = calm ? -1.9 : happy ? -4 : -3;
      }
      if (b.hopV || b.hop < 0) {
        b.x += b.facing * (SPEED[b.kind] || 1) * (calm ? 0.55 : happy ? 1.2 : 1);
        b.hop += b.hopV; b.hopV += 0.3;
        if (b.hop >= 0) { b.hop = 0; b.hopV = 0; b.landT = 9; b.pauseT = (calm ? 100 : happy ? 15 : 35) + Math.random() * (calm ? 90 : 40); }
      }
      if (happy && dist < 110 && b.hop === 0 && (!calm || Math.abs(dx) > 35)) b.facing = dx > 0 ? 1 : -1;
    } else if (b.behavior === 'walk') {
      if (b.pauseT > 0) b.pauseT--;
      else {
        const sp = (SPEED[b.kind] || 0.4) * (calm ? 0.65 : happy ? 1.3 : 1);
        const nx = b.x + b.facing * sp;
        const aheadX = Math.floor((nx + b.facing * 14) / T);
        const footY = Math.floor((b.y + (b.footOffset || 12)) / T);
        const bodyY = Math.floor(b.y / T);
        if (BB.Physics.solidSide(W().tile(aheadX, bodyY)) || !landable(aheadX, footY) || Math.abs(nx - b.homeX) > 150) {
          b.facing *= -1;
          b.pauseT = 30 + Math.random() * 60;
        } else b.x = nx;
        if (Math.random() < 0.004) b.pauseT = 60 + Math.random() * 90; // a little sigh
      }
      // happy hop when the kitten is near
      if (!calm && happy && dist < 90 && b.hop === 0 && Math.random() < 0.04) b.hopV = -3.2;
      if (b.hopV || b.hop < 0) { b.hop += b.hopV; b.hopV += 0.3; if (b.hop >= 0) { b.hop = 0; b.hopV = 0; b.landT = 9; } }
      if (happy && dist < 110 && (!calm || Math.abs(dx) > 35)) b.facing = dx > 0 ? 1 : -1;
    } else if (b.behavior === 'hover') {
      const k = calm ? 0.55 : happy ? 1.5 : 1;
      const x = b.homeX + Math.sin(b.t * 0.015 * k) * (calm ? 40 : 60);
      const y = b.homeY + Math.sin(b.t * 0.033 * k) * (calm ? 5 : 16) + (happy && !calm ? Math.sin(b.t * 0.1) * 4 : 0);
      b.x = calm ? b.x + BB.clamp((x - b.x) * 0.06, -0.8, 0.8) : x;
      b.y = calm ? b.y + BB.clamp((y - b.y) * 0.06, -0.5, 0.5) : y;
      b.facing = Math.cos(b.t * 0.015 * k) > 0 ? 1 : -1;
    } else if (b.behavior === 'dangle') {
      const y = b.homeY + (Math.sin(b.t * (calm ? 0.008 : 0.018)) * 0.5 + 0.5) * (calm ? 10 : 60) - (calm ? 5 : 20);
      const x = b.homeX + Math.sin(b.t * (calm ? 0.012 : 0.03)) * (happy ? 8 : 2);
      b.y = calm ? b.y + BB.clamp((y - b.y) * 0.06, -0.5, 0.5) : y;
      b.x = calm ? b.x + BB.clamp((x - b.x) * 0.06, -0.8, 0.8) : x;
      if (!calm || Math.abs(dx) > 35) b.facing = dx > 0 ? 1 : -1;
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

    b.moving = Math.abs(b.x - startX) > 0.02;
    b.stepT += Math.abs(b.x - startX) * 0.4;

    // ── a gloomy bump makes the kitten sadder (gloomy only) ──
    if (!happy && ctx.pl.state === 'play' && b.bumpCd <= 0 && Math.abs(dx) < b.r * 0.85 + 6 && Math.abs(dy) < b.r * 0.85 + 8) {
      if (ctx.hurt(b.x)) {
        b.bumpCd = 45;
        S().hmph();
        b.shake = 10;
        PT().burst('dot', b.x, b.y - 12, 5, { color: '#d8dce8', speed: 1, life: 24, size: 3, up: 0.6 });
      }
    }

    // ── friends share the love ──
    if (happy && dist < 120 && b.t % (calm ? 240 : 50) === 0) PT().heart(b.x, b.y - 16);
    if (happy && b.t % (calm ? 480 : 240) === 0 && Math.random() < 0.5) {
      // friends blow their own tiny bubbles now and then
      PT().burst('dot', b.x + b.facing * 12, b.y - 4, 2, { color: '#e8fbff', speed: 0.6, life: 50, size: 3, up: 0.4 });
    }
  }

  function hit(b, ctx) {
    if (b.state === 'happy') {
      // friends giggle at bubbles
      for (let i = 0; i < 3; i++) PT().heart(b.x, b.y - 10);
      b.hopV = -3;
      b.greetT = 66;
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
    b.greetT = 66;
    b.homeX = b.x;
    // ground critters drop back to their floor (the bubble lifted them);
    // flyers and danglers just stay where the bubble popped
    if (b.behavior === 'walk' || b.behavior === 'hop') b.y = b.homeY;
    else b.homeY = b.y;
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
    const dance = b.danceT > 0 ? Math.sin(b.t * (b.sourceKey ? 0.045 : 0.16)) * (b.sourceKey ? 0.055 : 0.13) : 0;
    const st = {
      t: b.t, mood: b.visualMood == null ? b.mood : b.visualMood, facing: b.facing, blink: b.blink, joy: b.state === 'happy' && (b.danceT > 0 || b.greetT > 0 || b.t % 200 < 40),
      shake: b.shake ? Math.sin(b.shake * 2) * 2.5 : 0, walk: b.behavior === 'walk' && b.moving, spin: dance,
      rainbow: b.rainbow > 0 ? Math.min(1, b.rainbow / 40) : 0, squash: b.hopV < 0 ? 1.12 : b.hop < 0 ? 1.05 : 1,
      step: b.stepT, landing: b.landT / 9, greeting: b.greetT ? Math.sin(b.greetT / 66 * Math.PI) : 0,
      ground: ['walk', 'hop'].includes(b.behavior) ? (b.footOffset == null ? (LIFT[b.kind] || 9) * LOOK : b.footOffset - 1) - b.hop : undefined,
      lookX: b.lookAt == null ? 0 : BB.clamp((b.lookAt - b.x) * b.facing / 100, -1, 1),
    };
    if (b.king) {
      st.scale = KING_LOOK;
      BB.Critters.drawKing(c, x, y, st);
    } else {
      st.scale = LOOK;
      BB.Critters.drawBug(c, b.kind, x, y, st);
    }
    if (b.state === 'bubbled') {
      const k = b.bubbledT / 50;
      BB.G.bubble(x, y, (b.king ? 64 : 28) * (0.8 + k * 0.3), '#d8b8ff', 0.9, c);
    }
  }

  BB.Bugs = { create, animate, update, hit, draw };
})(window.BB);
