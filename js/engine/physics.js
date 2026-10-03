// ════════════════════════════════════════════════════════════════
//  PHYSICS — the kitten's movement, as one pure function.
//
//  `step(body, input, abilities)` advances one 60 Hz tick against
//  BB.World. It never touches audio, particles or the DOM, so the exact
//  same code runs in the browser and inside tools/verify-world.js, which
//  proves every room is traversable with the real movement rules.
//
//  Kid-friendly assists baked in:
//   • coyote time + jump buffering
//   • ledge assist: arriving a little low against a ledge pops you on top
//   • corner slip: bonking your head on a corner slides you around it
//   • variable jump: tap for a hop, hold to soar
//
//  Powers (abilities object):
//   doubleJump  jump again in mid-air            (Butterfly Elder)
//   wallClimb   hold towards a wall to climb     (Snail Elder) — not ice `I`
//   glow        glow-petals `:` become solid     (Firefly Elder)
//   float       hold jump while falling to glide (Dandelion Elder)
//   swim        water `~` is safe: hold jump to swim up, and you leap out
//               at the surface                   (Sea Turtle Elder)
//   dig         sandstone `X` crumbles away      (Tortoise Elder)
//   spring      much higher jumps                (Snow Hare Elder)
//   rings       step into a fairy ring `1`–`9` to pop out at its twin
//                                                (Badger Elder)
//   bubbleBounce  press bubble in mid-air to bounce off a big bubble
//                                                (Otter Elder)
//   wings       keep pressing jump to flap higher and higher (Star Whale)
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const W = () => BB.World;

  // Event flags returned in body.fx each tick
  const FX = BB.FX = {
    JUMP: 1, DJUMP: 2, LAND: 4, BOUNCE: 8, WALLJUMP: 16, HAZARD: 32,
    CLIMB_START: 64, LEDGE: 128, BONK: 256, UPDRAFT: 512,
    PORTAL: 1024, BBOUNCE: 2048, FLAP: 4096, SPLASH: 8192, BREACH: 16384,
  };

  // Powers in effect for the current step (sandstone solidity depends on them)
  let AB = {};
  let EASY = false;
  const landingXs = p => EASY
    ? [p.x - C.EASY_EDGE_GRACE, p.x + p.w / 2, p.x + p.w + C.EASY_EDGE_GRACE]
    : [p.x + 2, p.x + p.w / 2, p.x + p.w - 2];
  const outsideFoot = (p, px) => px < p.x || px >= p.x + p.w;
  // Extra edge reach applies to an exposed top, never a tile down the
  // side of a wall (which would create invisible stairs without claws).
  const exposedEdge = (p, px, ty) => !outsideFoot(p, px) || !solidSide(W().tile(Math.floor(px / T), ty - 1));

  // ── Tile classification ──
  // side/ceiling solidity: out-of-world counts as a wall (invisible edge)
  function solidSide(ch) {
    return ch === '#' || ch === 'M' || ch === 'G' || ch === 'I' || ch === null || (ch === 'X' && !AB.dig);
  }
  // What your feet can stand on. Out-of-world is air, so open pits drop
  // you into the dandelion rescue rather than onto an invisible floor.
  function landKind(ch, ab) {
    if (ch === '#' || ch === 'G' || ch === 'I') return 1; // solid
    if (ch === 'X') return ab.dig ? 0 : 1;           // sandstone (crumbles with Mighty Paws)
    if (ch === 'M') return 3;                        // bouncy
    if (ch === '-') return 2;                        // one-way
    if (ch === ':') return ab.glow ? 2 : 0;          // glow petal
    return 0;
  }
  const isPortal = ch => ch !== null && ch >= '1' && ch <= '9';
  // Water is only dangerous before the Sea Turtle's gift; mist always is.
  const hazardous = (ch, ab) => ch === '%' || (ch === '~' && !ab.swim);

  function sideAt(px, py) { return solidSide(W().tile(Math.floor(px / T), Math.floor(py / T))); }

  // Is any solid tile overlapping the rectangle?
  function rectSolid(x, y, w, h) {
    const tx0 = Math.floor(x / T), tx1 = Math.floor((x + w - 0.01) / T);
    const ty0 = Math.floor(y / T), ty1 = Math.floor((y + h - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (solidSide(W().tile(tx, ty))) return true;
      }
    }
    return false;
  }

  function newBody(x, y) {
    return {
      x, y, vx: 0, vy: 0, w: C.PW, h: C.PH,
      facing: 1, grounded: false, groundKind: 0,
      coyote: 0, jumpBuf: 0, djUsed: false, bouncing: false,
      climbing: 0, climbPush: 0, wallLock: 0, floating: false, inUpdraft: false,
      airTicks: 0, fx: 0, lastSafe: { x, y },
      bbUsed: false, inWater: false, inPortal: true,
    };
  }

  // Climbable wall directly beside the body on side `dir` (mid and upper
  // body). Ice is too slippery for sticky paws.
  function wallBeside(p, dir) {
    const x = dir > 0 ? p.x + p.w + 1 : p.x - 1;
    const grip = py => { const ch = W().tile(Math.floor(x / T), Math.floor(py / T)); return solidSide(ch) && ch !== 'I'; };
    return grip(p.y + p.h * 0.5) || grip(p.y + 4);
  }

  function step(p, inp, ab, easy = false) {
    AB = ab;
    EASY = easy;
    p.fx = 0;
    const wasGrounded = p.grounded;
    const wasInWater = p.inWater;
    const cx0 = p.x + p.w / 2;
    p.inWater = !!ab.swim && W().tile(Math.floor(cx0 / T), Math.floor((p.y + p.h / 2) / T)) === '~';
    const swim = p.inWater;

    // ── Horizontal intent ──
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (p.wallLock > 0) { p.wallLock--; if (dir === -p.facing) dir = 0; }
    const target = dir * C.RUN * (swim ? C.SWIM_SPEED : 1);
    let acc;
    if (swim) acc = dir ? 0.4 : 0.25;
    else if (p.grounded) acc = dir ? C.ACC_GROUND : C.DEC_GROUND;
    else acc = dir ? (easy ? C.EASY_ACC_AIR : C.ACC_AIR) : (easy ? C.EASY_DEC_AIR : C.DEC_AIR);
    // turning around is always crisp
    if (dir && BB.sign(p.vx) === -dir) acc *= 1.6;
    p.vx = BB.approach(p.vx, target, acc);
    if (dir && !p.climbing) p.facing = dir;

    // ── Timers ──
    if (p.grounded) { p.coyote = easy ? C.EASY_COYOTE : C.COYOTE; p.airTicks = 0; } else { if (p.coyote > 0) p.coyote--; p.airTicks++; }
    if (inp.jumpPressed) p.jumpBuf = easy ? C.EASY_BUFFER : C.BUFFER; else if (p.jumpBuf > 0) p.jumpBuf--;
    if (swim) p.jumpBuf = 0; // underwater, holding jump swims instead

    // ── Wall climbing (Snail Elder) ──
    if (ab.wallClimb && !swim && dir && wallBeside(p, dir) && !(p.grounded && inp.jump)) {
      p.climbPush++;
      if (p.climbPush >= (p.grounded ? C.CLIMB_DELAY : 1)) {
        if (!p.climbing) p.fx |= FX.CLIMB_START;
        p.climbing = dir;
        p.facing = dir;
      }
    } else {
      p.climbPush = 0;
      p.climbing = 0;
    }

    // ── Jumps ──
    if (p.jumpBuf > 0 && p.climbing) {
      // kick off the wall
      p.vy = C.JUMP * 0.92;
      p.vx = -p.climbing * C.WALLJUMP_X;
      p.facing = -p.climbing;
      p.wallLock = C.WALLJUMP_LOCK;
      p.climbing = 0; p.climbPush = -12;
      p.jumpBuf = 0; p.coyote = 0; p.bouncing = false; p.djUsed = false;
      p.fx |= FX.WALLJUMP;
    } else if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0)) {
      p.vy = ab.spring ? C.JUMP_SPRING : C.JUMP;
      p.grounded = false; p.coyote = 0; p.jumpBuf = 0; p.bouncing = false;
      p.fx |= FX.JUMP;
    } else if (inp.jumpPressed && !p.grounded && !swim && ab.doubleJump && !p.djUsed && p.airTicks > 2) {
      p.vy = C.DJUMP;
      p.djUsed = true; p.jumpBuf = 0; p.bouncing = false;
      p.fx |= FX.DJUMP;
    } else if (inp.jumpPressed && !p.grounded && !swim && ab.wings && p.airTicks > 2) {
      // Star Wings: every further press is another flap
      p.vy = Math.min(p.vy, C.FLAP);
      p.jumpBuf = 0; p.bouncing = false;
      p.fx |= FX.FLAP;
    }
    // Bubble Bounce: blow a big bubble under your paws and spring off it
    if (inp.bubblePressed && ab.bubbleBounce && !p.grounded && !swim && !p.climbing && !p.bbUsed && p.airTicks > 2) {
      p.vy = C.BUBBLE_BOUNCE;
      p.bbUsed = true; p.bouncing = true;
      p.fx |= FX.BBOUNCE;
    }

    // ── Vertical forces ──
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    p.inUpdraft = W().tile(Math.floor(cx / T), Math.floor(cy / T)) === '^';
    p.floating = false;
    if (swim) {
      // paddle: hold jump to swim up, let go to drift gently down
      p.vy = inp.jump ? BB.approach(p.vy, C.SWIM_UP, 0.35) : BB.approach(p.vy, C.SWIM_SINK, 0.15);
      p.djUsed = false; p.bbUsed = false; p.bouncing = false;
    } else if (p.climbing) {
      p.vy = -C.CLIMB;
      p.djUsed = false; p.bbUsed = false;
    } else if (p.inUpdraft) {
      p.vy = BB.approach(p.vy, C.UPDRAFT, C.UPDRAFT_ACC);
      p.bouncing = true;       // keep full rise after leaving the breeze
      p.djUsed = false; p.bbUsed = false;
      p.fx |= FX.UPDRAFT;
    } else {
      let g;
      if (p.vy < 0) g = (inp.jump || p.bouncing) ? C.G_UP : C.G_CUT;
      else { g = easy && p.vy < 1.6 && !p.grounded ? C.EASY_APEX_GRAVITY : C.G_DOWN; p.bouncing = false; }
      p.vy += g;
      if (ab.float && inp.jump && p.vy > C.FLOAT_FALL && !p.grounded) {
        p.vy = BB.approach(p.vy, C.FLOAT_FALL, 1.2);
        p.floating = true;
      }
      if (p.vy > C.MAX_FALL) p.vy = C.MAX_FALL;
    }

    // ── Integrate in small sub-steps so fast bounces never tunnel ──
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy)) / 7));
    p.grounded = false;
    for (let i = 0; i < n; i++) {
      moveX(p, p.vx / n);
      moveY(p, p.vy / n, ab);
    }
    // Standing check (stay grounded while resting)
    if (!p.grounded && p.vy >= 0) {
      const k = feetKind(p, p.y + p.h + 1, ab, true);
      if (k === 1 || k === 2) { p.grounded = true; p.groundKind = k; }
    }
    if (p.grounded) {
      p.djUsed = false; p.bbUsed = false;
      p.climbing = 0;
      if (!wasGrounded) p.fx |= FX.LAND;
    }

    // ── Water entry / dolphin leap out of the surface ──
    const ncx = p.x + p.w / 2;
    const nowWater = !!ab.swim && W().tile(Math.floor(ncx / T), Math.floor((p.y + p.h / 2) / T)) === '~';
    if (nowWater && !wasInWater) p.fx |= FX.SPLASH;
    if (wasInWater && !nowWater && inp.jump && p.vy < 0) {
      p.vy = C.JUMP * 0.85; p.bouncing = false;
      p.fx |= FX.BREACH;
    }
    p.inWater = nowWater;

    // ── Fairy rings ──
    const here = W().tile(Math.floor(ncx / T), Math.floor((p.y + p.h / 2) / T));
    if (isPortal(here)) {
      if (ab.rings && !p.inPortal) {
        const twin = W().portalTwin(Math.floor(ncx / T), Math.floor((p.y + p.h / 2) / T));
        if (twin) {
          p.x = twin.tx * T + (T - p.w) / 2;
          p.y = (twin.ty + 1) * T - p.h;
          p.vx = 0; p.vy = 0;
          p.fx |= FX.PORTAL;
        }
      }
      p.inPortal = true;
    } else p.inPortal = false;

    // ── Safety & rescue ──
    const room = W().roomAtPx(p.x + p.w / 2, p.y + p.h / 2);
    const feetTile = W().tile(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h - 6) / T));
    if (!room || hazardous(feetTile, ab)) {
      p.fx |= FX.HAZARD;
    } else if (p.grounded && p.groundKind === 1 && isSafeFooting(p, ab)) {
      p.lastSafe.x = p.x; p.lastSafe.y = p.y;
    }
    return p.fx;
  }

  // Both feet on firm ground, and no water right next to us.
  function isSafeFooting(p, ab) {
    const fy = Math.floor((p.y + p.h + 1) / T);
    const l = Math.floor((p.x + 1) / T), r = Math.floor((p.x + p.w - 1) / T);
    for (let tx = l - 1; tx <= r + 1; tx++) {
      const a = W().tile(tx, fy - 1), b = W().tile(tx, fy);
      if (a === '~' || b === '~' || a === '%' || b === '%') return false;
    }
    return landKind(W().tile(l, fy), ab) === 1 && landKind(W().tile(r, fy), ab) === 1;
  }

  // Strongest landing surface under the feet at world y `fy`.
  function feetKind(p, fy, ab, resting) {
    const ty = Math.floor(fy / T);
    let best = 0;
    for (const px of landingXs(p)) {
      if (!exposedEdge(p, px, ty) || (resting && outsideFoot(p, px) && Math.abs(p.y + p.h - ty * T) > 1.5)) continue;
      const k = landKind(W().tile(Math.floor(px / T), ty), ab);
      if (k === 1) return 1;
      if (k > best) best = k;
    }
    // resting on a one-way/bouncy only counts if our feet are exactly on top
    if (resting && best && Math.abs((p.y + p.h) - ty * T) > 1.5) return 0;
    return best;
  }

  function moveX(p, dx) {
    if (!dx) return;
    const nx = p.x + dx;
    const edge = dx > 0 ? nx + p.w : nx;
    const tx = Math.floor((dx > 0 ? edge - 0.01 : edge) / T);
    const ty0 = Math.floor((p.y + 1) / T), ty1 = Math.floor((p.y + p.h - 0.5) / T);
    let hitTop = Infinity;
    for (let ty = ty0; ty <= ty1; ty++) {
      if (solidSide(W().tile(tx, ty))) { hitTop = Math.min(hitTop, ty * T); break; }
    }
    if (hitTop === Infinity) { p.x = nx; return; }

    // Ledge assist: only our feet clipped the ledge → hop up onto it.
    const feet = p.y + p.h;
    if (feet - hitTop <= (EASY ? C.EASY_LEDGE_ASSIST : C.LEDGE_ASSIST) && p.vy > -3 && !rectSolid(nx, hitTop - p.h, p.w, p.h)) {
      p.y = hitTop - p.h;
      p.x = nx;
      if (p.vy > 0) p.vy = 0;
      p.fx |= FX.LEDGE;
      return;
    }
    p.x = dx > 0 ? tx * T - p.w : (tx + 1) * T;
    p.vx = 0;
  }

  function moveY(p, dy, ab) {
    if (!dy) return;
    if (dy > 0) {
      const oldFeet = p.y + p.h;
      const newFeet = oldFeet + dy;
      const ty = Math.floor((newFeet - 0.01) / T);
      const top = ty * T;
      let kind = 0;
      if (newFeet > top) {
        for (const px of landingXs(p)) {
          if (!exposedEdge(p, px, ty) || (outsideFoot(p, px) && oldFeet > top + 0.01)) continue;
          const k = landKind(W().tile(Math.floor(px / T), ty), ab);
          if (!k) continue;
          if (k === 2 && oldFeet > top + 0.01) continue;     // one-way: only from above
          if (k === 3 && oldFeet > top + 0.01) continue;
          if (k === 1) { kind = 1; break; }
          if (k > kind || kind === 0) kind = k;
        }
      }
      if (kind) {
        p.y = top - p.h;
        if (kind === 3) {
          p.vy = C.BOUNCE; p.bouncing = true; p.djUsed = false;
          p.fx |= FX.BOUNCE;
        } else {
          p.vy = 0; p.grounded = true; p.groundKind = kind;
        }
        return;
      }
      p.y += dy;
    } else {
      const ny = p.y + dy;
      const ty = Math.floor(ny / T);
      const l = p.x + 1, r = p.x + p.w - 1;
      const hitL = solidSide(W().tile(Math.floor(l / T), ty));
      const hitR = solidSide(W().tile(Math.floor(r / T), ty));
      const hitM = solidSide(W().tile(Math.floor((p.x + p.w / 2) / T), ty));
      if (!hitL && !hitR && !hitM) { p.y = ny; return; }
      // Corner slip: only one corner bonked → slide around it
      if (hitL && !hitR && !hitM) {
        const push = (Math.floor(l / T) + 1) * T - p.x;
        if (push <= (EASY ? C.EASY_CORNER_SLIP : C.CORNER_SLIP) && !rectSolid(p.x + push, ny, p.w, p.h)) { p.x += push; p.y = ny; return; }
      }
      if (hitR && !hitL && !hitM) {
        const push = p.x + p.w - Math.floor(r / T) * T;
        if (push <= (EASY ? C.EASY_CORNER_SLIP : C.CORNER_SLIP) && !rectSolid(p.x - push, ny, p.w, p.h)) { p.x -= push; p.y = ny; return; }
      }
      p.y = (ty + 1) * T;
      p.vy = 0;
      p.bouncing = false;
      p.fx |= FX.BONK;
    }
  }

  BB.Physics = {
    step, newBody, landKind, solidSide, rectSolid, isSafeFooting, isPortal, hazardous,
    setAbilities(ab) { AB = ab; },
  };
})(window.BB);
