// ════════════════════════════════════════════════════════════════
//  MOVERS — moving platforms: lily pads, drifting leaves, crystal lifts,
//  cloud puffs, magic carpets, star wheels… one look per zone.
//
//  A room lists them in `movers:` (room tile coordinates, fractions ok):
//    { x, y, w, to: [x2, y2], period, phase }
//        glides back and forth between its left edge at (x, y) and (x2, y2)
//        (y is the platform's top), easing gently at each end
//    { orbit: [cx, cy], r, n, w, period, phase, spin }
//        a little wheel of `n` platforms round (cx, cy), always level
//  `period` is ticks for one full trip (60 = 1 s); `phase` (0–1) offsets it.
//
//  Motion is a pure function of a shared clock, so every platform is
//  exactly where its dotted track says it will be. Physics carries riders
//  (BB.Physics.setMovers). Every mover is a bonus: no route ever needs one,
//  and tools/verify-world.js proves every hop off one stays safe.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE;
  const TAU = Math.PI * 2;
  const W = () => BB.World;
  const G = () => BB.G;

  const SKIN = {
    gardens: 'flower', meadow: 'cap', caves: 'crystal', hive: 'comb', ruins: 'slab', clouds: 'cloud',
    lagoon: 'raft', dunes: 'carpet', frost: 'floe', autumn: 'leaf', springs: 'lantern', starlight: 'star',
  };

  const Movers = BB.Movers = {
    list: [],
    t: 0,

    // one live platform per entry (an orbit makes `n` of them)
    build() {
      this.list = [];
      this.rooms = W().rooms;
      for (const room of W().rooms) {
        for (const spec of room.def.movers || []) {
          const n = spec.orbit ? Math.max(1, spec.n || 1) : 1;
          for (let i = 0; i < n; i++) {
            const m = { room, spec, i, n, w: (spec.w || 2) * T, x: 0, y: 0, dx: 0, dy: 0, dip: 0, skin: spec.skin || SKIN[BB.ZONES[room.zone].key] || 'flower' };
            this.place(m, this.t);
            // a raft on water or steam is drawn over the surface, not under it
            m.wet = this.samples(m, 12).some(p => { const ch = W().tile(Math.floor((p.x + m.w / 2) / T), Math.floor((p.y + 4) / T)); return ch === '~' || ch === '%'; });
            this.list.push(m);
          }
        }
      }
      BB.Physics.setMovers(this.list);
      return this;
    },

    // where a platform's left edge and top are at clock tick `t` (world px)
    at(m, t) {
      const s = m.spec, r = m.room;
      let lx, ty;
      if (s.orbit) {
        const a = TAU * ((t / s.period + (s.phase || 0)) * (s.spin || 1) + m.i / m.n);
        lx = s.orbit[0] + Math.cos(a) * s.r - (s.w || 2) / 2;
        ty = s.orbit[1] + Math.sin(a) * s.r;
      } else {
        const k = (1 - Math.cos(TAU * (t / s.period + (s.phase || 0)))) / 2;
        lx = s.x + (s.to[0] - s.x) * k;
        ty = s.y + (s.to[1] - s.y) * k;
      }
      const px = s.mirror ? r.px + r.pw - (lx + (s.w || 2)) * T : r.px + lx * T;
      return { x: px, y: r.py + ty * T };
    },
    place(m, t) { const p = this.at(m, t); m.x = p.x; m.y = p.y; },

    // advance the shared clock one tick and move every platform
    update() {
      if (this.rooms !== W().rooms) this.build();
      this.t++;
      for (const m of this.list) {
        const ox = m.x, oy = m.y;
        this.place(m, this.t);
        m.dx = m.x - ox; m.dy = m.y - oy;
        if (m.dip > 0) m.dip = Math.max(0, m.dip - 0.06);
      }
    },

    // The kitten just landed on one: a little squash of the platform
    landed(body) {
      const m = body.ride;
      if (m) m.dip = 1;
    },

    // samples along a platform's whole path (for the verifier and tests)
    samples(m, k = 24) {
      const out = [];
      for (let j = 0; j < k; j++) out.push(this.at(m, (j / k) * m.spec.period));
      return out;
    },

    // ──── Drawing ────
    drawTracks(c, cam, rooms, t) {
      c.save();
      for (const room of rooms) {
        for (const s of room.def.movers || []) {
          const tint = s.orbit ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.26)';
          c.fillStyle = tint;
          if (s.orbit) {
            const cx = (s.mirror ? room.px + room.pw - s.orbit[0] * T : room.px + s.orbit[0] * T) - cam.x;
            const cy = room.py + s.orbit[1] * T - cam.y + 4;
            const rr = s.r * T;
            const dots = Math.max(12, Math.round(rr / 9));
            for (let i = 0; i < dots; i++) {
              const a = TAU * (i / dots) + t * 0.004;
              G().circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.8, c); c.fill();
            }
            // a little hub with spokes
            c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2;
            for (const m of this.list) if (m.spec === s) {
              c.beginPath(); c.moveTo(cx, cy); c.lineTo(m.x + m.w / 2 - cam.x, m.y - cam.y + 4); c.stroke();
            }
            c.fillStyle = 'rgba(255,255,255,0.5)'; G().circle(cx, cy, 5, c); c.fill();
          } else {
            const a = this.at({ spec: s, room, i: 0, n: 1 }, 0), b = this.at({ spec: s, room, i: 0, n: 1 }, s.period / 2 - (s.phase || 0) * s.period);
            const w = (s.w || 2) * T;
            const ax = a.x + w / 2 - cam.x, ay = a.y + 5 - cam.y, bx = b.x + w / 2 - cam.x, by = b.y + 5 - cam.y;
            const len = Math.hypot(bx - ax, by - ay), dots = Math.max(2, Math.round(len / 14));
            for (let i = 0; i <= dots; i++) {
              const k = i / dots;
              G().circle(ax + (bx - ax) * k, ay + (by - ay) * k, i === 0 || i === dots ? 3 : 1.8, c); c.fill();
            }
          }
        }
      }
      c.restore();
    },

    // front = false: behind the kitten (tracks too); true: rafts over water
    draw(c, cam, rooms, t, front = false) {
      if (!this.list.length) return;
      if (!front) this.drawTracks(c, cam, rooms, t);
      for (const m of this.list) {
        if (!rooms.includes(m.room) || !!m.wet !== front) continue;
        const x = m.x - cam.x, y = m.y - cam.y + Math.sin(m.dip * Math.PI) * 4;
        if (x + m.w < -40 || x > G().W + 40 || y < -60 || y > G().H + 60) continue;
        DRAW[m.skin](c, x, y, m.w, t, m, BB.ZONES[m.room.zone]);
      }
    },
  };

  // ──── One look per zone (each is drawn with its top surface at y) ────
  const DRAW = {
    flower(c, x, y, w, t) {
      // a big daisy pad on a curly stem-leaf
      const cx = x + w / 2;
      c.fillStyle = '#5aa845'; G().ellipse(cx, y + 9, w / 2 + 2, 7, 0, c); c.fill();
      for (let i = 0; i < 9; i++) {
        const px = x + 4 + (i / 8) * (w - 8);
        c.fillStyle = i % 2 ? '#ffd1e8' : '#ffffff'; c.strokeStyle = '#e48ab4'; c.lineWidth = 1;
        G().ellipse(px, y + 4, 6, 4.5, 0, c); c.fill(); c.stroke();
      }
      c.fillStyle = '#ffd34d'; G().ellipse(cx, y + 3, 8, 4, 0, c); c.fill();
      c.fillStyle = '#ffb02e'; G().circle(cx - 3, y + 2, 1.4, c); c.fill(); G().circle(cx + 3, y + 3, 1.4, c); c.fill();
    },
    cap(c, x, y, w, t, m, Z) {
      const cx = x + w / 2;
      G().drawGlow(cx, y + 6, w * 0.7, '#aaffee', 0.25 + Math.sin(t * 0.06 + m.i) * 0.08, c);
      const g = c.createLinearGradient(0, y - 2, 0, y + 12);
      g.addColorStop(0, '#e9a3f2'); g.addColorStop(1, '#a24fb8');
      c.fillStyle = g; c.strokeStyle = '#6a2c80'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(cx, y + 7, w / 2 + 2, 9, 0, Math.PI, 0); c.lineTo(x + w + 2, y + 9); c.quadraticCurveTo(cx, y + 14, x - 2, y + 9); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#7cf5d4';
      for (let i = 0; i < 4; i++) { G().circle(x + 8 + i * (w - 16) / 3, y + 3 + (i % 2) * 2, 2.2, c); c.fill(); }
      // three dangling glow spores
      c.fillStyle = 'rgba(170,255,238,0.8)';
      for (let i = 0; i < 3; i++) { G().circle(x + w * (0.25 + i * 0.25), y + 16 + Math.sin(t * 0.08 + i) * 2, 1.6, c); c.fill(); }
    },
    crystal(c, x, y, w, t, m) {
      G().drawGlow(x + w / 2, y + 6, w * 0.6, '#b8e8ff', 0.3, c);
      const g = c.createLinearGradient(0, y, 0, y + 14);
      g.addColorStop(0, '#e6f7ff'); g.addColorStop(1, '#6a8cff');
      c.fillStyle = g; c.strokeStyle = '#3d4fa8'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 6, y + 10); c.lineTo(x + w / 2, y + 18); c.lineTo(x + 6, y + 10); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + 6, y + 3); c.lineTo(x + w / 2, y + 12); c.lineTo(x + w - 6, y + 3); c.stroke();
      const sp = (t * 0.05 + m.i) % 3;
      if (sp < 1) { c.fillStyle = `rgba(255,255,255,${1 - sp})`; G().circle(x + w * 0.7, y + 3, 2, c); c.fill(); }
    },
    comb(c, x, y, w, t) {
      // a dripping honeycomb slab
      c.fillStyle = '#f2b33d'; c.strokeStyle = '#a8661a'; c.lineWidth = 1.5;
      G().rrect(x, y, w, 12, 4, c); c.fill(); c.stroke();
      c.strokeStyle = '#c77716'; c.lineWidth = 1;
      for (let hx = x + 6; hx < x + w - 2; hx += 10) {
        c.beginPath();
        for (let k = 0; k < 6; k++) { const a = TAU * k / 6; const px = hx + Math.cos(a) * 4, py = y + 6 + Math.sin(a) * 4; k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.closePath(); c.stroke();
      }
      c.fillStyle = '#ffc34a';
      for (let i = 0; i < 2; i++) {
        const dx = x + w * (0.3 + i * 0.4), len = 3 + ((t * 0.05 + i * 1.7) % 1) * 7;
        G().rrect(dx - 1.5, y + 11, 3, len, 1.5, c); c.fill();
      }
    },
    slab(c, x, y, w, t) {
      c.fillStyle = '#9aa6b1'; c.strokeStyle = '#58636e'; c.lineWidth = 1.5;
      G().rrect(x, y, w, 13, 3, c); c.fill(); c.stroke();
      c.strokeStyle = '#7d8a96'; c.beginPath(); c.moveTo(x + w * 0.4, y + 2); c.lineTo(x + w * 0.45, y + 11); c.stroke();
      c.fillStyle = '#6fae7a'; G().rrect(x - 1, y - 2, w + 2, 5, 2, c); c.fill();
      c.strokeStyle = '#4a8458'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 6, y + 12); c.quadraticCurveTo(x + 4, y + 20, x + 8, y + 24); c.stroke();
      c.fillStyle = 'rgba(191,231,255,0.8)';
      const d = (t * 0.04) % 1; G().circle(x + w - 8, y + 14 + d * 10, 1.8 * (1 - d), c); c.fill();
    },
    cloud(c, x, y, w) {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#cdbff5'; c.lineWidth = 1.5;
      c.beginPath();
      const n = Math.max(3, Math.round(w / 16));
      for (let i = 0; i < n; i++) { const px = x + 8 + i * (w - 16) / (n - 1); c.moveTo(px + 10, y + 7); c.arc(px, y + 7, 10, 0, TAU); }
      c.fill();
      c.beginPath(); G().rrect(x - 2, y + 4, w + 4, 12, 6, c); c.fill(); c.stroke();
      c.fillStyle = '#ffd6ec'; G().circle(x + w * 0.3, y + 11, 2.5, c); c.fill(); G().circle(x + w * 0.7, y + 11, 2.5, c); c.fill();
      c.fillStyle = '#6b5a8f'; G().circle(x + w * 0.42, y + 9, 1.4, c); c.fill(); G().circle(x + w * 0.58, y + 9, 1.4, c); c.fill();
    },
    raft(c, x, y, w) {
      // a little driftwood raft with a shell
      c.fillStyle = '#b07a48'; c.strokeStyle = '#6b4526'; c.lineWidth = 1.2;
      const logs = Math.max(2, Math.round(w / 12));
      for (let i = 0; i < logs; i++) { const lx = x + i * w / logs; G().rrect(lx + 0.5, y, w / logs - 1, 11, 4, c); c.fill(); c.stroke(); }
      c.strokeStyle = '#e8d2a6'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 2, y + 5); c.lineTo(x + w - 2, y + 5); c.stroke();
      c.fillStyle = '#ffb3c7'; c.strokeStyle = '#d06a8a'; c.lineWidth = 1;
      c.beginPath(); c.arc(x + w - 9, y - 1, 4, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    },
    carpet(c, x, y, w, t, m) {
      // a flying carpet that ripples
      const wave = k => Math.sin(t * 0.12 + k * 0.25 + m.i) * 2;
      c.fillStyle = '#c0392b'; c.strokeStyle = '#7b1f17'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y + wave(0));
      for (let k = 1; k <= 8; k++) c.lineTo(x + k * w / 8, y + wave(k));
      for (let k = 8; k >= 0; k--) c.lineTo(x + k * w / 8, y + 9 + wave(k));
      c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#f7c948'; c.lineWidth = 1.5;
      c.beginPath(); for (let k = 0; k <= 8; k++) c[k ? 'lineTo' : 'moveTo'](x + k * w / 8, y + 4.5 + wave(k)); c.stroke();
      c.fillStyle = '#f7c948';
      for (const ex of [x, x + w]) for (let j = 0; j < 3; j++) { G().circle(ex + (ex === x ? -3 : 3), y + 1 + j * 3.5 + wave(ex === x ? 0 : 8), 1.6, c); c.fill(); }
    },
    floe(c, x, y, w) {
      const g = c.createLinearGradient(0, y, 0, y + 14);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a8d8f0');
      c.fillStyle = g; c.strokeStyle = '#6aa6c8'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 4, y + 9); c.lineTo(x + w * 0.6, y + 14); c.lineTo(x + w * 0.3, y + 12); c.lineTo(x + 3, y + 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; G().rrect(x - 1, y - 3, w + 2, 5, 2.5, c); c.fill();
      c.fillStyle = 'rgba(160,220,255,0.9)';
      for (let i = 0; i < 3; i++) { G().rrect(x + 6 + i * (w - 12) / 2, y + 9, 2, 4 + i, 1, c); c.fill(); }
    },
    leaf(c, x, y, w, t, m) {
      const cx = x + w / 2, tilt = Math.sin(t * 0.05 + m.i) * 0.04;
      c.save(); c.translate(cx, y + 5); c.rotate(tilt);
      const col = ['#e8742a', '#d8442a', '#f2b33d'][m.i % 3];
      c.fillStyle = col; c.strokeStyle = BB.mix(col, '#000000', 0.35); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-w / 2 - 4, 0); c.quadraticCurveTo(0, -9, w / 2 + 4, 0); c.quadraticCurveTo(0, 12, -w / 2 - 4, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,240,200,0.7)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0);
      for (let k = -2; k <= 2; k++) { c.moveTo(k * w / 6, 0); c.lineTo(k * w / 6 + 5, -4); c.moveTo(k * w / 6, 0); c.lineTo(k * w / 6 + 5, 4); }
      c.stroke();
      c.restore();
    },
    lantern(c, x, y, w, t, m) {
      // a bamboo raft with a hanging paper lantern
      c.fillStyle = '#9bbf5a'; c.strokeStyle = '#4f6e2a'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { G().rrect(x, y + i * 4, w, 4, 2, c); c.fill(); c.stroke(); }
      const lx = x + w / 2, ly = y + 22 + Math.sin(t * 0.06 + m.i) * 1.5;
      c.strokeStyle = '#5b3b26'; c.lineWidth = 1; c.beginPath(); c.moveTo(lx, y + 12); c.lineTo(lx, ly - 6); c.stroke();
      G().drawGlow(lx, ly, 22, '#ffb36b', 0.45, c);
      c.fillStyle = '#ff6b5a'; c.strokeStyle = '#a8322a'; G().ellipse(lx, ly, 6, 7, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#ffd68a'; G().ellipse(lx, ly, 2.5, 5, 0, c); c.fill();
    },
    star(c, x, y, w, t, m) {
      const cx = x + w / 2;
      G().drawGlow(cx, y + 6, w * 0.8, '#fff6d0', 0.35 + Math.sin(t * 0.08 + m.i) * 0.1, c);
      c.fillStyle = '#ffe27a'; c.strokeStyle = '#c99a2a'; c.lineWidth = 1.5;
      G().rrect(x, y, w, 10, 5, c); c.fill(); c.stroke();
      // a little star face
      c.save(); c.translate(cx, y + 5);
      c.fillStyle = '#fff6d0';
      c.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 7, a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill();
      c.restore();
      c.fillStyle = 'rgba(255,246,208,0.8)';
      for (let i = 0; i < 2; i++) { const d = (t * 0.03 + i * 0.5 + m.i * 0.3) % 1; G().circle(x + (i ? w - 6 : 6), y + 10 + d * 14, 1.6 * (1 - d), c); c.fill(); }
    },
  };
  Movers.SKINS = Object.keys(DRAW);
})(window.BB);
