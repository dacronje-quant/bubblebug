// ════════════════════════════════════════════════════════════════
//  PLAY — the adventure itself.
//  Owns the kitten, every room's residents, bubbles and particles;
//  runs room-to-room camera glides, the dandelion rescue, the elders'
//  gift ceremony, cozy benches, shy-wall secrets, cavern lighting,
//  adaptive music and the rainbow finale party.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const G = () => BB.G;
  const W = () => BB.World;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;
  const Cam = () => BB.Camera;
  const FX = BB.FX;

  const P = BB.Play = {
    save: null, pl: null, room: null, prevRoom: null,
    ents: {},               // room id → { things: [], bugs: [] }
    zoneCard: 0, cardZone: 0, lastZone: -1,
    gift: null,             // elder ceremony in progress
    party: null,            // finale state
    joy: 0,                 // recent-friendship sparkle for the music
    shy: {},                // room id → current shy-wall opacity
    lastCam: { x: 0, y: 0 },
    t: 0,

    enter(opts) {
      const save = this.save = BB.Save.data;
      save.cat = opts.cat || save.cat;
      W().build();
      // restore opened gates
      for (const room of W().rooms) {
        const buds = room.things.filter(t => t.ch === 'o');
        const king = room.things.find(t => t.ch === 'K');
        if (buds.length && buds.every(b => save.buds[b.tx + ',' + b.ty])) W().openGates(room);
        if (king && save.friends[king.tx + ',' + king.ty]) W().openGates(room);
      }
      // create every room's residents
      this.ents = {};
      const turns = {}; // zone+char → how many critters placed so far (cast rotation)
      for (const room of W().rooms) {
        const e = { things: [], bugs: [] };
        for (const th of room.things) {
          if (th.ch === 'b' || th.ch === 'c' || th.ch === 'K') {
            const k = room.zone + th.ch;
            turns[k] = (turns[k] || 0) + 1;
            e.bugs.push(BB.Bugs.create(th, room, save, turns[k] - 1));
          }
          else { const x = BB.Things.create(th, room, save); if (x) e.things.push(x); }
        }
        this.ents[room.id] = e;
      }
      // the kitten
      let x, y;
      if (save.x != null && W().roomAtPx(save.x + 10, save.y + 12)) { x = save.x; y = save.y; }
      else {
        const s = W().findThings('S')[0];
        x = s.tx * T + (T - C.PW) / 2; y = (s.ty + 1) * T - C.PH;
      }
      this.pl = BB.Player.create(x, y, save.cat);
      this.pl.body.grounded = true;
      this.room = W().roomAtPx(x + 10, y + 12);
      this.prevRoom = null;
      save.visited[this.room.id] = 1;
      Cam().snap(this.room, this.pl.body);
      this.lastCam = { x: Cam().x, y: Cam().y };
      this.gift = null; this.party = null; this.partyStarted = false;
      this.lastZone = -1;
      this.enterZone(this.room.zone);
      BB.Bubbles.clear(); PT().clear();
      this.t = 0;
      this.writeSave();
    },

    enterZone(z) {
      if (z === this.lastZone) return;
      this.lastZone = z;
      this.cardZone = z;
      this.zoneCard = 220;
      BB.Music.play(BB.ZONES[z].key);
    },

    writeSave() {
      const b = this.pl.body;
      const s = this.save;
      s.x = b.lastSafe.x; s.y = b.lastSafe.y;
      s.room = this.room.id;
      BB.Save.write();
    },

    // callbacks handed to entities
    ctx() {
      const self = this;
      return {
        pl: this.pl, save: this.save, partyStarted: this.partyStarted,
        light: (x, y, r, col, s) => BB.Lighting.add(x, y, r, col, s),
        onSparkle(th) {
          self.save.sparkles[th.key] = 1;
          S().sparkle();
          PT().burst('spark', th.x, th.y, 8, { color: '#fff1a8', speed: 2.2, life: 26 });
          PT().ring(th.x, th.y, '#fff1a8', 10);
        },
        onFriend(b) {
          self.save.friends[b.key] = b.kind;
          self.joy = 1;
          self.pl.happyT = 60;
          if (b.king) {
            W().openGates(W().byId[b.room]);
            S().gate(); S().party();
            for (let i = 0; i < 40; i++) PT().burst('confetti', b.x + (Math.random() - 0.5) * 300, b.y - 100, 1, { speed: 2, g: 0.06, life: 120 });
          }
          BB.Save.write();
        },
        onBench(th, sleeping) {
          const b = self.pl.body;
          self.save.bench = { x: th.x - b.w / 2, y: th.y - b.h };
          b.lastSafe.x = th.x - b.w / 2; b.lastSafe.y = th.y - b.h;
          self.writeSave();
          if (sleeping) { S().purr(); }
          else { S().bench(); PT().burst('spark', th.x + 22, th.y - 42, 10, { color: '#ffd98a', speed: 1.8, life: 34 }); }
        },
        onToy(th) {
          self.save.toys[th.toy] = 1;
          S().toy();
          self.pl.happyT = 90;
          PT().burst('confetti', th.x, th.y, 30, { speed: 4, g: 0.08, life: 70 });
          PT().burst('spark', th.x, th.y, 16, { color: '#ffffff', speed: 3, life: 40 });
          BB.Save.write();
        },
        onElder(th) { self.startGift(th); },
        openGates(room) {
          W().openGates(room);
          S().gate();
          for (let r = 0; r < room.h; r++) for (let c = 0; c < room.w; c++) {
            if (room.grid[r][c] === 'g') PT().burst('spark', (room.x + c) * T + 16, (room.y + r) * T + 16, 4, { color: '#bff5a8', speed: 2, life: 36 });
          }
          BB.Save.write();
        },
        onFinale(th) { self.startParty(th); },
      };
    },

    // ──── Elder gift ceremony ────
    startGift(th) {
      if (this.pl.state !== 'play' || this.gift) return;
      this.pl.state = 'gift';
      const b = this.pl.body;
      b.vx = 0;
      this.gift = { th, t: 0, ability: th.ability, card: 0 };
      BB.Audio.duck(0.3, 6);
    },

    updateGift() {
      const g = this.gift, b = this.pl.body;
      g.t++;
      // let the kitten settle onto the ground during the ceremony
      if (!b.grounded) BB.Physics.step(b, { left: false, right: false, jump: false, jumpPressed: false }, this.save.abilities);
      const ox = g.th.x, oy = g.th.y - 20, kx = b.x + b.w / 2, ky = b.y + b.h / 2;
      if (g.t < 70) {
        const k = BB.easeInOut(g.t / 70);
        g.orb = { x: BB.lerp(ox, kx, k), y: BB.lerp(oy, ky, k) - Math.sin(k * Math.PI) * 80 };
        if (g.t % 3 === 0) PT().trail('spark', g.orb.x, g.orb.y, '#fff4c2');
      } else if (g.t === 70) {
        g.orb = null;
        this.save.abilities[g.ability] = true;
        S().unlock();
        PT().ring(kx, ky, '#fff4c2', 40);
        PT().burst('spark', kx, ky, 30, { color: '#fff4c2', speed: 4, life: 50 });
        PT().burst('confetti', kx, ky - 20, 30, { speed: 4, g: 0.08, life: 70 });
        this.pl.happyT = 120;
        BB.Save.write();
      } else if (g.t > 110) {
        g.card = Math.min(1, g.card + 0.06);
        if ((g.t > 260 && BB.Input.any) || g.t > 900) {
          this.gift.closing = true;
        }
      }
      if (this.gift.closing) {
        g.card -= 0.08;
        if (g.card <= 0) { this.gift = null; this.pl.state = 'play'; this.pl.idleT = 0; }
      }
    },

    // ──── The rainbow party ────
    startParty(th) {
      this.partyStarted = true;
      this.save.finale = true;
      BB.Save.write();
      const kinds = Object.values(this.save.friends).filter(k => typeof k === 'string' && k !== 'king');
      const guests = [];
      const n = Math.min(kinds.length, 28);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
        guests.push({ kind: kinds[i], x: th.x + side * (70 + (row % 7) * 38), y: th.y + 6 - Math.floor(row / 7) * 96, t: Math.random() * 100, facing: -side });
      }
      this.party = { th, t: 0, guests, card: 0 };
      BB.Music.play('party');
      S().party();
    },

    updateParty() {
      const p = this.party;
      p.t++;
      if (p.t % 25 === 0) PT().burst('confetti', p.th.x + (Math.random() - 0.5) * 700, p.th.y - 300, 12, { speed: 2, g: 0.05, life: 140 });
      if (p.t % 90 === 0) S().party();
      for (const g of p.guests) g.t++;
      if (p.t > 200 && !p.dismissed) {
        p.card = Math.min(1, p.card + 0.04);
        if (p.t > 380 && BB.Input.any) p.dismissed = true;
      }
      if (p.dismissed) p.card = Math.max(0, p.card - 0.06);
    },

    // ──── Main update ────
    update() {
      this.t++;
      G().t++;
      const I = BB.Input;
      if (I.pressed.pause && !this.gift) { BB.Main.go('pause'); return; }

      const cam = Cam();
      if (cam.sliding) {
        cam.update(this.room, this.pl.body);
        PT().update();
        return;
      }

      if (this.gift) this.updateGift();
      if (this.party) this.updateParty();

      const ab = this.save.abilities;
      const fx = BB.Player.update(this.pl, I, ab, {
        bubbleCount: BB.Bubbles.list.length,
        blow: (x, y, dir, vx) => BB.Bubbles.blow(x, y, dir, vx, this.pl.cat),
      });
      if ((fx & FX.HAZARD) && this.pl.state === 'play') BB.Player.startRescue(this.pl);

      // ── room change? glide the camera ──
      const b = this.pl.body;
      if (this.pl.state !== 'rescue') {
        const r = W().roomAtPx(b.x + b.w / 2, b.y + b.h / 2);
        if (r && r !== this.room) {
          this.prevRoom = this.room;
          this.room = r;
          this.save.visited[r.id] = 1;
          cam.startSlide(r, b);
          this.slideFrom = this.prevRoom.zone;
          if (r.zone !== this.prevRoom.zone) this.enterZone(r.zone);
          this.writeSave();
          BB.Bubbles.clear();
          S().whoosh();
          return;
        }
      }

      // ── residents ──
      const ctx = this.ctx();
      const e = this.ents[this.room.id];
      for (const th of e.things) BB.Things.update(th, ctx);
      e.things = e.things.filter(th => !th.dead);
      for (const bug of e.bugs) { bug.lookAt = b.x; BB.Bugs.update(bug, ctx); }

      // ── bubbles ──
      const targets = [];
      for (const bug of e.bugs) {
        if (bug.state === 'bubbled') continue;
        targets.push({ x: bug.x, y: bug.y, r: bug.r, homing: bug.state === 'gloomy', hit: () => BB.Bugs.hit(bug, ctx) });
      }
      for (const th of e.things) { const tg = BB.Things.target(th, ctx); if (tg) targets.push(tg); }
      BB.Bubbles.update(targets);

      // ── shy walls ──
      this.updateShy();

      PT().update();
      BB.Tiles.tick();
      cam.update(this.room, b);
      if (this.zoneCard > 0) this.zoneCard--;
      this.joy = Math.max(0, this.joy - 0.002);

      // ── adaptive music ──
      const moving = Math.min(1, Math.abs(b.vx) / C.RUN + (b.grounded ? 0 : 0.6));
      this.energy = BB.lerp(this.energy || 0, moving, 0.02);
      BB.Music.setMood({ energy: this.energy, calm: this.pl.state === 'bench', joy: this.joy, dark: this.darkness() });

      // stats
      this.save.playTicks++;
    },

    updateShy() {
      const room = this.room, b = this.pl.body;
      let inside = false;
      for (let ty = Math.floor(b.y / T) - 1; ty <= Math.floor((b.y + b.h) / T) + 1 && !inside; ty++) {
        for (let tx = Math.floor(b.x / T) - 1; tx <= Math.floor((b.x + b.w) / T) + 1; tx++) {
          if (W().tile(tx, ty) === 'H') {
            const ox = tx * T, oy = ty * T;
            if (b.x + b.w > ox - 6 && b.x < ox + T + 6 && b.y + b.h > oy && b.y < oy + T) { inside = true; break; }
          }
        }
      }
      if (inside && !this.save.secrets[room.id]) {
        this.save.secrets[room.id] = 1;
        S().secret();
        PT().burst('spark', b.x + 10, b.y, 12, { color: '#ffffff', speed: 2, life: 30 });
      }
      const target = inside ? 0.18 : this.save.secrets[room.id] ? 0.55 : 1;
      this.shy[room.id] = BB.lerp(this.shy[room.id] == null ? 1 : this.shy[room.id], target, 0.12);
    },

    darkness() {
      const room = this.room;
      const d = room.def.dark != null ? room.def.dark : BB.ZONES[room.zone].dark;
      return this.save.abilities.glow ? d * 0.75 : d;
    },

    // ──── Drawing ────
    draw(c) {
      const cam0 = Cam();
      const sc = G().scale;
      const cam = { x: Math.round(cam0.x * sc) / sc, y: Math.round(cam0.y * sc) / sc };
      const t = this.t;
      const room = this.room;

      // backdrop (crossfade during a zone-changing slide)
      let mix = 0, zoneA = room.zone, zoneB = null;
      if (cam0.slide && this.prevRoom && this.prevRoom.zone !== room.zone) {
        zoneA = this.prevRoom.zone; zoneB = room.zone;
        mix = BB.easeInOut(cam0.slide.t / cam0.slide.dur);
      }
      BB.Backdrops.draw(c, cam, zoneA, zoneB, mix, room.py + room.ph, t);

      // ambient drift behind the terrain
      PT().ambientUpdate(BB.ZONES[room.zone].key, !!room.def.rain, cam, this.lastCam);
      this.lastCam = { x: cam.x, y: cam.y };

      const visible = W().roomsInRect(cam.x - 64, cam.y - 64, G().W + 128, G().H + 128);
      const env = { glow: this.save.abilities.glow, px: this.pl.body.x + 10, py: this.pl.body.y + 12 };
      for (const r of visible) BB.Tiles.drawStatic(c, r, cam, 0);
      for (const r of visible) BB.Tiles.drawLive(c, r, cam, t, env);

      const ctx = this.ctx();
      // residents of visible rooms
      for (const r of visible) {
        const e = this.ents[r.id];
        for (const th of e.things) if (th.type !== 'elder') BB.Things.draw(c, th, cam, ctx);
      }
      if (this.party) this.drawGuests(c, cam);
      for (const r of visible) {
        const e = this.ents[r.id];
        for (const th of e.things) if (th.type === 'elder') BB.Things.draw(c, th, cam, ctx);
        for (const bug of e.bugs) BB.Bugs.draw(c, bug, cam);
      }

      BB.Player.draw(c, this.pl, cam, this.save.abilities);
      BB.Bubbles.draw(c, cam);
      PT().draw(c, cam);

      // shy walls drawn in front so secrets stay hidden until stepped into
      for (const r of visible) this.drawShy(c, r, cam);
      for (const r of visible) BB.Tiles.drawLive(c, r, cam, t, env, true);

      if (this.gift && this.gift.orb) {
        const o = this.gift.orb;
        G().drawGlow(o.x - cam.x, o.y - cam.y, 40, '#fff4c2', 1, c);
        c.fillStyle = '#ffffff'; G().circle(o.x - cam.x, o.y - cam.y, 6, c); c.fill();
      }

      // lighting: kitten + glow ability
      const b = this.pl.body;
      const lr = this.save.abilities.glow ? 240 : 150;
      BB.Lighting.add(b.x + b.w / 2 - cam.x, b.y + b.h / 2 - cam.y, lr, '#fff2c8', 1);
      BB.Lighting.render(c, this.darkness());

      PT().ambientDraw(c, t);
      this.drawVignette(c);

      // HUD
      BB.HUD.drawHUD(c, {
        stars: BB.Save.count(this.save.sparkles),
        hearts: BB.Save.count(this.save.friends),
        abilities: this.save.abilities, toys: this.save.toys,
      }, t);
      BB.HUD.drawZoneCard(c, this.cardZone, this.zoneCard / 40, t);
      if (this.gift && this.gift.card > 0) {
        c.fillStyle = `rgba(20,10,40,${0.35 * this.gift.card})`; c.fillRect(0, 0, G().W, G().H);
        BB.HUD.drawAbilityCard(c, this.gift.ability, this.gift.t, this.pl.cat, this.gift.card);
      }
      if (this.party && this.party.card > 0) this.drawPartyCard(c, this.party.card);
    },

    drawShy(c, room, cam) {
      const a = this.shy[room.id] == null ? (this.save.secrets[room.id] ? 0.55 : 1) : this.shy[room.id];
      BB.Tiles.drawStatic(c, room, cam, a, true);
    },

    drawVignette(c) {
      const g = c.createRadialGradient(G().W / 2, G().H / 2, G().H * 0.45, G().W / 2, G().H / 2, G().H * 0.95);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,40,0.28)');
      c.fillStyle = g; c.fillRect(0, 0, G().W, G().H);
    },

    drawGuests(c, cam) {
      for (const g of this.party.guests) {
        const hop = Math.abs(Math.sin(g.t * 0.12)) * -10;
        BB.Critters.drawBug(c, g.kind, g.x - cam.x, g.y - cam.y + hop - 4, { t: g.t, mood: 0, facing: g.facing, joy: true, spin: Math.sin(g.t * 0.1) * 0.2, scale: 1.3 });
        if (g.t % 70 === 0) PT().heart(g.x, g.y - 20);
      }
    },

    drawPartyCard(c, a) {
      const cx = G().W / 2, cy = G().H / 2;
      c.save();
      c.globalAlpha = Math.min(1, a);
      const k = BB.easeOutBack(Math.min(1, a));
      c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
      G().drawGlow(cx, cy, 320, '#fff4c2', 0.6, c);
      c.fillStyle = 'rgba(255,250,240,0.96)'; c.strokeStyle = '#ffcf5c'; c.lineWidth = 6;
      G().rrect(cx - 260, cy - 170, 520, 340, 40, c); c.fill(); c.stroke();
      c.lineWidth = 10;
      ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => {
        c.strokeStyle = col; c.beginPath(); c.arc(cx, cy + 10, 150 - i * 11, Math.PI, 0); c.stroke();
      });
      // the two kittens, celebrating together
      const t = this.party.t;
      BB.Kittens.draw(c, 'marshmallow', { mode: t % 60 < 30 ? 'sit' : 'stand', happy: true, t }, cx - 60, cy + 20, 2.6, 1);
      BB.Kittens.draw(c, 'pip', { mode: t % 60 >= 30 ? 'sit' : 'stand', happy: true, t }, cx + 60, cy + 20, 2.6, -1);
      // tallies: stars, hearts, toys
      const y = cy + 80;
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#c28a14'; c.lineWidth = 2;
      G().star(cx - 150, y, 16, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
      G().text(String(BB.Save.count(this.save.sparkles)), cx - 100, y + 2, 30, '#8a5a14', null);
      c.fillStyle = '#ff7eb6'; c.strokeStyle = '#b8407a';
      G().heart(cx + 20, y + 4, 16, c); c.fill(); c.stroke();
      G().text(String(BB.Save.count(this.save.friends)), cx + 70, y + 2, 30, '#b8407a', null);
      let tx = cx - 110;
      for (const toy of ['yarn', 'feather', 'bell', 'mouse', 'boat', 'star']) {
        c.globalAlpha = Math.min(1, a) * (this.save.toys[toy] ? 1 : 0.2);
        BB.HUD.toyIcon(c, toy, tx, cy + 130, 1.1, t);
        tx += 44;
      }
      c.restore();
    },
  };
})(window.BB);
