// ════════════════════════════════════════════════════════════════
//  PLAYER — the kitten: physics body + personality.
//  Movement itself is the pure BB.Physics.step; this module adds the
//  squash-and-stretch, blinking, idle habits, sounds, dust, bubble
//  blowing, cozy bench naps and the dandelion rescue float.
//
//  Idle personalities:
//   Marshmallow — sits sooner, big sleepy yawns, slow plume-tail sway
//   Phoebe      — twitchy ears, paw-licking, a wiggly pounce-crouch
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const FX = BB.FX;
  const A = () => BB.Audio.sfx;
  const PT = () => BB.Particles;

  function create(x, y, cat) {
    return {
      body: BB.Physics.newBody(x, y),
      cat,
      state: 'play',            // play | rescue | bench | gift | party | sad
      sad: 0, invuln: 0, hurtT: 0, sadT: 0,
      t: 0,
      phase: 0, squash: 1, puff: 0,
      blink: 0, blinkT: 90, idleT: 0,
      yawn: 0, yawnT: 0, ear: 0, earT: 0, lick: 0, lickT: 0, wiggleT: 0,
      happyT: 0, stepT: 0, munchT: 0, munchLen: 1,
      bubbleCd: 0,
      rescue: null,             // { fx, fy, tx, ty, t }
      benchT: 0,
    };
  }

  function update(pl, input, abilities, env) {
    const b = pl.body;
    pl.t++;
    if (pl.bubbleCd > 0) pl.bubbleCd--;
    pl.puff = Math.max(0, pl.puff - 0.08);
    pl.squash = BB.lerp(pl.squash, 1, 0.2);
    if (pl.happyT > 0) pl.happyT--;
    if (pl.hurtT > 0) pl.hurtT--;
    if (pl.munchT > 0) pl.munchT--;

    // blinking
    if (--pl.blinkT <= 0) { pl.blinkT = 100 + Math.random() * 180; pl.blink = 1; }
    pl.blink = Math.max(0, pl.blink - 0.14);

    if (pl.state === 'rescue') return updateRescue(pl);
    if (pl.state === 'gift' || pl.state === 'party') { idleAnims(pl, true); return 0; }

    const inp = input.physicsInput();
    const anyInput = inp.left || inp.right || inp.jump || input.pressed.bubble;

    if (pl.state === 'bench') {
      pl.benchT++;
      if (anyInput && pl.benchT > 20) { pl.state = 'play'; pl.idleT = 0; pl.squash = 1.2; }
      else { idleAnims(pl, true); return 0; }
    }

    const fx = BB.Physics.step(b, inp, abilities);
    const cx = b.x + b.w / 2, feet = b.y + b.h;

    // ── reactions ──
    if (fx & FX.JUMP) { A().jump(pl.cat); pl.squash = 1.3; PT().dust(cx, feet, 4); }
    if (fx & FX.DJUMP) {
      A().djump(pl.cat); pl.squash = 1.25;
      for (const d of [-1, 1]) PT().burst('spark', cx + d * 10, feet - 6, 4, { color: d < 0 ? '#7ef0d8' : '#d8b8ff', speed: 1.8, life: 26 });
      PT().ring(cx, feet, '#ffffff', 12);
    }
    if (fx & FX.WALLJUMP) { A().walljump(); PT().dust(b.x + (b.facing < 0 ? b.w : 0), b.y + b.h / 2, 4); }
    if (fx & FX.LAND) {
      const hard = pl.lastVy > 7;
      A().land(hard); pl.squash = hard ? 0.7 : 0.82;
      PT().dust(cx, feet, hard ? 8 : 4);
    }
    if (fx & FX.BOUNCE) {
      A().bounce(); pl.squash = 1.35;
      BB.Tiles.bounce(Math.floor(cx / C.TILE), Math.floor((feet + 2) / C.TILE));
      PT().burst('spark', cx, feet, 10, { color: '#ffe8f6', speed: 3, life: 30 });
      pl.happyT = 20;
    }
    if (fx & FX.CLIMB_START) A().climb();
    if (fx & (FX.SPLASH | FX.BREACH)) { A().splash(); PT().splash(cx, b.y + b.h / 2, '#dff8ff'); }
    if (fx & FX.BREACH) { A().jump(pl.cat); pl.squash = 1.3; }
    if (fx & FX.BBOUNCE) {
      // a big bubble appears under the paws and goes *pop*
      A().bounce(); A().pop(0.7); pl.squash = 1.35;
      PT().ring(cx, feet + 4, BB.CATS[pl.cat].bubbleTint, 22);
      PT().burst('dot', cx, feet + 4, 10, { color: '#e8fbff', speed: 2.5, life: 22, size: 2.4 });
    }
    if (fx & FX.FLAP) {
      A().djump(pl.cat); pl.squash = 1.2;
      PT().burst('star', cx, feet - 4, 5, { color: '#ffe27a', speed: 2, life: 30 });
    }
    if (b.inWater && pl.t % 12 === 0) PT().trail('dot', cx + b.facing * 8, b.y + 4, 'rgba(230,250,255,0.9)');
    if (b.climbing && pl.t % 10 === 0) A().climb();
    if (fx & FX.LEDGE) PT().dust(cx, feet, 3);
    if (b.floating && pl.t % 7 === 0) PT().seed(cx + (Math.random() - 0.5) * 16, b.y - 20);
    if (b.inUpdraft && pl.t % 5 === 0) PT().trail('dot', cx + (Math.random() - 0.5) * 20, feet, 'rgba(255,255,255,0.7)');

    // footsteps + run dust
    const running = b.grounded && Math.abs(b.vx) > 0.5;
    if (running) {
      pl.phase += Math.abs(b.vx) * 0.12;
      if (++pl.stepT > 14) { pl.stepT = 0; A().step(); if (Math.random() < 0.5) PT().dust(cx - b.facing * 6, feet, 1); }
    } else if (b.climbing) pl.phase += 0.25;
    pl.lastVy = b.vy;

    // idle timer (sitting, habits)
    if (running || !b.grounded || anyInput) { pl.idleT = 0; pl.yawn = 0; pl.lick = 0; }
    else pl.idleT++;
    idleAnims(pl, false);

    // ── bubbles ──
    if (input.pressed.bubble && !(fx & FX.BBOUNCE) && pl.bubbleCd <= 0 && env.bubbleCount < C.BUBBLE_MAX) {
      pl.bubbleCd = C.BUBBLE_COOLDOWN;
      pl.puff = 1;
      pl.idleT = 0;
      env.blow(cx + b.facing * 14, b.y + 9, b.facing, b.vx);
    }
    return fx;
  }

  function idleAnims(pl, resting) {
    const isM = pl.cat === 'marshmallow';
    if (pl.idleT > (isM ? 120 : 170) || resting) {
      // yawns (Marshmallow loves a big yawn)
      if (--pl.yawnT <= 0) { pl.yawnT = isM ? 360 + Math.random() * 200 : 700 + Math.random() * 300; pl.yawnPlay = 70; }
      if (pl.yawnPlay > 0) { pl.yawnPlay--; pl.yawn = Math.sin((1 - pl.yawnPlay / 70) * Math.PI); } else pl.yawn = 0;
      // paw licks (Phoebe)
      if (!isM && !resting) {
        if (--pl.lickT <= 0) { pl.lickT = 300 + Math.random() * 240; pl.lickPlay = 80; }
        if (pl.lickPlay > 0) { pl.lickPlay--; pl.lick = Math.min(1, Math.sin((1 - pl.lickPlay / 80) * Math.PI) * 1.5) * (0.8 + Math.sin(pl.t * 0.5) * 0.2); } else pl.lick = 0;
      }
    }
    // ear twitches (Phoebe twitches more)
    if (--pl.earT <= 0) { pl.earT = (isM ? 240 : 110) + Math.random() * 160; pl.earPlay = 12; }
    if (pl.earPlay > 0) { pl.earPlay--; pl.ear = Math.sin((1 - pl.earPlay / 12) * Math.PI * 2); } else pl.ear = 0;
  }

  // ── Dandelion rescue: never a fail, just a floaty ride back ──
  function startRescue(pl) {
    const b = pl.body;
    pl.state = 'rescue';
    pl.rescue = { fx: b.x, fy: b.y, tx: b.lastSafe.x, ty: b.lastSafe.y, t: 0 };
    b.vx = 0; b.vy = 0; b.climbing = 0;
    A().splash(); A().rescue();
    PT().splash(b.x + b.w / 2, b.y + b.h, BB.ZONES[BB.World.roomAtPx(b.lastSafe.x, b.lastSafe.y)?.zone || 0].water);
  }

  function updateRescue(pl) {
    const r = pl.rescue, b = pl.body;
    r.t++;
    const k = BB.easeInOut(Math.min(1, r.t / C.RESCUE_TIME));
    const arc = Math.sin(k * Math.PI) * 90;
    b.x = BB.lerp(r.fx, r.tx, k);
    b.y = BB.lerp(r.fy, r.ty, k) - arc;
    if (r.t % 6 === 0) PT().seed(b.x + b.w / 2 + (Math.random() - 0.5) * 20, b.y - 26);
    if (r.t >= C.RESCUE_TIME) {
      pl.state = 'play';
      b.x = r.tx; b.y = r.ty; b.vx = 0; b.vy = 0; b.grounded = true;
      pl.squash = 0.8; pl.happyT = 30;
      PT().burst('spark', b.x + b.w / 2, b.y + b.h, 8, { color: '#ffffff', speed: 2 });
      return FX.LAND;
    }
    return 0;
  }

  function pose(pl) {
    const b = pl.body;
    const p = {
      t: pl.t, blink: pl.blink, squash: pl.squash, puff: pl.puff, yawn: pl.yawn,
      ear: pl.ear, lick: pl.lick, happy: pl.happyT > 0, phase: pl.phase, vy: b.vy, tail: 0,
      munch: pl.munchT > 0 ? pl.munchT / pl.munchLen : 0,
    };
    p.sad = pl.happyT > 0 ? 0 : pl.sad || 0;
    if (pl.state === 'sad') {
      // too sad: sit down for a little cry
      p.mode = b.grounded ? 'sit' : 'air'; p.vy = 2; p.sad = 1; p.cry = true; p.happy = false;
      return p;
    }
    if (pl.hurtT > 12) { p.surprised = true; p.sad = Math.max(p.sad, 0.6); }
    if (pl.state === 'rescue') { p.mode = 'rescue'; p.surprised = pl.rescue.t < 30; p.happy = pl.rescue.t > 40; return p; }
    if (pl.state === 'bench') { p.mode = 'sleep'; return p; }
    if (pl.state === 'gift') { p.mode = 'sit'; p.happy = true; p.look = -1; return p; }
    if (pl.state === 'party') { p.mode = (pl.t % 60) < 30 ? 'stand' : 'air'; p.happy = true; return p; }
    if (b.climbing) { p.mode = 'climb'; return p; }
    if (b.inWater) { p.mode = 'run'; p.swim = true; p.phase = pl.t * 0.15; return p; }
    if (!b.grounded) { p.mode = b.floating ? 'float' : 'air'; return p; }
    if (Math.abs(b.vx) > 0.4) { p.mode = 'run'; return p; }
    const sitAt = pl.cat === 'marshmallow' ? 120 : 170;
    if (pl.idleT > sitAt) { p.mode = 'sit'; return p; }
    p.mode = 'stand';
    if (pl.cat === 'phoebe' && pl.idleT > 60 && pl.idleT < 110) p.wiggle = true;
    return p;
  }

  function draw(c, pl, cam, abilities) {
    const b = pl.body;
    const x = b.x + b.w / 2 - cam.x, y = b.y + b.h - cam.y;
    if (abilities.glow) G().drawGlow(x, y - 12, 70 + Math.sin(pl.t * 0.05) * 6, '#fff3b0', 0.35, c);
    // soft contact shadow
    if (b.grounded && pl.state !== 'rescue') {
      c.fillStyle = 'rgba(20,10,40,0.18)';
      G().ellipse(x, y + 1, 13, 3, 0, c); c.fill();
    }
    const face = pl.state === 'bench' ? 1 : b.facing;
    const drawX = b.climbing ? x + b.climbing * 2 : x;
    // drawn a touch larger than the collision box so little eyes can find it
    const ps = pose(pl);
    // blinking while safe after a bump
    if (pl.invuln > 0 && pl.state === 'play' && Math.floor(pl.invuln / 5) % 2 === 0) c.globalAlpha = 0.35;
    // the Star Whale's star wings, fluttering whenever you're up in the air
    if (abilities.wings && pl.state === 'play' && !b.grounded && !b.inWater && !b.climbing) {
      const fl = b.vy < 0 ? Math.sin(pl.t * 0.6) * 0.5 : Math.sin(pl.t * 0.15) * 0.15;
      for (const d of [-1, 1]) {
        c.save(); c.translate(drawX - face * 4, y - 20); c.rotate(d * (0.7 + fl));
        c.fillStyle = 'rgba(255,226,122,0.95)'; c.strokeStyle = '#c28a14'; c.lineWidth = 1.2;
        G().star(d * -9, -2, 8, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
        c.restore();
      }
    }
    BB.Kittens.draw(c, pl.cat, ps, drawX, y + (pl.state === 'bench' ? -6 : 0), 1.2, face);
    // the Sea Turtle's shimmering bubble helmet
    if (ps.swim) G().bubble(drawX + face * 10, y - 23, 15, '#bff4ff', 0.75, c);
    c.globalAlpha = 1;
  }
  const G = () => BB.G;

  BB.Player = { create, update, startRescue, draw, pose };
})(window.BB);
