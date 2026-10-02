// ════════════════════════════════════════════════════════════════
//  MAIN — boot, scene switching and the fixed-step game loop.
//  Simulation always runs at exactly 60 ticks per second (so a 144 Hz
//  monitor doesn't make the kitten zoom), and rendering happens once per
//  display frame.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const G = BB.G;

  const SCENES = { title: BB.Title, select: BB.Select, play: BB.Play, pause: BB.Pause };

  const Main = BB.Main = {
    scene: null, name: '',
    fade: 0, fadeDir: 0, next: null,

    // go('play', opts) — fade through a soft lilac; pause/resume are instant
    go(name, opts) {
      BB.Voice.stop();
      if (name === 'pause') { this.set('pause'); return; }
      if (name === 'play-resume') { this.scene = BB.Play; this.name = 'play'; BB.Input.clearAll(); return; }
      this.next = { name, opts };
      this.fadeDir = 1;
    },

    set(name, opts) {
      BB.Voice.stop();
      this.name = name;
      this.scene = SCENES[name];
      this.scene.enter(opts || {});
      document.body.classList.toggle('in-play', name === 'play' || name === 'pause');
    },

    update() {
      if (this.fadeDir) {
        this.fade += this.fadeDir * 0.07;
        if (this.fade >= 1 && this.fadeDir > 0) {
          this.fade = 1; this.fadeDir = -1;
          BB.Particles.clear();
          this.set(this.next.name, this.next.opts);
          this.next = null;
        } else if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; }
        if (this.fadeDir > 0) return; // freeze the old scene while fading out
      }
      this.scene.update();
    },

    draw() {
      const p = BB.Play;
      document.body.classList.toggle('menu-open', this.name !== 'play' || !!(p.wardrobe || p.gardenChoice || p.portalChoice || p.mapOn || p.maze && p.maze.choice));
      G.begin();
      const c = G.ctx;
      c.save();
      this.scene.draw(c);
      c.restore();
      if (this.fade > 0) {
        c.fillStyle = `rgba(40,24,70,${this.fade})`;
        c.fillRect(0, 0, G.W, G.H);
      }
    },
  };

  // ──── Adaptive quality ────
  // If frames are consistently slow (an older PC without much graphics
  // power), gently lower the render resolution until play is smooth.
  let slowT = 0, avgDt = 16.7;
  function adaptQuality(dt) {
    if (document.hidden || dt > 200) return;
    avgDt = avgDt * 0.95 + dt * 0.05;
    if (avgDt > 24 && G.scale > 0.8) {
      if (++slowT > 120) {
        G.maxScale = Math.max(0.75, Math.min(G.maxScale, G.scale) - 0.25);
        G.resize(); BB.Tiles.clear();
        slowT = 0; avgDt = 16.7;
      }
    } else slowT = Math.max(0, slowT - 1);
  }

  // ──── Loop ────
  let acc = 0, last = performance.now();
  function frame(now) {
    adaptQuality(now - last);
    acc += Math.min(100, now - last);
    last = now;
    let steps = 0;
    while (acc >= C.STEP && steps < 6) {
      BB.Input.poll();
      if (BB.Input.any) BB.Audio.init();
      if (BB.Audio.ctx && BB.Music.wanted && BB.Music.current !== BB.Music.wanted) BB.Music.play(BB.Music.wanted);
      Main.update();
      acc -= C.STEP;
      steps++;
    }
    if (steps >= 6) acc = 0;
    Main.draw();
    requestAnimationFrame(frame);
  }

  // ──── Boot ────
  function boot() {
    BB.setupInputDom();
    G.resize();
    BB.onResize = () => G.resize();
    BB.onScaleChange = () => { BB.Tiles.clear(); };
    window.addEventListener('resize', () => G.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => G.resize(), 200));

    // taps & clicks on the canvas → logical coordinates for the scenes
    const cv = G.canvas;
    const unlock = () => BB.Audio.init();
    cv.addEventListener('pointerdown', e => {
      unlock();
      const p = G.toLogical(e.clientX, e.clientY);
      BB.Input.pointers.push(p);
      BB.Input.pointerDown = p;
      e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      const p = G.toLogical(e.clientX, e.clientY), I = BB.Input;
      if (I.pointerDown) I.pointerDown = p;
      if (e.pointerType === 'mouse' && (!I.pointerPos || p.x !== I.pointerPos.x || p.y !== I.pointerPos.y)) {
        I.pointerPos = p; I.pointerVersion++;
      }
    });
    cv.addEventListener('pointerleave', () => {
      if (BB.Input.pointerPos) { BB.Input.pointerPos = null; BB.Input.pointerVersion++; }
    });
    window.addEventListener('pointerup', () => { BB.Input.pointerDown = null; });
    window.addEventListener('pointercancel', () => { BB.Input.pointerDown = null; });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });

    document.getElementById('pause-btn').addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      unlock();
      if (Main.name === 'play' && !BB.Play.gift) Main.go('pause');
      else if (Main.name === 'pause') { BB.Pause.leave(); Main.go('play-resume'); }
    });
    const mapBtn = document.getElementById('map-btn');
    mapBtn.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      unlock();
      if (Main.name === 'play') BB.Play.toggleMap();
    });
    // stepping away from the tablet pauses the game
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Main.name === 'play' && !BB.Play.gift) Main.go('pause');
    });

    BB.Save.load();
    Main.set('title');
    // Developer shortcut (never needed to play): index.html#play=phoebe&room=c4&ab=all
    // jumps straight into a room, optionally with every power; replay=1 makes
    // it a Rainbow adventure (Rainbow's family is lost). demo=rewards
    // seeds a save-free preview so a grown-up can try the optional extras.
    const h = location.hash;
    const m = /play=(\w+)/.exec(h);
    if (m) {
      const room = /room=(\w+)/.exec(h), all = /ab=all/.test(h);
      const demo = /(?:^#|&)demo=rewards(?:&|$)/.test(h);
      // demo=rainbow: a save-free Rainbow adventure, to meet her family
      const rainbowDemo = /(?:^#|&)demo=rainbow(?:&|$)/.test(h);
      if (room || all || demo || rainbowDemo) BB.Save.data = BB.Save.fresh();
      if (rainbowDemo) {
        BB.Save.preview = true;
        Object.assign(BB.Save.data, { replayCount: 1, rainbowUnlocked: true, introDone: 1, leftHome: 1 });
        Object.keys(BB.Save.data.abilities).forEach(k => { BB.Save.data.abilities[k] = true; });
      }
      if (demo) {
        BB.Save.preview = true;
        BB.World.build();
        const s = BB.Save.data;
        for (const th of BB.World.findThings('*').slice(0, 250)) s.sparkles[th.tx + ',' + th.ty] = 1;
        for (const ch of ['b', 'c']) for (const th of BB.World.findThings(ch)) s.friends[th.tx + ',' + th.ty] = 1;
        for (const r of BB.World.rooms) if (r.def.family) s.family[r.def.family] = 1;
        for (const a of BB.Wardrobe.LIST) if (a.boss) s.outfits[a.id] = 1;
        s.introDone = 1; s.leftHome = 1; s.finale = true;
      }
      if (all) Object.keys(BB.Save.data.abilities).forEach(k => { BB.Save.data.abilities[k] = true; });
      if (/replay=1/.test(h)) Object.assign(BB.Save.data, { replayCount: 1, rainbowUnlocked: true, introDone: 1, leftHome: 1 });
      if (room) {
        BB.World.build();
        const r = BB.World.byId[room[1]];
        const th = r && (r.things.find(t => t.ch === 'B') || r.things.find(t => 'RLUDf'.includes(t.ch)) || r.things[0]);
        if (th) { BB.Save.data.x = th.tx * C.TILE + 6; BB.Save.data.y = th.ty * C.TILE + 8 - 24; }
      }
      Main.set('play', { cat: m[1] });
    }
    requestAnimationFrame(frame);
  }

  boot();
})(window.BB);
