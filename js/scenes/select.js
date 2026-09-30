// ════════════════════════════════════════════════════════════════
//  SELECT — pick your kitten for a brand-new adventure. Tap a kitten (or
//  use ◀ ▶ and jump). The highlighted kitten hops and mews hello.
//  (Continuing a saved adventure goes straight from the title screen
//  into the game with the kitten it was saved with.)
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const I = () => BB.Input;
  const S = () => BB.Audio.sfx;
  const CATS = ['marshmallow', 'phoebe'];

  BB.Select = {
    t: 0, sel: 0, chosen: null, chosenT: 0, hopT: [0, 0],

    enter() {
      this.t = 0; this.chosen = null; this.chosenT = 0;
      this.sel = Math.max(0, CATS.indexOf(BB.Save.data.cat));
      this.hoverVersion = I().pointerVersion;
      BB.Music.play('lullaby');
    },

    spot(i) { return { x: G().W / 2 + (i ? 190 : -190), y: 400 }; },

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

      if (this.chosen) {
        if (++this.chosenT === 55) {
          BB.Save.data.cat = this.chosen;
          BB.Main.go('play', { cat: this.chosen });
        }
        return;
      }
      const inp = I();
      if (this.hoverVersion !== inp.pointerVersion) {
        this.hoverVersion = inp.pointerVersion;
        const p = inp.pointerPos;
        if (p && p.y > 170 && p.y < 520) for (let i = 0; i < 2; i++) {
          if (Math.abs(p.x - this.spot(i).x) < 150 && this.sel !== i) this.pick(i);
        }
      }
      if (inp.pressed.left) this.pick(0);
      if (inp.pressed.right) this.pick(1);
      if (inp.pressed.jump || inp.pressed.confirm || inp.pressed.bubble) this.confirm();

      for (const p of inp.takePointers()) {
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
          BB.UI.selectionPaw(c, s.x + 94, s.y - 156, 2.3);
        }
      }

      BB.Particles.draw(c, { x: 0, y: 0 });
      if (this.chosen) {
        c.fillStyle = `rgba(255,250,240,${Math.max(0, (this.chosenT - 30) / 25)})`;
        c.fillRect(0, 0, G().W, G().H);
      }
    },
  };
})(window.BB);
