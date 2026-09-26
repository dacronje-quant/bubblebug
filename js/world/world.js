// ════════════════════════════════════════════════════════════════
//  WORLD — room registry, map parsing and tile queries.
//
//  Every room is placed on one continuous world grid (in tiles), the
//  way Hollow Knight stitches its map together. The kitten's position is
//  always a world position; a "room" is just the rectangle the camera is
//  currently framed to. Walking off one room's edge simply walks you into
//  whichever room sits there — no hand-wired exit tables to get wrong.
//
//  MAP LEGEND ──────────────────────────────────────────────────────────
//   terrain                         things (become entities, tile → air)
//   .  air                          *  sparkle          B  cozy bench
//   #  ground                       b  gloomy bug       c  gloomy bug (alt kind)
//   -  one-way ledge                E  ancient elder    K  Cloud King
//   M  bouncy mushroom              f  guide firefly    T  hidden toy
//   ~  water / mist (dandelion      R L U D  arrow signposts
//      rescue, one sun sadder)      y  yarn ball        n  music flower
//   H  shy wall (walk through!)     o  bloom bud (bubble it to open G)
//   :  glow petal (solid w/ Glow)   F  finale party     S  start spot
//   ^  breezy updraft
//   G  vine gate (opens when every bud in the room blooms, its boss
//      is cheered up, or its puzzle is solved)
//   %  sky-mist (dandelion rescue, even for swimmers)
//   I  ice / sugar-glass: solid, too slippery to climb
//   X  sandstone: solid until the Tortoise's Mighty Paws crumble it
//   1–9 fairy rings: each digit appears exactly twice in the world; with
//      the Badger's gift, stepping into one pops you out at its twin
//   &  a lost member of the kittens' family (hidden down a side passage)
//   Q  a zone's big gloomy boss (the room's `boss:` says who) — cheer
//      them up and the room's gate opens
//   puzzles (each opens its room's G gate when solved):
//   P  paw pad — step on every pad in the room
//   d  lost baby — it follows you home; A  its mama (bring all her babies)
//   k  golden key;  Z  the keyhole it opens
//   V  song bell;  O  the singing stone that shows the tune to repeat
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE;

  const ENTITY_CHARS = '*bcBEKfRLUDTynoFS&QPdAkZVO';
  const DEFS = [];

  // Rooms register themselves from js/world/rooms/*.js
  BB.room = def => { DEFS.push(def); };

  const BUCKET = 16;
  // char-code → one-character string (0 → null: outside the world)
  const CH = [null];
  for (let i = 1; i < 128; i++) CH[i] = String.fromCharCode(i);

  const World = BB.World = {
    rooms: [],
    byId: {},
    buckets: new Map(),
    _last: null,
    bounds: { x0: 0, y0: 0, x1: 0, y1: 0 },

    // Parse (or re-parse) every room definition into live grids.
    build() {
      this.rooms = [];
      this.byId = {};
      this.buckets.clear();
      this._last = null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

      for (const def of DEFS) {
        const h = def.map.length;
        const w = def.map[0].length;
        const room = {
          def, id: def.id, zone: def.zone,
          x: def.x, y: def.y, w, h,
          px: def.x * T, py: def.y * T, pw: w * T, ph: h * T,
          grid: [], things: [], version: 0,
        };
        for (let r = 0; r < h; r++) {
          const line = def.map[r];
          if (line.length !== w) throw new Error(`Room ${def.id}: row ${r} is ${line.length} wide, expected ${w}`);
          const row = line.split('');
          for (let c = 0; c < w; c++) {
            const ch = row[c];
            if (ENTITY_CHARS.includes(ch)) {
              room.things.push({ ch, tx: def.x + c, ty: def.y + r });
              // a treasure tucked between shy walls stays hidden behind them,
              // and anything placed underwater stays surrounded by water
              const west = line[c - 1], east = line[c + 1];
              row[c] = (west === 'H' || east === 'H') ? 'H' : (west === '~' || east === '~') ? '~' : '.';
            }
          }
          room.grid.push(row);
        }
        if (this.byId[room.id]) throw new Error(`Duplicate room id ${room.id}`);
        this.rooms.push(room);
        this.byId[room.id] = room;
        x0 = Math.min(x0, room.x); y0 = Math.min(y0, room.y);
        x1 = Math.max(x1, room.x + w); y1 = Math.max(y1, room.y + h);

        for (let by = Math.floor(room.y / BUCKET); by <= Math.floor((room.y + h - 1) / BUCKET); by++) {
          for (let bx = Math.floor(room.x / BUCKET); bx <= Math.floor((room.x + w - 1) / BUCKET); bx++) {
            const k = bx + ',' + by;
            if (!this.buckets.has(k)) this.buckets.set(k, []);
            this.buckets.get(k).push(room);
          }
        }
      }
      this.bounds = { x0, y0, x1, y1 };
      this._checkOverlaps();
      // Flat char-code grid over the whole world: O(1) tile lookups for
      // physics (0 = outside every room).
      this.gw = x1 - x0; this.gh = y1 - y0;
      this.flat = new Uint8Array(this.gw * this.gh);
      for (const room of this.rooms) this._stamp(room);
      // pair up the fairy rings
      this.portals = new Map();
      const seen = {};
      for (const room of this.rooms) {
        for (let r = 0; r < room.h; r++) for (let c = 0; c < room.w; c++) {
          const ch = room.grid[r][c];
          if (ch >= '1' && ch <= '9') (seen[ch] = seen[ch] || []).push({ tx: room.x + c, ty: room.y + r });
        }
      }
      for (const [d, list] of Object.entries(seen)) {
        if (list.length !== 2) throw new Error(`Fairy ring ${d} appears ${list.length} times (needs exactly 2)`);
        this.portals.set(list[0].tx + ',' + list[0].ty, list[1]);
        this.portals.set(list[1].tx + ',' + list[1].ty, list[0]);
      }
      return this;
    },

    _stamp(room) {
      for (let r = 0; r < room.h; r++) {
        const base = (room.y + r - this.bounds.y0) * this.gw + (room.x - this.bounds.x0);
        for (let c = 0; c < room.w; c++) this.flat[base + c] = room.grid[r][c].charCodeAt(0);
      }
    },

    _checkOverlaps() {
      const rs = this.rooms;
      for (let i = 0; i < rs.length; i++) {
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i], b = rs[j];
          if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
            throw new Error(`Rooms ${a.id} and ${b.id} overlap`);
          }
        }
      }
    },

    roomAtTile(tx, ty) {
      const r0 = this._last;
      if (r0 && tx >= r0.x && ty >= r0.y && tx < r0.x + r0.w && ty < r0.y + r0.h) return r0;
      const list = this.buckets.get(Math.floor(tx / BUCKET) + ',' + Math.floor(ty / BUCKET));
      if (!list) return null;
      for (const r of list) {
        if (tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h) { this._last = r; return r; }
      }
      return null;
    },

    roomAtPx(px, py) { return this.roomAtTile(Math.floor(px / T), Math.floor(py / T)); },

    // Tile character at a world tile, or null when outside every room.
    tile(tx, ty) {
      const b = this.bounds;
      if (tx < b.x0 || ty < b.y0 || tx >= b.x1 || ty >= b.y1) return null;
      return CH[this.flat[(ty - b.y0) * this.gw + (tx - b.x0)]];
    },

    portalTwin(tx, ty) { return this.portals.get(tx + ',' + ty) || null; },

    // `quiet` skips re-painting the room's terrain (for tiles drawn live,
    // like crumbling sandstone)
    setTile(tx, ty, ch, quiet) {
      const r = this.roomAtTile(tx, ty);
      if (!r) return;
      r.grid[ty - r.y][tx - r.x] = ch;
      this.flat[(ty - this.bounds.y0) * this.gw + (tx - this.bounds.x0)] = ch.charCodeAt(0);
      if (!quiet) r.version++;
    },

    // Opens a room's bud gates (G → g).
    openGates(room) {
      for (let r = 0; r < room.h; r++) {
        for (let c = 0; c < room.w; c++) {
          if (room.grid[r][c] === 'G') room.grid[r][c] = 'g';
        }
      }
      this._stamp(room);
      room.version++;
    },

    // Rooms whose rectangle intersects a world-pixel rectangle.
    roomsInRect(x, y, w, h) {
      return this.rooms.filter(r => r.px < x + w && x < r.px + r.pw && r.py < y + h && y < r.py + r.ph);
    },

    findThings(ch) {
      const out = [];
      for (const r of this.rooms) for (const t of r.things) if (t.ch === ch) out.push({ room: r, ...t });
      return out;
    },
  };
})(window.BB);
