// ════════════════════════════════════════════════════════════════
//  LINKS — the ways between places that aren't just walking off a room's
//  edge. The Cat House sits in the middle of the ring of zones:
//
//   h      a cat flap, one in every zone (in Sparkle Gardens it's the
//          garden gate). Stand in it for a moment and you pop home, next
//          to that zone's door. Just walking past a flap lights its door
//          up at home.
//   doors  the door hall in the Cat House (its room's `doors`): one door
//          per zone, glowing once its flap has been found. Stand in a lit
//          door to go back to that zone's flap. Door 0 is the front door,
//          which always leads out to the garden gate.
//   u / v  the Rainbow Lift: from the bottom of Cloud Castles up to the
//          beach of the Sky Lagoon, and back. Walk in and whoosh!
//   F      (in things.js) the Rainbow Slide at the top of Starlight Sky,
//          which slides you home through the skylight for the party.
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
  const HOLD = 36; // ticks standing still in a doorway

  const home = () => W().rooms.find(r => r.def.home);
  function floorBelow(tx, ty) {
    let y = ty;
    while (y < ty + 30) { if (BB.Physics.landKind(W().tile(tx, y + 1), { glow: true })) break; y++; }
    return (y + 1) * T;
  }
  // a doorway's standing spot, in world px (kitten centred on the tile)
  const spot = (tx, ty) => ({ x: tx * T + T / 2, y: floorBelow(tx, ty), tx, ty });

  function flapTile(zone) {
    for (const r of W().rooms) if (r.zone === zone) for (const t of r.things) if (t.ch === 'h') return t;
    return null;
  }
  function doorTile(zone) {
    const h = home();
    const d = h && h.def.doors && h.def.doors[zone];
    return d ? { tx: h.x + d[1], ty: h.y + d[0] } : null;
  }
  function liftTile(ch) { for (const t of W().findThings(ch)) return t; return null; }
  function skylightTile() {
    const h = home();
    return h ? { tx: h.x + h.def.skylight[1], ty: h.y + h.def.skylight[0] } : null;
  }

  // ──── Entities ────
  function create(thing, room, save) {
    const s = spot(thing.tx, thing.ty);
    if (thing.ch === 'h') return { type: 'flap', link: true, zone: room.zone, room: room.id, x: s.x, y: s.y, t: 0, hold: 0 };
    if (thing.ch === 'u' || thing.ch === 'v') return { type: 'lift', link: true, end: thing.ch, zone: room.zone, room: room.id, x: s.x, y: s.y, t: 0 };
    return null;
  }
  // the door hall's doors live in the Cat House room definition
  function hallDoors(room) {
    const out = [];
    for (const [z, rc] of Object.entries(room.def.doors || {})) {
      const s = spot(room.x + rc[1], room.y + rc[0]);
      out.push({ type: 'door', link: true, zone: +z, front: +z === 0, room: room.id, x: s.x, y: s.y, t: Math.random() * 100, hold: 0 });
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
      if (near < 90 && !(save.doors || {})[th.zone]) ctx.onFlapFound(th);
      const still = standingIn(th, pl, 18) && Math.abs(b.vx) < 0.3 && !locked;
      th.hold = still ? th.hold + 1 : Math.max(0, th.hold - 3);
      if (th.hold >= HOLD) { th.hold = 0; ctx.travel(doorSpot(th.zone), 'home', th); }
    } else if (th.type === 'door') {
      const ok = unlocked(th, save);
      const still = ok && standingIn(th, pl, 18) && Math.abs(b.vx) < 0.3 && !locked;
      th.hold = still ? th.hold + 1 : Math.max(0, th.hold - 3);
      if (th.hold >= HOLD) { th.hold = 0; ctx.travel(th.front ? flapSpot(0) : flapSpot(th.zone), th.front ? 'out' : 'door', th); }
    } else if (th.type === 'lift') {
      if (!locked && standingIn(th, pl, 22)) {
        const other = liftTile(th.end === 'u' ? 'v' : 'u');
        if (other) ctx.travel(spot(other.tx, other.ty), th.end === 'u' ? 'liftUp' : 'liftDown', th);
      }
    }
  }
  const doorSpot = z => { const d = doorTile(z); return d ? spot(d.tx, d.ty) : null; };
  const flapSpot = z => { const f = flapTile(z); return f ? spot(f.tx, f.ty) : null; };

  // ──── Drawing ────
  function holdRing(c, x, y, k) {
    if (k <= 0) return;
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 5;
    c.beginPath(); c.arc(x, y, 13, 0, TAU); c.stroke();
    c.strokeStyle = '#ffd84a'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
    BB.Gestures.drawPaw(c, x, y + 1, 0.42, '#ffd84a', '#b8860b');
  }

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

  function draw(c, th, cam, ctx) {
    const x = th.x - cam.x, y = th.y - cam.y;
    if (x < -80 || x > G().W + 80 || y < -120 || y > G().H + 60) return;
    const t = th.t, save = ctx.save;
    if (th.type === 'flap') {
      if (th.zone === 0) {
        // the garden gate home: a little picket gate with a heart
        c.fillStyle = '#fff4e6'; c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.6;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 8 - 3, y); c.lineTo(x + i * 8 - 3, y - 30); c.lineTo(x + i * 8, y - 35); c.lineTo(x + i * 8 + 3, y - 30); c.lineTo(x + i * 8 + 3, y); c.closePath(); c.fill(); c.stroke(); }
        c.fillRect(x - 22, y - 24, 44, 4); c.strokeRect(x - 22, y - 24, 44, 4);
        c.fillStyle = '#ff7eb6'; G().heart(x, y - 40 + Math.sin(t * 0.08) * 2, 7, c); c.fill();
      } else {
        const Z = BB.ZONES[th.zone];
        catDoor(c, x, y, 24, 34, BB.mix(Z.accent, '#ffffff', 0.2), true, t);
        // a tiny house above: "this way home"
        c.save(); c.translate(x, y - 46 + Math.sin(t * 0.06) * 2);
        c.fillStyle = '#fff4e6'; c.strokeStyle = '#8a5a34'; c.lineWidth = 1.5;
        c.fillRect(-7, -4, 14, 10); c.strokeRect(-7, -4, 14, 10);
        c.fillStyle = '#e8706a'; c.beginPath(); c.moveTo(-10, -3); c.lineTo(0, -11); c.lineTo(10, -3); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#ff7eb6'; G().heart(0, 2, 3.5, c); c.fill();
        c.restore();
      }
      holdRing(c, x, y - 58, th.hold / HOLD);
    } else if (th.type === 'door') {
      const ok = unlocked(th, save);
      if (th.front) {
        // the big front door, glowing until you've gone out once
        const glow = !save.leftHome;
        if (glow) G().drawGlow(x, y - 40, 110, '#fff2b0', 0.5 + Math.sin(t * 0.1) * 0.25, c);
        c.fillStyle = '#8a4e2c'; c.strokeStyle = '#4a2a14'; c.lineWidth = 3;
        G().rrect(x - 26, y - 78, 52, 78, 22, c); c.fill(); c.stroke();
        c.fillStyle = '#c96a4a'; G().rrect(x - 21, y - 73, 42, 73, 18, c); c.fill();
        c.fillStyle = '#ffe9b0'; G().circle(x, y - 54, 9, c); c.fill();
        c.fillStyle = '#ff7eb6'; G().heart(x, y - 53, 5, c); c.fill();
        c.fillStyle = '#ffd84a'; G().circle(x + 13, y - 34, 3, c); c.fill();
        // a little cat flap at the bottom
        c.fillStyle = '#a9583a'; G().rrect(x - 9, y - 18, 18, 16, 6, c); c.fill();
      } else {
        const Z = BB.ZONES[th.zone];
        catDoor(c, x, y, 26, 42, ok ? BB.mix(Z.sky[1], Z.accent, 0.4) : '#8a7a7a', ok, t);
        if (!ok) { c.fillStyle = 'rgba(40,30,40,0.35)'; G().rrect(x - 13, y - 42, 26, 42, 10, c); c.fill(); }
        // the zone's emblem above its door
        c.save(); c.globalAlpha = ok ? 1 : 0.35;
        c.fillStyle = 'rgba(255,248,232,0.95)'; G().circle(x, y - 58, 13, c); c.fill();
        BB.HUD.zoneIcon(c, th.zone, x, y - 58, 0.4);
        c.restore();
      }
      if (ok) holdRing(c, x, y - (th.front ? 96 : 82), th.hold / HOLD);
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
    }
  }

  BB.Links = { create, hallDoors, update, draw, doorSpot, flapSpot, skylightTile, spot, home, flapTile, HOLD };
})(window.BB);
