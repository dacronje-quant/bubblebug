// ════════════════════════════════════════════════════════════════
//  CAMERA — smooth follow with look-ahead, framed to the current room, or
//  to its whole camera group (home and its outdoor rooms; a zone's rooms
//  side by side at the same height), so it scrolls straight across those
//  seams. Into any other room it glides across while the kitten and the
//  rest of the adventure keep moving.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const floorDepths = new WeakMap();
  function floorDepth(room) {
    const cached = floorDepths.get(room);
    if (cached && cached.version === room.version) return cached.depth;
    let depth = 0;
    // Find the lowest exposed firm surface, including rooms whose floor has
    // a doorway or pit. Fully filled rows would miss these partial floors.
    for (let row = room.h - 1; row > 0 && !depth; row--) for (let col = 0; col < room.w; col++) {
      const ch = room.grid[row][col];
      if ((ch === '#' || ch === 'I') && !BB.Physics.solidSide(room.grid[row - 1][col])) { depth = (room.h - row) * C.TILE; break; }
    }
    floorDepths.set(room, { version: room.version, depth });
    return depth;
  }
  // A strip of side-by-side rooms shares one floor line: frame it the same
  // way in each of them (the shallowest floor decides) so the camera never
  // hops up or down at a seam.
  function stripDepth(g) {
    let depth = 0;
    for (const r of g.rooms) { const d = floorDepth(r); if (d > 0 && (!depth || d < depth)) depth = d; }
    return depth;
  }

  BB.Camera = {
    x: 0, y: 0, lookX: 0, lookY: 0,
    revision: 0, // snaps mark camera discontinuities for render interpolation
    slide: null, // { from:{x,y}, to:{x,y}, t, dur }

    clampTo(room, x, y) {
      const G = BB.G;
      // Touch play may look a little farther down to keep the lowest firm
      // surface above the controls. The terrain and collision map stay intact.
      const touch = BB.Input.touchEnabled && document.body.classList.contains('touch');
      const g = room.camGroup;
      const soilDepth = !touch ? 0 : g && g.strip ? stripDepth(g) : floorDepth(room);
      const groundPad = bottom => touch && soilDepth > 0 ? Math.max(0, G.touchFloorReserve - soilDepth - (bottom - room.py - room.ph)) : 0;
      // keep the view inside [lo, hi]; a room narrower (or shorter) than the
      // view is simply centred, so the camera never flips between its edges
      const fit = (v, lo, hi, view) => hi - lo <= view ? lo + (hi - lo - view) / 2 : BB.clamp(v, lo, hi - view);
      // A camera group shares one continuous camera space. Seeing the next
      // room before entering it makes the walk legible.
      if (g) return { x: fit(x, g.px, g.px1, G.W), y: fit(y, g.py, g.py1 + groundPad(g.py1), G.H) };
      return {
        x: fit(x, room.px, room.px + room.pw, G.W),
        // A connecting shaft may reveal its real ceiling and the hatch
        // above it before the kitten jumps through the room boundary.
        y: fit(y, room.py - (room.def.ceilingPeek || 0) * C.TILE, room.py + room.ph + groundPad(room.py + room.ph), G.H),
      };
    },

    targetFor(room, p) {
      const G = BB.G;
      const want = {
        x: p.x + p.w / 2 - G.W / 2 + this.lookX,
        // on touchscreens frame the kitten a little higher, clear of the thumb buttons
        y: p.y + p.h / 2 - G.H * (BB.Input.touchEnabled ? 0.5 : 0.55) + this.lookY,
      };
      return this.clampTo(room, want.x, want.y);
    },

    snap(room, p) {
      this.revision++;
      this.lookX = p.facing * 50; this.lookY = 0;
      const t = this.targetFor(room, p);
      this.x = t.x; this.y = t.y;
      this.slide = null;
    },

    // (no glide within a camera group: the camera just scrolls on, and a
    // glide that brought the kitten into the group finishes as it was)
    sameGroup(a, b) { return !!(a && b && a.camGroup && a.camGroup === b.camGroup); },

    startSlide(room, p, fromRoom) {
      if (this.sameGroup(room, fromRoom)) return;
      const to = this.targetFor(room, p);
      const zone = fromRoom && fromRoom.zone !== room.zone;
      this.slide = { from: { x: this.x, y: this.y }, to, t: 0, dur: zone ? C.ZONE_SLIDE : C.ROOM_SLIDE };
    },

    get sliding() { return !!this.slide; },

    update(room, p) {
      if (this.slide) {
        const s = this.slide;
        // The kitten can jump, flap or run during a glide. Aim at its
        // current position so the camera finishes beside it, not where
        // it crossed the room boundary a few ticks ago.
        s.to = this.targetFor(room, p);
        s.t++;
        // smootherstep: starts and lands gently, no sudden lurch
        const u = Math.min(1, s.t / s.dur);
        const k = u * u * u * (u * (u * 6 - 15) + 10);
        this.x = BB.lerp(s.from.x, s.to.x, k);
        this.y = BB.lerp(s.from.y, s.to.y, k);
        if (s.t >= s.dur) this.slide = null;
        return;
      }
      // gentle look-ahead in the facing direction; peek down while falling fast
      this.lookX = BB.lerp(this.lookX, p.facing * 50 + p.vx * 8, 0.04);
      this.lookY = BB.lerp(this.lookY, p.vy > 6 ? 70 : 0, 0.05);
      const t = this.targetFor(room, p);
      this.x = BB.lerp(this.x, t.x, 0.14);
      this.y = BB.lerp(this.y, t.y, p.grounded ? 0.12 : 0.09);
      const c = this.clampTo(room, this.x, this.y);
      this.x = c.x; this.y = c.y;
    },
  };
})(window.BB);
