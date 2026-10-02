// ════════════════════════════════════════════════════════════════
//  BOSSES — one big gloomy friend-to-be guards the end of every zone.
//
//  Nobody here is mean — they're just having the saddest day ever, and
//  their sadness spills out as slow, silly "sad attacks" that are always
//  shown before they happen. Each boss has its own animal moves and its
//  own arena (the room's `arena:` says what's in it):
//    goose     waddles after you — lure her into the mud puddle and she slips
//    toad      tongue flicks (a dotted line shows where) and belly-flops
//    armadillo curls up and rolls round the crystal bowl, then gets dizzy
//    queen bee dives at the spot she marks and sticks in her own honey
//    elephant  floods the courtyard — hop up on a pillar till it drains
//    Cloud King huffs and puffs great gusts of wind
//    octopus   tentacles pop up through the shipwreck's deck (bubbles first)
//    camel     spits sand, whips up a sandstorm and bounces on its humps
//    walrus    belly-slides across the ice… straight into a crack
//    moose     charges the big oak and gets its antlers stuck
//    panda     sleepwalks after you and blows snore bubbles
//    moon rabbit takes huge floaty moon hops and pounds mochi
//  Plus the classics: things that fall (their shadow grows first), waves
//  along the floor (hop over), lobs (a ring marks where they land), sad
//  balls and little rain-clouds (pop them with a bubble!).
//
//  The rhythm is always the same, so little players can learn it:
//    wake up → sad attack (dodge!) → stuck / sniffling (BUBBLE NOW!)
//  The bubble moment glows gold. Enough bubbles pop one of the gloom
//  clouds over the boss's head. Pop them all and the boss bursts into a
//  rainbow, the vine gate opens, and a brand-new friend comes to the party.
//  Getting too sad just floats you back to the arena door — and the
//  boss remembers every cloud you already popped.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const TAU = Math.PI * 2;
  const W = () => BB.World;
  const G = () => BB.G;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;

  // clouds: gloom clouds to pop · per: bubbles per cloud · r: hit radius
  // lift: body centre above the floor · fly: hover height while attacking
  // stuck: how the boss looks when it's time to bubble
  const DEFS = {
    goose:     { clouds: 2, per: 3, r: 40, lift: 40, attacks: ['waddle', 'feathers', 'honk'], tele: 62, sniffle: 290 },
    toad:      { clouds: 2, per: 3, r: 42, lift: 34, attacks: ['tongue', 'flop', 'spores'], tele: 58, sniffle: 280 },
    armadillo: { clouds: 3, per: 3, r: 38, lift: 34, attacks: ['bowl', 'crystals'], tele: 56, sniffle: 270 },
    queenbee:  { clouds: 3, per: 3, r: 38, lift: 42, fly: 180, attacks: ['dive', 'drones', 'honey'], tele: 52, sniffle: 260 },
    elephant:  { clouds: 3, per: 3, r: 46, lift: 46, attacks: ['flood', 'stomp', 'spray'], tele: 52, sniffle: 260 },
    king:      { clouds: 3, per: 3, r: 42, lift: 44, fly: 170, attacks: ['gust', 'cloudlets', 'rain'], tele: 50, sniffle: 250 },
    octopus:   { clouds: 3, per: 3, r: 42, lift: 8, attacks: ['tentacles', 'ink', 'slap'], tele: 50, sniffle: 250 },
    camel:     { clouds: 3, per: 3, r: 46, lift: 50, attacks: ['spit', 'sandstorm', 'humps'], tele: 50, sniffle: 250, stuck: 'sulk' },
    walrus:    { clouds: 3, per: 3, r: 44, lift: 36, attacks: ['bellyslide', 'snowballs'], tele: 48, sniffle: 245 },
    moose:     { clouds: 3, per: 3, r: 46, lift: 52, attacks: ['ram', 'acorns'], tele: 48, sniffle: 240 },
    panda:     { clouds: 3, per: 3, r: 44, lift: 40, attacks: ['sleepwalk', 'snore', 'bamboo'], tele: 46, sniffle: 240, stuck: 'doze' },
    moonbunny: { clouds: 3, per: 4, r: 42, lift: 44, attacks: ['moonhop', 'mochi', 'stars'], tele: 46, sniffle: 240, stuck: 'pound' },
  };

  // Attack recipes — every one slow, readable and shown in advance
  const ATK = {
    waddle:     { type: 'chase', speed: 2.1, time: 220, mud: true },
    feathers:   { type: 'drops', sprite: 'feather', n: 3, fall: 2.3, sway: 1 },
    honk:       { type: 'wave', sprite: 'note', n: 1, speed: 2.1 },
    tongue:     { type: 'tongue', n: 2, reach: 330, stuck: 'tongue' },
    flop:       { type: 'hop', n: 2, height: 170, dur: 58, wave: 'ripple', ledges: true },
    spores:     { type: 'bouncers', sprite: 'spore', n: 3, speed: 1.3, bounce: 5.2 },
    bowl:       { type: 'bowl', passes: 4, speed: 5.4, stuck: 'dizzy' },
    crystals:   { type: 'drops', sprite: 'crystal', n: 4, fall: 4.4 },
    dive:       { type: 'dive' },
    honey:      { type: 'drops', sprite: 'honey', n: 4, fall: 4 },
    drones:     { type: 'floaters', sprite: 'drone', n: 3, speed: 0.8 },
    flood:      { type: 'flood', level: 46, rise: 80, hold: 120, drain: 60, stuck: 'soaked' },
    spray:      { type: 'lobs', sprite: 'water', n: 3 },
    stomp:      { type: 'wave', sprite: 'ripple', n: 1, both: true, speed: 2.5 },
    gust:       { type: 'gust', time: 190, push: 1.5, stuck: 'puffed' },
    cloudlets:  { type: 'floaters', sprite: 'cloudlet', n: 3, speed: 0.75 },
    rain:       { type: 'drops', sprite: 'tear', n: 3, follow: true, fall: 5.2, gap: 36 },
    tentacles:  { type: 'tentacles', n: 3, stuck: 'tangled' },
    ink:        { type: 'floaters', sprite: 'ink', n: 3, speed: 0.8 },
    slap:       { type: 'wave', sprite: 'splash', n: 1, both: true, speed: 2.7 },
    spit:       { type: 'lobs', sprite: 'dust', n: 3 },
    sandstorm:  { type: 'gust', time: 200, push: 1.2, sandy: true, waves: 2 },
    humps:      { type: 'hop', n: 3, height: 80, dur: 40, wave: 'sand', inPlace: true },
    bellyslide: { type: 'charge', style: 'slide', speed: 5.6, crack: true },
    snowballs:  { type: 'bouncers', sprite: 'snowball', n: 3, speed: 1.5, bounce: 5.6 },
    ram:        { type: 'charge', style: 'charge', speed: 5.4, tree: true },
    acorns:     { type: 'drops', sprite: 'acorn', n: 4, fall: 4.6 },
    sleepwalk:  { type: 'chase', speed: 1.35, time: 240, zigzag: true, sleepy: true },
    snore:      { type: 'floaters', sprite: 'zbubble', n: 3, speed: 0.5 },
    bamboo:     { type: 'lobs', sprite: 'bamboo', n: 3 },
    moonhop:    { type: 'hop', n: 3, height: 250, dur: 92, wave: 'crescent' },
    mochi:      { type: 'bouncers', sprite: 'mochi', n: 3, speed: 1.5, bounce: 6 },
    stars:      { type: 'drops', sprite: 'star', n: 4, fall: 3.2 },
  };

  const LAND = { glow: true };
  const isFloor = (tx, ty) => BB.Physics.landKind(W().tile(tx, ty), LAND) > 0;
  const solidAt = (x, y) => BB.Physics.solidSide(W().tile(Math.floor(x / T), Math.floor(y / T)));

  // Top of the first floor at or below fromY (px)
  function floorUnder(x, fromY) {
    const tx = Math.floor(x / T);
    let ty = Math.floor(fromY / T);
    for (let i = 0; i < 40; i++, ty++) {
      if (isFloor(tx, ty) && !isFloor(tx, ty - 1)) return ty * T;
    }
    return fromY + 40 * T;
  }

  const hazards = [];

  // ──── Creation ────
  function create(thing, room, save) {
    const kind = thing.ch === 'K' ? 'king' : room.def.boss;
    const D = DEFS[kind];
    if (!D) return null;
    const x = thing.tx * T + T / 2;
    let floorY = floorUnder(x, thing.ty * T), pool = null;
    if (W().tile(thing.tx, thing.ty + 1) === '~') {
      // the octopus lives in a rock pool: rest on the water's surface
      floorY = (thing.ty + 1) * T;
      let l = thing.tx, r = thing.tx;
      while (W().tile(l - 1, thing.ty + 1) === '~') l--;
      while (W().tile(r + 1, thing.ty + 1) === '~') r++;
      pool = { x0: l * T, x1: (r + 1) * T };
    }
    const happy = !!save.bosses[room.id];
    return {
      type: 'boss', kind, D, room: room.id, zone: room.zone, key: thing.tx + ',' + thing.ty,
      homeX: x, floorY, pool,
      x, y: floorY - D.lift, facing: -1,
      clouds: happy ? 0 : D.clouds, hits: 0,
      state: happy ? 'happy' : 'wait', stT: 0, atkN: 0, atk: null, a: null,
      t: Math.floor(Math.random() * 1000), squash: 1, shake: 0, blink: 0, blinkT: 90,
      rainbow: 0, roll: 0, bodyHurts: false, open: 0, jump: 0, hitFlash: 0, pops: [],
      danceT: happy ? 0 : 0,
    };
  }

  const arena = b => {
    const r = W().byId[b.room];
    return { r, x0: r.px + 2 * T, x1: r.px + r.pw - 3 * T, top: r.py };
  };
  const restY = b => b.floorY - b.D.lift;
  // walking bosses follow the floor's ups and downs (flowerbeds, the bowl…)
  // (solid ground only — bosses don't stand on the kitten's one-way ledges)
  function groundAt(b, x) {
    if (b.pool) return b.floorY;
    const tx = Math.floor(x / T);
    for (let ty = Math.floor(b.floorY / T) - 3; ty <= Math.floor(b.floorY / T) + 3; ty++) {
      const k = BB.Physics.landKind(W().tile(tx, ty), LAND), up = BB.Physics.landKind(W().tile(tx, ty - 1), LAND);
      if ((k === 1 || k === 3) && up !== 1 && up !== 3) return ty * T;
    }
    return b.floorY;
  }
  const standY = (b, x = b.x) => (b.D.fly ? b.floorY : groundAt(b, x)) - b.D.lift;
  // a spot in the boss's arena (its room's `arena:` columns → world px)
  const colX = (b, col) => (W().byId[b.room].x + col + 0.5) * T;
  const arenaDef = b => W().byId[b.room].def.arena || {};

  // push the kitten gently sideways (wind), never into a wall
  function nudge(pb, dx) {
    const nx = pb.x + dx;
    const edge = dx > 0 ? nx + pb.w : nx;
    for (let y = pb.y + 2; y < pb.y + pb.h - 1; y += T / 2) if (solidAt(edge, y)) return;
    if (solidAt(edge, pb.y + pb.h - 2)) return;
    pb.x = nx;
  }
  const mood = b => BB.clamp((b.clouds - b.hits / b.D.per) / b.D.clouds, 0, 1);

  // ──── Update ────
  function update(b, ctx) {
    b.t++; b.stT++;
    if (b.shake > 0) b.shake--;
    if (b.rainbow > 0) b.rainbow--;
    if (b.hitFlash > 0) b.hitFlash--;
    if (b.danceT > 0) b.danceT--;
    b.squash = BB.lerp(b.squash, 1, 0.12);
    if (--b.blinkT <= 0) { b.blinkT = 90 + Math.random() * 160; b.blink = 1; }
    b.blink = Math.max(0, b.blink - 0.2);
    b.open = Math.max(0, b.open - 0.04);
    for (const p of b.pops) p.t++;
    b.pops = b.pops.filter(p => p.t < 90);

    const A = arena(b);
    const pb = ctx.pl.body, pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    const here = ctx.room === A.r;
    b.bodyHurts = false;

    if (b.state === 'happy') { happyIdle(b, pcx); return; }
    if (!here) {
      if (b.state !== 'wait') { b.state = 'wait'; b.stT = 0; b.a = null; b.x = b.homeX; b.y = restY(b); b.roll = 0; b.jump = 0; b.stuck = null; b.hold = false; clear(); }
      sulk(b);
      return;
    }

    switch (b.state) {
      case 'wait':
        sulk(b);
        // (a few steps in from whichever side the kitten comes)
        if (ctx.pl.state === 'play' && (BB.roomDir(A.r) > 0 ? pcx > A.r.px + C.BOSS_WAKE * T : pcx < A.r.px + A.r.pw - C.BOSS_WAKE * T)) wake(b, ctx);
        break;
      case 'intro':
        face(b, pcx);
        hover(b, A, 0.5);
        if (b.stT === 24) { S().bossGrumble(); b.squash = 1.3; b.shake = 18; b.open = 1; PT().burst('dot', b.x, b.y - b.D.lift - 20, 14, { color: '#9aa0b8', speed: 2.4, life: 40, size: 4 }); }
        if (b.stT > 120) nextAttack(b, ctx);
        break;
      case 'tele':
        telegraph(b, ctx, A, pcx);
        if (b.stT >= b.D.tele) { b.state = 'attack'; b.stT = 0; b.a = { t: 0, n: 0 }; S().bossAttack(); }
        break;
      case 'attack':
        if (stepAttack(b, ctx, A, pcx, pcy)) {
          const s = b.a || {};
          b.stuck = s.stuck || b.atk.stuck || (b.atk.type === 'chase' && b.atk.sleepy ? 'doze' : null) || b.D.stuck || null;
          b.hold = !!s.hold; b.holdY = s.holdY != null ? s.holdY : b.y;
          b.state = 'sniffle'; b.stT = 0; b.hits = b.hits || 0; b.vx = 0;
          clearOwned(b.atk);
          S().bossSniffle();
        }
        break;
      case 'sniffle':
        // stuck where the attack left it (in the mud, on a ledge, in the tree…)
        if (b.stuck === 'sulk') b.facing = pcx < b.x ? 1 : -1; // (hmph! back turned)
        else if (b.stuck !== 'antlers' && b.stuck !== 'crack') face(b, pcx);
        if (b.hold) { b.y = BB.lerp(b.y, b.holdY + Math.sin(b.t * 0.05) * 0.8, 0.2); b.roll = BB.lerp(b.roll, 0, 0.1); }
        else settle(b, 0.06);
        if (b.stuck === 'antlers' && b.stT % 50 === 10) { b.shake = 8; S().bossScrape(); }
        if (b.stuck === 'doze' && b.stT % 60 === 5) S().purr();
        if (b.stT % 70 === 20) S().sniff();
        if (b.stT > b.D.sniffle) nextAttack(b, ctx);
        break;
      case 'pop':
        settle(b, 0.06);
        if (b.stT > 80) nextAttack(b, ctx);
        break;
      case 'calm':
        face(b, pcx);
        settle(b, 0.06);
        if (b.stT > 140) nextAttack(b, ctx);
        break;
    }

    if (b.bodyHurts && ctx.pl.state === 'play') {
      const dx = pcx - b.x, dy = pcy - b.y;
      if (Math.abs(dx) < b.D.r * 0.9 + 8 && Math.abs(dy) < b.D.r * 0.8 + 10) ctx.hurt(b.x, b);
    }
  }

  const face = (b, pcx) => { b.facing = pcx < b.x ? -1 : 1; };

  function sulk(b) {
    // sits at home, sighing, cloud drizzling
    b.x = BB.lerp(b.x, b.homeX + Math.sin(b.t * 0.01) * 10, 0.05);
    b.y = BB.lerp(b.y, restY(b) + Math.sin(b.t * 0.04) * (b.D.fly ? 3 : 1), 0.1);
    if (b.t % 180 === 0) PT().burst('dot', b.x + b.facing * 20, b.y - 10, 3, { color: '#d8dce8', speed: 0.6, life: 40, size: 3, up: 0.5 });
  }

  function settle(b, k) {
    b.x = BB.lerp(b.x, b.homeX, k * 0.6);
    b.y = BB.lerp(b.y, standY(b) + Math.sin(b.t * 0.05) * (b.D.fly ? 3 : 0.8), k);
    b.roll = BB.lerp(b.roll, 0, 0.1);
  }

  // flyers hover high while they're being gloomy
  function hover(b, A, k = 1) {
    if (!b.D.fly) { settle(b, 0.08); return; }
    const mid = (A.x0 + A.x1) / 2, span = (A.x1 - A.x0) / 2 - 60;
    const tx = mid + Math.sin(b.t * 0.011) * span;
    const ty = b.floorY - b.D.fly + Math.sin(b.t * 0.035) * 12;
    b.x = BB.lerp(b.x, tx, 0.03 * k);
    b.y = BB.lerp(b.y, ty, 0.04 * k);
  }

  function happyIdle(b, pcx) {
    b.x = BB.lerp(b.x, b.homeX, 0.03);
    b.y = BB.lerp(b.y, restY(b) + (b.D.fly ? Math.sin(b.t * 0.05) * 5 : 0), 0.08);
    b.roll = 0;
    if (Math.abs(pcx - b.x) < 220 && b.t % 50 === 0) PT().heart(b.x + (Math.random() - 0.5) * 40, b.y - b.D.lift - 10);
    if (b.danceT <= 0 && b.t % 400 === 0) b.danceT = 90;
    b.facing = pcx < b.x ? -1 : 1;
  }

  function wake(b, ctx) {
    b.state = 'intro'; b.stT = 0;
    ctx.onBossWake(b);
  }

  function nextAttack(b, ctx) {
    const list = b.D.attacks;
    b.atk = ATK[list[b.atkN % list.length]];
    b.atkName = list[b.atkN % list.length];
    b.atkN++;
    b.state = 'tele'; b.stT = 0; b.a = null;
    b.dashDir = 0; b.stuck = null; b.hold = false;
  }

  // ──── Telegraphs: the boss clearly winds up first ────
  function telegraph(b, ctx, A, pcx) {
    const a = b.atk;
    if (a.type === 'charge' || a.type === 'chase') {
      // brace at home, scraping the floor, facing the far side (or the big oak)
      settle(b, 0.1);
      const tree = a.tree && arenaDef(b).tree != null ? colX(b, arenaDef(b).tree) : null;
      if (a.type === 'chase') b.dashDir = pcx < b.x ? -1 : 1;
      else if (!b.dashDir) b.dashDir = tree != null ? Math.sign(tree - b.x) || 1 : b.x > (A.x0 + A.x1) / 2 ? -1 : 1;
      b.facing = b.dashDir;
      b.squash = 0.86 + Math.sin(b.stT * 0.5) * 0.04;
      if (b.stT % 8 === 0) PT().dust(b.x - b.dashDir * b.D.r * 0.6, b.floorY, 3);
      if (b.stT % 16 === 0) S().bossScrape();
    } else if (a.type === 'hop' || a.type === 'bowl') {
      settle(b, 0.1); face(b, pcx);
      b.squash = 0.82 + Math.sin(b.stT * 0.4) * 0.05;
    } else if (a.type === 'flood') {
      // trunk up, a little fountain dribbling already
      settle(b, 0.1); face(b, pcx);
      b.open = Math.max(b.open, b.stT / b.D.tele);
      if (b.stT % 4 === 0) PT().burst('dot', b.x + b.facing * b.D.r * 0.7, b.y - b.D.lift * 0.9, 1, { color: '#8fd0ff', speed: 1.6, life: 26, size: 3, g: 0.2, up: 1.4 });
    } else {
      hover(b, A);
      face(b, pcx);
      b.squash = 1 + Math.sin(b.stT * 0.35) * 0.06;
      b.open = Math.max(b.open, b.stT / b.D.tele);
    }
    b.shake = b.stT > b.D.tele - 16 ? 3 : 0;
  }

  // ──── Attacks ────
  function stepAttack(b, ctx, A, pcx, pcy) {
    const a = b.atk, s = b.a, pb = ctx.pl.body;
    s.t++;
    const clampX = x => BB.clamp(x, A.x0 + 20, A.x1 - 20);
    switch (a.type) {
      case 'drops': {
        hover(b, A);
        const gap = a.gap || 0;
        if (a.follow) {
          if (s.n < a.n && s.t % gap === 1) { spawnDrop(a, clampX(pcx), A); s.n++; b.open = 1; }
        } else if (s.t === 1) {
          const xs = spreadAround(clampX(pcx), a.n, A);
          xs.forEach((x, i) => spawnDrop(a, x, A, i * 14));
          s.n = a.n; b.open = 1; b.squash = 1.2;
        }
        return s.n >= a.n && !hazards.some(h => h.kind === 'drop' && h.owner === a) && s.t > 30;
      }
      case 'wave': {
        settle(b, 0.08);
        const gap = a.gap || 60;
        if (s.n < a.n && (s.t === 1 || s.t % gap === 1)) {
          s.n++;
          b.squash = 0.8; b.shake = 10; b.open = 1;
          ctx.shake(5);
          const dirs = a.both ? [-1, 1] : [pcx < b.x ? -1 : 1];
          for (const d of dirs) {
            let sx = b.x + d * (b.D.r * 0.6);
            if (b.pool) sx = d < 0 ? b.pool.x0 - 10 : b.pool.x1 + 10;
            spawnWave(a, sx, d, b);
          }
        }
        return s.n >= a.n && !hazards.some(h => h.kind === 'wave' && h.owner === a) && s.t > 20;
      }
      case 'lobs': {
        hover(b, A, 0.5);
        if (s.n < a.n && s.t % 22 === 1) {
          const off = (s.n - (a.n - 1) / 2) * 120;
          spawnLob(a, b, clampX(pcx + off), A, pb.y + pb.h);
          s.n++; b.open = 1; b.squash = 1.15;
        }
        return s.n >= a.n && !hazards.some(h => h.kind === 'lob' && h.owner === a) && s.t > 30;
      }
      case 'bouncers': {
        hover(b, A, 0.5);
        if (s.n < a.n && s.t % 32 === 1) {
          const d = pcx < b.x ? -1 : 1;
          hazards.push({ kind: 'bouncer', sprite: a.sprite, owner: a, x: b.x + d * b.D.r * 0.5, y: b.y - 10, vx: d * a.speed * (1 + s.n * 0.2), vy: -4, bounce: a.bounce, r: 14, t: 0, life: 380, pop: true });
          s.n++; b.open = 1; b.squash = 1.15;
          S().bossLob();
        }
        return s.n >= a.n && s.t > a.n * 32 + 90;
      }
      case 'floaters': {
        hover(b, A, 0.5);
        if (s.n < a.n && s.t % 26 === 1) {
          const ang = -Math.PI / 2 + (s.n - 1) * 0.9;
          hazards.push({ kind: 'floater', sprite: a.sprite, owner: a, x: b.x + Math.cos(ang) * 40, y: b.y - 20 + Math.sin(ang) * 30, vx: 0, vy: -1, speed: a.speed, r: 14, t: 0, life: 420, pop: true, seed: Math.random() * 10 });
          s.n++; b.open = 1;
          S().bossLob();
        }
        return s.n >= a.n && s.t > a.n * 26 + 110;
      }
      case 'charge': {
        b.bodyHurts = s.phase !== 3;
        const ad = arenaDef(b);
        const tree = a.tree && ad.tree != null ? colX(b, ad.tree) : null;
        if (!s.phase) {
          s.phase = 1;
          s.target = tree != null ? tree - b.dashDir * b.D.r * 0.55 : b.dashDir < 0 ? A.x0 + b.D.r : A.x1 - b.D.r;
          S().bossDash();
        }
        if (s.phase === 1) {
          const x0 = b.x;
          b.x += b.dashDir * a.speed;
          b.facing = b.dashDir;
          if (a.style === 'roll') b.roll += b.dashDir * a.speed / b.D.r;
          if (s.t % 5 === 0) PT().dust(b.x - b.dashDir * b.D.r * 0.5, groundAt(b, b.x), 2);
          // the walrus whizzes over the thin ice… and in she goes
          if (a.crack && ad.crack != null) {
            const cx = colX(b, ad.crack);
            if ((x0 - cx) * (b.x - cx) <= 0) {
              b.x = cx; b.bodyHurts = false;
              s.stuck = 'crack'; s.hold = true; s.holdY = standY(b) + 24;
              b.squash = 0.7; b.shake = 14; ctx.shake(7); S().crumble(); S().splash();
              PT().burst('dot', cx, groundAt(b, cx), 18, { color: '#dff4ff', speed: 3.4, life: 36, size: 3.4, up: 1 });
              return true;
            }
          }
          if ((b.dashDir < 0 && b.x <= s.target) || (b.dashDir > 0 && b.x >= s.target)) {
            b.x = s.target; s.phase = 2; s.pt = s.t;
            b.squash = 0.7; b.shake = 14; ctx.shake(7); S().bossBonk();
            PT().burst('dot', b.x + b.dashDir * b.D.r, b.y, 10, { color: '#e8e0d0', speed: 2.5, life: 30, size: 3 });
            if (tree != null) {
              // BONK — antlers stuck fast in the oak, and down come the acorns
              s.stuck = 'antlers'; s.hold = true; s.holdY = standY(b);
              PT().burst('dot', tree, b.y - 120, 16, { color: '#e8883a', speed: 2.4, g: 0.06, life: 80, size: 3.4 });
              const acorn = ATK.acorns;
              [-150, -80, 90, 160].forEach((d, i) => spawnDrop(acorn, BB.clamp(tree + d * b.dashDir * -1, A.x0 + 20, A.x1 - 20), A, 20 + i * 18));
              b.y = standY(b);
              return true;
            }
          }
        } else if (s.phase === 2) {
          if (s.t - s.pt > 26) { s.phase = 3; b.facing = -b.dashDir; }
        } else if (s.phase === 3) {
          // trot back home, tired (no longer dangerous)
          const d = Math.sign(b.homeX - b.x);
          b.x += d * 2.4;
          b.facing = d || b.facing;
          if (a.style === 'roll') b.roll = BB.lerp(b.roll, 0, 0.1);
          if (Math.abs(b.homeX - b.x) < 3) { b.x = b.homeX; b.y = standY(b); return true; }
        }
        b.y = BB.lerp(b.y, standY(b), 0.35);
        return false;
      }
      case 'hop': {
        // hops (the toad's belly-flop, the camel's hump bounce, big floaty
        // moon hops): a ring marks the landing spot; landing sends waves
        const dur = a.dur || 58;
        b.bodyHurts = s.phase === 1 && s.ht > dur * 0.5;
        if (!s.phase) {
          if (s.n >= a.n) return s.t > 40;
          s.phase = 1; s.ht = 0; s.fromX = b.x; s.fromY = b.y; s.n++;
          s.toX = a.inPlace ? b.x : clampX(pcx);
          // (the toad flops onto whatever the kitten is standing on — up to a few tiles up)
          const surf = a.ledges ? floorUnder(s.toX, Math.max(pb.y + pb.h - 8, b.floorY - 5 * T)) : groundAt(b, s.toX);
          s.toY = surf - b.D.lift;
          if (!a.inPlace) hazards.push({ kind: 'marker', owner: a, x: s.toX, y: surf, t: 0, life: dur + 4 });
          S().bossHop();
        }
        if (s.phase === 1) {
          s.ht++;
          const k = s.ht / dur;
          b.x = BB.lerp(s.fromX, s.toX, k);
          b.y = BB.lerp(s.fromY, s.toY, k) - Math.sin(k * Math.PI) * (a.height || 170);
          b.jump = Math.sin(k * Math.PI);
          b.facing = s.toX === s.fromX ? b.facing : s.toX < s.fromX ? -1 : 1;
          if (k >= 1) {
            b.y = s.toY; b.jump = 0; s.phase = 2; s.lt = 0;
            b.squash = 0.65; b.shake = 12; ctx.shake(7); S().bossBonk();
            PT().dust(b.x, b.y + b.D.lift, 10);
            for (const d of [-1, 1]) spawnWave({ sprite: a.wave || 'ripple', speed: 2.3 }, b.x + d * b.D.r * 0.6, d, b, a, b.y + b.D.lift);
          }
        } else if (s.phase === 2) {
          if (++s.lt > (a.inPlace ? 24 : 40)) s.phase = 0;
        }
        return false;
      }
      case 'chase': {
        // the goose's angry waddle / the panda's sleepwalk: slower than a
        // kitten can run, so you can always get away (or hop up a ledge)
        b.bodyHurts = true;
        if (!s.go) { s.go = 1; b.vx = 0; S().bossDash(); }
        const dir = Math.sign(pcx - b.x) || b.facing;
        const zig = a.zigzag ? Math.sin(s.t * 0.045) * 0.9 : 0;
        b.vx = BB.lerp(b.vx || 0, dir * a.speed + zig, 0.05);
        b.x = BB.clamp(b.x + b.vx, A.x0 + b.D.r * 0.6, A.x1 - b.D.r * 0.6);
        b.facing = b.vx < 0 ? -1 : 1;
        b.y = BB.lerp(b.y, standY(b), 0.3);
        if (s.t % 14 === 0) { PT().dust(b.x, groundAt(b, b.x), 2); if (!a.sleepy) S().step(); }
        if (a.sleepy && s.t % 50 === 0) PT().burst('dot', b.x + b.facing * 20, b.y - b.D.lift, 1, { color: '#e0e8ff', speed: 0.5, life: 50, size: 5, g: -0.02 });
        const mud = a.mud && arenaDef(b).mud != null ? colX(b, arenaDef(b).mud) : null;
        if (mud != null && Math.abs(b.x - mud) < 14) {
          // SPLOSH — slipped in the mud puddle
          b.x = mud; b.bodyHurts = false;
          s.stuck = 'mud'; s.hold = true; s.holdY = standY(b) + 6;
          b.squash = 0.7; b.shake = 16; ctx.shake(5); S().splash(); S().bossBonk();
          PT().burst('dot', mud, groundAt(b, mud) - 4, 16, { color: '#8a5a34', speed: 3, life: 34, size: 3.2, up: 1.2 });
          return true;
        }
        return s.t >= a.time;
      }
      case 'tongue': {
        // the toad: a dotted line shows where the tongue will flick, then
        // out it shoots… and back
        settle(b, 0.08);
        if (!s.phase) {
          if (s.n >= a.n) return s.t > 30;
          s.phase = 1; s.pt = 0; s.n++;
          s.hz = { kind: 'tongue', owner: a, x: b.x, y: b.y, ang: 0, len: 0, aim: true, t: 0, life: 999 };
          hazards.push(s.hz);
        }
        s.pt++;
        const hz = s.hz;
        if (s.phase === 1) {
          face(b, pcx);
          hz.x = b.x + b.facing * b.D.r * 0.72; hz.y = b.y + 6;
          const ang = Math.atan2(pcy - hz.y, pcx - hz.x);
          // (never straight up or down — a toad's tongue flicks forwards)
          const fwd = b.facing > 0 ? 0 : Math.PI;
          let d = Math.atan2(Math.sin(ang - fwd), Math.cos(ang - fwd));
          d = BB.clamp(d, -0.75, 0.75);
          hz.ang = fwd + d;
          b.open = 0.5;
          if (s.pt > 46) { s.phase = 2; hz.aim = false; S().bossAttack(); }
        } else if (s.phase === 2) {
          hz.len += 15;
          const tx = hz.x + Math.cos(hz.ang) * hz.len, ty = hz.y + Math.sin(hz.ang) * hz.len;
          if (hz.len >= a.reach || solidAt(tx, ty)) { s.phase = 3; s.hold = 0; b.open = 1; }
        } else if (s.phase === 3) {
          if (++s.hold > 16) s.phase = 4;
        } else if (s.phase === 4) {
          hz.len -= 12;
          if (hz.len <= 0) { hz.dead = true; const i = hazards.indexOf(hz); if (i >= 0) hazards.splice(i, 1); s.phase = 0; b.open = 0; s.hold = 0; }
        }
        return false;
      }
      case 'bowl': {
        // the armadillo curls up and rolls round and round the bowl
        b.bodyHurts = true;
        const bw = arenaDef(b).bowl || [2, 26];
        const lo = colX(b, bw[0]) + b.D.r * 0.3, hi = colX(b, bw[1]) - b.D.r * 0.3;
        if (!s.dir) { s.dir = b.x < (lo + hi) / 2 ? 1 : -1; s.pass = 0; s.v = 0; S().bossDash(); }
        s.v = s.slow ? s.v * 0.975 : BB.lerp(s.v, a.speed, 0.05);
        b.x += s.dir * s.v;
        b.roll += s.dir * s.v / b.D.r;
        b.facing = s.dir;
        if ((s.dir > 0 && b.x >= hi) || (s.dir < 0 && b.x <= lo)) {
          b.x = s.dir > 0 ? hi : lo; s.dir = -s.dir; s.pass++;
          b.squash = 0.8; ctx.shake(3); S().bossBonk();
          PT().burst('dot', b.x, b.y, 6, { color: '#bfe6ff', speed: 2.2, life: 24, size: 2.6 });
          if (s.pass >= a.passes) s.slow = true;
        }
        b.y = BB.lerp(b.y, standY(b), 0.35);
        if (s.t % 5 === 0) PT().dust(b.x, groundAt(b, b.x), 2);
        if (s.slow && s.v < 0.45) { b.bodyHurts = false; s.hold = true; s.holdY = standY(b); return true; }
        return false;
      }
      case 'dive': {
        // the queen hovers right above you — her shadow shows where she'll
        // land — then down she dives… and sticks in her own honey
        b.bodyHurts = s.phase === 2;
        if (!s.phase) {
          s.phase = 1; s.pt = 0;
          s.hz = { kind: 'marker', owner: a, x: b.x, y: b.floorY, t: 0, life: 999, honey: true };
          hazards.push(s.hz);
        }
        s.pt++;
        if (s.phase === 1) {
          b.x = BB.lerp(b.x, clampX(pcx), s.pt < 50 ? 0.06 : 0.02);
          b.y = BB.lerp(b.y, Math.min(pcy - 170, b.floorY - b.D.fly), 0.05);
          face(b, pcx);
          s.landY = floorUnder(b.x, Math.max(b.y + b.D.r, pb.y + pb.h - 8));
          s.hz.x = b.x; s.hz.y = s.landY;
          b.open = s.pt / 70;
          if (s.pt > 70) { s.phase = 2; s.vy = 1.5; S().bossDash(); }
        } else if (s.phase === 2) {
          s.vy = Math.min(12, s.vy + 0.7);
          b.y += s.vy;
          if (b.y >= s.landY - b.D.lift) {
            b.y = s.landY - b.D.lift;
            s.stuck = 'honey'; s.hold = true; s.holdY = b.y;
            b.squash = 0.65; b.shake = 14; ctx.shake(7); S().bossBonk();
            PT().burst('dot', b.x, s.landY - 4, 16, { color: '#ffc34a', speed: 2.8, life: 34, size: 3.4, up: 1 });
            return true;
          }
        }
        return false;
      }
      case 'flood': {
        // the elephant floods the courtyard — up on a pillar till it drains!
        settle(b, 0.08);
        face(b, pcx);
        if (!s.hz) {
          const r = A.r;
          s.hz = { kind: 'flood', owner: a, x0: r.px + 2 * T, x1: r.px + r.pw - 2 * T, base: b.floorY, level: 0, t: 0, life: 9999, from: b.x };
          hazards.push(s.hz);
          S().splash();
        }
        const up = a.rise, hold = a.hold, down = a.drain;
        const k = s.t < up ? s.t / up : s.t < up + hold ? 1 : 1 - (s.t - up - hold) / down;
        s.hz.level = a.level * BB.easeInOut(BB.clamp(k, 0, 1));
        b.open = s.t < up + hold ? 1 : 0.3;
        if (s.t < up + hold && s.t % 3 === 0) PT().burst('dot', b.x + b.facing * b.D.r * 0.7, b.y - b.D.lift * 0.9, 2, { color: '#8fd0ff', speed: 2.6, life: 40, size: 3.2, g: 0.18, up: 2.2 });
        if (s.t % 40 === 0 && s.t < up + hold) S().splash();
        if (s.t >= up + hold + down) { s.hz.dead = true; const i = hazards.indexOf(s.hz); if (i >= 0) hazards.splice(i, 1); return true; }
        return false;
      }
      case 'gust': {
        // huff and puff: a great gust blows the kitten away from the boss
        // (the camel's is a sandstorm, with sandy waves rolling along)
        if (b.D.fly) hover(b, A, 0.4); else settle(b, 0.08);
        if (!s.hz) {
          s.hz = { kind: 'wind', owner: a, dir: pcx < b.x ? -1 : 1, push: 0, t: 0, life: 9999, sandy: !!a.sandy };
          hazards.push(s.hz);
          S().whoosh();
        }
        b.facing = s.hz.dir;
        const k = Math.min(1, s.t / 30, (a.time - s.t) / 30);
        s.hz.push = a.push * Math.max(0, k);
        b.open = 1; b.squash = 1.05 + Math.sin(s.t * 0.3) * 0.04;
        if (s.t % 45 === 0) S().whoosh();
        if (a.waves && s.t % 70 === 20 && s.t < a.time - 40) spawnWave({ sprite: 'sand', speed: 2.4 }, b.x + s.hz.dir * b.D.r * 0.6, s.hz.dir, b, a);
        if (s.t >= a.time) { s.hz.dead = true; const i = hazards.indexOf(s.hz); if (i >= 0) hazards.splice(i, 1); return true; }
        return false;
      }
      case 'tentacles': {
        // bubbles fizz up through holes in the deck… then up pops a tentacle
        settle(b, 0.08);
        b.open = 0.5;
        const holes = (arenaDef(b).holes || []).map(c => colX(b, c));
        if (!holes.length) return true;
        if (!s.round || (s.rt > 20 && !hazards.some(h => h.kind === 'tentacle' && h.owner === a))) {
          if (s.round >= a.n) return true;
          s.round = (s.round || 0) + 1; s.rt = 0;
          const near = holes.slice().sort((p, q) => Math.abs(p - pcx) - Math.abs(q - pcx));
          const pick = [near[0]];
          if (s.round > 1 && near.length > 1) pick.push(near[1 + Math.floor(Math.random() * (near.length - 1))]);
          for (const x of pick) hazards.push({ kind: 'tentacle', owner: a, x, base: groundAt(b, x), h: 0, t: 0, life: 200, seed: Math.random() * 6 });
          S().bossAttack();
        }
        s.rt++;
        return false;
      }
    }
    return true;
  }

  // n distinct spots: one right where the kitten is, the rest spread about
  function spreadAround(x0, n, A) {
    const xs = [x0];
    let guard = 0;
    while (xs.length < n && guard++ < 200) {
      const x = A.x0 + 20 + Math.random() * (A.x1 - A.x0 - 40);
      if (xs.every(o => Math.abs(o - x) > 110)) xs.push(x);
    }
    return xs;
  }

  // the first open air below the arena's top (under any cave ceiling)
  function skyAbove(x, A) {
    const tx = Math.floor(x / T);
    let ty = Math.floor(A.top / T);
    for (let i = 0; i < 20 && BB.Physics.solidSide(W().tile(tx, ty)); i++) ty++;
    return ty * T;
  }

  function spawnDrop(a, x, A, delay = 0) {
    const top = skyAbove(x, A);
    const gy = floorUnder(x, top + 4);
    hazards.push({
      kind: 'drop', sprite: a.sprite, owner: a, x, x0: x, y: Math.max(top - (top > A.top ? -6 : 20), gy - 440), gy,
      vy: a.fall, sway: a.sway || 0, r: a.sprite === 'feather' ? 12 : 13, t: 0, delay: 58 + delay, life: 900,
    });
  }

  function spawnWave(a, x, dir, b, owner, y) {
    const r = W().byId[b.room];
    hazards.push({ kind: 'wave', sprite: a.sprite, owner: owner || a, x, y: y != null ? y : groundAt(b, x), dir, x0: r.px, x1: r.px + r.pw, speed: a.speed, w: 34, h: a.sprite === 'sand' ? 30 : 24, t: 0, life: 700 });
    S().bossWave();
  }

  function spawnLob(a, b, tx, A, feetY) {
    const x0 = b.x + b.facing * b.D.r * 0.5, y0 = b.y - b.D.lift * 0.3;
    // it arcs in from the side, so it lands down near the kitten's level —
    // not on a ledge high overhead (a ledge right over your head still shelters you)
    const from = Math.max(skyAbove(tx, A) + 4, Math.min(feetY, b.floorY) - 2.5 * T);
    const gy = floorUnder(tx, from);
    const n = 66, g = 0.22;
    hazards.push({
      kind: 'lob', sprite: a.sprite, owner: a, x: x0, y: y0, tx, gy, g,
      vx: (tx - x0) / n, vy: (gy - 12 - y0) / n - 0.5 * g * n, r: 13, t: 0, life: 400, spin: 0,
    });
    S().bossLob();
  }

  // ──── Hazards ────
  function updateHazards(ctx) {
    const pb = ctx.pl.body, pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.t++;
      let hit = false;
      switch (h.kind) {
        case 'drop':
          if (h.delay > 0) { h.delay--; break; }
          h.y += h.vy;
          if (h.sway) h.x = h.x0 + Math.sin(h.t * 0.06) * 26;
          if (h.y >= h.gy - h.r * 0.6) { poof(h); h.dead = true; }
          hit = Math.hypot(pcx - h.x, pcy - h.y) < h.r + 9;
          break;
        case 'lob':
          h.vy += h.g; h.x += h.vx; h.y += h.vy; h.spin += 0.2;
          if (h.vy > 0 && h.y >= h.gy - h.r * 0.6) { poof(h); h.dead = true; }
          hit = Math.hypot(pcx - h.x, pcy - h.y) < h.r + 9;
          break;
        case 'wave': {
          h.x += h.dir * h.speed;
          // follow the floor; stop at walls, gaps and the arena's edges
          const ahead = h.x + h.dir * (h.w / 2);
          const room = W().roomAtPx(h.x, h.y - 4);
          // (it rolls up and down little one-tile steps — dunes, flowerbeds —
          // but stops at anything taller)
          const wx = Math.floor(h.x / T);
          if (solidAt(h.x, h.y - 10) && !solidAt(h.x, h.y - T - 10)) h.y -= T;
          else if (!isFloor(wx, Math.floor((h.y + 4) / T)) && isFloor(wx, Math.floor((h.y + T + 4) / T))) h.y += T;
          const wall = solidAt(ahead, h.y - 10) && solidAt(ahead, h.y - T - 10);
          if (!room || wall || h.x < h.x0 || h.x > h.x1 || !isFloor(wx, Math.floor((h.y + 4) / T))) { poof(h); h.dead = true; break; }
          hit = Math.abs(pcx - h.x) < h.w / 2 + pb.w / 2 - 6 && pb.y + pb.h > h.y - h.h + 6 && pb.y < h.y;
          break;
        }
        case 'bouncer': {
          h.vy += 0.24;
          h.x += h.vx; h.y += h.vy;
          if (solidAt(h.x + Math.sign(h.vx) * h.r, h.y)) { h.vx = -h.vx; h.x += h.vx * 2; }
          const fy = floorUnder(h.x, h.y - h.r);
          if (h.vy > 0 && h.y + h.r >= fy) { h.y = fy - h.r; h.vy = -h.bounce; h.sq = 1; }
          h.sq = Math.max(0, (h.sq || 0) - 0.1);
          hit = Math.hypot(pcx - h.x, pcy - h.y) < h.r + 9;
          break;
        }
        case 'floater': {
          const dx = pcx - h.x, dy = pcy - 6 - h.y, d = Math.max(1, Math.hypot(dx, dy));
          h.vx = BB.lerp(h.vx, dx / d * h.speed, 0.04);
          h.vy = BB.lerp(h.vy, dy / d * h.speed, 0.04);
          h.x += h.vx + Math.sin(h.t * 0.05 + h.seed) * 0.4;
          h.y += h.vy + Math.cos(h.t * 0.04 + h.seed) * 0.3;
          hit = Math.hypot(pcx - h.x, pcy - h.y) < h.r + 8;
          break;
        }
        case 'marker': break;
        case 'tongue': {
          if (h.aim || h.len <= 0) break;
          // distance from the kitten to the tongue
          const ex = Math.cos(h.ang), ey = Math.sin(h.ang);
          const k = BB.clamp((pcx - h.x) * ex + (pcy - h.y) * ey, 0, h.len);
          hit = Math.hypot(pcx - (h.x + ex * k), pcy - (h.y + ey * k)) < 15;
          break;
        }
        case 'flood':
          // the water's top; standing in it is a (splashy) bump
          hit = h.level > 8 && pcx > h.x0 && pcx < h.x1 && pb.y + pb.h > h.base - h.level + 6;
          if (hit) h.x = h.from;
          break;
        case 'wind':
          if (h.push > 0 && ctx.pl.state === 'play') nudge(pb, h.dir * h.push);
          break;
        case 'tentacle': {
          const up = 48, rise = 16, stay = 64, down = 22;
          const tt = h.t;
          h.h = tt < up ? 0 : tt < up + rise ? (tt - up) / rise * 104 : tt < up + rise + stay ? 104 : Math.max(0, 104 * (1 - (tt - up - rise - stay) / down));
          if (tt < up && tt % 6 === 0) PT().burst('dot', h.x + (Math.random() - 0.5) * 16, h.base - 2, 1, { color: '#bfefff', speed: 0.8, life: 26, size: 3, g: -0.06 });
          if (tt === up) { S().splash(); PT().burst('dot', h.x, h.base - 4, 10, { color: '#c89a6a', speed: 2.6, life: 26, size: 3, up: 1 }); }
          if (tt > up + rise + stay + down) h.dead = true;
          hit = h.h > 12 && Math.abs(pcx - h.x) < 14 + pb.w / 2 - 4 && pb.y + pb.h > h.base - h.h + 6 && pb.y < h.base;
          break;
        }
      }
      if (hit && !h.dead && ctx.pl.state === 'play') {
        if (ctx.hurt(h.x, h) && h.kind !== 'wave' && h.kind !== 'tongue' && h.kind !== 'flood' && h.kind !== 'tentacle') { poof(h); h.dead = true; }
      }
      if (--h.life <= 0 && !h.dead) { if (h.sprite) poof(h); h.dead = true; }
      if (h.dead) { const j = hazards.indexOf(h); if (j >= 0) hazards.splice(j, 1); }
    }
  }

  function poof(h) {
    const col = SPRITE_COL[h.sprite] || '#c8cce0';
    PT().burst('dot', h.x, h.kind === 'wave' ? h.y - 8 : h.y, 7, { color: col, speed: 1.8, life: 24, size: 3, up: 0.4 });
  }

  function clear() { hazards.length = 0; }
  // the tongue, wind, flood and landing marks go when their attack ends
  function clearOwned(a) {
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      if (h.owner === a && (h.kind === 'tongue' || h.kind === 'wind' || h.kind === 'flood' || h.kind === 'marker')) hazards.splice(i, 1);
    }
  }

  // Bubbles pop the poppable hazards (with a satisfying sparkle)
  function hazardTargets() {
    const out = [];
    for (const h of hazards) {
      if (!h.pop || h.dead) continue;
      out.push({
        x: h.x, y: h.y, r: h.r + 2, homing: true,
        hit: () => {
          h.dead = true;
          const i = hazards.indexOf(h); if (i >= 0) hazards.splice(i, 1);
          S().pop(1.3);
          PT().burst('spark', h.x, h.y, 10, { color: '#fff6c2', speed: 2.4, life: 28 });
          PT().ring(h.x, h.y, '#ffffff', 14);
          return true;
        },
      });
    }
    return out;
  }

  // ──── Bubbles on the boss ────
  function target(b, ctx) {
    if (b.state === 'happy') {
      return { x: b.x, y: b.y, r: b.D.r, homing: false, hit: () => { b.danceT = 60; for (let i = 0; i < 4; i++) PT().heart(b.x + (Math.random() - 0.5) * 40, b.y - b.D.lift); return true; } };
    }
    if (ctx.room !== W().byId[b.room]) return null;
    if (b.state === 'wait') return { x: b.x, y: b.y, r: b.D.r, homing: true, hit: () => { wake(b, ctx); return true; } };
    if (b.state === 'sniffle') return { x: b.x, y: b.y, r: b.D.r + 4, homing: true, hit: () => { cheer(b, ctx); return true; } };
    // mid-attack, the gloom cloud bats bubbles away — wait for the sniffle!
    return {
      x: b.x, y: b.y, r: b.D.r, homing: false,
      hit: bub => {
        b.shake = 6;
        S().deflect();
        PT().burst('dot', bub.x, bub.y, 5, { color: '#c8cce0', speed: 1.6, life: 18, size: 2.4 });
        return true;
      },
    };
  }

  function cheer(b, ctx) {
    b.hits++;
    b.shake = 10; b.hitFlash = 12; b.squash = 1.15;
    S().cheerHit(b.hits + (b.D.clouds - b.clouds) * b.D.per);
    PT().burst('spark', b.x, b.y - 10, 10, { color: '#fff6c2', speed: 2.8, life: 30 });
    for (let i = 0; i < 2; i++) PT().heart(b.x + (Math.random() - 0.5) * 30, b.y - b.D.lift * 0.5);
    if (b.hits >= b.D.per) {
      b.hits = 0;
      b.clouds--;
      // a fishy treat bounces out, right when a sad kitten could use one
      if (ctx.dropFood) ctx.dropFood(b.x, b.y - b.D.lift * 0.5);
      const cx = b.x, cy = b.y - b.D.lift - 46;
      b.pops.push({ t: 0, x: cx, y: cy });
      S().bossCloudPop();
      PT().ring(cx, cy, '#ffffff', 36);
      PT().burst('confetti', cx, cy, 24, { speed: 3.5, g: 0.08, life: 70 });
      ctx.shake(4);
      if (b.clouds <= 0) becomeHappy(b, ctx);
      else { b.state = 'pop'; b.stT = 0; }
    }
  }

  function becomeHappy(b, ctx) {
    b.state = 'happy'; b.stT = 0; b.rainbow = 260; b.danceT = 150;
    b.bodyHurts = false; b.roll = 0;
    clear();
    PT().ring(b.x, b.y, '#ffffff', 60);
    for (let i = 0; i < 50; i++) PT().burst('confetti', b.x + (Math.random() - 0.5) * 400, b.y - 150, 1, { speed: 2, g: 0.06, life: 130 });
    for (let i = 0; i < 14; i++) PT().heart(b.x + (Math.random() - 0.5) * 80, b.y - Math.random() * 60);
    ctx.onBossHappy(b);
  }

  // the kitten left the arena: the boss sits back down (popped clouds stay popped)
  function reset(b) {
    if (b.state === 'happy') return;
    b.state = 'wait'; b.stT = 0; b.a = null; b.hits = 0; b.stuck = null; b.hold = false;
    b.x = b.homeX; b.y = restY(b); b.roll = 0; b.jump = 0; b.bodyHurts = false;
  }

  // after the kitten floats back to the door, the boss takes a breather
  function calm(b) {
    if (b.state === 'happy' || b.state === 'wait') return;
    b.state = 'calm'; b.stT = 0; b.a = null; b.roll = 0; b.jump = 0; b.stuck = null; b.hold = false;
    b.x = BB.lerp(b.x, b.homeX, 0.5); b.y = restY(b);
    clear();
  }

  // ──── Drawing ────
  const SPRITE_COL = {
    feather: '#ffffff', note: '#9fb8ff', ripple: '#a8c8e8', splash: '#8fe0f0', sand: '#e8c080', crescent: '#d8c8ff',
    spore: '#b8a0d0', snowball: '#ffffff', mochi: '#ffe0ec', crystal: '#bfe6ff', honey: '#ffc34a', acorn: '#c0843a',
    star: '#ffe27a', tear: '#9fd0ff', water: '#8fd0ff', dust: '#d8b890', bamboo: '#8ac86a', drone: '#c8b870',
    cloudlet: '#b8bccc', ink: '#8a6aa8', zbubble: '#dff0ff',
  };

  function draw(c, b, cam, t) {
    const x = b.x - cam.x, y = b.y - cam.y;
    if (x < -220 || x > G().W + 220 || y < -300 || y > G().H + 200) return;
    const D = b.D;
    // soft shadow on the floor (shrinks while jumping)
    if (!b.pool) {
      const sy = b.floorY - cam.y;
      c.fillStyle = `rgba(20,10,40,${0.22 * (1 - b.jump * 0.6)})`;
      G().ellipse(b.x - cam.x, sy + 2, D.r * (0.95 - b.jump * 0.4), 7, 0, c); c.fill();
    }
    const m = mood(b);
    const stuckNow = b.state === 'sniffle';
    const sleepy = (stuckNow && b.stuck === 'doze') || (b.state === 'attack' && b.atk && b.atk.sleepy);
    // the bubble moment glows gold
    if (stuckNow) {
      const k = Math.min(1, b.stT / 16), p = 0.5 + 0.5 * Math.sin(t * 0.15);
      G().drawGlow(x, y - 4, D.r * 2.2, '#fff1a0', (0.5 + 0.25 * p) * k, c);
      c.save(); c.globalAlpha = 0.85 * k; c.strokeStyle = '#ffd84a'; c.lineWidth = 3; c.setLineDash([6, 7]); c.lineDashOffset = -t * 0.5;
      G().circle(x, y - 4, D.r * 1.25 + p * 4, c); c.stroke(); c.restore();
    }
    if (stuckNow) drawStuck(c, b, x, y, t, false);
    const attackPose = b.atk && (b.atk.type === 'charge' || b.atk.type === 'bowl') && b.a && b.a.phase !== 3 ? 'dash'
      : b.atk && b.atk.type === 'hop' ? 'hop' : sleepy ? 'sulk' : 'attack';
    const st = {
      t: b.t, mood: m, facing: b.facing, blink: sleepy ? 1 : b.blink, squash: b.squash,
      tears: !(stuckNow && (b.stuck === 'doze' || b.stuck === 'dizzy' || b.stuck === 'sulk' || b.stuck === 'pound')),
      shake: b.shake ? Math.sin(b.shake * 1.7) * 3 : 0, roll: b.roll, open: b.open,
      pose: b.state === 'happy' ? (b.danceT > 0 ? 'dance' : 'happy')
        : b.state === 'sniffle' || b.state === 'calm' ? 'sniffle'
        : b.state === 'tele' ? 'tele'
        : b.state === 'attack' ? attackPose
        : b.state === 'pop' ? 'pop' : 'sulk',
      style: b.atk && b.atk.style, jump: b.jump, flash: b.hitFlash / 12,
    };
    if (b.stuck === 'crack' && stuckNow) {
      // half sunk through the ice: only the top half shows
      c.save(); c.beginPath(); c.rect(x - 200, y - 300, 400, 300 + D.lift * 0.35); c.clip();
      BB.BossArt.draw(c, b.kind, x + st.shake, y, D.r / 22, st);
      c.restore();
    } else BB.BossArt.draw(c, b.kind, x + st.shake, y, D.r / 22, st);
    if (stuckNow) drawStuck(c, b, x, y, t, true);
    else if (sleepy) zzz(c, x + b.facing * D.r * 0.6, y - D.lift - 10, t);
    drawGloom(c, b, x, y, t);
    if (b.rainbow > 0) BB.Critters.rainbow(c, x, y - D.lift - 34, Math.min(1, b.rainbow / 40), 3.2);
    // "bubble now!" — the bubble button pops up over a sniffling boss
    if (b.state === 'sniffle') {
      const k = Math.min(1, b.stT / 18);
      const bob = Math.sin(t * 0.18) * 4;
      c.save(); c.globalAlpha = k;
      BB.HUD.buttonIcon(c, 'bubble', x + b.facing * (D.r + 26), y - D.lift - 10 + bob, 0.9, 0.5 + 0.5 * Math.sin(t * 0.25));
      // how many bubbles this cloud still needs
      for (let i = 0; i < D.per; i++) {
        c.fillStyle = i < b.hits ? '#ffe27a' : 'rgba(255,255,255,0.45)';
        G().circle(x + b.facing * (D.r + 26) + (i - (D.per - 1) / 2) * 12, y - D.lift + 20 + bob, 4, c); c.fill();
      }
      c.restore();
    }
  }

  function zzz(c, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.012) + i / 3) % 1;
      c.save(); c.globalAlpha = Math.sin(k * Math.PI);
      G().text('z', x + k * 22 + i * 3, y - k * 34, 12 + k * 10, '#ffffff', '#6a7ab8');
      c.restore();
    }
  }

  // what "stuck" looks like, boss by boss (front = drawn over the boss)
  function drawStuck(c, b, x, y, t, front) {
    const D = b.D, fy = y + D.lift, f = b.facing;
    switch (b.stuck) {
      case 'mud':
        if (!front) {
          c.fillStyle = '#7a5030'; G().ellipse(x, fy + 1, D.r * 1.2, 10, 0, c); c.fill();
          c.fillStyle = '#9a6a42'; G().ellipse(x - 6, fy - 1, D.r * 0.8, 5, 0, c); c.fill();
        } else {
          c.fillStyle = '#7a5030';
          for (let i = 0; i < 6; i++) { G().circle(x + Math.sin(i * 2.1) * D.r * 0.7, y + 6 + Math.cos(i * 1.7) * 10, 2.6 + (i % 3), c); c.fill(); }
          const k = (t * 0.02) % 1;
          c.strokeStyle = `rgba(122,80,48,${1 - k})`; c.lineWidth = 2; G().circle(x + D.r * 0.8, fy - 2 - k * 6, 3 + k * 3, c); c.stroke();
        }
        break;
      case 'tongue':
        if (front) {
          // tongue all tied up in a bow
          const tx = x + f * D.r * 0.7, ty = y + 8;
          c.strokeStyle = '#ff7e9c'; c.lineWidth = 6; c.lineCap = 'round';
          c.beginPath(); c.moveTo(tx - f * 6, ty); c.quadraticCurveTo(tx + f * 14, ty + 20, tx + f * 4, ty + 26); c.stroke();
          c.fillStyle = '#ff7e9c'; c.strokeStyle = '#b8406a'; c.lineWidth = 1.5;
          for (const d of [-1, 1]) { c.beginPath(); c.ellipse(tx + f * 4 + d * 8, ty + 26, 8, 5, d * 0.4, 0, TAU); c.fill(); c.stroke(); }
          G().circle(tx + f * 4, ty + 26, 3.5, c); c.fill(); c.stroke();
        }
        break;
      case 'dizzy':
        if (front) for (let i = 0; i < 3; i++) {
          const a = t * 0.12 + i * TAU / 3;
          c.fillStyle = '#ffe27a'; c.strokeStyle = '#c28a14'; c.lineWidth = 1;
          G().star(x + Math.cos(a) * 30, y - D.lift - 4 + Math.sin(a) * 8, 7, 5, 0.5, a, c); c.fill(); c.stroke();
        }
        break;
      case 'honey':
        if (!front) { c.fillStyle = 'rgba(255,195,74,0.9)'; G().ellipse(x, fy + 1, D.r * 1.3, 9, 0, c); c.fill(); }
        else {
          c.fillStyle = 'rgba(255,195,74,0.95)';
          for (let i = 0; i < 4; i++) {
            const dx = (i - 1.5) * 14, k = ((t * 0.02) + i * 0.3) % 1;
            c.beginPath(); c.moveTo(dx + x - 5, y + 4); c.quadraticCurveTo(dx + x, y + 14 + k * 16, dx + x + 5, y + 4); c.fill();
          }
          G().drawGlow(x, fy - 4, 40, '#ffd66b', 0.3, c);
        }
        break;
      case 'soaked':
        if (!front) { c.fillStyle = 'rgba(120,190,240,0.6)'; G().ellipse(x, fy + 1, D.r * 1.4, 9, 0, c); c.fill(); }
        else for (let i = 0; i < 6; i++) {
          const k = ((t * 0.03) + i / 6) % 1;
          c.fillStyle = `rgba(140,200,255,${1 - k})`;
          G().ellipse(x + (i - 2.5) * 13, y - D.lift * 0.6 + k * (D.lift + 20), 2, 3.4, 0, c); c.fill();
        }
        break;
      case 'puffed':
        if (front) for (let i = 0; i < 3; i++) {
          const k = ((t * 0.02) + i / 3) % 1;
          c.fillStyle = `rgba(255,255,255,${0.9 - k * 0.9})`;
          G().circle(x + f * (D.r * 0.8 + k * 30), y - 6 - k * 14, 5 + k * 7, c); c.fill();
        }
        break;
      case 'tangled':
        if (front) {
          // eight arms in one big knot
          c.strokeStyle = '#e888b8'; c.lineWidth = 7; c.lineCap = 'round';
          c.beginPath(); c.ellipse(x - 10, fy - 12, 14, 9, 0.5, 0, TAU); c.stroke();
          c.beginPath(); c.ellipse(x + 10, fy - 12, 14, 9, -0.5, 0, TAU); c.stroke();
          c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
          for (let i = 0; i < 5; i++) { G().circle(x - 16 + i * 8, fy - 6, 1.6, c); c.stroke(); }
        }
        break;
      case 'sulk':
        if (front) {
          // "hmph!" in a little grey cloud
          const cx = x - f * (D.r * 0.9), cy = y - D.lift - 6 + Math.sin(t * 0.06) * 2;
          BB.Critters.moodCloud(c, cx, cy, 0.9, t, 1);
          c.strokeStyle = '#3a2a3a'; c.lineWidth = 1.6;
          c.beginPath(); for (let i = 0; i < 12; i++) c.lineTo(cx - 8 + i * 1.4, cy + Math.sin(i * 1.9) * 3); c.stroke();
        }
        break;
      case 'crack':
        if (!front) { c.fillStyle = '#2a5a8a'; G().ellipse(x, fy + 4, D.r * 1.1, 10, 0, c); c.fill(); }
        else {
          c.fillStyle = '#dff4ff'; c.strokeStyle = '#6a9ad0'; c.lineWidth = 1.4;
          for (let i = 0; i < 7; i++) {
            const dx = (i - 3) * (D.r * 0.34), h = 10 + (i % 3) * 7;
            c.beginPath(); c.moveTo(x + dx - 7, fy + 8); c.lineTo(x + dx, fy - h + 8); c.lineTo(x + dx + 7, fy + 8); c.closePath(); c.fill(); c.stroke();
          }
        }
        break;
      case 'antlers':
        if (front && b.stT % 50 < 12) for (let i = 0; i < 2; i++) { c.fillStyle = '#c89a5a'; G().circle(x + f * (D.r + 6) + (Math.random() - 0.5) * 16, y - D.lift + (Math.random() - 0.5) * 20, 2.4, c); c.fill(); }
        break;
      case 'doze':
        if (front) {
          zzz(c, x + f * D.r * 0.5, y - D.lift - 10, t);
          const k = 0.5 + 0.5 * Math.sin(t * 0.06);
          c.fillStyle = 'rgba(200,230,255,0.7)'; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.2;
          G().circle(x + f * D.r * 0.72, y - D.lift * 0.35, 3 + k * 7, c); c.fill(); c.stroke();
        }
        break;
      case 'pound':
        if (front) {
          // a mortar full of mochi, and a tired little mallet
          const mx = x + f * (D.r + 18);
          c.fillStyle = '#a8784a'; c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(mx - 16, fy - 16); c.lineTo(mx + 16, fy - 16); c.lineTo(mx + 11, fy); c.lineTo(mx - 11, fy); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff4f8'; G().ellipse(mx, fy - 16, 13, 5, 0, c); c.fill();
          const sw = Math.max(0, Math.sin(t * 0.08)) * 0.6;
          c.save(); c.translate(mx - f * 10, fy - 44); c.rotate(-f * (0.4 - sw));
          c.fillStyle = '#c89a5a'; c.fillRect(-2, 0, 4, 26); G().rrect(-10, -8, 20, 12, 4, c); c.fill(); c.stroke();
          c.restore();
          const k = (t * 0.03) % 1;
          c.fillStyle = `rgba(140,200,255,${1 - k})`; G().ellipse(x - f * 16, y - D.lift + k * 14, 2.4, 3.6, 0, c); c.fill();
        }
        break;
    }
  }

  // The row of gloom clouds over the boss's head (popped ones → rainbows)
  function drawGloom(c, b, x, y, t) {
    const D = b.D;
    const n = D.clouds;
    const low = b.state === 'sniffle' ? 16 : 0;
    const dark = b.state === 'tele' ? 1 : b.state === 'attack' ? 0.7 : 0.3;
    for (let i = 0; i < n; i++) {
      const cx = x + (i - (n - 1) / 2) * 42 + Math.sin(t * 0.03 + i) * 3;
      const cy = y - D.lift - 50 + low + Math.abs(i - (n - 1) / 2) * 8;
      if (i < b.clouds) {
        c.save();
        c.globalAlpha = b.state === 'sniffle' ? 0.75 : 1;
        BB.Critters.moodCloud(c, cx, cy, 0.5 + dark * 0.5, t + i * 13, 1.8);
        c.restore();
      } else if (b.state !== 'happy') {
        BB.Critters.rainbow(c, cx, cy + 4, 0.9, 1.3);
      }
    }
    for (const p of b.pops) {
      const k = p.t / 90;
      c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 3;
      G().circle(p.x - (b.x - x), p.y - (b.y - y), 20 + k * 50, c); c.stroke();
    }
  }

  function drawHazards(c, cam, t) {
    // shadows and landing rings first
    for (const h of hazards) {
      if (h.kind === 'drop') {
        const k = h.delay > 0 ? 1 - h.delay / 60 : 1;
        const sx = (h.sway ? h.x : h.x0) - cam.x, sy = h.gy - cam.y;
        c.fillStyle = `rgba(40,30,80,${0.15 + k * 0.3})`;
        G().ellipse(sx, sy + 1, 8 + k * 12, 3 + k * 3, 0, c); c.fill();
        if (h.delay > 0 && Math.floor(h.delay / 8) % 2 === 0) {
          c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
          G().ellipse(sx, sy + 1, 10 + k * 12, 4 + k * 3, 0, c); c.stroke();
        }
      } else if (h.kind === 'lob') {
        const sx = h.tx - cam.x, sy = h.gy - cam.y;
        c.save();
        c.setLineDash([4, 4]); c.lineDashOffset = -t * 0.6;
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
        G().ellipse(sx, sy + 1, 20, 6, 0, c); c.stroke();
        c.restore();
        c.fillStyle = 'rgba(40,30,80,0.2)'; G().ellipse(sx, sy + 1, 14, 4, 0, c); c.fill();
      }
    }
    for (const h of hazards) {
      if (h.kind === 'drop' && h.delay > 0) continue;
      if (h.kind === 'marker') drawMarker(c, h, cam, t);
      else if (h.kind === 'tongue') drawTongue(c, h, cam, t);
      else if (h.kind === 'flood') drawFlood(c, h, cam, t);
      else if (h.kind === 'wind') drawWind(c, h, t);
      else if (h.kind === 'tentacle') drawTentacle(c, h, cam, t);
      else drawSprite(c, h, h.x - cam.x, h.y - cam.y, t);
    }
  }

  // where a hop or a dive will land
  function drawMarker(c, h, cam, t) {
    const x = h.x - cam.x, y = h.y - cam.y;
    c.save();
    c.setLineDash([5, 5]); c.lineDashOffset = -t * 0.6;
    c.strokeStyle = h.honey ? 'rgba(255,210,90,0.9)' : 'rgba(255,255,255,0.8)'; c.lineWidth = 2.5;
    G().ellipse(x, y + 1, 30 + Math.sin(t * 0.2) * 3, 8, 0, c); c.stroke();
    c.restore();
    c.fillStyle = 'rgba(40,30,80,0.22)'; G().ellipse(x, y + 1, 22, 6, 0, c); c.fill();
  }
  function drawTongue(c, h, cam, t) {
    const x = h.x - cam.x, y = h.y - cam.y, ex = Math.cos(h.ang), ey = Math.sin(h.ang);
    if (h.aim) {
      // the dotted line: this is where the tongue will go
      c.save(); c.setLineDash([4, 8]); c.lineDashOffset = -t;
      c.strokeStyle = `rgba(255,140,170,${0.5 + 0.3 * Math.sin(t * 0.3)})`; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex * 330, y + ey * 330); c.stroke();
      c.restore();
      return;
    }
    if (h.len <= 0) return;
    c.strokeStyle = '#b8406a'; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex * h.len, y + ey * h.len); c.stroke();
    c.strokeStyle = '#ff7e9c'; c.lineWidth = 8;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex * h.len, y + ey * h.len); c.stroke();
    c.fillStyle = '#ff7e9c'; c.strokeStyle = '#b8406a'; c.lineWidth = 2;
    G().circle(x + ex * h.len, y + ey * h.len, 9, c); c.fill(); c.stroke();
  }
  function drawFlood(c, h, cam, t) {
    if (h.level <= 0) return;
    const x0 = h.x0 - cam.x, x1 = h.x1 - cam.x, top = h.base - h.level - cam.y, bot = h.base - cam.y + 4;
    c.save();
    c.fillStyle = 'rgba(90,170,230,0.55)';
    c.beginPath(); c.moveTo(x0, bot);
    for (let x = x0; x <= x1; x += 12) c.lineTo(x, top + Math.sin(x * 0.05 + t * 0.12) * 3);
    c.lineTo(x1, bot); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(230,248,255,0.9)'; c.lineWidth = 2.5;
    c.beginPath(); for (let x = x0; x <= x1; x += 12) c.lineTo(x, top + Math.sin(x * 0.05 + t * 0.12) * 3); c.stroke();
    c.restore();
  }
  function drawWind(c, h, t) {
    if (h.push <= 0) return;
    const a = h.push / 1.5, W0 = G().W, H0 = G().H;
    c.save();
    if (h.sandy) { c.fillStyle = `rgba(230,190,120,${0.22 * a})`; c.fillRect(0, 0, W0, H0); }
    c.strokeStyle = h.sandy ? `rgba(200,150,80,${0.55 * a})` : `rgba(255,255,255,${0.6 * a})`; c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const y = (BB.hash(i, 3, 9) * H0 * 0.9 + 20);
      const x = ((BB.hash(i, 4, 9) * W0 + t * 9 * h.dir) % (W0 + 200) + W0 + 200) % (W0 + 200) - 100;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - h.dir * 30, y - 6, x - h.dir * 60, y + Math.sin(t * 0.1 + i) * 4); c.stroke();
    }
    c.restore();
  }
  function drawTentacle(c, h, cam, t) {
    const x = h.x - cam.x, base = h.base - cam.y;
    // the hole in the deck, fizzing
    c.fillStyle = '#3a2418'; G().ellipse(x, base + 1, 17, 5, 0, c); c.fill();
    if (h.h <= 0) {
      G().drawGlow(x, base - 6, 26, '#bfefff', 0.5 + 0.3 * Math.sin(t * 0.4), c);
      return;
    }
    const sway = Math.sin(t * 0.12 + h.seed) * 8;
    c.strokeStyle = '#a8508a'; c.lineWidth = 22; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, base + 4); c.quadraticCurveTo(x - sway, base - h.h * 0.5, x + sway, base - h.h); c.stroke();
    c.strokeStyle = '#e888b8'; c.lineWidth = 17;
    c.beginPath(); c.moveTo(x, base + 4); c.quadraticCurveTo(x - sway, base - h.h * 0.5, x + sway, base - h.h); c.stroke();
    c.fillStyle = '#fff0f6';
    for (let k = 0.2; k < 0.95; k += 0.18) {
      const px = BB.lerp(BB.lerp(x, x - sway, k), BB.lerp(x - sway, x + sway, k), k), py = BB.lerp(BB.lerp(base, base - h.h * 0.5, k), BB.lerp(base - h.h * 0.5, base - h.h, k), k);
      G().circle(px + 5, py, 2.4, c); c.fill();
    }
  }

  // tiny sad face used on bouncers and floaters
  function sadFace(c, s) {
    c.fillStyle = '#3a2a3a';
    G().circle(-3 * s, -1 * s, 1.1 * s, c); c.fill(); G().circle(3 * s, -1 * s, 1.1 * s, c); c.fill();
    c.strokeStyle = '#3a2a3a'; c.lineWidth = 1 * s; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 3.4 * s, 2 * s, Math.PI + 0.5, -0.5); c.stroke();
  }

  function drawSprite(c, h, x, y, t) {
    c.save();
    c.translate(x, y);
    const col = SPRITE_COL[h.sprite];
    switch (h.sprite) {
      case 'feather': {
        c.rotate(Math.sin(h.t * 0.06) * 0.6);
        c.fillStyle = '#ffffff'; c.strokeStyle = '#a8a8c8'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(0, 0, 5, 13, 0.2, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(0, -12); c.lineTo(1, 14); c.stroke();
        break;
      }
      case 'crystal':
        c.fillStyle = '#bfe6ff'; c.strokeStyle = '#5a6fc0'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(-6, -12); c.lineTo(6, -12); c.lineTo(0, 13); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(-2, -10, 2, 12);
        break;
      case 'honey': case 'tear': case 'water': {
        const k = h.sprite === 'honey' ? ['#ffc34a', '#b87a14'] : ['#9fd0ff', '#4a8ad0'];
        c.fillStyle = k[0]; c.strokeStyle = k[1]; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(0, -13); c.quadraticCurveTo(10, 3, 0, 11); c.quadraticCurveTo(-10, 3, 0, -13); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)'; G().ellipse(-3, 2, 2, 3.5, 0, c); c.fill();
        break;
      }
      case 'acorn':
        c.rotate(h.t * 0.05);
        c.fillStyle = '#c0843a'; G().ellipse(0, 2, 8, 10, 0, c); c.fill();
        c.fillStyle = '#6a4a24'; c.beginPath(); c.ellipse(0, -3, 9.5, 5, 0, Math.PI, 0); c.fill();
        c.fillRect(-1, -11, 2, 4);
        break;
      case 'star':
        c.strokeStyle = 'rgba(255,240,180,0.5)'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, -4); c.lineTo(-10, -30); c.stroke();
        c.rotate(h.t * 0.08);
        c.fillStyle = '#ffe27a'; c.strokeStyle = '#c28a14'; c.lineWidth = 1.2;
        G().star(0, 0, 12, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
        break;
      case 'dust':
        c.fillStyle = 'rgba(216,184,144,0.9)';
        for (let i = 0; i < 4; i++) { G().circle(Math.cos(i * 1.6 + h.t * 0.1) * 6, Math.sin(i * 1.6 + h.t * 0.1) * 5, 7, c); c.fill(); }
        c.save(); c.translate(0, 0); sadFace(c, 1); c.restore();
        break;
      case 'bamboo':
        c.rotate(h.spin);
        c.fillStyle = '#8ac86a'; c.strokeStyle = '#4a8a3a'; c.lineWidth = 1.2;
        G().rrect(-4, -14, 8, 28, 3, c); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke();
        break;
      case 'spore': case 'snowball': case 'mochi': {
        const sq = h.sq || 0;
        c.scale(1 + sq * 0.25, 1 - sq * 0.25);
        const k = { spore: ['#c8b0e0', '#7a5a9a'], snowball: ['#ffffff', '#8aa8d0'], mochi: ['#fff0f4', '#e0a0b8'] }[h.sprite];
        const g = c.createRadialGradient(-4, -5, 2, 0, 0, h.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, k[0]);
        c.fillStyle = g; c.strokeStyle = k[1]; c.lineWidth = 1.5;
        G().circle(0, 0, h.r, c); c.fill(); c.stroke();
        if (h.sprite === 'spore') { c.fillStyle = 'rgba(122,90,154,0.5)'; for (let i = 0; i < 5; i++) { G().circle(Math.cos(i * 1.3) * 8, Math.sin(i * 1.3) * 8, 2, c); c.fill(); } }
        if (h.sprite === 'mochi') { c.fillStyle = 'rgba(255,160,190,0.6)'; G().ellipse(-7, 3, 2.5, 1.5, 0, c); c.fill(); G().ellipse(7, 3, 2.5, 1.5, 0, c); c.fill(); }
        sadFace(c, 1.2);
        break;
      }
      case 'zbubble': {
        const r = h.r + Math.sin(h.t * 0.08) * 2;
        c.fillStyle = 'rgba(210,235,255,0.45)'; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2;
        G().circle(0, 0, r, c); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)'; G().circle(-r * 0.4, -r * 0.4, 3, c); c.fill();
        G().text('z', 0, 1, 16, '#6a7ab8', null);
        break;
      }
      case 'cloudlet': case 'ink': case 'drone': {
        const bob = Math.sin(h.t * 0.1) * 2;
        c.translate(0, bob);
        if (h.sprite === 'cloudlet') {
          c.fillStyle = '#b8bccc'; c.strokeStyle = 'rgba(60,60,90,0.5)'; c.lineWidth = 1;
          c.beginPath(); c.arc(-7, 2, 7, 0, TAU); c.arc(0, -3, 9, 0, TAU); c.arc(8, 2, 7, 0, TAU); c.fill();
          c.fillRect(-11, 1, 22, 8);
          c.strokeStyle = 'rgba(120,170,255,0.8)'; c.lineWidth = 1.2;
          for (let i = 0; i < 3; i++) { const ph = (h.t * 0.08 + i * 0.37) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.moveTo(-6 + i * 6, 10 + ph * 8); c.lineTo(-7 + i * 6, 13 + ph * 8); c.stroke(); }
          c.globalAlpha = 1;
          c.translate(0, 1); sadFace(c, 1.1);
        } else if (h.sprite === 'ink') {
          const g = c.createRadialGradient(-4, -5, 2, 0, 0, h.r);
          g.addColorStop(0, '#c8a8e8'); g.addColorStop(1, '#6a4a88');
          c.fillStyle = g; G().circle(0, 0, h.r, c); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, h.r - 3, 3.6, 4.6); c.stroke();
          c.fillStyle = '#fff'; sadFace(c, 1.1);
        } else {
          // a small grumpy bee drone
          const f = Math.sin(h.t * 0.9) * 0.5;
          c.fillStyle = 'rgba(230,245,255,0.8)';
          c.save(); c.rotate(-0.4 + f); G().ellipse(-4, -9, 6, 4, 0, c); c.fill(); c.restore();
          c.save(); c.rotate(0.4 - f); G().ellipse(4, -9, 6, 4, 0, c); c.fill(); c.restore();
          c.fillStyle = '#d8c060'; c.strokeStyle = '#5a4a2a'; c.lineWidth = 1.2;
          G().ellipse(0, 0, 11, 9, 0, c); c.fill(); c.stroke();
          c.fillStyle = '#5a4a2a'; c.fillRect(-3, -8, 3, 16); c.fillRect(4, -7, 2.5, 14);
          sadFace(c, 0.9);
        }
        break;
      }
      case 'note': case 'ripple': case 'splash': case 'sand': case 'crescent': {
        // ground waves: a rolling bump with a little crest
        const w = h.w, hh = h.h;
        const sq = 0.85 + Math.sin(h.t * 0.3) * 0.15;
        c.fillStyle = BB.rgba(col, 0.75);
        c.strokeStyle = BB.rgba(BB.mix(col, '#3a3a6a', 0.4), 0.9); c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-w / 2 - 6, 0);
        c.quadraticCurveTo(-w / 4, -hh * sq * 1.2, h.dir * 6, -hh * sq);
        c.quadraticCurveTo(w / 4, -hh * sq * 0.5, w / 2 + 6, 0);
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)';
        G().circle(h.dir * 6, -hh * sq + 3, 3, c); c.fill();
        if (h.sprite === 'note') {
          c.fillStyle = '#5a6ab8';
          G().ellipse(h.dir * 2 - 3, -hh - 8, 4, 3, -0.3, c); c.fill();
          c.fillRect(h.dir * 2, -hh - 22, 1.6, 14);
        } else if (h.sprite === 'crescent') {
          G().drawGlow(0, -hh / 2, 30, '#d8c8ff', 0.5, c);
        } else if (h.sprite === 'splash') {
          for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(230,250,255,0.9)'; G().circle(-8 + i * 8, -hh - 3 - Math.abs(Math.sin(h.t * 0.2 + i)) * 5, 2.2, c); c.fill(); }
        }
        c.save(); c.translate(0, -hh * 0.45); sadFace(c, 0.9); c.restore();
        break;
      }
    }
    c.restore();
  }

  // ──── Picture HUD while a boss is gloomy: its face and its clouds ────
  function drawBossHUD(c, b, t) {
    const W0 = G().W;
    const n = b.D.clouds;
    const w = 90 + n * 44;
    const x0 = W0 - 118 - w, y0 = 12;
    c.fillStyle = 'rgba(30,20,50,0.4)';
    G().rrect(x0, y0, w, 44, 22, c); c.fill();
    c.save();
    c.beginPath(); c.arc(x0 + 30, y0 + 22, 20, 0, TAU); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x0 + 8, y0, 44, 44);
    BB.BossArt.draw(c, b.kind, x0 + 30, y0 + 30, 0.55, { t, mood: mood(b), facing: 1, pose: 'sulk', blink: 0 });
    c.restore();
    for (let i = 0; i < n; i++) {
      const cx = x0 + 74 + i * 44, cy = y0 + 20;
      if (i < b.clouds) BB.Critters.moodCloud(c, cx, cy, 0.8, t + i * 20, 1.35);
      else BB.Critters.rainbow(c, cx, cy + 2, 1, 1.2);
    }
  }

  BB.Bosses = {
    DEFS, create, update, draw, target, hazardTargets, updateHazards, drawHazards, drawBossHUD, calm, reset, clear,
    get hazards() { return hazards; },
    mood,
  };
})(window.BB);
