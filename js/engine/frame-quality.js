// Resolution follows measured game work, with time-based hysteresis. Display
// cadence alone (including a perfectly healthy 30 Hz tablet) is not overload.
(function (BB) {
  'use strict';
  let avgWork = 0, avgDraw = 0, avgPeriod = 0, slow = 0, healthy = 0, cooldown = 0;
  const Q = BB.FrameQuality = {
    reset() { avgWork = avgDraw = avgPeriod = slow = healthy = cooldown = 0; },
    sample(period, work, draw) {
      if (document.hidden || period <= 0 || period > 150) { this.reset(); return; }
      const weight = 1 - Math.exp(-period / 500);
      avgPeriod = avgPeriod ? BB.lerp(avgPeriod, period, weight) : period;
      avgWork = BB.lerp(avgWork, work, weight);
      avgDraw = BB.lerp(avgDraw, draw, weight);
      cooldown = Math.max(0, cooldown - period);
      const overloaded = avgWork > avgPeriod * 0.82 && avgDraw > avgPeriod * 0.3;
      const spare = avgWork < avgPeriod * 0.5;
      slow = overloaded ? slow + period : Math.max(0, slow - period * 2);
      healthy = spare ? healthy + period : 0;
      if (cooldown) return;
      const G = BB.G;
      let cap = G.maxScale;
      if (slow >= 2000 && G.scale > 0.8) cap = Math.max(0.75, Math.min(cap, G.scale) - 0.25);
      else if (healthy >= 8000 && cap < BB.CFG.MAX_RENDER_SCALE) cap = Math.min(BB.CFG.MAX_RENDER_SCALE, cap + 0.25);
      if (cap !== G.maxScale) {
        G.maxScale = cap; G.resize(); BB.Tiles.clear();
        slow = healthy = 0; cooldown = 3000;
      }
    },
  };
})(window.BB);
