// Render between completed 60 Hz ticks without changing physics or saved state.
(function (BB) {
  'use strict';
  const fields = ['x', 'y', 'feetY', 't', 'hop', 'rot', 'phase', 'ph', 'squash', 'puff', 'cast', 'blink', 'visualMood', 'grow', 'r'];
  const records = new WeakMap(), active = [];
  let stamp = 0, revision = 0;

  function capture(obj, keys = fields) {
    if (!obj) return;
    let r = records.get(obj);
    if (!r) { r = { obj, keys, before: [], current: [], stamp: -1 }; records.set(obj, r); }
    if (r.stamp === stamp) return;
    r.stamp = stamp;
    for (let i = 0; i < r.keys.length; i++) r.before[i] = obj[r.keys[i]];
    active.push(r);
  }
  function list(items) { if (items) for (const obj of items) capture(obj); }

  BB.RenderMotion = {
    alpha: 1,
    reset() { active.length = 0; stamp++; },
    beforeTick(scene) {
      active.length = 0; stamp++;
      revision = BB.Camera.revision;
      capture(BB.G, ['t']);
      capture(BB.Main, ['fade']);
      capture(BB.Main.scene, scene === 'play' ? ['t', 'narrowDim', 'flash'] : ['t']);
      if (scene !== 'play') return;
      const p = BB.Play;
      capture(BB.Camera, ['x', 'y']);
      capture(BB.Camera.slide, ['t']);
      capture(p.pl); capture(p.pl && p.pl.body, ['x', 'y']);
      const rooms = p.visibleRooms || [];
      for (const room of [p.room, ...rooms]) {
        const e = room && p.ents[room.id];
        if (e) { list(e.things); list(e.bugs); list(e.bosses); }
      }
      list(p.followers); list(p.homeVisitors); list(p.orbs); list(p.healFx); list(p.hopHome);
      list(p.party && p.party.guests); capture(p.party, ['t', 'card']);
      capture(p.iris, ['t']);
      capture(p.gardenBall); capture(p.gift && p.gift.orb);
      list(BB.Bubbles.list); list(BB.Bosses.hazards); list(BB.Food.drops);
      list(BB.Particles.list); list(BB.Particles.ambient); list(BB.Particles.rain);
    },
    draw(alpha, fn) {
      this.alpha = BB.clamp(alpha, 0, 1);
      if (this.alpha === 1) return fn();
      const snapped = revision !== BB.Camera.revision;
      // Save every value before applying any render pose, including when a
      // drawing helper throws. The simulation always receives its exact state.
      for (const r of active) for (let i = 0; i < r.keys.length; i++) r.current[i] = r.obj[r.keys[i]];
      try {
        for (const r of active) {
          const teleported = snapped || (r.keys.includes('x') && Math.abs(r.obj.x - r.before[r.keys.indexOf('x')]) > 128) ||
            (r.keys.includes('y') && Math.abs(r.obj.y - r.before[r.keys.indexOf('y')]) > 128);
          for (let i = 0; i < r.keys.length; i++) {
            const key = r.keys[i], from = r.before[i], to = r.current[i];
            if (typeof from !== 'number' || typeof to !== 'number' || (teleported && (key === 'x' || key === 'y' || key === 'feetY')) ||
                (key === 't' && (to < from || to - from > 1))) continue;
            r.obj[key] = BB.lerp(from, to, this.alpha);
          }
        }
        return fn();
      } finally {
        for (const r of active) for (let i = 0; i < r.keys.length; i++)
          if (typeof r.current[i] === 'number') r.obj[r.keys[i]] = r.current[i];
        this.alpha = 1;
      }
    },
  };
})(window.BB);
