// ════════════════════════════════════════════════════════════════
//  CAMERA — smooth follow with look-ahead, framed to the current room.
//  When the kitten crosses into another room the camera glides across
//  (Celeste-style) while the action pauses for a heartbeat.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;

  const Cam = BB.Camera = {
    x: 0, y: 0, lookX: 0, lookY: 0,
    slide: null, // { from:{x,y}, to:{x,y}, t, dur }

    clampTo(room, x, y) {
      const G = BB.G;
      // Home and its outdoor rooms share one continuous camera space.
      // Seeing the next room before entering it makes the walk legible.
      if (room.def.cameraGroup) {
        const group = BB.World.rooms.filter(r => r.def.cameraGroup === room.def.cameraGroup);
        const x0 = Math.min(...group.map(r => r.px)), y0 = Math.min(...group.map(r => r.py));
        const x1 = Math.max(...group.map(r => r.px + r.pw)), y1 = Math.max(...group.map(r => r.py + r.ph));
        return { x: BB.clamp(x, x0, x1 - G.W), y: BB.clamp(y, y0, y1 - G.H) };
      }
      return {
        x: BB.clamp(x, room.px, room.px + room.pw - G.W),
        y: BB.clamp(y, room.py, room.py + room.ph - G.H),
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
      this.lookX = p.facing * 50; this.lookY = 0;
      const t = this.targetFor(room, p);
      this.x = t.x; this.y = t.y;
      this.slide = null;
    },

    startSlide(room, p, fromRoom) {
      if (fromRoom && room.def.cameraGroup && room.def.cameraGroup === fromRoom.def.cameraGroup) {
        this.slide = null;
        return;
      }
      const to = this.targetFor(room, p);
      this.slide = { from: { x: this.x, y: this.y }, to, t: 0, dur: C.ROOM_SLIDE };
    },

    get sliding() { return !!this.slide; },

    update(room, p) {
      if (this.slide) {
        const s = this.slide;
        s.t++;
        const k = BB.easeInOut(Math.min(1, s.t / s.dur));
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
