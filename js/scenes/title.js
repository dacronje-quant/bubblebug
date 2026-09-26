// ════════════════════════════════════════════════════════════════
//  TITLE — both kittens snoozing on a sunny hill while bubbles drift
//  up. Any key, button or tap at all starts the game.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;

  // shared bits for the menu scenes
  const UI = BB.UI = {
    bubbles: [],
    tickBubbles() {
      if (this.bubbles.length < 18 && Math.random() < 0.08) {
        this.bubbles.push({ x: Math.random() * G().W, y: G().H + 20, r: 6 + Math.random() * 16, v: 0.4 + Math.random() * 0.8, ph: Math.random() * 6, tint: BB.pick(['#d8b8ff', '#ffc6e6', '#ffd27a', '#a8f0c8', '#9fe8ff']) });
      }
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.y -= b.v; b.ph += 0.02;
        if (b.y < -40) this.bubbles.splice(i, 1);
      }
    },
    drawBubbles(c) {
      for (const b of this.bubbles) G().bubble(b.x + Math.sin(b.ph) * 12, b.y, b.r, b.tint, 0.85, c);
    },
    // soft meadow hill scene used behind title & select
    drawScenery(c, t, zone = 0) {
      const cam = { x: t * 0.4, y: 0 };
      BB.Backdrops.draw(c, cam, zone, null, 0, G().H, t);
      const Z = BB.ZONES[zone];
      c.fillStyle = Z.topDark;
      c.beginPath(); c.ellipse(G().W / 2, G().H + 150, G().W * 0.75, 260, 0, Math.PI, 0); c.fill();
      c.fillStyle = Z.top;
      c.beginPath(); c.ellipse(G().W / 2, G().H + 160, G().W * 0.72, 250, 0, Math.PI, 0); c.fill();
      for (let i = 0; i < 14; i++) {
        const fx = 90 + i * 60 + Math.sin(i * 7) * 20;
        const fy = G().H - 60 - Math.sin((fx / G().W) * Math.PI) * 170 + 170 - 40;
        if (fy < G().H - 5) BB.Tiles.flower(c, fx, fy + 30, ['#ff9ec7', '#ffe066', '#ffffff', '#c9a6ff'][i % 4], 1.5);
      }
    },
    logo(c, t, y = 120) {
      const cx = G().W / 2;
      const wob = Math.sin(t * 0.03) * 3;
      c.save();
      c.translate(cx, y + wob);
      c.rotate(Math.sin(t * 0.02) * 0.015);
      c.font = `900 96px ${G().FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = 22; c.strokeStyle = '#4a2a6a'; c.strokeText('Bubblebug', 0, 0);
      c.lineWidth = 10; c.strokeStyle = '#ffffff'; c.strokeText('Bubblebug', 0, 0);
      const g = c.createLinearGradient(0, -45, 0, 45);
      g.addColorStop(0, '#ffd6f0'); g.addColorStop(0.5, '#c9a6ff'); g.addColorStop(1, '#7cc8ff');
      c.fillStyle = g; c.fillText('Bubblebug', 0, 0);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      G().bubble(-250, -38, 16, '#ffffff', 0.9, c);
      G().bubble(262, 30, 11, '#ffffff', 0.9, c);
      c.restore();
      G().text('The Whispering Kingdom', cx, y + 70 + wob * 0.5, 30, '#fff8e8', 'rgba(74,42,106,0.85)');
    },
    playButton(c, x, y, r, t, lit) {
      const k = 1 + Math.sin(t * 0.08) * 0.06 + (lit ? 0.1 : 0);
      G().drawGlow(x, y, r * 2.4, '#fff4c2', 0.6, c);
      c.save(); c.translate(x, y); c.scale(k, k);
      c.fillStyle = '#5fd48a'; c.strokeStyle = '#ffffff'; c.lineWidth = 6;
      G().circle(0, 0, r, c); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(-r * 0.28, -r * 0.42); c.lineTo(r * 0.48, 0); c.lineTo(-r * 0.28, r * 0.42); c.closePath(); c.fill();
      c.restore();
    },
  };

  BB.Title = {
    t: 0,
    enter() { this.t = 0; this.leaving = 0; BB.Music.play('lullaby'); },
    update() {
      this.t++;
      G().t++;
      UI.tickBubbles();
      const taps = BB.Input.takePointers();
      if (!this.leaving && this.t > 20 && (BB.Input.any || BB.Input._anyKey || taps.length)) {
        BB.Input._anyKey = false;
        this.leaving = 1;
        BB.Audio.sfx.confirm();
        BB.Main.go('select');
      }
      BB.Input._anyKey = false;
    },
    draw(c) {
      const t = this.t;
      UI.drawScenery(c, t, 0);
      // both kittens snoozing / sitting on the hill
      BB.Kittens.draw(c, 'marshmallow', { mode: 'sit', t, blink: (t % 240) < 8 ? 1 : 0, yawn: (t % 600) > 520 ? Math.sin(((t % 600) - 520) / 80 * Math.PI) : 0 }, G().W / 2 - 90, G().H - 95, 3.2, 1);
      BB.Kittens.draw(c, 'phoebe', { mode: 'sit', t: t + 50, blink: ((t + 90) % 260) < 8 ? 1 : 0, ear: (t % 170) < 12 ? Math.sin((t % 170) / 12 * Math.PI * 2) : 0 }, G().W / 2 + 90, G().H - 95, 3.2, -1);
      UI.drawBubbles(c);
      UI.logo(c, t);
      UI.playButton(c, G().W / 2, G().H / 2 + 10, 44, t, false);
    },
  };
})(window.BB);
