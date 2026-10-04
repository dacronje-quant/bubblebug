// ════════════════════════════════════════════════════════════════
//  WAYFINDER — "this way!": a gentle guide along the adventure.
//  The next place to go is the first room along the story (BB.STORY)
//  that hasn't been explored yet. From the room you're in, the guide
//  finds the shortest way there (open doorways between rooms, the
//  Rainbow Lift, a cat flap home and a lit door in the Cat House) and
//  marks the way out of this room: a bouncing golden arrow over the
//  doorway, lift, flap or door when it's on screen, or a soft arrow at
//  the edge of the screen pointing towards it when it isn't.
//  It steps aside during a boss's fight, in menus and cut-scenes, and on
//  Hard it only shows after a few seconds of standing still.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE;
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const W = () => BB.World;

  // ──── The room graph: open doorways between neighbouring rooms ────
  // (rebuilt when any room's tiles change, e.g. a gate opening)
  let graph = null, graphKey = '';
  function doorways() {
    const Wd = W(), P = BB.Physics;
    const key = Wd.rooms.map(r => r.version).join(',');
    if (graph && key === graphKey) return graph;
    // gates and crumbly sandstone count as open: they're the way on once
    // opened, so the guide points right at them
    const air = (x, y) => { const c = Wd.tile(x, y); return c !== null && (!P.solidSide(c) || c === 'G' || c === 'X'); };
    graph = new Map(Wd.rooms.map(r => [r.id, []]));
    const add = (a, b, x, y, dx, dy) => {
      // one entry per run of open tiles: keep the run's middle
      const list = graph.get(a.id), last = list[list.length - 1];
      if (last && last.to === b.id && last.dx === dx && last.dy === dy && Math.abs(last.x1 - x) + Math.abs(last.y1 - y) <= 1) {
        last.x1 = x; last.y1 = y; last.n++;
      } else list.push({ to: b.id, kind: 'walk', x0: x, y0: y, x1: x, y1: y, n: 1, dx, dy });
    };
    for (const a of Wd.rooms) {
      for (let y = a.y; y < a.y + a.h; y++) {
        for (const [x, dx] of [[a.x - 1, -1], [a.x + a.w, 1]]) {
          if (!air(x, y) || !air(x - dx, y)) continue;
          const b = Wd.roomAtTile(x, y);
          if (b && b !== a) add(a, b, x - dx, y, dx, 0);
        }
      }
      for (let x = a.x; x < a.x + a.w; x++) {
        for (const [y, dy] of [[a.y - 1, -1], [a.y + a.h, 1]]) {
          if (!air(x, y) || !air(x, y - dy)) continue;
          const b = Wd.roomAtTile(x, y);
          if (b && b !== a) add(a, b, x, y - dy, 0, dy);
        }
      }
    }
    for (const list of graph.values()) for (const e of list) {
      e.tx = (e.x0 + e.x1) / 2; e.ty = e.dy ? e.y0 : Math.max(e.y0, e.y1); // a side doorway's floor end
    }
    graphKey = key;
    return graph;
  }

  // every way on from a room: doorways, plus the lift, flaps and doors
  function exits(room, save) {
    const out = (doorways().get(room.id) || []).slice();
    // fairy rings (once the Badger Elder's gift lets you use them)
    if ((save.abilities || {}).rings) {
      for (let r = 0; r < room.h; r++) for (let c = 0; c < room.w; c++) {
        const ch = room.grid[r][c];
        if (ch < '1' || ch > '9') continue;
        const twin = W().portals.get((room.x + c) + ',' + (room.y + r)), to = twin && W().roomAtTile(twin.tx, twin.ty);
        if (to && to !== room) out.push({ to: to.id, kind: 'ring', tx: room.x + c, ty: room.y + r, cost: 2 });
      }
    }
    for (const t of room.things) {
      if (t.ch === 'u' || t.ch === 'v') {
        const other = W().findThings(t.ch === 'u' ? 'v' : 'u')[0];
        const to = other && W().roomAtTile(other.tx, other.ty);
        if (to) out.push({ to: to.id, kind: 'lift', tx: t.tx, ty: t.ty, cost: 2 });
      }
      if (t.ch === 'h' && BB.Links.flapOpen(room.zone, Math.max(0, BB.Links.flapTiles(room.zone).findIndex(f => f.tx === t.tx && f.ty === t.ty)), save)) {
        const h = BB.Links.home();
        if (h) out.push({ to: h.id, kind: 'flap', tx: t.tx, ty: t.ty, cost: 6 });
      }
    }
    if (room.def.home && room.def.doors) {
      for (const z of Object.keys(room.def.doors)) {
        if (+z === 0 || !(save.doors || {})[z]) continue; // (the front door is a real doorway)
        const f = BB.Links.flapTile(+z, BB.Links.doorFlap(+z, save));
        const to = f && W().roomAtTile(f.tx, f.ty);
        const d = room.def.doors[z];
        if (to) out.push({ to: to.id, kind: 'door', tx: room.x + d[1], ty: room.y + d[0], cost: 2 });
      }
    }
    return out;
  }

  // the first room along the story not yet explored
  function goal(save) {
    for (const id of BB.STORY) if (!save.visited[id] && W().byId[id]) return id;
    return null;
  }

  // the first step from `from` towards `to` (cheapest route), or null
  function firstStep(from, to, save) {
    if (from.id === to) return null;
    const dist = new Map([[from.id, 0]]), first = new Map(), done = new Set();
    const queue = [from.id];
    while (queue.length) {
      // (small graph: pick the nearest open room each time)
      let bi = 0;
      for (let i = 1; i < queue.length; i++) if (dist.get(queue[i]) < dist.get(queue[bi])) bi = i;
      const id = queue.splice(bi, 1)[0];
      if (done.has(id)) continue;
      done.add(id);
      if (id === to) return first.get(id);
      const room = W().byId[id];
      for (const e of exits(room, save)) {
        const d = dist.get(id) + (e.cost || 1);
        if (dist.has(e.to) && dist.get(e.to) <= d) continue;
        dist.set(e.to, d);
        first.set(e.to, id === from.id ? e : first.get(id));
        queue.push(e.to);
      }
    }
    return null;
  }

  Object.assign(BB.Play, {
    // worked out twice a second (and straight away in a new room)
    updateWay() {
      const way = this.way = this.way || { t: 0, step: null, room: null, show: 0, idle: 0 };
      way.t++;
      const b = this.pl.body;
      way.idle = Math.abs(b.vx) < 0.3 && b.grounded ? way.idle + 1 : 0;
      if (way.room !== this.room || way.t % 30 === 0) {
        way.room = this.room;
        const g = goal(this.save);
        way.goal = g;
        way.step = g ? firstStep(this.room, g, this.save) : null;
      }
      const boss = this.activeBoss;
      const busy = this.pl.state !== 'play' || this.intro || this.gift || this.party || this.maze || this.wardrobe ||
        this.portalChoice || this.gardenChoice || this.traveling || BB.Camera.sliding ||
        (boss && boss.state !== 'happy' && boss.room === this.room.id);
      const want = way.step && !busy && (!BB.Settings.hard || way.idle > 240) ? 1 : 0;
      way.show = BB.lerp(way.show, want, want ? 0.06 : 0.15);
    },

    drawWay(c, cam) {
      const way = this.way;
      if (!way || !way.step || way.show < 0.03) return;
      const s = way.step, t = this.t;
      // where to point: the middle of a doorway, standing height; or the
      // lift / flap / door itself
      let x = (s.tx + 0.5) * T - cam.x, y = (s.ty + 0.5) * T - cam.y;
      let dir = s.kind === 'walk' ? (s.dx ? (s.dx > 0 ? 0 : Math.PI) : (s.dy > 0 ? Math.PI / 2 : -Math.PI / 2)) : Math.PI / 2;
      if (s.kind === 'walk' && s.dx) y -= T * 0.5;
      if (s.kind !== 'walk') y -= T * 2.2; // above the lift, flap or door, pointing down at it
      const m = 46, Wd = G().W, H = G().H;
      const onScreen = x > m && x < Wd - m && y > m + 40 && y < H - m;
      c.save();
      c.globalAlpha = way.show;
      if (onScreen) {
        const bob = Math.sin(t * 0.12) * 6;
        G().drawGlow(x, y, 46, '#fff1b0', 0.55, c);
        arrow(c, x - Math.cos(dir) * bob, y - Math.sin(dir) * bob, dir, 1, t);
      } else {
        // a soft arrow at the screen edge, towards the way on
        const cx = Wd / 2, cy = H / 2, a = Math.atan2(y - cy, x - cx);
        const k = Math.min((Wd / 2 - m) / Math.max(1e-6, Math.abs(Math.cos(a))), (H / 2 - m - 20) / Math.max(1e-6, Math.abs(Math.sin(a))));
        const ex = cx + Math.cos(a) * k, ey = cy + 20 + Math.sin(a) * k;
        const pulse = 0.85 + Math.sin(t * 0.1) * 0.15;
        c.fillStyle = 'rgba(255,248,225,0.82)'; G().circle(ex, ey, 24 * pulse, c); c.fill();
        c.strokeStyle = '#f0b347'; c.lineWidth = 3; c.stroke();
        arrow(c, ex, ey, a, 0.62, t);
      }
      c.restore();
    },
  });

  // a chunky golden arrow pointing along `dir`
  function arrow(c, x, y, dir, s, t) {
    c.save(); c.translate(x, y); c.rotate(dir); c.scale(s, s);
    c.beginPath();
    c.moveTo(22, 0); c.lineTo(2, -18); c.lineTo(2, -8); c.lineTo(-18, -8); c.lineTo(-18, 8); c.lineTo(2, 8); c.lineTo(2, 18); c.closePath();
    c.fillStyle = '#ffd25a'; c.strokeStyle = '#b8761c'; c.lineWidth = 3; c.lineJoin = 'round';
    c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(-15, -5); c.lineTo(2, -5); c.lineTo(2, -2); c.lineTo(-15, -2); c.fill();
    c.restore();
  }

  BB.Wayfinder = { goal, firstStep, exits, doorways };
})(window.BB);
