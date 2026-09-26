// ════════════════════════════════════════════════════════════════
//  PAUSE — four big picture buttons: keep playing ▶, sound 🔊,
//  kingdom map 🗺 and home 🏠 (back to the title screen). The map shows
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
      else if (b === 'home') { this.leave(); BB.Play.writeSave(); BB.Main.go('title'); }
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

    drawMap(c) { BB.MapView.draw(c, 'full', this.t); },
  };
})(window.BB);
