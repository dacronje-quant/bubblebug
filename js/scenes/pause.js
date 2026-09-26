// ════════════════════════════════════════════════════════════════
//  PAUSE — four big picture buttons: keep playing ▶, sound 🔊,
//  kingdom map 🗺 and home 🏠 (back to kitten select). The map shows
//  every room you've visited in its biome colour, a star on rooms
//  whose sparkles are all found, and your kitten's face where you are.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const TAU = Math.PI * 2;
  const BUTTONS = ['resume', 'sound', 'map', 'home'];

  BB.Pause = {
    t: 0, focus: 0, map: false,
    enter() { this.t = 0; this.focus = 0; this.map = false; BB.Music.setMood({ paused: true }); },
    leave() { BB.Music.setMood({ energy: 0.3 }); },

    pos(i) { return { x: G().W / 2 + (i - 1.5) * 150, y: G().H / 2 + 20 }; },

    activate(i) {
      const b = BUTTONS[i];
      BB.Audio.sfx.select();
      if (b === 'resume') { this.leave(); BB.Main.go('play-resume'); }
      else if (b === 'sound') BB.Audio.toggle();
      else if (b === 'map') this.map = true;
      else if (b === 'home') { this.leave(); BB.Play.writeSave(); BB.Main.go('select'); }
    },

    update() {
      this.t++;
      G().t++;
      const I = BB.Input;
      const taps = I.takePointers();
      if (this.map) {
        if ((I.any || taps.length) && this.t > 10) { this.map = false; this.t = 0; }
        return;
      }
      if (I.pressed.pause || I.pressed.back) { this.leave(); BB.Main.go('play-resume'); return; }
      if (I.pressed.left) { this.focus = (this.focus + 3) % 4; BB.Audio.sfx.select(); }
      if (I.pressed.right) { this.focus = (this.focus + 1) % 4; BB.Audio.sfx.select(); }
      if (I.pressed.jump || I.pressed.confirm || I.pressed.bubble) this.activate(this.focus);
      for (const p of taps) {
        for (let i = 0; i < 4; i++) {
          const q = this.pos(i);
          if (Math.hypot(p.x - q.x, p.y - q.y) < 58) { this.focus = i; this.activate(i); }
        }
      }
    },

    draw(c) {
      BB.Play.draw(c);
      c.fillStyle = 'rgba(25,15,45,0.6)'; c.fillRect(0, 0, G().W, G().H);
      if (this.map) return this.drawMap(c);
      const t = this.t;
      for (let i = 0; i < 4; i++) {
        const q = this.pos(i), on = i === this.focus;
        const k = on ? 1.12 + Math.sin(t * 0.1) * 0.04 : 1;
        c.save(); c.translate(q.x, q.y); c.scale(k, k);
        if (on) G().drawGlow(0, 0, 90, '#fff4c2', 0.6, c);
        c.fillStyle = ['#5fd48a', '#5fb8ff', '#ffb35c', '#ff8fb8'][i]; c.strokeStyle = '#ffffff'; c.lineWidth = 5;
        G().circle(0, 0, 48, c); c.fill(); c.stroke();
        c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
        const b = BUTTONS[i];
        if (b === 'resume') { c.beginPath(); c.moveTo(-12, -18); c.lineTo(20, 0); c.lineTo(-12, 18); c.closePath(); c.fill(); }
        else if (b === 'sound') {
          c.beginPath(); c.moveTo(-20, -8); c.lineTo(-10, -8); c.lineTo(2, -18); c.lineTo(2, 18); c.lineTo(-10, 8); c.lineTo(-20, 8); c.closePath(); c.fill();
          if (BB.Audio.muted) { c.beginPath(); c.moveTo(10, -9); c.lineTo(24, 9); c.moveTo(24, -9); c.lineTo(10, 9); c.stroke(); }
          else { c.beginPath(); c.arc(4, 0, 10, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(4, 0, 19, -0.8, 0.8); c.stroke(); }
        } else if (b === 'map') {
          c.beginPath(); c.moveTo(-22, -14); c.lineTo(-8, -20); c.lineTo(8, -14); c.lineTo(22, -20); c.lineTo(22, 16); c.lineTo(8, 22); c.lineTo(-8, 16); c.lineTo(-22, 22); c.closePath(); c.fill();
          c.fillStyle = '#ffb35c'; G().heart(4, 2, 8, c); c.fill();
        } else if (b === 'home') {
          c.beginPath(); c.moveTo(-22, 0); c.lineTo(0, -20); c.lineTo(22, 0); c.lineTo(15, 0); c.lineTo(15, 18); c.lineTo(-15, 18); c.lineTo(-15, 0); c.closePath(); c.fill();
          c.fillStyle = '#ff8fb8'; G().rrect(-5, 5, 10, 13, 3, c); c.fill();
        }
        c.restore();
      }
    },

    drawMap(c) {
      const W = BB.World, save = BB.Play.save;
      // fit the map to the rooms explored so far
      const seen = W.rooms.filter(r => save.visited[r.id]);
      const bd = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      for (const r of seen) { bd.x0 = Math.min(bd.x0, r.x); bd.y0 = Math.min(bd.y0, r.y); bd.x1 = Math.max(bd.x1, r.x + r.w); bd.y1 = Math.max(bd.y1, r.y + r.h); }
      const pad = 90;
      const sc = Math.min(4, (G().W - pad * 2) / (bd.x1 - bd.x0), (G().H - pad * 2) / (bd.y1 - bd.y0));
      const ox = (G().W - (bd.x1 - bd.x0) * sc) / 2, oy = (G().H - (bd.y1 - bd.y0) * sc) / 2;
      const t = this.t;
      // parchment
      c.fillStyle = '#fff6de'; c.strokeStyle = '#d9a95a'; c.lineWidth = 6;
      G().rrect(40, 40, G().W - 80, G().H - 80, 30, c); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(217,169,90,0.35)'; c.lineWidth = 2; c.setLineDash([6, 8]);
      G().rrect(56, 56, G().W - 112, G().H - 112, 22, c); c.stroke(); c.setLineDash([]);
      for (const r of W.rooms) {
        if (!save.visited[r.id]) continue;
        const x = ox + (r.x - bd.x0) * sc, y = oy + (r.y - bd.y0) * sc, w = r.w * sc, h = r.h * sc;
        const Z = BB.ZONES[r.zone];
        c.fillStyle = BB.mix(Z.sky[1], Z.top, 0.45);
        G().rrect(x + 1.5, y + 1.5, w - 3, h - 3, 6, c); c.fill();
        c.strokeStyle = BB.mix(Z.topDark, '#5a3a24', 0.4); c.lineWidth = 2; c.stroke();
        const stars = r.things.filter(th => th.ch === '*');
        if (stars.length && stars.every(s => save.sparkles[s.tx + ',' + s.ty])) {
          c.fillStyle = '#ffd84a'; G().star(x + w - 7, y + 7, 5, 5, 0.5, -Math.PI / 2, c); c.fill();
        }
        if (r.things.some(th => th.ch === 'B')) { c.fillStyle = '#ffd98a'; G().circle(x + 6, y + h - 6, 3, c); c.fill(); }
        if (r.def.elder && save.abilities[r.def.elder]) BB.HUD.abilityIcon(c, r.def.elder, x + w / 2, y + h / 2, 0.6);
        if (r === BB.Play.room) {
          c.strokeStyle = `rgba(255,244,194,${0.6 + Math.sin(t * 0.15) * 0.4})`; c.lineWidth = 3;
          G().rrect(x, y, w, h, 4, c); c.stroke();
          const b = BB.Play.pl.body;
          const kx = ox + (b.x / BB.CFG.TILE - bd.x0) * sc, ky = oy + (b.y / BB.CFG.TILE - bd.y0) * sc;
          BB.Kittens.draw(c, BB.Play.pl.cat, { mode: 'sit', t, happy: true }, kx + 10, ky + 24, Math.max(0.9, sc / 2.2), 1);
        }
      }
    },
  };
})(window.BB);
