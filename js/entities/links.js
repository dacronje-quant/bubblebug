// ════════════════════════════════════════════════════════════════
//  LINKS — the ways between places that aren't just walking off a room's
//  edge. The Cat House connects to the ring through its neighbourhood:
//
//   h      a cat flap: two in every zone, one near its start (in Sparkle
//          Gardens it's the garden gate) and one by its boss. Stand in one
//          for a moment and you pop home, next to that zone's door. Just
//          walking past a flap lights its door up at home, and the door
//          always opens at the furthest flap you've reached in that zone.
//   doors  the door hall in the Cat House (its room's `doors`): one door
//          per zone, glowing once its flap has been found. Stand in a lit
//          door to go back to that zone's flap. Door 0 is a physical front
//          door: walk through it into the garden without a teleport.
//   u / v  the Rainbow Lift: from the far end of Cloud Castles round to
//          the Coral Lagoon's beach, and back. Stand still, then whoosh!
//   F      (in things.js) the Starfall float past the Moon Rabbit: a
//          dandelion drift down the Starfall Shaft, home to the rainbow door.
//
//  Doorways need you to stand still in them (a paw ring fills up), so a
//  little player never pops somewhere by accident.
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
  const HOLD = C.INTERACT_HOLD;

  const home = () => W().rooms.find(r => r.def.home);
  function floorBelow(tx, ty) {
    let y = ty;
    while (y < ty + 30) { if (BB.Physics.landKind(W().tile(tx, y + 1), { glow: true })) break; y++; }
    return (y + 1) * T;
  }
  // a doorway's standing spot, in world px (kitten centred on the tile)
  const spot = (tx, ty) => ({ x: tx * T + T / 2, y: floorBelow(tx, ty), tx, ty });

  // a zone's cat flaps in the order you meet them (one near its start, one
  // by its boss)
  const FLAPS = {};
  function flapTiles(zone) {
    if (!FLAPS[zone]) {
      const out = [];
      for (const r of W().rooms) if (r.zone === zone) for (const t of r.things) if (t.ch === 'h') out.push({ t, r });
      // along the story, then onward inside a room
      FLAPS[zone] = out.sort((a, b) => BB.storyIndex(a.r) - BB.storyIndex(b.r) || (a.t.tx - b.t.tx) * BB.roomDir(a.r)).map(o => o.t);
    }
    return FLAPS[zone];
  }
  const flapTile = (zone, i = 0) => flapTiles(zone)[i] || null;
  const flapIndex = (zone, t) => flapTiles(zone).findIndex(f => f.tx === t.tx && f.ty === t.ty);
  // a zone's door opens at the furthest flap reached (save.doors[zone] = how many)
  // the flap in a boss arena only opens once that boss is happy again
  const flapBossRoom = t => { const r = W().roomAtTile(t.tx, t.ty); return r && r.def.arena ? r.id : null; };
  const flapOpen = (zone, i, save) => { const t = flapTiles(zone)[i]; if (!t) return false; const br = flapBossRoom(t); return !br || !!(save.bosses || {})[br]; };
  function doorFlap(zone, save) {
    for (let i = Math.min(flapTiles(zone).length, (save.doors || {})[zone] || 1) - 1; i > 0; i--) if (flapOpen(zone, i, save)) return i;
    return 0;
  }
  function doorTile(zone) {
    const h = home();
    const d = h && h.def.doors && h.def.doors[zone];
    return d ? { tx: h.x + d[1], ty: h.y + d[0] } : null;
  }
  function liftTile(ch) { for (const t of W().findThings(ch)) return t; return null; }
  // the Starfall float lands by the rainbow door, at the living room's west end
  function landingTile() {
    const h = home();
    return h ? { tx: h.x + 5, ty: h.y + 31 } : null;
  }
  function skylightTile() {
    const h = home();
    return h ? { tx: h.x + h.def.skylight[1], ty: h.y + h.def.skylight[0] } : null;
  }

  // ──── Entities ────
  function create(thing, room, save) {
    const s = spot(thing.tx, thing.ty);
    if (thing.ch === 'h') return { type: 'flap', link: true, zone: room.zone, idx: Math.max(0, flapIndex(room.zone, thing)), room: room.id, bossRoom: room.def.arena ? room.id : null, x: s.x, y: s.y, t: 0, hold: 0 };
    if (thing.ch === 'u' || thing.ch === 'v') return { type: 'lift', link: true, end: thing.ch, zone: room.zone, room: room.id, x: s.x, y: s.y, t: 0, hold: 0 };
    return null;
  }
  // the door hall's doors live in the Cat House room definition
  function hallDoors(room) {
    const out = [];
    for (const [z, rc] of Object.entries(room.def.doors || {})) {
      const s = spot(room.x + rc[1], room.y + rc[0]);
      out.push({ type: 'door', link: true, zone: +z, front: +z === 0, walkOut: +z === 0 && !!room.def.walkOut, room: room.id, x: s.x, y: s.y, t: Math.random() * 100, hold: 0 });
    }
    return out;
  }

  const unlocked = (th, save) => th.front || !!(save.doors || {})[th.zone];
  function standingIn(th, pl, r) {
    const b = pl.body;
    return pl.state === 'play' && b.grounded && Math.abs(b.x + b.w / 2 - th.x) < r && Math.abs(b.y + b.h - th.y) < 6;
  }

  function update(th, ctx) {
    th.t++;
    const pl = ctx.pl, b = pl.body, save = ctx.save;
    const near = Math.hypot(b.x + b.w / 2 - th.x, b.y + b.h - th.y);
    const locked = ctx.linkLocked(th);
    if (th.type === 'flap') {
      // (shut tight until the boss here is happy)
      if (th.bossRoom && !(save.bosses || {})[th.bossRoom]) { th.hold = 0; th.shut = true; return; }
      if (th.shut) { th.shut = false; th.opened = 40; }
      if (th.opened > 0) th.opened--;
      if (near < 90 && ((save.doors || {})[th.zone] || 0) < th.idx + 1) ctx.onFlapFound(th);
      const still = standingIn(th, pl, 18) && Math.abs(b.vx) < 0.3 && !locked;
      th.hold = still ? th.hold + 1 : 0;
      if (th.hold >= HOLD) { th.hold = 0; ctx.travel(doorSpot(th.zone), 'home', th); }
    } else if (th.type === 'door') {
      // The front door is a physical opening into the Front Garden.
      // Other doors keep their convenient travel to discovered cat flaps.
      if (th.walkOut) { th.hold = 0; return; }
      const ok = unlocked(th, save);
      const still = ok && standingIn(th, pl, 18) && Math.abs(b.vx) < 0.3 && !locked;
      th.hold = still ? th.hold + 1 : 0;
      if (th.hold >= HOLD) { th.hold = 0; ctx.travel(flapSpot(th.zone, doorFlap(th.zone, save)), th.front ? 'out' : 'door', th); }
    } else if (th.type === 'lift') {
      const still = !locked && standingIn(th, pl, 22) && Math.abs(b.vx) < 0.3;
      th.hold = still ? th.hold + 1 : 0;
      if (th.hold >= HOLD) {
        th.hold = 0;
        const other = liftTile(th.end === 'u' ? 'v' : 'u');
        if (other) ctx.travel(spot(other.tx, other.ty), th.end === 'u' ? 'liftUp' : 'liftDown', th);
      }
    }
  }
  const doorSpot = z => { const d = doorTile(z); return d ? spot(d.tx, d.ty) : null; };
  const flapSpot = (z, i = 0) => { const f = flapTile(z, i); return f ? spot(f.tx, f.ty) : null; };

  // ──── Drawing ────
  function holdRing(c, x, y, k) {
    if (k <= 0) return;
    c.save();
    c.fillStyle = 'rgba(255,248,232,0.96)'; G().circle(x, y, 19, c); c.fill();
    c.strokeStyle = '#d6cadc'; c.lineWidth = 5;
    c.beginPath(); c.arc(x, y, 13, 0, TAU); c.stroke();
    c.strokeStyle = '#ffd84a'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
    BB.Gestures.drawPaw(c, x, y + 1, 0.42, '#ffd84a', '#b8860b');
    c.restore();
  }

  // Active waits belong in the foreground, above the kitten and hats.
  function drawProgress(c, th, cam, ctx) {
    if (!(th.hold > 0)) return;
    if (th.type === 'door' && !unlocked(th, ctx.save)) return;
    if (th.type === 'flap' && th.bossRoom && !(ctx.save.bosses || {})[th.bossRoom]) return;
    const offset = th.type === 'flap' ? 130 : th.type === 'door' && !th.front ? 150 : 96;
    if (th.type === 'flap' || th.type === 'door' || th.type === 'lift')
      holdRing(c, th.x - cam.x, th.y - cam.y - offset, th.hold / HOLD);
  }

  // "stand here!": an empty paw ring that pulses
  function hintRing(c, x, y, t) {
    const k = 0.5 + 0.5 * Math.sin(t * 0.12);
    c.save();
    c.globalAlpha = 0.55 + 0.35 * k;
    c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.setLineDash([6, 5]); c.lineDashOffset = -t * 0.4;
    c.beginPath(); c.arc(x, y, 14 + k * 2, 0, TAU); c.stroke();
    c.setLineDash([]);
    BB.Gestures.drawPaw(c, x, y + 1, 0.45, '#ffd84a', '#b8860b');
    c.restore();
  }
  // a big bouncing arrow pointing down at something (flip = pointing up)
  function arrow(c, x, y, t, col = '#ffd84a', flip = false) {
    const b = Math.abs(Math.sin(t * 0.12)) * -8;
    c.save(); c.translate(x, y + b); if (flip) c.scale(1, -1);
    c.fillStyle = col; c.strokeStyle = '#8a5a14'; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-9, -16); c.lineTo(9, -16); c.lineTo(9, -4); c.lineTo(16, -4); c.lineTo(0, 12); c.lineTo(-16, -4); c.lineTo(-9, -4); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  // a soft column of light with sparkles drifting up: "something's here!"
  function beacon(c, x, y, h, col, t) {
    const g = c.createLinearGradient(0, y, 0, y - h);
    g.addColorStop(0, BB.rgba(col, 0.7)); g.addColorStop(0.6, BB.rgba(col, 0.25)); g.addColorStop(1, BB.rgba(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - 32, y); c.lineTo(x - 18, y - h); c.lineTo(x + 18, y - h); c.lineTo(x + 32, y); c.closePath(); c.fill();
    G().drawGlow(x, y - 20, 60, col, 0.35 + 0.15 * Math.sin(t * 0.1), c);
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.012) + i / 4) % 1;
      c.fillStyle = `rgba(255,255,240,${Math.sin(k * Math.PI)})`;
      G().twinkle(x + Math.sin(i * 2.3 + t * 0.03) * 14, y - k * h, 2.5, c); c.fill();
    }
  }
  // the round "home" sign that floats over every way home
  function homeSign(c, x, y, t, s = 1) {
    const b = Math.sin(t * 0.06) * 3;
    c.save(); c.translate(x, y + b); c.scale(s, s);
    c.fillStyle = '#fff8e8'; c.strokeStyle = '#ff9ec7'; c.lineWidth = 3;
    G().circle(0, 0, 17, c); c.fill(); c.stroke();
    BB.HUD.zoneIcon(c, BB.HOME_ZONE, 0, 1, 0.75);
    c.restore();
  }
  // a link that's been used once needs no more arrows or "stand here" rings
  const linkKey = th => th.type === 'flap' ? 'flap' + th.zone + '_' + th.idx : th.type === 'door' ? 'door' + th.zone : th.type === 'lift' ? 'lift' : null;
  const used = (th, save) => !!(save.used || {})[linkKey(th)];
  const kittenNear = (th, ctx, r = 110) => {
    const b = ctx.pl.body;
    return Math.abs(b.x + b.w / 2 - th.x) < r && Math.abs(b.y + b.h - th.y) < 60;
  };

  // a round-topped little door with a paw on it
  function catDoor(c, x, y, w, h, col, glow, t) {
    if (glow) G().drawGlow(x, y - h / 2, h * 1.2, '#fff2b0', 0.55 + Math.sin(t * 0.08) * 0.15, c);
    c.fillStyle = '#7a4e2c'; c.strokeStyle = '#4a2e18'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - w / 2 - 4, y); c.lineTo(x - w / 2 - 4, y - h + w / 2); c.arc(x, y - h + w / 2, w / 2 + 4, Math.PI, 0); c.lineTo(x + w / 2 + 4, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h + w / 2); c.arc(x, y - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, y - h + 6); c.lineTo(x, y - 3); c.stroke();
    c.fillStyle = '#ffd84a'; G().circle(x + w / 2 - 6, y - h / 2 + 4, 2.2, c); c.fill();
    BB.Gestures.drawPaw(c, x, y - h + w / 2 + 2, 0.5, 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0.85)');
  }

  // ──── The door hall: every door dressed as its own zone ────
  // big emblem sign on top, the door painted in the zone's colours with its
  // own trimmings, and a round window looking out onto that zone's sky
  const TRIM = {
    gardens(c, w, h, t) {
      for (const [dx, dy, col] of [[-w / 2, -h * 0.5, '#ff9ec7'], [w / 2, -h * 0.35, '#ffe066'], [-w / 2, -h * 0.15, '#ffffff'], [w / 2, -h * 0.75, '#c9a6ff'], [-w / 2 + 2, -h * 0.85, '#ff8c6b']]) BB.Tiles.flower(c, dx, dy, col, 1.1);
      c.fillStyle = '#6cc24a'; for (let i = -2; i <= 2; i++) { G().ellipse(i * 8, 1, 6, 3, 0, c); c.fill(); }
    },
    meadow(c, w, h, t) {
      for (const [dx, dy] of [[-w / 2 - 2, -12], [w / 2 + 2, -18]]) {
        c.fillStyle = '#f5ead0'; c.fillRect(dx - 2, dy, 4, 12);
        c.fillStyle = '#c46ad8'; c.beginPath(); c.ellipse(dx, dy, 10, 7, 0, Math.PI, 0); c.fill();
      }
      for (let i = 0; i < 6; i++) { const a = Math.PI + i / 5 * Math.PI; G().drawGlow(Math.cos(a) * (w / 2 + 4), -h + w / 2 + Math.sin(a) * (w / 2 + 4), 8, '#7cf5d4', 0.6 + 0.3 * Math.sin(t * 0.08 + i), c); }
    },
    caves(c, w, h) { BB.Tiles.crystalCluster(c, -w / 2 - 2, 0, 0.3, 1.1); BB.Tiles.crystalCluster(c, w / 2 + 2, 0, 0.7, 0.9); },
    hive(c, w, h, t) {
      c.fillStyle = '#ffc34a';
      c.beginPath(); c.moveTo(-w / 2 - 4, -h + w / 2);
      for (let i = 0; i <= 6; i++) { const x = -w / 2 - 4 + i * (w + 8) / 6; c.lineTo(x, -h + w / 2 + 4 + (i % 2 ? 10 + Math.sin(t * 0.05 + i) * 3 : 0)); }
      c.lineTo(w / 2 + 4, -h + w / 2); c.arc(0, -h + w / 2, w / 2 + 4, 0, Math.PI, true); c.fill();
    },
    ruins(c, w, h) {
      c.strokeStyle = '#4f9e6c'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-w / 2 - 3, -h + 10); c.quadraticCurveTo(-w / 2 - 8, -h / 2, -w / 2 - 2, 0); c.stroke();
      c.fillStyle = '#6cc24a'; for (let i = 0; i < 4; i++) { G().heart(-w / 2 - 5 + (i % 2) * 5, -h + 16 + i * 14, 5, c); c.fill(); }
    },
    clouds(c, w, h) { BB.Backdrops.cloud(c, -w / 2 - 16, -6, 0.32, '#ffffff'); BB.Backdrops.cloud(c, w / 2 - 12, -h * 0.55, 0.26, '#ffffff'); },
    lagoon(c, w, h) {
      c.fillStyle = '#ff9a7a'; G().star(-w / 2 - 2, -h * 0.4, 7, 5, 0.45, -Math.PI / 2, c); c.fill();
      c.fillStyle = '#ffd0dc'; c.beginPath(); c.arc(w / 2 + 2, -10, 7, Math.PI, 0); c.fill();
      c.strokeStyle = '#c07a8a'; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(w / 2 + 2, -10); c.lineTo(w / 2 + 2 + i * 3, -16); c.stroke(); }
    },
    dunes(c, w, h) {
      c.fillStyle = '#6fbf6a'; G().rrect(w / 2 + 2, -30, 7, 30, 3, c); c.fill(); G().rrect(w / 2 + 7, -24, 8, 5, 2, c); c.fill(); G().rrect(w / 2 + 12, -30, 5, 11, 2, c); c.fill();
      c.fillStyle = '#f2c98a'; G().ellipse(0, 2, w * 0.7, 4, 0, c); c.fill();
    },
    frost(c, w, h) {
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, -h + w / 2, w / 2 + 6, Math.PI, 0); c.lineTo(w / 2 + 6, -h + w / 2 + 5); c.lineTo(-w / 2 - 6, -h + w / 2 + 5); c.fill();
      c.fillStyle = '#dff4ff'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9 - 3, -h + w / 2 + 5); c.lineTo(i * 9, -h + w / 2 + 14 + (i % 2) * 4); c.lineTo(i * 9 + 3, -h + w / 2 + 5); c.fill(); }
    },
    autumn(c, w, h) {
      for (const [dx, dy, col, a] of [[-w / 2 - 3, -h * 0.7, '#e8783a', 0.4], [w / 2 + 3, -h * 0.45, '#ffb060', -0.6], [-w / 2 - 1, -h * 0.2, '#d8442a', 1.2], [w / 2 - 2, -4, '#e8783a', 2]]) {
        c.save(); c.translate(dx, dy); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(-7, 0); c.quadraticCurveTo(0, -6, 7, 0); c.quadraticCurveTo(0, 6, -7, 0); c.fill(); c.restore();
      }
    },
    springs(c, w, h, t) {
      for (const dx of [-w / 2 - 8, w / 2 + 8]) {
        c.strokeStyle = '#6a2a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(dx, -h - 4); c.lineTo(dx, -h + 8); c.stroke();
        G().drawGlow(dx, -h + 16, 16, '#ffb070', 0.5 + 0.2 * Math.sin(t * 0.1), c);
        c.fillStyle = '#ff9a5a'; G().ellipse(dx, -h + 16, 6, 8, 0, c); c.fill();
      }
    },
    starlight(c, w, h, t) {
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i + 0.5) / 5 * Math.PI;
        c.fillStyle = '#ffe27a'; G().star(Math.cos(a) * (w / 2 + 6), -h + w / 2 + Math.sin(a) * (w / 2 + 6), 4 + Math.sin(t * 0.1 + i), 5, 0.45, -Math.PI / 2, c); c.fill();
      }
    },
  };

  function zoneDoor(c, th, x, y, t, ok, recent) {
    const Z = BB.ZONES[th.zone], w = 40, h = 66;
    c.save(); c.translate(x, y);
    if (!ok) c.globalAlpha = 0.45;
    if (recent && ok) {
      // where you were last: a glow, sparkles and a bouncing arrow
      G().drawGlow(0, -h / 2, 90, '#fff2b0', 0.55 + 0.2 * Math.sin(t * 0.1), c);
      for (let i = 0; i < 3; i++) { const a = t * 0.04 + i * 2.1; c.fillStyle = '#fff6c2'; G().twinkle(Math.cos(a) * 34, -h / 2 + Math.sin(a) * 36, 3.5, c); c.fill(); }
    } else if (ok) G().drawGlow(0, -h / 2, 60, Z.light, 0.3, c);
    // frame and door, painted in the zone's colours
    const arch = (pad) => { c.beginPath(); c.moveTo(-w / 2 - pad, 0); c.lineTo(-w / 2 - pad, -h + w / 2); c.arc(0, -h + w / 2, w / 2 + pad, Math.PI, 0); c.lineTo(w / 2 + pad, 0); c.closePath(); };
    c.fillStyle = ok ? Z.groundDark : '#5a4e56'; c.strokeStyle = 'rgba(30,20,20,0.7)'; c.lineWidth = 2;
    arch(5); c.fill(); c.stroke();
    const g = c.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, ok ? Z.top : '#8a7f86'); g.addColorStop(1, ok ? Z.ground : '#6e646a');
    c.fillStyle = g; arch(0); c.fill();
    // a round window onto that zone's sky
    const wy = -h + w / 2 + 2;
    c.save(); c.beginPath(); c.arc(0, wy, 12, 0, TAU); c.clip();
    const sg = c.createLinearGradient(0, wy - 12, 0, wy + 12);
    sg.addColorStop(0, ok ? Z.sky[0] : '#3a3440'); sg.addColorStop(1, ok ? Z.sky[2] : '#4a4450');
    c.fillStyle = sg; c.fillRect(-12, wy - 12, 24, 24);
    if (ok) { c.fillStyle = Z.far; G().ellipse(0, wy + 12, 16, 7, 0, c); c.fill(); }
    c.restore();
    c.strokeStyle = ok ? Z.accent : '#9a9098'; c.lineWidth = 3; G().circle(0, wy, 12, c); c.stroke();
    // a little paw on the door and a knob
    BB.Gestures.drawPaw(c, 0, -20, 0.55, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.7)');
    c.fillStyle = '#ffd84a'; G().circle(w / 2 - 7, -h * 0.42, 2.6, c); c.fill();
    if (ok && TRIM[Z.key]) TRIM[Z.key](c, w, h, t);
    // the big emblem sign over the door
    const sy = -h - 26 + (recent && ok ? Math.sin(t * 0.12) * 2 : 0);
    c.fillStyle = ok ? '#fff8e8' : '#cfc6cc'; c.strokeStyle = ok ? Z.accent : '#9a9098'; c.lineWidth = 3;
    G().circle(0, sy, 21, c); c.fill(); c.stroke();
    BB.HUD.zoneIcon(c, th.zone, 0, sy, 0.95);
    if (!ok) {
      // not found yet: the door's shut tight
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(60,40,50,0.8)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-w / 2 + 6, -h * 0.55); c.lineTo(w / 2 - 6, -h * 0.55); c.moveTo(-w / 2 + 6, -h * 0.3); c.lineTo(w / 2 - 6, -h * 0.3); c.stroke();
    }
    if (recent && ok && !used(th, BB.Play.save)) {
      const ay = sy - 34 + Math.sin(t * 0.15) * 4;
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#b8860b'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-8, ay - 6); c.lineTo(8, ay - 6); c.lineTo(0, ay + 4); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  }

  function draw(c, th, cam, ctx) {
    const x = th.x - cam.x, y = th.y - cam.y;
    if (x < -80 || x > G().W + 80 || y < -200 || y > G().H + 60) return;
    const t = th.t, save = ctx.save;
    if (th.type === 'flap') {
      const Z = BB.ZONES[th.zone];
      if (th.bossRoom && !(save.bosses || {})[th.bossRoom]) {
        // not yet: a little grey flap, shut, with a vine across it
        catDoor(c, x, y, 34, 50, '#9a9098', false, t);
        c.strokeStyle = '#4e9a3a'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x - 20, y - 38); c.quadraticCurveTo(x, y - 26, x + 20, y - 40); c.stroke();
        c.beginPath(); c.moveTo(x - 20, y - 14); c.quadraticCurveTo(x, y - 24, x + 20, y - 12); c.stroke();
        c.fillStyle = '#6cc24a'; for (const [lx, ly] of [[-10, -32], [8, -34], [-6, -18], [11, -16]]) { G().ellipse(x + lx, y + ly, 4, 2.4, 0.5, c); c.fill(); }
        return;
      }
      if (th.opened > 0) { G().drawGlow(x, y - 30, 90, '#fff2b0', th.opened / 40, c); PT().burst('spark', th.x, th.y - 30, 2, { color: '#fff4c2', speed: 2, life: 24 }); }
      beacon(c, x, y, 150, th.zone === 0 && th.idx === 0 ? '#ffe9a0' : Z.accent, t);
      if (th.zone === 0 && th.idx === 0) {
        // the garden gate home: a picket gate under an arch of flowers
        c.strokeStyle = '#6cc24a'; c.lineWidth = 5;
        c.beginPath(); c.arc(x, y - 36, 30, Math.PI, 0); c.stroke();
        ['#ff9ec7', '#ffe066', '#ffffff', '#c9a6ff', '#ff8c6b', '#ff9ec7', '#ffe066'].forEach((col, i) => {
          const an = Math.PI + (i + 0.5) / 7 * Math.PI;
          BB.Tiles.flower(c, x + Math.cos(an) * 30, y - 36 + Math.sin(an) * 30 + 4, col, 1.3);
        });
        c.fillStyle = '#fff4e6'; c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.8;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 10 - 4, y); c.lineTo(x + i * 10 - 4, y - 40); c.lineTo(x + i * 10, y - 46); c.lineTo(x + i * 10 + 4, y - 40); c.lineTo(x + i * 10 + 4, y); c.closePath(); c.fill(); c.stroke(); }
        c.fillRect(x - 27, y - 30, 54, 5); c.strokeRect(x - 27, y - 30, 54, 5);
        c.fillRect(x - 27, y - 12, 54, 5); c.strokeRect(x - 27, y - 12, 54, 5);
      } else {
        catDoor(c, x, y, 34, 50, BB.mix(Z.accent, '#ffffff', 0.2), true, t);
      }
      homeSign(c, x, y - 92, t, 1.15);
      if (th.hold <= 0 && !used(th, save)) {
        if (kittenNear(th, ctx)) hintRing(c, x, y - 130, t);
        else if (((save.doors || {})[th.zone] || 0) < th.idx + 1) arrow(c, x, y - 136, t); // (not found yet: look here!)
      }
    } else if (th.type === 'door') {
      const ok = unlocked(th, save);
      if (th.front) {
        // the big front door, glowing until you've gone out once
        const glow = !save.leftHome;
        if (glow) {
          // the very first way out: rays, a big glow and a bouncing arrow
          c.save(); c.globalAlpha = 0.25 + 0.1 * Math.sin(t * 0.08);
          c.fillStyle = '#fff2b0';
          for (let i = 0; i < 9; i++) {
            const an = -Math.PI / 2 + (i - 4) * 0.28 + Math.sin(t * 0.01) * 0.05;
            c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + Math.cos(an - 0.07) * 190, y - 40 + Math.sin(an - 0.07) * 190); c.lineTo(x + Math.cos(an + 0.07) * 190, y - 40 + Math.sin(an + 0.07) * 190); c.closePath(); c.fill();
          }
          c.restore();
          G().drawGlow(x, y - 40, 150, '#fff2b0', 0.6 + Math.sin(t * 0.1) * 0.25, c);
        }
        c.fillStyle = '#8a4e2c'; c.strokeStyle = '#4a2a14'; c.lineWidth = 3;
        G().rrect(x - 26, y - 78, 52, 78, 22, c); c.fill(); c.stroke();
        c.fillStyle = '#c96a4a'; G().rrect(x - 21, y - 73, 42, 73, 18, c); c.fill();
        // a round window with the sunny garden outside
        c.save(); c.beginPath(); c.arc(x, y - 54, 11, 0, TAU); c.clip();
        c.fillStyle = '#9fdcff'; c.fillRect(x - 11, y - 65, 22, 22);
        c.fillStyle = '#fff4b0'; G().circle(x + 5, y - 59, 3.5, c); c.fill();
        c.fillStyle = '#6cc24a'; G().ellipse(x, y - 44, 14, 6, 0, c); c.fill();
        c.restore();
        c.strokeStyle = '#ffe9b0'; c.lineWidth = 2.5; G().circle(x, y - 54, 11, c); c.stroke();
        c.fillStyle = '#ffd84a'; G().circle(x + 13, y - 34, 3, c); c.fill();
        // a little cat flap at the bottom
        c.fillStyle = '#a9583a'; G().rrect(x - 9, y - 18, 18, 16, 6, c); c.fill();
        if (!save.leftHome && th.hold <= 0) arrow(c, x, y - 128, t);
        if (th.walkOut) {
          // A bright open doorway and paw prints point through the wall.
          c.fillStyle = 'rgba(255,246,196,0.8)';
          G().rrect(x - 18, y - 70, 36, 70, 16, c); c.fill();
          c.strokeStyle = '#fff4b0'; c.lineWidth = 4; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x + 22, y - 32); c.lineTo(x + 46, y - 32);
          c.moveTo(x + 38, y - 40); c.lineTo(x + 46, y - 32); c.lineTo(x + 38, y - 24); c.stroke();
        }
      } else zoneDoor(c, th, x, y, t, ok, save.newDoor != null ? save.newDoor === th.zone : save.lastZone === th.zone);
      const ry = y - (th.front ? 96 : 150);
      if (ok && th.hold <= 0 && !th.walkOut && !used(th, save) && kittenNear(th, ctx, 70)) hintRing(c, x, ry, t);
    } else if (th.type === 'lift') {
      // a rainbow beam (bottom end) or a rainbow landing pool (top end)
      const cols = ['#ff7b9c', '#ffcf5c', '#fff27a', '#8fe388', '#7cc8ff', '#b99cff'];
      c.save();
      c.globalAlpha = 0.55 + Math.sin(t * 0.1) * 0.15;
      const tall = th.end === 'u' ? 260 : 60;
      cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(x - 18 + i * 6, y - tall, 6, tall); });
      c.restore();
      G().drawGlow(x, y - 20, 70, '#ffffff', 0.5, c);
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.02) + i / 3) % 1;
        c.fillStyle = `rgba(255,255,255,${1 - k})`;
        G().twinkle(x + Math.sin(i * 2 + t * 0.05) * 10, y - k * tall, 3, c); c.fill();
      }
      // which way it goes: up from the clouds, down from the lagoon
      if (th.hold <= 0 && !used(th, save)) {
        arrow(c, x, y - 150, t, '#ffffff', th.end === 'u');
        if (kittenNear(th, ctx, 90)) hintRing(c, x, y - 60, t);
      }
    }
  }

  BB.Links = { create, hallDoors, update, draw, drawProgress, doorSpot, flapSpot, skylightTile, landingTile, spot, home, flapTile, flapTiles, flapOpen, doorFlap, holdRing, hintRing, arrow, linkKey, HOLD };
})(window.BB);
