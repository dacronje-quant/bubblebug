// ════════════════════════════════════════════════════════════════
//  MAP VIEW — the kingdom map, drawn from the rooms you've visited.
//
//  One map, on parchment, opened from the pause menu or straight from
//  play (map button, M / Tab, or a gamepad's Select). It opens showing
//  the whole kingdom fitted to the frame (on a small screen it centres on
//  your kitten instead); browse with ◀ ▶ (▲ ▼ too) held down, by dragging,
//  or with the big arrow buttons. A small square map of the whole kingdom
//  at the bottom shows where you're looking (tap it to jump there); zone
//  name tags float over each zone you've explored. While Rainbow's family
//  is lost, each lost relative flashes in their own colour where they wait.
//  Pictures only: each room in its biome colour, a gold star when all its
//  sparkles are found, a lantern dot for benches, the elder's gift badge,
//  a cat face where you found family, a toy where you found a toy, each
//  boss (under a rain-cloud until cheered up, then with a heart), dotted
//  lines between fairy-ring twins, a little house on each cat flap you've
//  found, the Rainbow Lift swooping round the outside of the kingdom, the
//  Starfall float's dotted dandelion path down to the rainbow door, and
//  your kitten's face where you are. Add #overview to the URL to see every
//  room at once (for checking the layout).
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const TAU = Math.PI * 2;
  const ZOOM = 2.6; // screen px per tile at most (a small kingdom never blows up past this)
  // the dev overview (#overview in the URL) shows every room at once
  const OVERVIEW = () => { try { return /[?#&]overview\b/.test(String(location.search) + String(location.hash)); } catch (e) { return false; } };

  // ──── Layout of the browsable (pause) map ────
  const FRAME = () => ({ x: 56, y: 56, w: G().W - 112, h: G().H - 164 });  // the zoomed-in part
  const STRIP = () => ({ x: G().W / 2 - 34, y: G().H - 102, w: 68, h: 58 }); // the small square map of the whole kingdom
  const ARROW = d => ({ x: d < 0 ? 88 : G().W - 88, y: 56 + (G().H - 164) / 2, r: 27, d });
  const CLOSE = () => ({ x: G().W - 70, y: 70, r: 22 });
  const view = { cx: 0, cy: 0, tx: 0, ty: 0 }; // centre (tiles) and where it's gliding to

  function seenRooms() {
    const save = BB.Play.save;
    if (OVERVIEW()) return BB.World.rooms.slice();
    return BB.World.rooms.filter(r => save.visited[r.id]);
  }
  // the whole kingdom fits the frame: one zoom for it all (never more than ZOOM)
  function fitZoom() {
    const b = BB.World.bounds, f = FRAME();
    return Math.min(ZOOM, (f.w - 24) / (b.x1 - b.x0 + 30), (f.h - 24) / (b.y1 - b.y0 + 22));
  }
  let zoom = ZOOM;
  function boundsOf(rooms) {
    if (!rooms.length) return null;
    const bd = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const r of rooms) { bd.x0 = Math.min(bd.x0, r.x); bd.y0 = Math.min(bd.y0, r.y); bd.x1 = Math.max(bd.x1, r.x + r.w); bd.y1 = Math.max(bd.y1, r.y + r.h); }
    return bd;
  }
  // how far the centre may go on one axis (a little margin past the edges)
  // (a small kingdom still slides about, so the arrows always do something)
  function range(a, b, half) {
    const pad = 10;
    if (b - a + pad * 2 <= half * 2) return [a, b];
    return [a - pad + half, b + pad - half];
  }
  function limits() {
    const bd = boundsOf(seenRooms());
    if (!bd) return null;
    const f = FRAME();
    return { x: range(bd.x0, bd.x1, f.w / 2 / zoom), y: range(bd.y0, bd.y1, f.h / 2 / zoom), bd };
  }
  function clampView() {
    const L = limits();
    if (!L) return;
    view.cx = BB.clamp(view.cx, L.x[0], L.x[1]); view.tx = BB.clamp(view.tx, L.x[0], L.x[1]);
    view.cy = BB.clamp(view.cy, L.y[0], L.y[1]); view.ty = BB.clamp(view.ty, L.y[0], L.y[1]);
  }

  // open the pause map centred on the kitten
  // open the pause map showing the whole kingdom (centred on the kitten
  // if it's too big for the screen)
  function openFull() {
    zoom = fitZoom();
    const b = BB.Play.pl.body, T = BB.CFG.TILE, wb = BB.World.bounds;
    view.cx = view.tx = (wb.x0 + wb.x1) / 2;
    view.cy = view.ty = (wb.y0 + wb.y1) / 2;
    const f = FRAME();
    if ((wb.x1 - wb.x0) * zoom > f.w || (wb.y1 - wb.y0) * zoom > f.h) {
      view.cx = view.tx = (b.x + b.w / 2) / T;
      view.cy = view.ty = (b.y + b.h / 2) / T;
    }
    clampView();
  }
  // move straight away (held keys, dragging)…
  function pan(dx, dy) {
    view.cx += dx; view.tx += dx; view.cy += dy; view.ty += dy;
    clampView();
  }
  // …or glide there (arrow buttons, the strip)
  function glideBy(dx) { view.tx += dx; clampView(); }
  function glideTo(x, y) { view.tx = x; if (y != null) view.ty = y; clampView(); }
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
    // a tap on a flashing edge face glides to that lost relative
    const f0 = FRAME(), mark = edgeMarks(f0.x + f0.w / 2 - view.cx * zoom, f0.y + f0.h / 2 - view.cy * zoom, zoom).find(e => Math.hypot(p.x - e.x, p.y - e.y) < 24);
    if (mark) { glideTo(mark.tx, mark.ty); BB.Audio.sfx.select(); return 'kin'; }
    const hit = controlAt(p);
    const f = FRAME();
    if (hit === 'left' || hit === 'right') { glideBy((hit === 'left' ? -1 : 1) * f.w * 0.5 / zoom); BB.Audio.sfx.whoosh(); }
    else if (hit === 'strip') {
      const L = limits();
      if (L) { const m = stripFit(L.bd); glideTo(L.bd.x0 + (p.x - m.x) / m.k, L.bd.y0 + (p.y - m.y) / m.k); }
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

  // Rainbow's relatives still lost (Mama at the courtyard doorway once the
  // other six are home), in tiles
  function lostKin(save) {
    const RF = BB.RainbowFamily, lost = [];
    if (RF.hunting(save)) for (const th of BB.World.findThings('@')) if (!save.kin[th.kin]) lost.push({ id: th.kin, tx: th.tx, ty: th.ty });
    if (RF.mamaReady(save)) { const q = BB.RainbowJourney.spot('rainbow'), T0 = BB.CFG.TILE; lost.push({ id: 'rbMama', tx: q.x / T0, ty: q.y / T0 - 2 }); }
    return lost;
  }
  // …and a flashing face at the edge of the map pointing to each one
  // that is off to the side (tap it to glide there)
  function edgeMarks(ox, oy, sc) {
    const f = FRAME(), out = [];
    lostKin(BB.Play.save).forEach((k, i) => {
      const lx = ox + (k.tx + 0.5) * sc, ly = oy + (k.ty + 0.5) * sc;
      if (lx > f.x && lx < f.x + f.w && ly > f.y && ly < f.y + f.h) return;
      out.push({ ...k, i, x: BB.clamp(lx, f.x + 84, f.x + f.w - 84), y: BB.clamp(ly, f.y + 50, f.y + f.h - 26), dx: lx, dy: ly });
    });
    return out;
  }

  // ──── Room miniatures: each room's real shape in its own colours ────
  // (sky, ground with a grassy top, ledges, water and mist), painted once
  // into a small picture and reused; gates are painted open.
  const PX = 4, minis = new Map();
  const SOLID = '#IXHGgM';
  function miniature(r) {
    if (minis.has(r.id)) return minis.get(r.id);
    let cv = null;
    try {
      cv = document.createElement('canvas'); cv.width = r.w * PX; cv.height = r.h * PX;
      const m = cv.getContext && cv.getContext('2d');
      if (!m || !m.fillRect || !m.createLinearGradient) cv = null;
      else {
        const Z = BB.ZONES[r.zone], tile = (x, y) => (r.grid[y] && r.grid[y][x]) || '#';
        const sky = m.createLinearGradient(0, 0, 0, cv.height);
        sky.addColorStop(0, Z.sky[0]); sky.addColorStop(1, Z.sky[2] || Z.sky[1]);
        m.fillStyle = sky; m.fillRect(0, 0, cv.width, cv.height);
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
          const ch = tile(x, y), X = x * PX, Y = y * PX;
          if (ch === '~') { m.fillStyle = Z.water; m.globalAlpha = 0.8; m.fillRect(X, Y, PX, PX); m.globalAlpha = 1; }
          else if (ch === '%') { m.fillStyle = 'rgba(235,225,255,0.7)'; m.fillRect(X, Y, PX, PX); }
          else if (ch === '-' || ch === ':') { m.fillStyle = Z.ledge; m.fillRect(X, Y, PX, PX * 0.45); }
          else if (ch === 'M') { m.fillStyle = Z.accent; m.fillRect(X, Y, PX, PX); }
          else if ('#IXH'.includes(ch)) {
            const open = !SOLID.includes(tile(x, y - 1)) && tile(x, y - 1) !== '~';
            m.fillStyle = ch === 'I' ? '#d8eefa' : open ? Z.top : y % 2 ? Z.ground : Z.groundDark;
            m.fillRect(X, Y, PX, PX);
          }
        }
      }
    } catch (e) { cv = null; }
    minis.set(r.id, cv);
    return cv;
  }

  // a soft cloud with a "?" over an unexplored room next to explored ones
  function mystery(c, x, y, w, h, t, i) {
    c.save(); c.globalAlpha = 0.9;
    const cx = x + w / 2, cy = y + h / 2 + Math.sin(t * 0.03 + i) * 2, k = Math.min(1, Math.min(w, h) / 40);
    c.fillStyle = '#f4ecff';
    for (const [dx, dy, rr] of [[-18, 4, 13], [-4, -6, 17], [14, 2, 14], [0, 8, 12]]) { G().circle(cx + dx * k, cy + dy * k, rr * k, c); c.fill(); }
    c.globalAlpha = 1;
    G().text('?', cx, cy + 1, 16 * k, '#b49ad6', null, 'center', c);
    c.restore();
  }

  // every visited room, with its pictures, at scale sc (screen = o + tile·sc)
  function drawRooms(c, seen, sc, ox, oy, t) {
    const W = BB.World, P = BB.Play, save = P.save;
    const mk = s => Math.max(0.55, Math.min(1.2, s));
    // unexplored rooms touching explored ones: puffy "?" clouds
    const seenSet = new Set(seen.map(r => r.id));
    const touch = (a, b) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
    W.rooms.forEach((r, i) => {
      if (seenSet.has(r.id) || r.def.maze || !seen.some(v => touch(v, r))) return;
      const x = ox + r.x * sc, y = oy + r.y * sc;
      if (x > G().W || y > G().H || x + r.w * sc < 0 || y + r.h * sc < 0) return;
      mystery(c, x, y, r.w * sc, r.h * sc, t, i);
    });
    // a soft shadow under the explored kingdom
    c.save(); c.fillStyle = 'rgba(120,80,40,0.16)';
    for (const r of seen) { const x = ox + r.x * sc, y = oy + r.y * sc; if (x > G().W || y > G().H || x + r.w * sc < 0 || y + r.h * sc < 0) continue; G().rrect(x + 3, y + 4, r.w * sc, r.h * sc, 6, c); c.fill(); }
    c.restore();
    for (const r of seen) {
      const x = ox + r.x * sc, y = oy + r.y * sc, w = r.w * sc, h = r.h * sc;
      if (x > G().W || y > G().H || x + w < 0 || y + h < 0) continue;
      const Z = BB.ZONES[r.zone];
      c.globalAlpha = 1;
      const pic = miniature(r);
      c.save(); G().rrect(x + 1, y + 1, w - 2, h - 2, Math.min(6, w / 5), c); c.clip();
      if (pic) { c.imageSmoothingEnabled = true; c.drawImage(pic, x, y, w, h); }
      else { c.fillStyle = BB.mix(Z.sky[1], Z.top, 0.45); c.fillRect(x, y, w, h); }
      c.restore();
      G().rrect(x + 1, y + 1, w - 2, h - 2, Math.min(6, w / 5), c);
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = BB.mix(Z.topDark, '#5a3a24', 0.5); c.lineWidth = 1.2; c.stroke();
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
      // where one of Rainbow's relatives was found
      for (const k of r.def.kin || []) if (save.kin[k.id]) BB.RainbowFamily.face(c, k.id, x + w / 2 - 14 * s, y + h / 2, 0.85 * s, true);
      if (r.def.toy && save.toys[r.def.toy]) BB.HUD.toyIcon(c, r.def.toy, x + 8 * s, y + 8 * s, 0.55 * s, t);
      const boss = r.def.boss || (r.things.some(th => th.ch === 'K') ? 'king' : null);
      if (boss) bossMark(c, boss, x + w / 2, y + h / 2 + 4 * s, s, !!(save.bosses && save.bosses[r.id]), t);
      if (r.def.home) BB.HUD.zoneIcon(c, r.zone, x + w / 2, y + h / 2, 1.4 * s);
    }

    // a little house on every cat flap you've found (a way home from there)
    const L = BB.Links;
    for (let z = 0; z < 12; z++) {
      const n = (save.doors || {})[z] || 0;
      L.flapTiles(z).slice(0, n).forEach((f, i) => {
        if (!L.flapOpen(z, i, save)) return;
        const fx = ox + (f.tx + 0.5) * sc, fy = oy + (f.ty + 0.5) * sc;
        if (fx < -20 || fx > G().W + 20 || fy < -20 || fy > G().H + 20) return;
        c.fillStyle = 'rgba(255,248,232,0.95)'; G().circle(fx, fy - 4, 9, c); c.fill();
        BB.HUD.zoneIcon(c, BB.HOME_ZONE, fx, fy - 3, 0.42);
      });
    }
    // the Rainbow Lift: a rainbow swooping round the outside of the kingdom,
    // from the Cloud Castles down past the east edge and under it to the Lagoon
    const lu = W.findThings('u')[0], lv = W.findThings('v')[0], wb = W.bounds;
    const seenAt = th => save.visited[W.roomAtTile(th.tx, th.ty).id] || OVERVIEW();
    if (lu && lv && seenAt(lu) && seenAt(lv)) {
      const X = tx => ox + (tx + 0.5) * sc, Y = ty => oy + (ty + 0.5) * sc;
      c.lineWidth = 3; c.lineCap = 'round';
      ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => {
        const d = (i - 2) * 3.2;
        c.strokeStyle = col; c.beginPath();
        c.moveTo(X(lu.tx), Y(lu.ty) + d);
        c.bezierCurveTo(X(wb.x1 + 30) + d, Y(lu.ty), X(wb.x1 + 30) + d, Y(wb.y1 + 16) + d, X((wb.x0 + wb.x1) / 2), Y(wb.y1 + 16) + d);
        c.bezierCurveTo(X(lv.tx + 24) - d, Y(wb.y1 + 16) + d, X(lv.tx) - d, Y(wb.y1 + 14), X(lv.tx) - d, Y(lv.ty + 1));
        c.stroke();
      });
    }
    // the Starfall float: a dotted dandelion path down the shaft to the rainbow door
    const fpad = W.findThings('F')[0], shaft = W.byId.t4, land = BB.Links.landingTile();
    if (fpad && shaft && land && (save.visited[W.roomAtTile(fpad.tx, fpad.ty).id] || save.finale || OVERVIEW())) {
      const cx = shaft.x + shaft.w / 2;
      const pts = [[fpad.tx + 0.5, fpad.ty - 2], [cx, shaft.y + 2], [cx, shaft.y + shaft.h], [land.tx + 0.5, land.ty]];
      c.strokeStyle = 'rgba(255,250,230,0.95)'; c.lineWidth = 2.5; c.setLineDash([2, 6]); c.lineCap = 'round';
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(ox + x * sc, oy + y * sc) : c.moveTo(ox + x * sc, oy + y * sc)); c.stroke();
      c.setLineDash([]);
      const [hx, hy] = pts[0];
      c.fillStyle = '#fffbe6'; c.strokeStyle = 'rgba(160,140,90,0.7)'; c.lineWidth = 1;
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; G().circle(ox + hx * sc + Math.cos(a) * 5, oy + hy * sc + Math.sin(a) * 5, 1.6, c); c.fill(); }
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

    // Rainbow's lost relatives flash in their own colours where they wait
    // (Mama at the courtyard doorway once the other six are home)
    lostKin(save).forEach((k, i) => {
      const lx = ox + (k.tx + 0.5) * sc, ly = oy + (k.ty + 0.5) * sc, col = BB.CATS[k.id].trailColor;
      if (lx < -40 || lx > G().W + 40 || ly < -40 || ly > G().H + 40) return;
      const f = (Math.sin(t * 0.14 + i * 1.3) + 1) / 2;
      G().drawGlow(lx, ly, 26 + f * 12, col, 0.45 + f * 0.45, c);
      c.strokeStyle = col; c.lineWidth = 3; G().circle(lx, ly, 13 + f * 5, c); c.stroke();
      BB.Kittens.draw(c, BB.Kittens.fadedId(k.id, 1 - f), { mode: 'sit', sad: 0.6 * (1 - f), t: t + i * 9 }, lx, ly + 11, 0.62, 1);
    });

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
    const f = FRAME(), placed = [];
    const zones = [...new Set(seen.map(r => r.zone))];
    c.font = `800 15px ${G().FONT}`;
    const tags = [];
    for (const z of zones) {
      const zr = seen.filter(r => r.zone === z);
      const x0 = Math.min(...zr.map(r => r.x)), x1 = Math.max(...zr.map(r => r.x + r.w)), y0 = Math.min(...zr.map(r => r.y));
      const sx0 = ox + x0 * sc, sx1 = ox + x1 * sc;
      if (sx1 < f.x + 40 || sx0 > f.x + f.w - 40) continue; // not on screen
      const tw = c.measureText(BB.ZONES[z].name).width + 44;
      const cx = BB.clamp((Math.max(sx0, f.x) + Math.min(sx1, f.x + f.w)) / 2, f.x + tw / 2 + 66, f.x + f.w - tw / 2 - 66); // (clear of the arrows)
      tags.push({ z, tw, cx, ty: BB.clamp(oy + y0 * sc - 16, f.y + 18, f.y + f.h - 18) });
    }
    // neighbouring zones' tags never sit on top of each other: a tag that
    // would overlap one already placed slides sideways, or else steps down
    tags.sort((a, b) => a.ty - b.ty || a.cx - b.cx);
    const hit = g => placed.some(p => Math.abs(p.cx - g.cx) < (p.tw + g.tw) / 2 + 6 && Math.abs(p.ty - g.ty) < 30);
    for (const g of tags) {
      const lo = f.x + g.tw / 2 + 66, hi = f.x + f.w - g.tw / 2 - 66, home = g.cx;
      for (let i = 0; hit(g) && i < 12; i++) {
        const blocker = placed.find(p => Math.abs(p.cx - g.cx) < (p.tw + g.tw) / 2 + 6 && Math.abs(p.ty - g.ty) < 30);
        const side = home >= blocker.cx ? 1 : -1, nx = blocker.cx + side * ((blocker.tw + g.tw) / 2 + 8);
        if (nx >= lo && nx <= hi && Math.abs(nx - home) < 160) g.cx = nx;
        else { g.cx = home; g.ty = Math.min(f.y + f.h - 18, blocker.ty + 32); }
      }
      placed.push(g);
      c.fillStyle = 'rgba(90,58,36,0.85)'; G().rrect(g.cx - g.tw / 2, g.ty - 13, g.tw, 26, 13, c); c.fill();
      BB.HUD.zoneIcon(c, g.z, g.cx - g.tw / 2 + 16, g.ty, 0.42);
      G().text(BB.ZONES[g.z].name, g.cx + 12, g.ty + 1, 15, '#fff8e8', null, 'center', c);
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

  // the overview's scale and placement: the explored kingdom, to scale,
  // centred in the strip's box
  function stripFit(bd) {
    const s = STRIP();
    const k = Math.min(s.w / (bd.x1 - bd.x0), s.h / (bd.y1 - bd.y0));
    return { k, x: s.x + (s.w - (bd.x1 - bd.x0) * k) / 2, y: s.y + (s.h - (bd.y1 - bd.y0) * k) / 2 };
  }

  // the whole kingdom, small, with a box around what the big map shows
  function drawStrip(c, seen, bd, t) {
    const s = STRIP(), f = FRAME(), m = stripFit(bd);
    const X = tx => m.x + (tx - bd.x0) * m.k, Y = ty => m.y + (ty - bd.y0) * m.k;
    c.fillStyle = 'rgba(217,169,90,0.2)'; G().rrect(s.x - 8, s.y - 6, s.w + 16, s.h + 12, 10, c); c.fill();
    for (const r of seen) {
      const Z = BB.ZONES[r.zone];
      c.fillStyle = BB.mix(Z.sky[1], Z.top, 0.45);
      c.fillRect(X(r.x), Y(r.y), Math.max(1.5, r.w * m.k), Math.max(1.5, r.h * m.k));
    }
    const hw = f.w / 2 / zoom, hh = f.h / 2 / zoom;
    const vx0 = Math.max(s.x - 4, X(view.cx - hw)), vx1 = Math.min(s.x + s.w + 4, X(view.cx + hw));
    const vy0 = Math.max(s.y - 4, Y(view.cy - hh)), vy1 = Math.min(s.y + s.h + 4, Y(view.cy + hh));
    c.strokeStyle = '#8a5a34'; c.lineWidth = 2.5;
    G().rrect(vx0, vy0, vx1 - vx0, vy1 - vy0, 4, c); c.stroke();
    // lost relatives, as little flashing dots in their own colours
    const save = BB.Play.save;
    if (BB.RainbowFamily.hunting(save)) BB.World.findThings('@').forEach((th, i) => {
      if (save.kin[th.kin]) return;
      const f = (Math.sin(t * 0.14 + i * 1.3) + 1) / 2;
      c.fillStyle = BB.CATS[th.kin].trailColor; c.globalAlpha = 0.5 + f * 0.5;
      G().circle(X(th.tx), Y(th.ty), 3 + f * 1.5, c); c.fill(); c.globalAlpha = 1;
    });
    // the kitten, as a little glowing dot
    const b = BB.Play.pl.body, T = BB.CFG.TILE;
    const kx = X(b.x / T), ky = Y(b.y / T);
    G().drawGlow(kx, ky, 10, '#fff4c2', 0.9, c);
    c.fillStyle = '#ff7eb6'; G().circle(kx, ky, 3 + Math.sin(t * 0.15) * 0.8, c); c.fill();
  }

  // a storybook map: warm paper with speckles, a rainbow-trimmed double
  // border, heart corners and a little compass
  function drawParchment(c, t) {
    const W0 = G().W, H0 = G().H;
    const g = c.createLinearGradient(0, 40, 0, H0 - 40);
    g.addColorStop(0, '#fff8e6'); g.addColorStop(1, '#fbe8c4');
    c.fillStyle = g; c.strokeStyle = '#c99550'; c.lineWidth = 6;
    G().rrect(40, 40, W0 - 80, H0 - 80, 30, c); c.fill(); c.stroke();
    c.fillStyle = 'rgba(170,120,60,0.08)';
    for (let i = 0; i < 140; i++) { const h = BB.hash(i, 7, 3), k = BB.hash(i, 11, 5); G().circle(50 + h * (W0 - 100), 50 + k * (H0 - 100), 1 + BB.hash(i, 3, 9) * 2.2, c); c.fill(); }
    ['#ff9ec7', '#ffd27a', '#9fe0a6', '#8fcff0', '#c4a4f0'].forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 2; G().rrect(48 + i * 2.6, 48 + i * 2.6, W0 - 96 - i * 5.2, H0 - 96 - i * 5.2, 24 - i, c); c.stroke();
    });
    for (const [x, y] of [[62, 62], [W0 - 62, 62], [62, H0 - 62], [W0 - 62, H0 - 62]]) {
      if (x > W0 / 2 && y < H0 / 2) continue; // (the ✕ lives there)
      c.fillStyle = '#ff8fb8'; G().heart(x, y + 2, 7, c); c.fill();
    }
    // compass rose, bottom right
    const cx = W0 - 112, cy = H0 - 84;
    c.save(); c.translate(cx, cy); c.rotate(Math.sin(t * 0.02) * 0.05);
    c.fillStyle = 'rgba(255,248,232,0.9)'; G().circle(0, 0, 22, c); c.fill();
    c.strokeStyle = '#c99550'; c.lineWidth = 1.5; c.stroke();
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i ? '#d9b07a' : '#ff8fb8';
      c.beginPath(); c.moveTo(0, -19); c.lineTo(5, 0); c.lineTo(-5, 0); c.closePath(); c.fill();
      c.rotate(Math.PI / 2);
    }
    c.fillStyle = '#fff6c2'; G().circle(0, 0, 3.5, c); c.fill();
    c.restore();
  }
  // the space between rooms: a soft sea with drifting waves and clouds,
  // moving gently with the map so browsing feels alive
  function drawSea(c, f, ox, oy, sc, t) {
    const g = c.createLinearGradient(0, f.y, 0, f.y + f.h);
    g.addColorStop(0, '#e3f4fb'); g.addColorStop(1, '#f6efdc');
    c.fillStyle = g; c.fillRect(f.x, f.y, f.w, f.h);
    c.strokeStyle = 'rgba(120,180,210,0.28)'; c.lineWidth = 1.5; c.lineCap = 'round';
    const step = 46, sx = ((ox * 0.5) % step + step) % step, sy = ((oy * 0.5) % step + step) % step;
    for (let y = f.y - step + sy; y < f.y + f.h + step; y += step) for (let x = f.x - step + sx; x < f.x + f.w + step; x += step) {
      const o = Math.sin(t * 0.03 + x * 0.05 + y * 0.03) * 2, j = ((Math.round(y / step) % 2) + 2) % 2 * step / 2;
      c.beginPath(); c.arc(x + j, y + o, 5, Math.PI * 1.1, Math.PI * 1.9); c.arc(x + j + 10, y + o, 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = f.x + ((i * 233 + t * 0.12 + ox * 0.2) % (f.w + 160) + f.w + 160) % (f.w + 160) - 80;
      BB.Backdrops.cloud(c, x, f.y + 40 + i * 70, 0.32, 'rgba(255,255,255,0.6)');
    }
  }

  function draw(c, mode, t) {
    const P = BB.Play;
    const seen = seenRooms();
    if (!seen.length) return;
    const sc = zoom;
    const f0 = FRAME();
    const ox = f0.x + f0.w / 2 - view.cx * sc, oy = f0.y + f0.h / 2 - view.cy * sc;
    c.save();
    drawParchment(c, t);
    const f = FRAME();
    c.save();
    G().rrect(f.x, f.y, f.w, f.h, 22, c); c.clip();
    drawSea(c, f, ox, oy, sc, t);
    drawRooms(c, seen, sc, ox, oy, t);
    drawZoneTags(c, seen, sc, ox, oy);
    for (const e of edgeMarks(ox, oy, sc)) {
      const col = BB.CATS[e.id].trailColor, fl = (Math.sin(t * 0.14 + e.i * 1.3) + 1) / 2;
      const a = Math.atan2(e.dy - e.y, e.dx - e.x);
      c.fillStyle = col; c.globalAlpha = 0.55 + fl * 0.45;
      c.beginPath(); c.moveTo(e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26);
      c.lineTo(e.x + Math.cos(a + 2.5) * 15, e.y + Math.sin(a + 2.5) * 15); c.lineTo(e.x + Math.cos(a - 2.5) * 15, e.y + Math.sin(a - 2.5) * 15); c.fill();
      c.globalAlpha = 1;
      G().drawGlow(e.x, e.y, 22 + fl * 8, col, 0.5 + fl * 0.4, c);
      c.fillStyle = '#fff8ee'; c.strokeStyle = col; c.lineWidth = 3; G().circle(e.x, e.y, 15, c); c.fill(); c.stroke();
      BB.RainbowFamily.face(c, e.id, e.x, e.y + 1, 1.15, fl > 0.5);
    }
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

  BB.MapView = { draw, catFace, ZOOM, openFull, pan, glideBy, tick, tapFull, controlAt, fitZoom, zoom: () => zoom };
})(window.BB);
