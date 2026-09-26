// ════════════════════════════════════════════════════════════════
//  MAP VIEW — the kingdom map, drawn from the rooms you've visited.
//
//  Two ways to see it:
//   • 'full'    — on parchment, fitted to everything explored (pause menu)
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

  function draw(c, mode, t) {
    const W = BB.World, P = BB.Play, save = P.save;
    const overlay = mode === 'overlay';
    const seen = W.rooms.filter(r => save.visited[r.id]);
    if (!seen.length) return;
    const bd = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const r of seen) { bd.x0 = Math.min(bd.x0, r.x); bd.y0 = Math.min(bd.y0, r.y); bd.x1 = Math.max(bd.x1, r.x + r.w); bd.y1 = Math.max(bd.y1, r.y + r.h); }

    const b = P.pl.body, T = BB.CFG.TILE;
    const kx0 = b.x / T, ky0 = b.y / T;
    let sc, ox, oy;
    if (overlay) {
      // centred on the kitten, at a comfortable fixed zoom
      sc = 1.35;
      ox = G().W / 2 - kx0 * sc;
      oy = G().H / 2 - ky0 * sc;
    } else {
      const pad = 90;
      sc = Math.min(4, (G().W - pad * 2) / (bd.x1 - bd.x0), (G().H - pad * 2) / (bd.y1 - bd.y0));
      ox = (G().W - (bd.x1 - bd.x0) * sc) / 2 - bd.x0 * sc;
      oy = (G().H - (bd.y1 - bd.y0) * sc) / 2 - bd.y0 * sc;
    }

    c.save();
    if (overlay) {
      c.fillStyle = 'rgba(20,12,40,0.32)';
      c.fillRect(0, 0, G().W, G().H);
    } else {
      c.fillStyle = '#fff6de'; c.strokeStyle = '#d9a95a'; c.lineWidth = 6;
      G().rrect(40, 40, G().W - 80, G().H - 80, 30, c); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(217,169,90,0.35)'; c.lineWidth = 2; c.setLineDash([6, 8]);
      G().rrect(56, 56, G().W - 112, G().H - 112, 22, c); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.rect(56, 56, G().W - 112, G().H - 112); c.clip();
    }
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
    const cur = P.room;
    {
      const x = ox + cur.x * sc, y = oy + cur.y * sc;
      c.strokeStyle = `rgba(255,244,194,${0.6 + Math.sin(t * 0.15) * 0.4})`; c.lineWidth = 3;
      G().rrect(x, y, cur.w * sc, cur.h * sc, 4, c); c.stroke();
      const kx = ox + kx0 * sc, ky = oy + ky0 * sc;
      G().drawGlow(kx, ky, 26, '#fff4c2', 0.7, c);
      BB.Kittens.draw(c, P.pl.cat, { mode: 'sit', t, happy: true }, kx, ky + 12, overlay ? 0.9 : Math.max(0.9, sc / 2.2), 1);
    }
    c.restore();
  }

  BB.MapView = { draw, catFace };
})(window.BB);
