// ════════════════════════════════════════════════════════════════
//  SELECT — pick your kitten. Tap a kitten (or use ◀ ▶ and jump).
//  The highlighted kitten hops and mews hello. If there's a saved
//  adventure, picking a kitten simply continues it — and a little sprout
//  button (hold it down) lets a grown-up start fresh.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const I = () => BB.Input;
  const S = () => BB.Audio.sfx;
  const CATS = ['marshmallow', 'phoebe'];

  BB.Select = {
    t: 0, sel: 0, chosen: null, chosenT: 0, hopT: [0, 0], holdT: 0, resetFx: 0,

    enter() {
      this.t = 0; this.chosen = null; this.chosenT = 0; this.holdT = 0;
      BB.Save.load();
      this.sel = Math.max(0, CATS.indexOf(BB.Save.data.cat));
      BB.Music.play('lullaby');
    },

    spot(i) { return { x: G().W / 2 + (i ? 190 : -190), y: 400 }; },
    sprout() { return { x: G().W - 60, y: G().H - 56, r: 30 }; },

    pick(i) {
      if (this.sel !== i) { this.sel = i; S().select(); }
      this.hopT[i] = 24;
      S().meow(CATS[i]);
    },

    confirm() {
      if (this.chosen) return;
      this.chosen = CATS[this.sel];
      this.chosenT = 0;
      this.hopT[this.sel] = 30;
      S().meow(this.chosen);
      S().confirm();
      for (let i = 0; i < 30; i++) BB.Particles.burst('confetti', this.spot(this.sel).x, 330, 1, { speed: 4, g: 0.08, life: 70 });
    },

    update() {
      this.t++;
      G().t++;
      BB.UI.tickBubbles();
      BB.Particles.update();
      for (let i = 0; i < 2; i++) if (this.hopT[i] > 0) this.hopT[i]--;
      if (this.resetFx > 0) this.resetFx--;

      if (this.chosen) {
        if (++this.chosenT === 55) {
          BB.Save.data.cat = this.chosen;
          BB.Main.go('play', { cat: this.chosen });
        }
        return;
      }
      const inp = I();
      if (inp.pressed.left) this.pick(0);
      if (inp.pressed.right) this.pick(1);
      if (inp.pressed.jump || inp.pressed.confirm || inp.pressed.bubble) this.confirm();

      // grown-up "fresh start": hold the sprout (or hold Backspace)
      let holding = inp.held.back && !inp.held.pause;
      const sp = this.sprout();
      if (BB.Input.pointerDown && BB.Save.exists()) {
        const p = BB.Input.pointerDown;
        if (Math.hypot(p.x - sp.x, p.y - sp.y) < sp.r + 10) holding = true;
      }
      if (holding && BB.Save.exists()) {
        this.holdT++;
        if (this.holdT > 100) {
          BB.Save.reset();
          this.holdT = 0; this.resetFx = 60;
          S().gate();
          BB.Particles.burst('spark', sp.x, sp.y, 20, { color: '#bff5a8', speed: 3, life: 40 });
        }
      } else this.holdT = Math.max(0, this.holdT - 4);

      for (const p of inp.takePointers()) {
        if (Math.hypot(p.x - sp.x, p.y - sp.y) < sp.r + 10) continue;
        for (let i = 0; i < 2; i++) {
          const s = this.spot(i);
          if (Math.abs(p.x - s.x) < 150 && p.y > 170 && p.y < 520) { this.pick(i); this.confirm(); }
        }
      }
    },

    draw(c) {
      const t = this.t;
      BB.UI.drawScenery(c, t, 0);
      c.fillStyle = 'rgba(40,20,70,0.18)'; c.fillRect(0, 0, G().W, G().H);
      BB.UI.drawBubbles(c);
      BB.UI.logo(c, t, 78);

      for (let i = 0; i < 2; i++) {
        const s = this.spot(i);
        const on = this.sel === i;
        const cat = BB.CATS[CATS[i]];
        // spotlight + cushion
        if (on) G().drawGlow(s.x, s.y - 60, 190, '#fff4c2', 0.65 + Math.sin(t * 0.08) * 0.1, c);
        c.fillStyle = on ? '#ff9ec7' : '#d8b8e8';
        G().ellipse(s.x, s.y + 12, 110, 26, 0, c); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; G().ellipse(s.x - 20, s.y + 4, 60, 8, 0, c); c.fill();
        // kitten
        const hop = this.hopT[i] > 0 ? -Math.sin((1 - this.hopT[i] / 24) * Math.PI) * 40 : 0;
        const chosen = this.chosen === CATS[i];
        const pose = {
          mode: hop < -2 ? 'air' : on ? 'stand' : 'sit', vy: -2, t: t + i * 40,
          happy: on && (chosen || (t % 200) > 150), blink: ((t + i * 70) % 230) < 8 ? 1 : 0,
          yawn: !on && i === 0 && (t % 500) > 420 ? Math.sin(((t % 500) - 420) / 80 * Math.PI) : 0,
          ear: i === 1 && (t % 150) < 12 ? Math.sin((t % 150) / 12 * Math.PI * 2) : 0,
          wiggle: on && i === 1 && (t % 300) > 200,
        };
        c.save();
        if (!on) c.globalAlpha = 0.85;
        BB.Kittens.draw(c, CATS[i], pose, s.x, s.y + hop, on ? 4.8 : 4.2, i ? -1 : 1);
        c.restore();
        // name (for grown-ups) + a bubble in the kitten's own colours
        G().text(cat.name, s.x, s.y + 62, on ? 34 : 28, on ? '#ffffff' : '#f0e6ff', 'rgba(74,42,106,0.85)');
        G().bubble(s.x + (i ? -120 : 120), s.y - 150 + Math.sin(t * 0.05 + i) * 8, 16, cat.bubbleTint, 0.9, c);
        G().bubble(s.x + (i ? -100 : 100), s.y - 118 + Math.sin(t * 0.05 + i + 1) * 8, 9, cat.bubbleTint2, 0.9, c);
        if (on && !this.chosen) {
          // bouncing paw-pointer
          const py = s.y - 190 + Math.sin(t * 0.12) * 6;
          c.fillStyle = '#ffffff'; c.strokeStyle = '#4a2a6a'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(s.x - 14, py - 10); c.lineTo(s.x + 14, py - 10); c.lineTo(s.x, py + 8); c.closePath(); c.fill(); c.stroke();
        }
      }

      // continuing an adventure? show its stars & hearts
      if (BB.Save.exists()) {
        const d = BB.Save.data;
        c.fillStyle = 'rgba(30,20,50,0.4)'; G().rrect(G().W / 2 - 90, 222, 180, 40, 20, c); c.fill();
        c.fillStyle = '#ffd84a'; G().star(G().W / 2 - 62, 242, 11, 5, 0.5, -Math.PI / 2, c); c.fill();
        G().text(String(BB.Save.count(d.sparkles)), G().W / 2 - 28, 243, 20, '#fff6d6', null);
        c.fillStyle = '#ff7eb6'; G().heart(G().W / 2 + 24, 244, 10, c); c.fill();
        G().text(String(BB.Save.count(d.friends)), G().W / 2 + 58, 243, 20, '#ffe3f0', null);
        // sprout "fresh start" button (hold to use)
        const sp = this.sprout();
        c.fillStyle = 'rgba(30,20,50,0.35)'; G().circle(sp.x, sp.y, sp.r, c); c.fill();
        if (this.holdT > 0) {
          c.strokeStyle = '#bff5a8'; c.lineWidth = 5;
          c.beginPath(); c.arc(sp.x, sp.y, sp.r - 3, -Math.PI / 2, -Math.PI / 2 + (this.holdT / 100) * Math.PI * 2); c.stroke();
        }
        c.strokeStyle = '#6cc24a'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(sp.x, sp.y + 14); c.lineTo(sp.x, sp.y - 2); c.stroke();
        c.fillStyle = '#8fe388';
        G().ellipse(sp.x - 8, sp.y - 4, 8, 4, 0.5, c); c.fill();
        G().ellipse(sp.x + 8, sp.y - 8, 8, 4, -0.5, c); c.fill();
      }
      BB.Particles.draw(c, { x: 0, y: 0 });
      if (this.chosen) {
        c.fillStyle = `rgba(255,250,240,${Math.max(0, (this.chosenT - 30) / 25)})`;
        c.fillRect(0, 0, G().W, G().H);
      }
    },
  };
})(window.BB);
