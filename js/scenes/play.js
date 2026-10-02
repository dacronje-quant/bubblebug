// ════════════════════════════════════════════════════════════════
//  PLAY — the adventure itself.
//  Owns the kitten, every room's residents, bubbles and particles;
//  runs room-to-room camera glides, the kitten's feelings (a gentle kind
//  of danger), save points, the dandelion rescue, bosses, puzzles, the
//  elders' gift ceremony, cozy benches, shy-wall secrets, cavern
//  lighting, adaptive music and the rainbow finale party.
//
//  Feelings: the kitten has four happy suns. A bump from a gloomy
//  critter, a boss's sad attack or a tumble into water / mist costs one.
//  With no suns left the kitten sits down for a little cry, and a soft
//  iris carries it back to the latest save point (the first safe spot
//  it stood on in the current room, or the last cozy bench) with all
//  its suns back. Nothing collected is ever lost. Making a new friend
//  cheers the kitten up (+1 sun) and a nap on a bench fills them all.
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
  const NO_INPUT = { left: false, right: false, jump: false, jumpPressed: false, bubblePressed: false };

  const P = BB.Play = {
    save: null, pl: null, room: null, prevRoom: null,
    ents: {},               // room id → { things: [], bugs: [], bosses: [] }
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
      BB.Economy.milestones(save);
      // create every room's residents
      this.ents = {};
      this.locks = {};
      const turns = {}; // zone+char → how many critters placed so far (cast rotation)
      for (const room of W().rooms) {
        const e = { things: [], bugs: [], bosses: [] };
        for (const th of room.things) {
          if (room.def.maze) continue; // the maze scene owns its collectibles
          if (th.ch === 'b' || th.ch === 'c') {
            const k = room.zone + th.ch;
            turns[k] = (turns[k] || 0) + 1;
            e.bugs.push(BB.Bugs.create(th, room, save, turns[k] - 1));
          } else if (th.ch === 'K' || th.ch === 'Q') {
            // (older saves remember the Cloud King as a friend)
            if (th.ch === 'K' && save.friends[th.tx + ',' + th.ty]) save.bosses[room.id] = 1;
            const b = BB.Bosses.create(th, room, save);
            if (b) e.bosses.push(b);
          } else {
            const x = BB.Things.create(th, room, save);
            if (x) { e.things.push(x); if (x.type === 'lock') this.locks[x.key] = x; }
          }
        }
        if (room.def.home) e.things.push(...BB.Links.hallDoors(room));
        this.ents[room.id] = e;
      }
      // restore opened gates (and any gate whose puzzle was already solved)
      for (const room of W().rooms) {
        if (!room.grid.some(r => r.includes('G'))) continue;
        const need = BB.Puzzles.needs(room, save);
        if (save.gates[room.id] || (need.length && need.every(n => n.done))) { save.gates[room.id] = 1; W().openGates(room); }
      }
      // the kitten, at the save point
      let x, y;
      if (save.inMaze && !BB.GardenMaze.available(save)) { save.inMaze = false; save.mazeReturn = null; save.mazePosition = null; }
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
      // sparkles that moved when the boss arenas were rebuilt don't count twice
      const stars = new Set(W().findThings('*').map(t => t.tx + ',' + t.ty));
      for (const k in save.sparkles) if (!stars.has(k)) delete save.sparkles[k];
      if (save.doorsFromVisited) {
        for (const id in save.visited) {
          const r = W().byId[id];
          if (r && !r.def.home) save.doors[r.zone] = Math.max(save.doors[r.zone] || 0, r.def.arena ? 2 : 1);
        }
        delete save.doorsFromVisited;
      }
      // a save from before the bosses and puzzles existed: open their gates
      // behind the kitten (along the ring, in zone order) so going back for
      // secrets is never blocked. Those bosses stay, ready to be cheered up.
      if (save.openBehind) {
        const here = this.room;
        for (const room of W().rooms) {
          if (!room.grid.some(r => r.includes('G'))) continue;
          if (!BB.Puzzles.needs(room, save).some(n => n.icon !== 'bud')) continue;
          const zo = z => z === BB.HOME_ZONE ? -1 : z;
          const before = BB.zoneDir(here.zone) > 0 ? room.x + room.w <= here.x : room.x >= here.x + here.w;
          if (zo(room.zone) < zo(here.zone) || (room.zone === here.zone && before)) { save.gates[room.id] = 1; W().openGates(room); }
        }
        delete save.openBehind;
      }
      Cam().snap(this.room, this.pl.body);
      this.lastCam = { x: Cam().x, y: Cam().y };
      this.gift = null; this.party = null; this.partyStarted = false;
      this.traveling = null; this.linkLock = null; this.intro = null;
      this.wardrobe = null; this.outfitCard = null; this.mirrorHold = 0; this.toyBounce = {}; this.toyNear = {};
      this.gardenChoice = null; this.gardenHold = 0; this.celebrationT = 0; this.gardenLock = null; this.fountainCd = 0; this.mirrorLock = false;
      this.maze = null;
      this.portalChoice = null; this.journeyHold = 0; this.journeyLock = null; this.replayStarting = false;
      this.rainbowGateOpen = null; this.kinRoom = null; this.kinPulse = 0; this.kinCard = null; this.cloud = null; this.mini = null;
      // An old checkpoint outside the newly locked door must still
      // allow its kitten to walk home before the door closes behind it.
      this.rainbowExitPass = x < (W().byId.hm.x + 2) * T;
      this.syncRainbowGate();
      document.body.classList.remove('in-maze');
      // (the elephant's rain hat became a unicorn horn)
      if (save.outfits && save.outfits.rainhat) { delete save.outfits.rainhat; save.outfits.horn = 1; }
      if (save.wear && save.wear.head === 'rainhat') save.wear.head = 'horn';
      // presents from bosses cheered up before there were presents
      for (const r of W().rooms) if (save.bosses[r.id]) BB.Wardrobe.grant(save, r.def.boss || 'king', false);
      // every boss cheered up has opened the door home to the zone after it
      for (const r of W().rooms) if (save.bosses[r.id] && r.zone < 11) save.doors[r.zone + 1] = Math.max(save.doors[r.zone + 1] || 0, 1);
      this.lastZone = -1;
      // feelings, save point & friends that follow you
      this.mood = C.MOOD_MAX; this.invuln = 60; this.hurtT = 0; this.healT = 0; this.munchT = 0;
      this.trickCard = null; this.trickHint = 0; this.nextTrick = null;
      this.showTrickButton();
      BB.Food.clearDrops();
      this.checkpoint = { x, y };
      this.pendingCP = false;
      this.lantern = null;
      this.iris = { t: 0, close: false };
      this.followers = []; this.trail = [];
      this.timers = []; this.orbs = []; this.hopHome = []; this.healFx = [];
      this.guidance = { jobs: {}, next: 0 };
      this.shakeT = 0; this.shakeAmp = 0;
      this.activeBoss = null; this.bossCard = null; this.bossMusic = false;
      this.homeVisitors = [];
      this.refreshHomeVisitors();
      this.gardenFun = null; this.funHold = 0; this.funLock = null;
      this.gardenBall = null;
      this.signFade = {};
      this.enterZone(this.room.zone);
      if (!save.introDone && this.room.def.home) this.startIntro();
      BB.Bubbles.clear(); PT().clear(); BB.Bosses.clear();
      this.t = 0;
      this.writeSave();
      if (save.inMaze) this.openMaze();
      else this.startHunt(); // (an older finished adventure: Rainbow's family is waiting)
    },

    enterZone(z) {
      if (z === this.lastZone) return;
      this.lastZone = z;
      if (z !== BB.HOME_ZONE && this.save) {
        this.save.lastZone = z; // (its door sparkles at home)
        if (this.save.newDoor === z) delete this.save.newDoor;
      }
      this.cardZone = z;
      this.zoneCard = 220;
      BB.Music.play(BB.ZONES[z].key);
      this.bossMusic = false;
    },

    // The save point is what gets saved as "where you are"
    writeSave() {
      const s = this.save;
      s.x = this.checkpoint.x; s.y = this.checkpoint.y;
      const r = W().roomAtPx(s.x + 10, s.y + 12);
      s.room = r ? r.id : this.room.id;
      BB.Save.write();
    },

    setCheckpoint(x, y, bench) {
      this.checkpoint = { x, y };
      this.pendingCP = false;
      if (bench) this.lantern = null;
      else {
        this.lantern = { x: x + C.PW / 2, y: y + C.PH, t: 0 };
        S().checkpoint();
      }
      this.writeSave();
    },

    // ──── Going through a door, a cat flap, the lift or the slide ────
    travel(dest, kind, from) {
      if (!dest || this.traveling) return;
      BB.Voice.stop();
      // used once: its arrows and "stand here" rings can go now
      const key = from && BB.Links.linkKey(from);
      if (key) { this.save.used = this.save.used || {}; this.save.used[key] = 1; }
      const pl = this.pl;
      this.traveling = { dest, kind, from, t: 0 };
      pl.state = 'travel'; pl.gesture = null;
      pl.body.vx = 0; pl.body.vy = 0;
      this.iris = { t: 0, close: true };
      BB.Bubbles.clear();
      if (kind === 'slide' || kind === 'liftUp' || kind === 'liftDown') { S().whoosh(); S().rescue(); }
      else S().whoosh();
    },

    updateTravel() {
      const tr = this.traveling, pl = this.pl, b = pl.body;
      tr.t++;
      if (tr.kind === 'slide' && tr.t % 3 === 0) PT().trail('star', b.x + b.w / 2, b.y + b.h / 2, '#fff4c2');
      if (tr.t < C.IRIS_TIME) return;
      // arrive
      const d = tr.dest;
      b.x = d.x - b.w / 2; b.y = d.y - b.h; b.vx = 0; b.vy = 0; b.grounded = true; b.climbing = 0;
      b.lastSafe = { x: b.x, y: b.y };
      const r = W().roomAtPx(b.x + b.w / 2, b.y + b.h / 2) || this.room;
      if (r !== this.room) {
        this.leaveRoom(this.room);
        this.prevRoom = this.room;
        this.room = r;
        this.save.visited[r.id] = 1;
        if (r.zone !== this.prevRoom.zone) this.enterZone(r.zone);
      }
      Cam().snap(r, b);
      this.trail = [{ x: b.x + b.w / 2, y: b.y + b.h }];
      for (const f of this.followers) { f.x = b.x + b.w / 2 - b.facing * 20; f.feetY = b.y + b.h; f.y = f.type === 'key' ? b.y - 20 : f.feetY; }
      this.checkpoint = { x: b.x, y: b.y };
      this.pendingCP = false;
      this.linkLock = { x: d.x, y: d.y };
      this.iris = { t: 0, close: false };
      this.traveling = null;
      pl.state = 'play'; pl.idleT = 0; pl.squash = 0.8; pl.happyT = 30;
      PT().burst('spark', b.x + b.w / 2, b.y + b.h / 2, 14, { color: '#fff4c2', speed: 2.4, life: 30 });
      if (tr.kind === 'out') this.save.leftHome = 1;
      if (tr.kind === 'slide') this.homecoming();
      this.writeSave();
    },

    // ──── A new adventure: waking up alone in the Cat House ────
    sayStory(id, delay = 0) {
      const heard = this.save.voiceStory = this.save.voiceStory || {};
      if (heard[id]) return false;
      heard[id] = 1;
      BB.Voice.play(id, delay);
      BB.Save.write();
      return true;
    },
    startIntro() {
      const pl = this.pl, b = pl.body, h = this.room;
      const bed = h.things.find(t => t.ch === 'B');
      if (bed) { b.x = bed.tx * T + T / 2 - b.w / 2; b.y = (bed.ty + 1) * T - b.h; }
      pl.state = 'bench'; pl.benchT = 0;
      this.intro = { t: 0 };
    },
    updateIntro() {
      const it = this.intro, pl = this.pl;
      it.t++;
      if (it.t === 70 && pl.state === 'bench') {
        pl.state = 'play'; pl.idleT = 0; pl.squash = 1.2; BB.Gestures.start(pl, 'stretch'); S().meow(pl.cat);
        this.sayStory(this.save.replayCount ? 'story_replay_start' : 'story_welcome');
      }
      if (it.t > 70 && pl.state === 'play') pl.idleT = 0; // (awake now: no dozing back off on the bed)
      if (it.t > 260 || (it.t > 70 && pl.state === 'play' && (BB.Input.held.left || BB.Input.held.right || BB.Input.held.jump))) {
        this.intro = null; this.save.introDone = 1; BB.Save.write();
      }
    },

    // ──── Home at last ────
    homecoming() {
      if (!this.save.finale) this.startParty();
      else {
        // home again: the family comes running with hearts
        const b = this.pl.body;
        for (let i = 0; i < 12; i++) PT().heart(b.x + (Math.random() - 0.5) * 200, b.y - Math.random() * 60);
        S().befriend();
      }
    },

    // ──── Cat tricks: ▼ does the next one you know ────
    doTrick() {
      const pl = this.pl, b = pl.body;
      if (pl.state === 'bench' && pl.benchT > 20) { pl.state = 'play'; pl.idleT = 0; pl.squash = 1.2; } // wake from a nap
      if (pl.state !== 'play' || pl.gesture || this.gift || this.party) return;
      const known = BB.Gestures.LIST.filter(g => this.save.gestures[g.id]);
      if (!known.length) { this.trickHint = 80; return; }
      if (!b.grounded || b.inWater || b.climbing) return;
      let i = known.findIndex(g => g.id === this.nextTrick);
      if (i < 0) i = 0;
      BB.Gestures.start(pl, known[i].id);
      this.nextTrick = known[(i + 1) % known.length].id;
    },

    showTrickButton() {
      const n = BB.Save.count(this.save.gestures || {});
      document.body.classList.toggle('has-tricks', n > 0);
    },

    // "A new trick!": the kitten doing it beside the smiling-cat button
    drawTrickCard(c, t) {
      const tc = this.trickCard;
      const a = tc.t < 16 ? tc.t / 16 : tc.t > 225 ? Math.max(0, (260 - tc.t) / 35) : 1;
      if (a <= 0) return;
      const g = BB.Gestures.BY[tc.id];
      const cx = G().W / 2, cy = 150 - (1 - Math.min(1, tc.t / 16)) * 24;
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(255,250,240,0.95)'; c.strokeStyle = '#ffc94a'; c.lineWidth = 4;
      G().rrect(cx - 170, cy - 62, 340, 124, 30, c); c.fill(); c.stroke();
      // the kitten doing the trick, over and over
      const lt = (tc.t + 20) % (g.len + 30);
      const p = { t: tc.t, blink: 0, squash: 1, tail: 0 };
      const doing = lt < g.len;
      if (!doing || !BB.Gestures.pose(tc.id, lt, true, p)) { p.mode = 'sit'; p.happy = true; }
      const tf = doing ? BB.Gestures.transform(tc.id, lt) : null;
      const kx = cx - 70, ky = cy + 40;
      c.save();
      c.beginPath(); c.rect(cx - 160, cy - 56, 190, 112); c.clip();
      G().drawGlow(kx, ky - 28, 60, '#fff1c2', 0.7, c);
      if (tf && tf.rot) { c.translate(kx, ky - 22); c.rotate(tf.rot); c.translate(-kx, -(ky - 22)); }
      BB.Kittens.draw(c, this.pl.cat, p, kx, ky, 2.1, tf ? tf.flip : 1);
      c.restore();
      // …and the button that does it (▼, S, D-pad down, or the paw button)
      const bx = cx + 90, by = cy - 4, pulse = (Math.sin(t * 0.15) + 1) / 2;
      BB.HUD.buttonIcon(c, 'trick', bx, by, 1.25, pulse);
      c.strokeStyle = '#9a7ac8'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(bx - 9, by + 36); c.lineTo(bx, by + 45); c.lineTo(bx + 9, by + 36); c.stroke();
      c.restore();
    },

    // Pressed ▼ before finding a trick: its own symbol and a "?".
    drawTrickHint(c, cam) {
      const b = this.pl.body, a = Math.min(1, this.trickHint / 15);
      const x = b.x + b.w / 2 - cam.x + 18, y = b.y - cam.y - 26 - (80 - this.trickHint) * 0.15;
      c.save(); c.globalAlpha = a;
      c.fillStyle = 'rgba(255,255,255,0.92)'; c.strokeStyle = '#b8a0e8'; c.lineWidth = 2;
      G().circle(x - 10, y + 18, 3, c); c.fill(); c.stroke();
      G().circle(x - 5, y + 11, 4.5, c); c.fill(); c.stroke();
      G().circle(x + 8, y - 4, 16, c); c.fill(); c.stroke();
      BB.Gestures.drawIcon(c, x + 1, y - 3, 0.6);
      G().text('?', x + 15, y - 8, 14, '#9a7ac8', null);
      c.restore();
    },

    // ──── Feelings ────
    // Hard: a bump costs a happy sun. Easy / Medium: knock-back and a boing.
    hurt(fromX) {
      const pl = this.pl, b = pl.body;
      if (pl.state !== 'play' || this.invuln > 0 || this.party || this.gift) return false;
      const hard = BB.Settings.hard;
      pl.gesture = null;
      if (hard) {
        this.mood = Math.max(0, this.mood - 1);
        this.hurtT = 36;
      }
      this.invuln = hard ? C.HURT_INVULN : C.BUMP_INVULN;
      pl.hurtT = 24;
      const dir = (b.x + b.w / 2) >= fromX ? 1 : -1;
      b.vx = dir * (b.inWater ? 2.6 : 4.2);
      if (!b.inWater) { b.vy = Math.min(b.vy, -5); b.grounded = false; }
      b.climbing = 0;
      if (hard) {
        S().ouch(pl.cat);
        PT().burst('dot', b.x + b.w / 2, b.y + 4, 9, { color: '#9fc0e8', speed: 2.2, life: 30, size: 3, up: 0.6 });
      } else {
        S().hmph();
        PT().burst('spark', b.x + b.w / 2, b.y + 4, 6, { color: '#fff4c2', speed: 2, life: 22 });
      }
      this.shake(hard ? 5 : 3);
      if (this.mood <= 0) this.startSad();
      return true;
    },

    heal(n, fromX, fromY) {
      if (this.mood >= C.MOOD_MAX) return;
      this.mood = Math.min(C.MOOD_MAX, this.mood + n);
      this.healT = 30;
      if (fromX != null) this.healFx.push({ x: fromX, y: fromY, t: 0 });
      S().cheerUp();
    },

    startSad() {
      const pl = this.pl;
      pl.gesture = null;
      pl.state = 'sad'; pl.sadT = 0;
      pl.body.vx *= 0.3;
      S().tooSad(pl.cat);
      BB.Audio.duck(0.35, 3);
      BB.Bubbles.clear();
    },

    updateSad() {
      const pl = this.pl, b = pl.body;
      pl.sadT++;
      if (!b.grounded) BB.Physics.step(b, NO_INPUT, this.save.abilities, BB.Settings.assists);
      else b.vx *= 0.8;
      if (pl.sadT % 30 === 5) PT().burst('dot', b.x + b.w / 2 + 10, b.y + 6, 2, { color: '#9fd0ff', speed: 1, life: 26, size: 2.4, g: 0.15 });
      if (pl.sadT === C.SAD_TIME - C.IRIS_TIME) this.iris = { t: 0, close: true };
      if (pl.sadT >= C.SAD_TIME) this.respawn();
    },

    respawn() {
      const pl = this.pl, b = pl.body, cp = this.checkpoint;
      b.x = cp.x; b.y = cp.y; b.vx = 0; b.vy = 0; b.grounded = true; b.climbing = 0;
      b.lastSafe = { x: cp.x, y: cp.y };
      const r = W().roomAtPx(b.x + b.w / 2, b.y + b.h / 2) || this.room;
      if (r !== this.room) {
        this.leaveRoom(this.room);
        this.prevRoom = this.room;
        this.room = r;
        if (r.zone !== this.prevRoom.zone) this.enterZone(r.zone);
      }
      Cam().snap(r, b);
      this.mood = C.MOOD_MAX; this.healT = 30;
      this.invuln = C.RESPAWN_INVULN;
      pl.state = 'play'; pl.idleT = 0; pl.happyT = 40; pl.squash = 0.8;
      BB.Bubbles.clear(); BB.Bosses.clear();
      for (const bs of this.ents[r.id].bosses) BB.Bosses.calm(bs);
      for (const th of this.ents[r.id].things) if (th.food) BB.Food.regrow(th, true);
      this.trail = [{ x: b.x + b.w / 2, y: b.y + b.h }];
      for (const f of this.followers) { f.x = b.x + b.w / 2 - b.facing * 20; f.feetY = b.y + b.h; f.y = f.type === 'key' ? b.y - 20 : f.feetY; }
      this.iris = { t: 0, close: false };
      S().respawn();
      PT().burst('spark', b.x + b.w / 2, b.y + b.h / 2, 16, { color: '#fff4c2', speed: 2.5, life: 34 });
    },

    shake(n) { this.shakeT = Math.max(this.shakeT, 14); this.shakeAmp = Math.max(this.shakeAmp, n); },

    // ──── Gates: open when everything the room's sign asks for is done ────
    tryOpen(room) {
      if (!room || this.save.gates[room.id]) return;
      if (!room.grid.some(r => r.includes('G'))) return;
      const need = BB.Puzzles.needs(room, this.save);
      if (!need.length || !need.every(n => n.done)) return;
      this.save.gates[room.id] = 1;
      W().openGates(room);
      S().gate();
      this.signFade[room.id] = 1;
      for (let r = 0; r < room.h; r++) for (let c = 0; c < room.w; c++) {
        if (room.grid[r][c] === 'g') PT().burst('spark', (room.x + c) * T + 16, (room.y + r) * T + 16, 4, { color: '#bff5a8', speed: 2, life: 36 });
      }
      BB.Save.write();
    },

    // ──── Friends that follow you (lost babies, keys) ────
    follow(th) {
      if (th.follow) return;
      th.follow = true;
      th.order = this.followers.filter(f => f.type === th.type).length;
      this.followers.push(th);
      const list = this.ents[th.room].things;
      const i = list.indexOf(th);
      if (i >= 0) list.splice(i, 1);
      if (th.type === 'key') { S().keyGet(); PT().burst('spark', th.x, th.y, 14, { color: '#ffe27a', speed: 2.5, life: 30 }); }
      else { S().peep(); for (let k = 0; k < 4; k++) PT().heart(th.x, th.y - 20); }
    },

    deliver(kid, mama) {
      const i = this.followers.indexOf(kid);
      if (i >= 0) this.followers.splice(i, 1);
      let n = 0;
      for (const f of this.followers) if (f.type === 'baby') f.order = n++;
      this.save.babies[kid.key] = 1;
      this.hopHome.push({ kind: kid.kind, x0: kid.x, y0: kid.feetY, mama, t: 0 });
      BB.Save.write();
    },

    unlock(keyEnt, lock) {
      const i = this.followers.indexOf(keyEnt);
      if (i >= 0) this.followers.splice(i, 1);
      lock.open = true; lock.flash = 30;
      this.save.keys[lock.key] = 1;
      S().unlockDoor();
      PT().burst('spark', lock.x, lock.y - 27, 24, { color: '#ffe27a', speed: 3, life: 40 });
      PT().ring(lock.x, lock.y - 27, '#fff4c2', 24);
      this.shake(3);
      this.tryOpen(W().byId[lock.room]);
    },

    trailPoint(n) {
      const tr = this.trail;
      if (!tr.length) return null;
      return tr[Math.max(0, tr.length - 1 - n)];
    },

    // ──── Bosses ────
    bossWake(b) {
      this.activeBoss = b;
      this.bossCard = { b, t: 0 };
      this.zoneCard = 0;
      BB.Music.play('boss');
      this.bossMusic = true;
      this.shake(4);
    },

    bossHappy(b) {
      if (this.save.bosses[b.room]) return;
      this.save.bosses[b.room] = 1;
      // the way home opens here, and so does the Cat House door to the next zone
      const z = W().byId[b.room].zone;
      if (z < 11) { this.save.doors[z + 1] = Math.max(this.save.doors[z + 1] || 0, 1); this.save.newDoor = z + 1; }
      this.activeBoss = null;
      this.joy = 1;
      this.pl.happyT = 150;
      this.heal(C.MOOD_MAX);
      S().bossHappy();
      this.later(40, () => S().bossFriend(b.kind));
      BB.Voice.cancel('tutorial_goose');
      BB.Voice.play('story_big_friend', 700);
      this.giveOutfit(b.kind);
      BB.Audio.duck(0.3, 4);
      this.later(200, () => { if (this.bossMusic) { BB.Music.play(BB.ZONES[this.room.zone].key); this.bossMusic = false; } });
      this.tryOpen(W().byId[b.room]);
      BB.Save.write();
    },

    leaveRoom(room) {
      BB.Voice.stop();
      if (!room) return;
      if (room.def.home && this.party) { this.party = null; this.partyStarted = false; }
      for (const bs of this.ents[room.id].bosses) BB.Bosses.reset(bs);
      BB.Bosses.clear();
      // snacks are back for next time; boss treats don't wait around
      for (const th of this.ents[room.id].things) if (th.food) BB.Food.regrow(th, true);
      BB.Food.clearDrops();
      this.activeBoss = null;
      this.bossCard = null;
      if (this.bossMusic) { this.bossMusic = false; BB.Music.play(BB.ZONES[room.zone].key); }
    },

    later(n, fn) { this.timers.push({ n, fn }); },

    // callbacks handed to entities
    ctx() {
      const self = this;
      return {
        pl: this.pl, save: this.save, partyStarted: this.partyStarted, room: this.room,
        followers: this.followers,
        light: (x, y, r, col, s) => BB.Lighting.add(x, y, r, col, s),
        hurt: (x) => self.hurt(x),
        shake: n => self.shake(n),
        later: (n, fn) => self.later(n, fn),
        tryOpen: room => self.tryOpen(room),
        openGates: room => self.tryOpen(room),
        follow: th => self.follow(th),
        deliver: (kid, mama) => self.deliver(kid, mama),
        unlock: (k, lock) => self.unlock(k, lock),
        trailPoint: n => self.trailPoint(n),
        findLock: key => self.locks[key] || null,
        entsOf: room => self.ents[room.id].things,
        sendOrb(x, y, roomId) {
          const room = W().byId[roomId];
          const spot = BB.Puzzles.gateSpot(room);
          if (!spot) { self.tryOpen(room); return; }
          self.orbs.push({ x0: x, y0: y, x1: spot.x, y1: spot.y, t: 0, dur: 44, col: BB.ZONES[room.zone].accent, done: () => { S().gateDing(); self.tryOpen(room); } });
        },
        noteOrb(x0, y0, x1, y1, col) { self.orbs.push({ x0, y0, x1, y1, t: 0, dur: 18, col, note: true }); },
        onBossWake: b => self.bossWake(b),
        onBossHappy: b => self.bossHappy(b),
        onSparkle(th) {
          self.save.sparkles[th.key] = 1;
          BB.Economy.milestones(self.save);
          S().sparkle();
          PT().burst('spark', th.x, th.y, 8, { color: '#fff1a8', speed: 2.2, life: 26 });
          PT().ring(th.x, th.y, '#fff1a8', 10);
        },
        onFriend(b) {
          self.save.friends[b.key] = b.kind;
          if (self.save.residents[b.kind]) self.refreshHomeVisitors();
          self.joy = 1;
          self.pl.happyT = 60;
          // making a friend makes you happier too
          self.heal(1, b.x, b.y - 20);
          BB.Save.write();
        },
        onBench(th, sleeping) {
          const b = self.pl.body;
          self.save.bench = { x: th.x - b.w / 2, y: th.y - b.h };
          b.lastSafe.x = th.x - b.w / 2; b.lastSafe.y = th.y - b.h;
          self.setCheckpoint(th.x - b.w / 2, th.y - b.h, true);
          if (sleeping) { S().purr(); if (self.mood < C.MOOD_MAX) self.heal(C.MOOD_MAX, th.x, th.y - 40); }
          else { S().bench(); PT().burst('spark', th.x + 22, th.y - 42, 10, { color: '#ffd98a', speed: 1.8, life: 34 }); }
        },
        onToy(th) {
          self.save.toys[th.toy] = 1;
          S().toy();
          self.later(27, () => S().toySound(th.toy));
          self.pl.happyT = 90;
          PT().burst('confetti', th.x, th.y, 30, { speed: 4, g: 0.08, life: 70 });
          PT().burst('spark', th.x, th.y, 16, { color: '#ffffff', speed: 3, life: 40 });
          BB.Save.write();
        },
        onGlasses(th) {
          self.save.glassesFound[th.item] = 1; self.save.outfits[th.item] = 1;
          self.save.wear.face = th.item; self.save.wardrobeNew = 1;
          self.outfitCard = { id: th.item, t: 0 }; self.pl.happyT = 90;
          S().outfit(); PT().burst('spark', th.x, th.y, 16, { color: '#efcaff', speed: 2, life: 40 });
          if (th.item === 'googly') self.sayGuidance('tutorial_googly_glasses', () => self.save.wear.face === 'googly', 500);
          BB.Save.write();
        },
        onElder(th) { self.startGift(th); },
        // links: doors, cat flaps, the Rainbow Lift and the Rainbow Slide
        linkLocked: th => !!self.linkLock && Math.abs(th.x - self.linkLock.x) < 4 && Math.abs(th.y - self.linkLock.y) < 4,
        travel: (dest, kind, from) => self.travel(dest, kind, from),
        onFlapFound(th) {
          self.save.doors[th.zone] = Math.max(self.save.doors[th.zone] || 0, th.idx + 1);
          S().gateDing();
          PT().burst('spark', th.x, th.y - 30, 14, { color: '#fff4c2', speed: 2.4, life: 32 });
          PT().ring(th.x, th.y - 20, '#ffe9a0', 24);
          BB.Save.write();
        },
        onSlide(th) {
          const sk = BB.Links.skylightTile();
          if (sk) self.travel(BB.Links.spot(sk.tx, sk.ty), 'slide', th);
        },
        // nom nom: in Hard a treat brings a sun back (a bowl, all of them);
        // in Easy it's just yummy
        onEat(th) {
          const big = th.type === 'bowl';
          self.munchT = big ? 70 : 42;
          self.pl.munchT = self.munchT; self.pl.munchLen = self.munchT;
          self.pl.happyT = Math.max(self.pl.happyT, 24);
          S().munch(big);
          PT().burst('dot', th.x, th.y - 16, big ? 14 : 8, { color: '#e0a060', speed: 2.2, life: 26, size: 2.4, g: 0.18, up: 0.9 });
          if (BB.Settings.hard && self.mood < C.MOOD_MAX) self.heal(big ? C.MOOD_MAX : 1, th.x, th.y - 24);
          else for (let i = 0; i < (big ? 7 : 3); i++) PT().heart(th.x + (Math.random() - 0.5) * 34, th.y - 24 - Math.random() * 22);
        },
        dropFood: (x, y) => BB.Food.drop(x, y, self.pl.body.x + self.pl.body.w / 2, self.room),
        // a smiling-cat bubble: a new cat trick to do with ▼
        onTrick(th) {
          self.save.gestures[th.gid] = 1;
          self.nextTrick = th.gid;
          self.trickCard = { id: th.gid, t: 0 };
          self.pl.happyT = 60;
          S().trick();
          PT().burst('spark', th.x, th.y, 18, { color: '#ffe27a', speed: 3, life: 36 });
          PT().ring(th.x, th.y, '#ffe27a', 30);
          self.showTrickButton();
          BB.Save.write();
        },
        onKin: th => self.onKin(th),
        onFamily(th) {
          if (self.save.family[th.fam]) return;
          self.cancelGuidance();
          self.save.family[th.fam] = 1;
          self.pl.happyT = 120;
          self.heal(C.MOOD_MAX, th.x, th.y - 30);
          S().familyFound();
          S().meow(self.pl.cat);
          self.later(36, () => S().meow(th.fam));
          BB.Voice.play('cat_' + th.fam, 1200);
          if (BB.Save.count(self.save.family) === 1) self.sayGuidance('tutorial_first_family', () => BB.Save.count(self.save.family) === 1);
          if (BB.GardenMaze.available(self.save)) self.sayStory('story_family_complete');
          for (let i = 0; i < 14; i++) PT().heart(th.x + (Math.random() - 0.5) * 50, th.y - 20 - Math.random() * 30);
          PT().burst('confetti', th.x, th.y - 30, 24, { speed: 3.5, g: 0.08, life: 70 });
          BB.Save.write();
        },
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
      if (!b.grounded) BB.Physics.step(b, NO_INPUT, this.save.abilities, BB.Settings.assists);
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
        this.heal(C.MOOD_MAX);
        BB.Save.write();
      } else if (g.t > 110) {
        if (g.ability === 'doubleJump') this.sayGuidance('tutorial_double_jump', () => this.gift === g && !g.closing);
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

    // ──── The homecoming party, in the Cat House ────
    // Only the family you found come: they dance in a ring around the
    // kitten (grannies sway, babies bounce). Friends float in on little
    // clouds and the bosses you cheered up wave from the landing upstairs.
    startParty() {
      this.sayStory('story_homecoming', 600);
      const h = this.room, b = this.pl.body;
      this.partyStarted = true;
      this.save.finale = true;
      BB.Save.write();
      const cx = b.x + b.w / 2, floor = (h.y + 32) * T;
      const guests = [];
      // bosses on the landing
      const bosses = W().rooms.filter(r => this.save.bosses[r.id]).map(r => r.def.boss || 'king');
      const upY = (h.y + 20) * T;
      const spots = [];
      for (let col = 5; col <= 55; col += 4.2) if (col < 25.5 || col > 33.5) spots.push(col);
      bosses.forEach((kind, i) => {
        const col = spots[Math.round((i + 0.5) * spots.length / Math.max(1, bosses.length) - 0.5)] || spots[i % spots.length];
        guests.push({ boss: kind, x: (h.x + col) * T, y: upY, t: Math.random() * 100, facing: (h.x + col) * T < cx ? 1 : -1 });
      });
      // friends on clouds, filling the living room air (but not hiding the family wall)
      const kinds = Object.values(this.save.friends).filter(k => typeof k === 'string' && k !== 'king');
      const n = Math.min(kinds.length, 40);
      const cols = [];
      for (let col = 4; col <= 56; col += 2.6) if (col < 23 || col > 37) cols.push(col);
      for (let i = 0; i < n; i++) {
        const col = cols[i % cols.length], row = Math.floor(i / cols.length);
        const x = (h.x + col) * T;
        guests.push({ kind: kinds[i], x, y: (h.y + 23.2 + row * 1.9 + (i % 2) * 0.6) * T, t: Math.random() * 100, facing: x < cx ? 1 : -1, cloud: true });
      }
      // the family ring (Mama first, right beside you)
      const mama = this.mamaId();
      const fam = BB.Home.familyOrder().filter(id => this.save.family[id]);
      fam.sort((a, c) => (c === mama) - (a === mama));
      // (Rainbow's own relatives who are home dance too)
      const kin = BB.RAINBOW_KIN.filter(id => this.save.kin[id]);
      const ring = fam.concat(kin);
      ring.forEach((id, i) => guests.push({ cat: id, ring: true, ang: Math.PI / 2 + (i + 0.5) / ring.length * Math.PI * 2, t: Math.random() * 100 }));
      this.party = { t: 0, guests, card: 0, cx, floor, found: fam.length, total: BB.Home.familyOrder().length };
      this.heal(C.MOOD_MAX);
      this.pl.happyT = 400;
      BB.Music.play('party');
      S().party();
      if (mama && this.save.family[mama]) {
        this.later(30, () => S().meow(mama));
        for (let i = 0; i < 10; i++) PT().heart(cx + (Math.random() - 0.5) * 60, b.y - 10 - Math.random() * 30);
      }
    },

    // the kitten's own Mama (she's the one waiting by the door)
    mamaId() { return this.pl.cat === 'phoebe' ? 'mamaTortie' : this.pl.cat === 'rainbow' ? null : 'mamaMallow'; },

    updateParty() {
      const p = this.party, W0 = G().W;
      p.t++;
      const cy = p.floor - 7 * T;
      if (p.t % 25 === 0) PT().burst('confetti', p.cx + (Math.random() - 0.5) * W0, cy - 120, 12, { speed: 2, g: 0.05, life: 140 });
      if (p.t % 90 === 0) S().party();
      if (p.t % 60 === 0) PT().firework(p.cx + (Math.random() - 0.5) * 700, cy - 60 - Math.random() * 80);
      for (const g of p.guests) g.t++;
      if (p.t > 200 && !p.dismissed) {
        p.card = Math.min(1, p.card + 0.04);
        // everyone found: an extra shower of fireworks as the banner fills up
        if (p.found === p.total && p.t > 240 && p.t < 480 && p.t % 20 === 0) PT().firework(p.cx + (Math.random() - 0.5) * 800, cy - Math.random() * 120);
        if (p.t > 420 && BB.Input.any) p.dismissed = true;
      }
      if (p.dismissed) p.card = Math.max(0, p.card - 0.06);
    },

    // ──── Main update ────
    update() {
      this.t++;
      G().t++;
      const I = BB.Input;
      if (this.replayStarting) return;
      if (this.maze) { this.updateMaze(); return; }
      if (this.cloud) { this.updateCloud(); return; }
      if (this.mini) { this.updateMini(); return; }
      if (this.portalChoice) { this.updateJourneyChoice(); PT().update(); return; }
      if (this.wardrobe) { this.updateWardrobe(); PT().update(); return; }
      if (this.gardenChoice) { this.updateGardenChoice(); PT().update(); return; }
      if (I.pressed.pause && !this.gift && this.pl.state !== 'sad') { BB.Main.go('pause'); return; }
      if (I.pressed.map) { this.toggleMap(); if (BB.Main.name === 'pause') return; }

      // timers, orbs, iris, shake
      for (let i = this.timers.length - 1; i >= 0; i--) { if (--this.timers[i].n <= 0) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); } }
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        if (++o.t >= o.dur) { this.orbs.splice(i, 1); if (o.done) o.done(); }
        else if (o.t % 2 === 0) { const p = orbPos(o); PT().trail(o.note ? 'star' : 'spark', p.x, p.y, o.col); }
      }
      if (this.iris) { this.iris.t++; if (!this.iris.close && this.iris.t > C.IRIS_TIME) this.iris = null; }
      if (this.shakeT > 0) { this.shakeT--; if (!this.shakeT) this.shakeAmp = 0; }
      if (this.hurtT > 0) this.hurtT--;
      if (this.healT > 0) this.healT--;
      if (this.munchT > 0) this.munchT--;
      if (this.invuln > 0 && this.pl.state === 'play') this.invuln--;
      if (this.bossCard && ++this.bossCard.t > 200) this.bossCard = null;
      if (this.lantern) this.lantern.t++;
      for (const f of this.healFx) f.t++;
      this.healFx = this.healFx.filter(f => f.t < 40);
      for (const h of this.hopHome) h.t++;
      this.hopHome = this.hopHome.filter(h => h.t < 30);

      const cam = Cam();
      if (cam.sliding) {
        cam.update(this.room, this.pl.body);
        PT().update();
        return;
      }

      if (this.gift) this.updateGift();
      if (this.party) this.updateParty();

      const ab = this.save.abilities;
      const b = this.pl.body;
      let fx = 0;
      if (this.intro) this.updateIntro();
      if (this.linkLock && Math.hypot(b.x + b.w / 2 - this.linkLock.x, b.y + b.h - this.linkLock.y) > 40) this.linkLock = null;
      if (I.pressed.down && !this.traveling) this.doTrick();
      if (this.trickCard && ++this.trickCard.t > 260) this.trickCard = null;
      if (this.outfitCard && ++this.outfitCard.t > 280) this.outfitCard = null;
      if (this.trickHint > 0) this.trickHint--;
      if (this.pl.state === 'sad') this.updateSad();
      else if (this.traveling) this.updateTravel();
      else {
        fx = BB.Player.update(this.pl, I, ab, {
          bubbleCount: BB.Bubbles.list.length,
          blow: (x, y, dir, vx) => BB.Bubbles.blow(x, y, dir, vx, this.pl.cat, this.save.cosmetics.bubble),
        });
      }
      // feelings on the kitten itself (for drawing)
      if (fx & (FX.JUMP | FX.DJUMP)) {
        this.guidance.jumped = true;
        this.save.voiceStory = this.save.voiceStory || {};
        this.save.voiceStory.tutorial_jump = 1;
      }
      this.pl.invuln = this.invuln;
      this.pl.sad = this.pl.state === 'sad' ? 1 : this.mood <= 1 ? 0.85 : this.mood === 2 ? 0.3 : 0;

      // a tumble into water or mist: dandelion rescue (and a little sadder,
      // unless the kitten is still blinking from a bump that knocked it in)
      if ((fx & FX.HAZARD) && this.pl.state === 'play') {
        if (BB.Settings.hard && this.invuln <= 0) { this.mood = Math.max(0, this.mood - 1); this.hurtT = 36; }
        if (this.mood <= 0) this.startSad();
        else { BB.Player.startRescue(this.pl); this.invuln = Math.max(this.invuln, 70); S().ouch(this.pl.cat); }
      }

      // ── fairy ring hop: pop out at the twin with a sparkly flash ──
      if (fx & FX.PORTAL) {
        const r = W().roomAtPx(b.x + b.w / 2, b.y + b.h / 2);
        if (r) {
          if (r !== this.room) this.leaveRoom(this.room);
          if (r.zone !== this.room.zone) this.enterZone(r.zone);
          this.room = r; this.save.visited[r.id] = 1;
          cam.snap(r, b);
          this.flash = 16;
          this.pendingCP = true;
          S().secret(); S().whoosh();
          PT().burst('spark', b.x + b.w / 2, b.y + b.h / 2, 18, { color: '#ffe6a8', speed: 3, life: 36 });
          PT().ring(b.x + b.w / 2, b.y + b.h, '#ffe6a8', 26);
          BB.Bubbles.clear();
          this.trail = [{ x: b.x + b.w / 2, y: b.y + b.h }];
        }
      }
      // ── Mighty Paws: cracked sandstone crumbles at a touch ──
      if (ab.dig && this.pl.state === 'play') this.crumbleAround(b);

      // ── room change? glide the camera ──
      if (this.pl.state === 'play' || this.pl.state === 'bench') {
        const r = W().roomAtPx(b.x + b.w / 2, b.y + b.h / 2);
        if (r && r !== this.room) {
          this.leaveRoom(this.room);
          this.prevRoom = this.room;
          this.room = r;
          this.save.visited[r.id] = 1;
          if (this.prevRoom.def.home && r.id === 'ng') this.save.leftHome = 1;
          if (r.def.neighbourhood === 'garden') this.refreshHomeVisitors();
          cam.startSlide(r, b, this.prevRoom);
          this.slideFrom = this.prevRoom.zone;
          if (r.zone !== this.prevRoom.zone) this.enterZone(r.zone);
          this.pendingCP = true;
          BB.Save.write();
          BB.Bubbles.clear();
          S().whoosh();
          return;
        }
      }

      // ── save point: the first safe spot you stand on in a new room ──
      if (this.pendingCP && this.pl.state === 'play' && b.grounded && !b.inWater &&
          W().roomAtPx(b.x + b.w / 2, b.y + b.h / 2) === this.room && BB.Physics.isSafeFooting(b, ab)) {
        this.setCheckpoint(b.x, b.y, false);
      }

      // ── the trail that followers walk along ──
      if (this.pl.state === 'play') {
        const last = this.trail[this.trail.length - 1];
        const fxp = b.x + b.w / 2, fyp = b.y + b.h;
        if (!last || Math.hypot(fxp - last.x, fyp - last.y) > 2.5) {
          this.trail.push({ x: fxp, y: fyp });
          if (this.trail.length > 400) this.trail.shift();
        }
      }

      // ── residents ──
      const ctx = this.ctx();
      const e = this.ents[this.room.id];
      for (const th of e.things) BB.Things.update(th, ctx);
      e.things = e.things.filter(th => !th.dead);
      for (const bug of e.bugs) { bug.lookAt = b.x; BB.Bugs.update(bug, ctx); }
      for (const bs of e.bosses) BB.Bosses.update(bs, ctx);
      for (const f of this.followers.slice()) BB.Things.update(f, ctx);
      BB.Bosses.updateHazards(ctx);
      BB.Food.updateDrops(ctx);
      this.updateMirror();
      this.updateHomeToys();
      this.updateFamilyPokes();
      this.updateFirstExit();
      this.updateHomeVisitors();
      this.updateGardenFun();
      this.updateGarden();
      this.updateJourney();
      this.updateRainbowFamily();

      // ── bubbles ──
      const targets = [];
      for (const bug of e.bugs) {
        if (bug.state === 'bubbled') continue;
        targets.push({ x: bug.x, y: bug.y, r: bug.r, homing: bug.state === 'gloomy', hit: () => BB.Bugs.hit(bug, ctx) });
      }
      for (const visitor of this.homeVisitors) if (visitor.room === this.room.id) targets.push({ x: visitor.x, y: visitor.y + visitor.hop, r: visitor.r, hit: () => this.petHomeVisitor(visitor) });
      for (const bs of e.bosses) { const tg = BB.Bosses.target(bs, ctx); if (tg) targets.push(tg); }
      for (const tg of BB.Bosses.hazardTargets()) targets.push(tg);
      for (const th of e.things) { const tg = BB.Things.target(th, ctx); if (tg) targets.push(tg); }
      if (this.room.def.home && !this.party) for (const p of BB.Home.familySpots(this.room, this)) {
        targets.push({ x: p.x, y: p.y - 26, r: 24, hit: () => this.pokeFamily(p.id, p.x, p.y) });
      }
      BB.Bubbles.update(targets);
      this.updateGuidance();

      // ── shy walls ──
      this.updateShy();

      PT().update();
      BB.Tiles.tick();
      BB.Fx.update(this, b);
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

    crumbleAround(b) {
      const T = C.TILE;
      for (let ty = Math.floor((b.y - 4) / T); ty <= Math.floor((b.y + b.h + 4) / T); ty++) {
        for (let tx = Math.floor((b.x - 4) / T); tx <= Math.floor((b.x + b.w + 4) / T); tx++) {
          if (W().tile(tx, ty) !== 'X') continue;
          W().setTile(tx, ty, '.', true);
          const Z = BB.ZONES[this.room.zone];
          PT().burst('dust', tx * T + 16, ty * T + 16, 8, { color: Z.groundLight, speed: 2.4, life: 34, g: 0.12, size: 4 });
          PT().burst('dot', tx * T + 16, ty * T + 16, 6, { color: Z.ground, speed: 3, life: 28, g: 0.2, size: 3 });
          if (!this.crumbleCd) { S().crumble(); this.crumbleCd = 6; }
        }
      }
      if (this.crumbleCd) this.crumbleCd--;
    },

    // the see-through map floats over the game while you keep playing
    // the one kingdom map (the same as the pause menu's), paused while open
    toggleMap() {
      if (this.gift || this.party || this.pl.state === 'sad' || this.traveling) return;
      BB.Voice.stop();
      BB.Pause.openMap();
    },

    darkness() {
      const room = this.room;
      const d = room.def.dark != null ? room.def.dark : BB.ZONES[room.zone].dark;
      return this.save.abilities.glow ? d * 0.75 : d;
    },

    // ──── Drawing ────
    draw(c) {
      if (this.maze) { this.drawMaze(c); return; }
      if (this.cloud) { this.drawCloud(c); return; }
      if (this.mini) { this.drawMini(c); return; }
      const cam0 = Cam();
      const sc = G().scale;
      let sx = 0, sy = 0;
      if (this.shakeT > 0) {
        const k = this.shakeT / 14 * this.shakeAmp;
        sx = (Math.random() - 0.5) * k; sy = (Math.random() - 0.5) * k;
      }
      const cam = { x: Math.round((cam0.x + sx) * sc) / sc, y: Math.round((cam0.y + sy) * sc) / sc };
      const t = this.t;
      const room = this.room;

      // backdrop (crossfade during a zone-changing slide)
      let mix = 0, zoneA = room.def.walkOut ? 0 : room.zone, zoneB = null;
      if (cam0.slide && this.prevRoom && this.prevRoom.zone !== room.zone) {
        zoneA = this.prevRoom.zone; zoneB = room.zone;
        mix = BB.easeInOut(cam0.slide.t / cam0.slide.dur);
      }
      BB.Backdrops.draw(c, cam, zoneA, zoneB, mix, room.py + room.ph, t);
      BB.Fx.drawShafts(c, room, cam, t);

      // ambient drift behind the terrain
      PT().ambientUpdate(BB.ZONES[room.zone].key, !!room.def.rain, cam, this.lastCam);
      this.lastCam = { x: cam.x, y: cam.y };

      const visible = W().roomsInRect(cam.x - 64, cam.y - 64, G().W + 128, G().H + 128);
      const env = { glow: this.save.abilities.glow, rings: this.save.abilities.rings, dig: this.save.abilities.dig, px: this.pl.body.x + 10, py: this.pl.body.y + 12 };
      for (const r of visible) if (r.def.neighbourhood) BB.Neighbourhood.drawBack(c, r, cam, t);
      for (const r of visible) if (r.def.home) { BB.Home.drawBack(c, r, cam, t, this); BB.Home.drawMirror(c, r, cam, t, this); }
      for (const r of visible) if (r.def.arena) BB.Arenas.drawBack(c, r, cam, t, this);
      for (const r of visible) {
        // The separate maze is behind a quiet outdoor rainbow door.
        // Its containment walls stay in physics, outside the scenery.
        if (r.def.maze) {
          c.save(); c.beginPath(); c.rect(r.px - cam.x, (r.y + 32) * C.TILE - cam.y, r.pw, r.ph); c.clip();
          BB.Tiles.drawStatic(c, r, cam, 0); c.restore();
        } else BB.Tiles.drawStatic(c, r, cam, 0);
      }
      for (const r of visible) BB.Tiles.drawLive(c, r, cam, t, env);
      for (const r of visible) if (r.def.arena) BB.Arenas.drawFront(c, r, cam, t);
      BB.Fx.drawGround(c, visible, cam, t, this.pl.body);

      const ctx = this.ctx();
      // gate picture-signs
      for (const r of visible) {
        if (!r.grid.some(row => row.includes('G') || row.includes('g'))) continue;
        const f = this.signFade[r.id];
        if (this.save.gates[r.id] && !f) continue;
        if (f) this.signFade[r.id] = f + 1 > 60 ? 0 : f + 1;
        BB.Puzzles.drawSign(c, r, this.save, cam, t, f || 0);
      }
      // the save-point lantern
      this.drawLantern(c, cam, t);
      // residents of visible rooms
      for (const r of visible) {
        const e = this.ents[r.id];
        for (const th of e.things) if (th.type !== 'elder') BB.Things.draw(c, th, cam, ctx);
      }
      for (const r of visible) if (r.def.home) { this.drawRainbowNest(c, r, cam, t); BB.Home.drawToys(c, r, cam, t, this); BB.Home.drawFamily(c, r, cam, t, this); }
      if (room.def.home && !this.wardrobe) {
        const mx = (room.x + BB.Home.MIRROR_COL) * T, my = (room.y + 32) * T, pb = this.pl.body;
        if (this.mirrorHold <= 0 && !(this.save.used || {}).mirror && Math.abs(pb.x + pb.w / 2 - mx) < 80 && Math.abs(pb.y + pb.h - my) < 40) BB.Links.hintRing(c, mx - cam.x, my - cam.y - 186, t);
      }
      if (this.party) this.drawGuests(c, cam, true);
      for (const r of visible) {
        const e = this.ents[r.id];
        for (const th of e.things) if (th.type === 'elder') BB.Things.draw(c, th, cam, ctx);
        for (const bs of e.bosses) BB.Bosses.draw(c, bs, cam, t);
        for (const bug of e.bugs) BB.Bugs.draw(c, bug, cam);
      }
      this.drawHomeVisitors(c, cam, visible);
      for (const r of visible) this.drawGardenFun(c, r, cam, t);
      for (const r of visible) this.drawGarden(c, r, cam, t);
      for (const r of visible) this.drawJourney(c, r, cam, t);
      for (const h of this.hopHome) this.drawHopHome(c, h, cam);
      for (const f of this.followers) BB.Things.draw(c, f, cam, ctx);
      BB.Food.drawDrops(c, cam);

      BB.Player.draw(c, this.pl, cam, this.save.abilities);
      if (this.party) this.drawGuests(c, cam, false);
      if (this.pl.sad > 0.5 || this.pl.state === 'sad') {
        const b = this.pl.body;
        BB.Critters.moodCloud(c, b.x + b.w / 2 - cam.x, b.y - 22 - cam.y, this.pl.state === 'sad' ? 1 : 0.6, t, 1.2);
      }
      BB.Bosses.drawHazards(c, cam, t);
      BB.Bubbles.draw(c, cam);
      PT().draw(c, cam);
      for (const o of this.orbs) {
        const p = orbPos(o);
        G().drawGlow(p.x - cam.x, p.y - cam.y, 16, o.col, 0.9, c);
        c.fillStyle = '#ffffff'; G().circle(p.x - cam.x, p.y - cam.y, 3.5, c); c.fill();
      }

      // shy walls drawn in front so secrets stay hidden until stepped into
      for (const r of visible) this.drawShy(c, r, cam);
      for (const r of visible) BB.Tiles.drawLive(c, r, cam, t, env, true);
      BB.Fx.drawWaterFront(c, visible, cam, t);
      for (const r of visible) if (r.def.neighbourhood) BB.Neighbourhood.drawFront(c, r, cam, t);
      for (const r of visible) if (r.def.home) BB.Home.drawFront(c, r, cam, t, this);
      if (this.intro) BB.Home.drawIntro(c, cam, this);

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
      if (this.mood <= 1 && !this.party) {
        // feeling low: a soft blue hush around the edges
        const k = 0.5 + Math.sin(t * 0.06) * 0.2;
        const g = c.createRadialGradient(G().W / 2, G().H / 2, G().H * 0.35, G().W / 2, G().H / 2, G().H * 0.9);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(60,80,150,${0.32 * k})`);
        c.fillStyle = g; c.fillRect(0, 0, G().W, G().H);
      }

      this.drawInteractionProgress(c, cam, visible);

      // HUD
      BB.HUD.drawHUD(c, {
        stars: BB.Economy.balance(this.save, 'stars'),
        hearts: BB.Economy.balance(this.save, 'hearts'),
        abilities: this.save.abilities, toys: this.save.toys,
        family: BB.Save.count(this.save.family || {}),
        mood: this.mood, moodMax: C.MOOD_MAX, cat: this.pl.cat, hurtT: this.hurtT, healT: this.healT,
        hard: BB.Settings.hard, munchT: this.munchT,
        tricks: BB.Save.count(this.save.gestures || {}),
        kin: BB.RainbowFamily.active(this.save) ? this.save : null, kinPulse: this.kinPulse || 0,
        boss: !!(this.activeBoss && this.activeBoss.state !== 'happy' && this.activeBoss.room === this.room.id),
      }, t);
      for (const f of this.healFx) {
        // a heart flies from a new friend up to your happy suns
        const k = BB.easeInOut(f.t / 40);
        const hx = BB.lerp(f.x - cam.x, 40 + (this.mood - 1) * 24, k), hy = BB.lerp(f.y - cam.y, 31, k) - Math.sin(k * Math.PI) * 40;
        c.fillStyle = '#ff7eb6'; G().heart(hx, hy, 8, c); c.fill();
      }
      const boss = this.activeBoss;
      if (boss && boss.state !== 'happy' && boss.room === this.room.id) BB.Bosses.drawBossHUD(c, boss, t);
      if (this.bossCard) BB.HUD.drawBossCard(c, this.bossCard.b, this.bossCard.t, t);
      if (this.trickCard) this.drawTrickCard(c, t);
      if (this.kinCard) this.drawKinCard(c, t);
      if (this.outfitCard) this.drawOutfitCard(c, t);
      if (this.trickHint > 0) this.drawTrickHint(c, cam);
      this.drawGuidance(c, cam);
      // (a lesson or present card takes the top of the screen: the zone
      // name steps aside instead of overlapping it)
      if (this.trickCard || this.outfitCard || this.kinCard) this.zoneCard = Math.min(this.zoneCard, 12);
      BB.HUD.drawZoneCard(c, this.cardZone, this.zoneCard / 40, t);
      if (this.gift && this.gift.card > 0) {
        c.fillStyle = `rgba(20,10,40,${0.35 * this.gift.card})`; c.fillRect(0, 0, G().W, G().H);
        BB.HUD.drawAbilityCard(c, this.gift.ability, this.gift.t, this.pl.cat, this.gift.card);
      }
      if (this.party && this.party.card > 0) this.drawPartyCard(c, this.party.card);
      if (this.flash > 0) { c.fillStyle = `rgba(255,248,220,${this.flash / 20})`; c.fillRect(0, 0, G().W, G().H); this.flash--; }
      if (this.wardrobe) this.drawWardrobe(c, t);
      if (this.gardenChoice) this.drawGardenChoice(c, t);
      if (this.portalChoice) this.drawJourneyChoice(c, t);
      this.drawIris(c, cam);
    },

    drawInteractionProgress(c, cam, visible) {
      if (this.wardrobe || this.gardenChoice || this.portalChoice || this.iris) return;
      const ctx = this.ctx(), room = this.room;
      for (const r of visible) for (const th of this.ents[r.id].things) BB.Links.drawProgress(c, th, cam, ctx);
      if (room.def.home && this.mirrorHold > 0)
        BB.Links.holdRing(c, (room.x + BB.Home.MIRROR_COL) * T - cam.x, (room.y + 32) * T - cam.y - 186, this.mirrorHold / BB.Links.HOLD);
      const garden = this.gardenSpot(room), fun = BB.GardenFun.spot(room);
      if (garden && this.gardenHold > 0) BB.Links.holdRing(c, garden.x - cam.x, garden.y - cam.y - 96, this.gardenHold / BB.Links.HOLD);
      if (fun && this.funHold > 0) BB.Links.holdRing(c, fun.x - cam.x, fun.y - cam.y - 96, this.funHold / BB.Links.HOLD);
      if (room.id === 'nm' && this.journeyHold > 0) for (const kind of ['rainbow', 'cloud']) {
        const q = BB.RainbowJourney.spot(kind);
        if (BB.RainbowJourney.unlocked(this.save, kind) && Math.abs(this.pl.body.x + this.pl.body.w / 2 - q.x) < 18)
          BB.Links.holdRing(c, q.x - cam.x, q.y - cam.y - 96, this.journeyHold / BB.Links.HOLD);
      }
    },

    // the save-point lantern: a little post with a glowing paw-print lamp
    drawLantern(c, cam, t) {
      const L = this.lantern;
      if (!L) return;
      const x = L.x - cam.x, y = L.y - cam.y;
      if (x < -60 || x > G().W + 60 || y < -80 || y > G().H + 60) return;
      const pop = Math.min(1, L.t / 16);
      const k = BB.easeOutBack(pop);
      c.save();
      c.translate(x - 26, y);
      c.scale(k, k);
      G().drawGlow(0, -34, 34, '#ffd98a', 0.55 + Math.sin(t * 0.08) * 0.1, c);
      c.fillStyle = '#8a5a34'; c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.2;
      G().rrect(-2, -30, 4, 30, 2, c); c.fill(); c.stroke();
      c.fillStyle = '#fff3c0'; c.strokeStyle = '#a8740e'; c.lineWidth = 1.5;
      G().rrect(-8, -46, 16, 17, 5, c); c.fill(); c.stroke();
      c.fillStyle = '#ff9fb8';
      G().ellipse(0, -35, 3.2, 2.6, 0, c); c.fill();
      for (const [px, py] of [[-3.4, -39.5], [-1.2, -41.5], [1.2, -41.5], [3.4, -39.5]]) { G().circle(px, py, 1.2, c); c.fill(); }
      c.fillStyle = '#a8740e'; G().rrect(-6, -49, 12, 4, 2, c); c.fill();
      c.restore();
      if (L.t < 30 && L.t % 4 === 0) PT().trail('spark', L.x - 26, L.y - 40, '#ffd98a');
    },

    drawHopHome(c, h, cam) {
      const k = h.t / 30, m = h.mama;
      const x = BB.lerp(h.x0, m.x, k) - cam.x, y = BB.lerp(h.y0, m.y, k) - cam.y - Math.sin(k * Math.PI) * 50;
      BB.Critters.drawBug(c, h.kind, x, y - 10, { t: h.t, mood: 0, facing: m.x > h.x0 ? 1 : -1, scale: 0.85, noCloud: true, joy: true });
    },

    drawIris(c, cam) {
      if (!this.iris) return;
      const b = this.pl.body;
      const cx = b.x + b.w / 2 - cam.x, cy = b.y + b.h / 2 - cam.y;
      const k = Math.min(1, this.iris.t / C.IRIS_TIME);
      const big = Math.hypot(G().W, G().H);
      const r = this.iris.close ? BB.lerp(big, 0, BB.easeInOut(k)) : BB.lerp(0, big, BB.easeInOut(k));
      if (!this.iris.close && k >= 1) return;
      c.save();
      c.fillStyle = '#1b1433';
      c.beginPath();
      c.rect(0, 0, G().W, G().H);
      c.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2, true);
      c.fill('evenodd');
      c.strokeStyle = 'rgba(255,214,150,0.6)'; c.lineWidth = 6;
      c.beginPath(); c.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2); c.stroke();
      c.restore();
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

    ringPos(g) {
      const p = this.party, ring = p.guests.filter(q => q.ring).length;
      const a = g.ang + p.t * 0.012;
      const R = 70 + ring * 9;
      return { x: p.cx + Math.cos(a) * R, y: p.floor - 4 + Math.sin(a) * 8, back: Math.sin(a) < 0, dir: -Math.sin(a) >= 0 ? 1 : -1 };
    },

    // back = the ring's far half (drawn behind the kitten); otherwise the rest
    drawGuests(c, cam, back) {
      for (const g of this.party.guests) {
        if (g.ring) {
          const rp = this.ringPos(g);
          if (rp.back !== back) continue;
          const m = BB.CATS[g.cat] || {}, sz = (m.size || 1.4) * (rp.back ? 0.9 : 1);
          const baby = (m.size || 1.4) < 1.2, old = /granny|grandpa/i.test(g.cat);
          const hop = baby ? Math.abs(Math.sin(g.t * 0.16)) * -12 : old ? 0 : Math.abs(Math.sin(g.t * 0.12)) * -5;
          const dance = g.t % 160;
          const pose = dance < 110 ? { mode: 'run', happy: true, t: g.t * 0.6 } : { mode: 'sit', happy: true, t: g.t };
          c.save();
          if (old) { c.translate(rp.x - cam.x, rp.y - cam.y); c.rotate(Math.sin(g.t * 0.06) * 0.12); c.translate(-(rp.x - cam.x), -(rp.y - cam.y)); }
          BB.Kittens.draw(c, g.cat, pose, rp.x - cam.x, rp.y - cam.y + hop, sz, dance < 110 ? rp.dir : (rp.x < this.party.cx ? 1 : -1));
          c.restore();
          if (g.t % 80 === 0) PT().heart(rp.x, rp.y - 30);
          continue;
        }
        if (back) continue;
        const hop = Math.abs(Math.sin(g.t * 0.12)) * -10;
        const x = g.x - cam.x, y = g.y - cam.y;
        if (x < -120 || x > G().W + 120) continue;
        if (g.boss) {
          BB.BossArt.draw(c, g.boss, x, y - 24 + hop * 0.4, 1.2, { t: g.t, mood: 0, facing: g.facing, pose: 'dance', blink: 0 });
        } else {
          if (g.cloud) BB.Backdrops.cloud(c, x - 20, y + 16, 0.28, 'rgba(255,255,255,0.9)');
          BB.Critters.drawBug(c, g.kind, x, y + hop - 4 + Math.sin(g.t * 0.03) * 4, { t: g.t, mood: 0, facing: g.facing, joy: true, spin: Math.sin(g.t * 0.1) * 0.2, scale: 1 });
        }
        if (g.t % 70 === 0) PT().heart(g.x, g.y - 20);
      }
    },

    // the homecoming card: a banner of all twelve family frames filling in
    // one by one, a big "found / 12", then your other treasures
    drawPartyCard(c, a) {
      const p = this.party, t = p.t;
      const cx = G().W / 2, cy = G().H / 2;
      const all = p.found === p.total;
      c.save();
      c.globalAlpha = Math.min(1, a);
      const k = BB.easeOutBack(Math.min(1, a));
      c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
      G().drawGlow(cx, cy, 340, all ? '#fff0f8' : '#fff4c2', 0.6, c);
      c.fillStyle = 'rgba(255,250,240,0.96)'; c.strokeStyle = '#ffcf5c'; c.lineWidth = 6;
      G().rrect(cx - 290, cy - 200, 580, 400, 40, c); c.fill(); c.stroke();
      if (all) {
        c.lineWidth = 8;
        ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => {
          c.strokeStyle = col; G().rrect(cx - 282 + i * 5, cy - 192 + i * 5, 564 - i * 10, 384 - i * 10, 34 - i * 3, c); c.stroke();
        });
      }
      // a little house over the banner
      BB.HUD.zoneIcon(c, BB.HOME_ZONE, cx, cy - 158, 1.6);
      // the banner: frames light up one by one
      const fam = BB.Home.familyOrder(), t0 = 230;
      let shown = 0;
      fam.forEach((id, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        const x = cx - 205 + col * 82, y = cy - 88 + row * 84;
        const found = !!this.save.family[id];
        const on = t > t0 + i * 10;
        const pop = on ? BB.easeOutBack(Math.min(1, (t - t0 - i * 10) / 12)) : 0;
        if (on && found) shown++;
        c.save(); c.translate(x, y);
        c.fillStyle = found && on ? (all ? ['#ff9ab8', '#ffd66b', '#9fe89a', '#8fd0ff', '#c8a8ff', '#ffb38a'][i % 6] : '#e8b860') : '#c8c0cc';
        c.strokeStyle = '#6a4a2a'; c.lineWidth = 2;
        G().rrect(-32, -36, 64, 72, 10, c); c.fill(); c.stroke();
        c.fillStyle = found && on ? '#fff6de' : '#e4dee8'; G().rrect(-25, -29, 50, 58, 7, c); c.fill();
        if (on) {
          c.scale(0.4 + 0.6 * pop, 0.4 + 0.6 * pop);
          BB.Home.faceOf(c, id, 0, 2, 2.4, found);
          if (found) { c.fillStyle = '#ff7eb6'; G().heart(20, -22, 7, c); c.fill(); }
        }
        c.restore();
      });
      // the big count
      const ny = cy + 100;
      if (BB.RainbowFamily.nest(this.save)) {
        // once Rainbow is rescued: her own rainbow family beside the cats
        const kin = BB.RainbowFamily.count(this.save), whole = BB.RainbowFamily.complete(this.save);
        BB.MapView.catFace(c, cx - 190, ny, 2.4, '#fff1dc', '#9a7a64');
        G().text(shown + ' / ' + p.total, cx - 102, ny + 2, 38, all ? '#d8407a' : '#8a5a3a', null);
        BB.RainbowFamily.miniArc(c, cx + 62, ny - 4, 1.6, this.save, t);
        G().text(kin + ' / ' + BB.RAINBOW_KIN.length, cx + 150, ny + 2, 38, whole ? '#d8407a' : '#8a5a3a', null);
      } else {
        BB.MapView.catFace(c, cx - 70, ny, 2.6, '#fff1dc', '#9a7a64');
        G().text(shown + ' / ' + p.total, cx + 30, ny + 2, 44, all ? '#d8407a' : '#8a5a3a', null);
      }
      // other treasures: stars, friends, bosses
      const y = cy + 158;
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#c28a14'; c.lineWidth = 2;
      G().star(cx - 170, y, 14, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
      G().text(String(BB.Save.count(this.save.sparkles)), cx - 128, y + 2, 24, '#8a5a14', null);
      c.fillStyle = '#ff7eb6'; c.strokeStyle = '#b8407a';
      G().heart(cx - 50, y + 4, 14, c); c.fill(); c.stroke();
      G().text(String(BB.Save.count(this.save.friends)), cx - 12, y + 2, 24, '#b8407a', null);
      BB.Critters.rainbow(c, cx + 70, y + 4, 1, 1.1);
      G().text(String(BB.Save.count(this.save.bosses || {})), cx + 106, y + 2, 24, '#6a4a9a', null);
      BB.HUD.toyIcon(c, 'yarn', cx + 170, y, 0.9, t);
      G().text(String(BB.Save.count(this.save.toys || {})), cx + 204, y + 2, 24, '#8a5a3a', null);
      c.restore();
    },
  };

  function orbPos(o) {
    const k = BB.easeInOut(Math.min(1, o.t / o.dur));
    return { x: BB.lerp(o.x0, o.x1, k), y: BB.lerp(o.y0, o.y1, k) - Math.sin(k * Math.PI) * (o.note ? 30 : 60) };
  }
})(window.BB);
