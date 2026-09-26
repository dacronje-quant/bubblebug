// ════════════════════════════════════════════════════════════════
//  LIGHTING — soft, cozy darkness for caverns and hive chambers.
//  A low-resolution shade map is filled with darkness, lights punch
//  soft holes in it, and it's stretched over the scene (the blur from
//  upscaling is free and looks lovely). Coloured lights then add a warm
//  glow on top. Never pitch black: little kids should feel safe.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const RES = 0.25;
  let shade = null;
  const lights = [];

  function ensure() {
    if (!shade) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(G.W * RES); c.height = Math.ceil(G.H * RES);
      shade = { canvas: c, ctx: c.getContext('2d') };
    }
    return shade;
  }

  BB.Lighting = {
    // x, y in screen (logical) px
    add(x, y, r, color = '#fff2c8', strength = 1) { lights.push({ x, y, r, color, strength }); },
    clear() { lights.length = 0; },

    render(c, darkness, tint = '#0b0820') {
      if (darkness > 0.01) {
        const s = ensure(), x = s.ctx;
        x.globalCompositeOperation = 'source-over';
        x.clearRect(0, 0, s.canvas.width, s.canvas.height);
        x.fillStyle = BB.rgba(tint, darkness);
        x.fillRect(0, 0, s.canvas.width, s.canvas.height);
        x.globalCompositeOperation = 'destination-out';
        const img = G.glow('#ffffff');
        for (const L of lights) {
          const r = L.r * RES;
          x.globalAlpha = Math.min(1, L.strength);
          x.drawImage(img, L.x * RES - r, L.y * RES - r, r * 2, r * 2);
        }
        x.globalAlpha = 1;
        x.globalCompositeOperation = 'source-over';
        c.drawImage(s.canvas, 0, 0, G.W, G.H);
      }
      // coloured bloom on top
      c.globalCompositeOperation = 'lighter';
      for (const L of lights) G.drawGlow(L.x, L.y, L.r * 0.55, L.color, 0.18 * L.strength * (0.4 + darkness), c);
      c.globalCompositeOperation = 'source-over';
      lights.length = 0;
    },
  };
})(window.BB);
