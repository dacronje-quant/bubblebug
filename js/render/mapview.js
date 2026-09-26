// ════════════════════════════════════════════════════════════════
//  MAP VIEW — the kingdom map, drawn from the rooms you've visited.
//
//  Both maps use the same comfortable zoom, which fits the kingdom's whole
//  height on screen:
//   • 'full'    — on parchment (pause menu). It opens centred on your
//                 kitten; browse side to side with ◀ ▶ (▲ ▼ too) held down,
//                 by dragging, or with the big arrow buttons. A strip along
//                 the bottom shows the whole kingdom and where you're
//                 looking (tap it to jump there); zone name tags float over
//                 each zone you've explored.
//   • 'overlay' — a see-through map floating over the game while you keep
//                 playing (map button, M / Tab, or a gamepad's Select),
//                 centred on your kitten
//  Pictures only: each room in its biome colour, a gold star when all its
//  sparkles are found, a lantern dot for benches, the elder's gift badge,
//  a cat face where you found family, a toy where you found a toy, each
//  boss (under a rain-cloud until cheered up, then with a heart), dotted
//  lines between fairy-ring twins, and your kitten's face where you are.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const TAU = Math.PI * 2;
  const ZOOM = 2.6; // screen px per tile, on both maps

  // ──── Layout of the browsable (pause) map ────
  const FRAME = () => ({ x: 56, y: 56, w: G().W - 112, h: G().H - 164 });  // the zoomed-in part
  const STRIP = () => ({ x: 104, y: G().H - 96, w: G().W - 208, h: 30 });  // the whole kingdom, small
  const ARROW = d => ({ x: d < 0 ? 88 : G().W - 88, y: 56 + (G().H - 164) / 2, r: 27, d });
  const CLOSE = () => ({ x: G().W - 70, y: 70, r: 22 });
  const view = { cx: 0, cy: 0, tx: 0, ty: 0 }; // centre (tiles) and where it's gliding to

  function seenRooms() {
    const save = BB.Play.save;
    return BB.World.rooms.filter(r => save.visited[r.id]);
  }
  function boundsOf(rooms) {
    if (!rooms.length) return null;
    const bd = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const r of rooms) { bd.x0 = Math.min(bd.x0, r.x); bd.y0 = Math.min(bd.y0, r.y); bd.x1 = Math.max(bd.x1, r.x + r.w); bd.y1 = Math.max(bd.y1, r.y + r.h); }
    return bd;
  }
  // how far the centre may go on one axis (a little margin past the edges)
  function range(a, b, half) {
    const pad = 6;
    if (b - a + pad * 2 <= half * 2) return [(a + b) / 2, (a + b) / 2];
    return [a - pad + half, b + pad - half];
  }
  function limits() {
    const bd = boundsOf(seenRooms());
    if (!bd) return null;
    const f = FRAME();
    return { x: range(bd.x0, bd.x1, f.w / 2 / ZOOM), y: range(bd.y0, bd.y1, f.h / 2 / ZOOM), bd };
  }
  function clampView() {
    const L = limits();
    if (!L) return;
    view.cx = BB.clamp(view.cx, L.x[0], L.x[1]); view.tx = BB.clamp(view.tx, L.x[0], L.x[1]);
    view.cy = BB.clamp(view.cy, L.y[0], L.y[1]); view.ty = BB.clamp(view.ty, L.y[0], L.y[1]);
  }

  // open the pause map centred on the kitten
  function openFull() {
    const b = BB.Play.pl.body, T = BB.CFG.TILE;
    view.cx = view.tx = (b.x + b.w / 2) / T;
    view.cy = view.ty = (b.y + b.h / 2) / T;
    clampView();
  }
  // move straight away (held keys, dragging)…
  function pan(dx, dy) {
    view.cx += dx; view.tx += dx; view.cy += dy; view.ty += dy;
    clampView();
  }
  // …or glide there (arrow buttons, the strip)
  function glideBy(dx) { view.tx += dx; clampView(); }
  function glideTo(x) { view.tx = x; clampView(); }
  function tick() {
    view.cx = BB.lerp(view.cx, view.tx, 0.18);
    view.cy = BB.lerp(view.cy, view.ty, 0.18);
  }
  // can the map still move this way? (−1 = left, +1 = right)
  function canGo(d) {
    const L = limits();
    if (!L) return false;
    return d < 0 ? view.tx > L.x[0] + 0.5 : view.tx < L.x[1] - 0.5;
  }
  const inCircle = (p, b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10;
  const inRect = (p, r) => p.x >= r.x - 6 && p.x <= r.x + r.w + 6 && p.y >= r.y - 8 && p.y <= r.y + r.h + 8;
  // which control (if any) is under a pointer on the pause map
  function controlAt(p) {
    if (inCircle(p, CLOSE())) return 'close';
    if (inCircle(p, ARROW(-1))) return 'left';
    if (inCircle(p, ARROW(1))) return 'right';
    if (inRect(p, STRIP())) return 'strip';
    return null;
  }
  // a tap on the pause map: arrows glide half a screen, the strip jumps there
  function tapFull(p) {
    const hit = controlAt(p);
    const f = FRAME();
    if (hit === 'left' || hit === 'right') { glideBy((hit === 'left' ? -1 : 1) * f.w * 0.5 / ZOOM); BB.Audio.sfx.whoosh(); }
    else if (hit === 'strip') {
      const L = limits(), s = STRIP();
      if (L) glideTo(L.bd.x0 + (p.x - s.x) / s.w * (L.bd.x1 - L.bd.x0));
      BB.Audio.sfx.select();
    }
    return hit;
  }

  // A tiny cat face (for family members found)
  function catFace(c, x, y, s, fur, ear) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = ear;
    c.beginPath(); c.moveTo(-7, -2); c.lineTo(-6, -10); c.lineTo(-1, -5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(7, -2); c.lineTo(6, -10); c.lineTo(1, -5); c.closePath(); c.fill();
    c.fillStyle = fur; c.strokeStyle = 'rgba(40,20,40,0.7)'; c.lineWidth = 1;
    G().circle(0, 0, 7, c); c.fill(); c.stroke();
    c.fillStyle = '#2a1a2a';
    G().circle(-2.5, -1, 1.1, c); c.fill(); G().circle(2.5, -1, 1.1, c); c.fill();
    c.fillStyle = '#ff9fb0'; G().circle(0, 1.5, 0.9, c); c.fill();
    c.restore();
  }

  // A tiny boss portrait: grey under a rain-cloud until cheered up, then
  // smiling with a heart
  function bossMark(c, kind, x, y, s, happy, t) {
    BB.BossArt.draw(c, kind, x, y, 0.42 * s, { t, mood: happy ? 0 : 1, facing: 1, pose: happy ? 'happy' : 'sulk', blink: 0 });
    const hy = y - 22 * s;
    if (happy) {
      c.fillStyle = '#ff6f9f'; G().heart(x, hy + Math.sin(t * 0.08) * 1.5 * s, 7 * s, c); c.fill();
    } else {
      c.fillStyle = 'rgba(150,156,184,0.95)';
      c.beginPath();
      c.arc(x - 4 * s, hy + 1 * s, 3.6 * s, 0, TAU); c.arc(x, hy - 1.5 * s, 4.6 * s, 0, TAU); c.arc(x + 4 * s, hy + 1 * s, 3.6 * s, 0, TAU);
      c.fill();
      const k = (t * 0.05) % 1;
      c.fillStyle = `rgba(140,190,255,${1 - k})`;
      G().ellipse(x, hy + 5 * s + k * 5 * s, 1 * s, 1.6 * s, 0, c); c.fill();
    }
  }

  // every visited room, with its pictures, at scale sc (screen = o + tile·sc)
  function drawRooms(c, seen, sc, ox, oy, t, overlay) {
    const W = BB.World, P = BB.Play, save = P.save;
    const mk = s => Math.max(0.55, Math.min(1.2, s));
    for (const r of seen) {
      const x = ox + r.x * sc, y = oy + r.y * sc, w = r.w * sc, h = r.h * sc;
      if (x > G().W || y > G().H || x + w < 0 || y + h < 0) continue;
      const Z = BB.ZONES[r.zone];
      c.globalAlpha = overlay ? 0.72 : 1;
      c.fillStyle = BB.mix(Z.sky[1], Z.top, 0.45);
      G().rrect(x + 1, y + 1, w - 2, h - 2, Math.min(6, w / 5), c); c.fill();
      c.strokeStyle = overlay ? 'rgba(255,255,255,0.9)' : BB.mix(Z.topDark, '#5a3a24', 0.4);
      c.lineWidth = overlay ? 1.5 : 2; c.stroke();
      c.globalAlpha = 1;
      const s = mk(sc / 2.2);
      const stars = r.things.filter(th => th.ch === '*');
      if (stars.length && stars.every(st => save.sparkles[st.tx + ',' + st.ty])) {
        c.fillStyle = '#ffd84a'; G().star(x + w - 6 * s - 2, y + 6 * s + 2, 5 * s, 5, 0.5, -Math.PI / 2, c); c.fill();
      }
      if (r.things.some(th => th.ch === 'B')) { c.fillStyle = '#ffd98a'; G().circle(x + 5 * s + 1, y + h - 5 * s - 1, 3 * s, c); c.fill(); }
      if (r.def.elder && save.abilities[r.def.elder]) BB.HUD.abilityIcon(c, r.def.elder, x + w / 2, y + h / 2, 0.55 * s);
      if (r.def.family && save.family && save.family[r.def.family]) {
        const m = BB.CATS[r.def.family];
        catFace(c, x + w / 2 + (r.def.elder ? 14 * s : 0), y + h / 2, 0.9 * s, m ? m.fur : '#fff', m ? (m.pointDark || m.fur) : '#ccc');
      }
      if (r.def.toy && save.toys[r.def.toy]) BB.HUD.toyIcon(c, r.def.toy, x + 8 * s, y + 8 * s, 0.55 * s, t);
      const boss = r.def.boss || (r.things.some(th => th.ch === 'K') ? 'king' : null);
      if (boss) bossMark(c, boss, x + w / 2, y + h / 2 + 4 * s, s, !!(save.bosses && save.bosses[r.id]), t);
    }

    // dotted links between fairy-ring twins you've seen both ends of
    if (save.abilities.rings) {
      c.strokeStyle = 'rgba(255,214,120,0.8)'; c.lineWidth = 1.5; c.setLineDash([3, 4]);
      const done = new Set();
      for (const [k, twin] of W.portals) {
        const [tx, ty] = k.split(',').map(Number);
        const a = W.roomAtTile(tx, ty), bR = W.roomAtTile(twin.tx, twin.ty);
        const id = [k, twin.tx + ',' + twin.ty].sort().join('|');
        if (done.has(id) || !save.visited[a.id] || !save.visited[bR.id]) continue;
        done.add(id);
        c.beginPath(); c.moveTo(ox + (tx + 0.5) * sc, oy + (ty + 0.5) * sc); c.lineTo(ox + (twin.tx + 0.5) * sc, oy + (twin.ty + 0.5) * sc); c.stroke();
      }
      c.setLineDash([]);
    }

    // you are here
    const cur = P.room, b = P.pl.body, T = BB.CFG.TILE;
    const x = ox + cur.x * sc, y = oy + cur.y * sc;
    c.strokeStyle = `rgba(255,244,194,${0.6 + Math.sin(t * 0.15) * 0.4})`; c.lineWidth = 3;
    G().rrect(x, y, cur.w * sc, cur.h * sc, 4, c); c.stroke();
    const kx = ox + b.x / T * sc, ky = oy + b.y / T * sc;
    G().drawGlow(kx, ky, 26, '#fff4c2', 0.7, c);
    BB.Kittens.draw(c, P.pl.cat, { mode: 'sit', t, happy: true }, kx, ky + 12, Math.max(0.9, sc / 2.2), 1);
  }

  // a name tag with the zone's emblem over each zone you've explored; tags
  // of zones running off the edge stay tucked inside the frame
  function drawZoneTags(c, seen, sc, ox, oy) {
    const f = FRAME();
    const zones = [...new Set(seen.map(r => r.zone))];
    for (const z of zones) {
      const zr = seen.filter(r => r.zone === z);
      const x0 = Math.min(...zr.map(r => r.x)), x1 = Math.max(...zr.map(r => r.x + r.w)), y0 = Math.min(...zr.map(r => r.y));
      const sx0 = ox + x0 * sc, sx1 = ox + x1 * sc;
      if (sx1 < f.x + 40 || sx0 > f.x + f.w - 40) continue; // not on screen
      const Z = BB.ZONES[z];
      c.font = `800 15px ${G().FONT}`;
      const tw = c.measureText(Z.name).width + 44;
      const cx = BB.clamp((Math.max(sx0, f.x) + Math.min(sx1, f.x + f.w)) / 2, f.x + tw / 2 + 66, f.x + f.w - tw / 2 - 66); // (clear of the arrows)
      const ty = BB.clamp(oy + y0 * sc - 16, f.y + 18, f.y + f.h - 18);
      c.fillStyle = 'rgba(90,58,36,0.85)'; G().rrect(cx - tw / 2, ty - 13, tw, 26, 13, c); c.fill();
      BB.HUD.zoneIcon(c, z, cx - tw / 2 + 16, ty, 0.42);
      G().text(Z.name, cx + 12, ty + 1, 15, '#fff8e8', null, 'center', c);
    }
  }

  function drawArrow(c, d, t, on) {
    const a = ARROW(d);
    c.save();
    c.globalAlpha = on ? 1 : 0.3;
    const k = on ? 1 + Math.sin(t * 0.1) * 0.04 : 1;
    c.translate(a.x, a.y); c.scale(k, k);
    c.fillStyle = '#ffb35c'; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    G().circle(0, 0, a.r, c); c.fill(); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-6 * d, -11); c.lineTo(8 * d, 0); c.lineTo(-6 * d, 11); c.stroke();
    c.restore();
  }

  // the whole kingdom, small, with a box around what the big map shows
  function drawStrip(c, seen, bd, t) {
    const s = STRIP(), f = FRAME();
    const sx = s.w / (bd.x1 - bd.x0), sy = s.h / (bd.y1 - bd.y0);
    c.fillStyle = 'rgba(217,169,90,0.2)'; G().rrect(s.x - 8, s.y - 6, s.w + 16, s.h + 12, 10, c); c.fill();
    for (const r of seen) {
      const Z = BB.ZONES[r.zone];
      c.fillStyle = BB.mix(Z.sky[1], Z.top, 0.45);
      c.fillRect(s.x + (r.x - bd.x0) * sx, s.y + (r.y - bd.y0) * sy, Math.max(1.5, r.w * sx), Math.max(1.5, r.h * sy));
    }
    const hw = f.w / 2 / ZOOM, hh = f.h / 2 / ZOOM;
    const vx0 = Math.max(s.x - 4, s.x + (view.cx - hw - bd.x0) * sx), vx1 = Math.min(s.x + s.w + 4, s.x + (view.cx + hw - bd.x0) * sx);
    const vy0 = Math.max(s.y - 4, s.y + (view.cy - hh - bd.y0) * sy), vy1 = Math.min(s.y + s.h + 4, s.y + (view.cy + hh - bd.y0) * sy);
    c.strokeStyle = '#8a5a34'; c.lineWidth = 2.5;
    G().rrect(vx0, vy0, vx1 - vx0, vy1 - vy0, 4, c); c.stroke();
    // the kitten, as a little glowing dot
    const b = BB.Play.pl.body, T = BB.CFG.TILE;
    const kx = s.x + (b.x / T - bd.x0) * sx, ky = s.y + (b.y / T - bd.y0) * sy;
    G().drawGlow(kx, ky, 10, '#fff4c2', 0.9, c);
    c.fillStyle = '#ff7eb6'; G().circle(kx, ky, 3 + Math.sin(t * 0.15) * 0.8, c); c.fill();
  }

  function draw(c, mode, t) {
    const P = BB.Play;
    const overlay = mode === 'overlay';
    const seen = seenRooms();
    if (!seen.length) return;
    const b = P.pl.body, T = BB.CFG.TILE;
    const sc = ZOOM;
    let ox, oy;
    if (overlay) {
      // centred on the kitten
      ox = G().W / 2 - (b.x + b.w / 2) / T * sc;
      oy = G().H / 2 - (b.y + b.h / 2) / T * sc;
    } else {
      const f = FRAME();
      ox = f.x + f.w / 2 - view.cx * sc;
      oy = f.y + f.h / 2 - view.cy * sc;
    }

    c.save();
    if (overlay) {
      c.fillStyle = 'rgba(20,12,40,0.32)';
      c.fillRect(0, 0, G().W, G().H);
      drawRooms(c, seen, sc, ox, oy, t, true);
      c.restore();
      return;
    }
    // parchment, with the zoomed-in part clipped to its frame
    c.fillStyle = '#fff6de'; c.strokeStyle = '#d9a95a'; c.lineWidth = 6;
    G().rrect(40, 40, G().W - 80, G().H - 80, 30, c); c.fill(); c.stroke();
    const f = FRAME();
    c.strokeStyle = 'rgba(217,169,90,0.35)'; c.lineWidth = 2; c.setLineDash([6, 8]);
    G().rrect(f.x, f.y, f.w, f.h, 22, c); c.stroke(); c.setLineDash([]);
    c.save();
    G().rrect(f.x, f.y, f.w, f.h, 22, c); c.clip();
    drawRooms(c, seen, sc, ox, oy, t, false);
    drawZoneTags(c, seen, sc, ox, oy);
    c.restore();
    drawStrip(c, seen, boundsOf(seen), t);
    drawArrow(c, -1, t, canGo(-1));
    drawArrow(c, 1, t, canGo(1));
    // ✕ to close
    const x = CLOSE();
    c.fillStyle = '#ff8fb8'; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    G().circle(x.x, x.y, x.r, c); c.fill(); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x.x - 8, x.y - 8); c.lineTo(x.x + 8, x.y + 8); c.moveTo(x.x + 8, x.y - 8); c.lineTo(x.x - 8, x.y + 8); c.stroke();
    c.restore();
  }

  BB.MapView = { draw, catFace, ZOOM, openFull, pan, glideBy, tick, tapFull, controlAt };
})(window.BB);
