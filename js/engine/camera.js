// ════════════════════════════════════════════════════════════════
//  CAMERA — smooth follow with look-ahead, framed to the current room's
//  camera frame (a zone's side-by-side rooms share one, so it scrolls
//  straight across them). Crossing into a room with a different frame,
//  the camera glides across while the game keeps running underneath.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;

  const Cam = BB.Camera = {
    x: 0, y: 0, lookX: 0, lookY: 0,
    slide: null, // { from:{x,y}, t, dur }

    clampTo(room, x, y) {
      const G = BB.G, f = room.frame || room;
      return {
        x: BB.clamp(x, f.px, f.px + f.pw - G.W),
        y: BB.clamp(y, f.py, f.py + f.ph - G.H),
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

    startSlide() {
      this.slide = { from: { x: this.x, y: this.y }, t: 0, dur: C.ROOM_SLIDE };
    },

    update(room, p) {
      // gentle look-ahead in the facing direction; peek down while falling fast
      this.lookX = BB.lerp(this.lookX, p.facing * 50 + p.vx * 8, 0.04);
      this.lookY = BB.lerp(this.lookY, p.vy > 6 ? 70 : 0, 0.05);
      const t = this.targetFor(room, p);
      if (this.slide) {
        // ease out from where the camera was towards wherever the kitten is
        // now (it keeps moving during the glide), quickest at the start so
        // the kitten never hangs off the edge of the screen
        const s = this.slide;
        s.t++;
        const k = Math.sin(Math.min(1, s.t / s.dur) * Math.PI / 2);
        this.x = BB.lerp(s.from.x, t.x, k);
        this.y = BB.lerp(s.from.y, t.y, k);
        if (s.t >= s.dur) this.slide = null;
        return;
      }
      this.x = BB.lerp(this.x, t.x, 0.14);
      this.y = BB.lerp(this.y, t.y, p.grounded ? 0.12 : 0.09);
      const c = this.clampTo(room, this.x, this.y);
      this.x = c.x; this.y = c.y;
    },
  };
})(window.BB);
