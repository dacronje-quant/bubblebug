// ════════════════════════════════════════════════════════════════
//  PAUSE — four big picture buttons: keep playing ▶, sound 🔊,
//  kingdom map 🗺 and home 🏠 (back to the title screen). The map shows
//  every room you've visited in its biome colour, a star on rooms
//  whose sparkles are all found, and your kitten's face where you are.
//  It stays zoomed in; browse it with ◀ ▶ (▲ ▼) held down, by dragging, or
//  with its arrow buttons, and close it with ✕ (or jump / bubble / Esc / M).
//  It is the game's one map: the map button (or M / Tab / Select) during
//  play opens the very same map, and closing it then goes straight back
//  to playing.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const TAU = Math.PI * 2;
  const BUTTONS = ['resume', 'sound', 'map', 'home'];

  BB.Pause = {
    t: 0, focus: 0, map: false, fromPlay: false,
    enter() { this.t = 0; this.focus = 0; this.map = false; this.fromPlay = false; BB.Music.setMood({ paused: true }); },
    // the map straight from play (map button, M / Tab / Select)
    openMap() {
      BB.Main.go('pause');
      this.fromPlay = true; this.focus = 2;
      this.map = true; this.t = 0; this.drag = null; this.holdT = 0; BB.MapView.openFull();
      BB.Audio.sfx.select();
    },
    closeMap() {
      this.map = false; this.t = 0; this.drag = null; BB.Audio.sfx.select();
      if (this.fromPlay) { this.leave(); BB.Main.go('play-resume'); }
    },
    leave() { BB.Music.setMood({ energy: 0.3 }); },

    pos(i) { return { x: G().W / 2 + (i - 1.5) * 150, y: G().H / 2 + 20 }; },

    activate(i) {
      const b = BUTTONS[i];
      BB.Audio.sfx.select();
      if (b === 'resume') { this.leave(); BB.Main.go('play-resume'); }
      else if (b === 'sound') BB.Audio.toggle();
      else if (b === 'map') { this.map = true; this.t = 0; this.drag = null; this.holdT = 0; BB.MapView.openFull(); }
      else if (b === 'home') { this.leave(); BB.Play.writeSave(); BB.Main.go('title'); }
    },

    update() {
      this.t++;
      G().t++;
      const I = BB.Input;
      const taps = I.takePointers();
      if (this.map) return this.updateMap(I, taps);
      if (I.pressed.pause || I.pressed.back) { this.leave(); BB.Main.go('play-resume'); return; }
      if (I.pressed.map) { this.focus = 2; this.activate(2); return; }
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
      G().text('AI-generated story voices', G().W / 2, G().H - 24, 12, '#e2d6ec', null, 'center', c);
    },

    // browsing the kingdom map
    updateMap(I, taps) {
      const M = BB.MapView;
      const close = () => this.closeMap();
      M.tick();
      // (▲ is also "jump" on the keyboard, so jump alone doesn't close the map)
      if (this.t > 8 && (I.pressed.confirm || I.pressed.bubble || I.pressed.back || I.pressed.pause || I.pressed.map)) return close();
      const sp = 10 / M.zoom();
      if (I.held.left) M.pan(-sp, 0);
      if (I.held.right) M.pan(sp, 0);
      if (I.held.up) M.pan(0, -sp);
      if (I.held.down) M.pan(0, sp);
      for (const p of taps) if (M.tapFull(p) === 'close') return close();
      // drag the map around, or hold an arrow button to keep scrolling
      const pd = I.pointerDown;
      const on = pd ? M.controlAt(pd) : null;
      if (pd && (on === 'left' || on === 'right')) {
        if (++this.holdT > 14) M.pan((on === 'left' ? -1 : 1) * sp * 1.5, 0);
      } else this.holdT = 0;
      if (pd && !on) {
        if (this.drag) M.pan(-(pd.x - this.drag.x) / M.zoom(), -(pd.y - this.drag.y) / M.zoom());
        this.drag = { x: pd.x, y: pd.y };
      } else this.drag = null;
    },

    drawMap(c) { BB.MapView.draw(c, 'full', this.t); },
  };
})(window.BB);
