// ════════════════════════════════════════════════════════════════
//  SAVE — progress lives in localStorage. Everything you collect is
//  saved the moment you get it. Your *save point* — where Continue puts
//  you back, and where you float back to if you get too sad — is the
//  first safe spot you stood on in the latest room, or the last cozy
//  bench you rested on.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  // (the storage key keeps the game's first working name, "Bubblebug",
  // so existing saves carry straight over)
  const KEY = 'bubblebug_kingdom_v2';

  // Boss arenas were slotted in at these world columns (v2 → v3), and
  // everything to their right moved 30 tiles along
  const SHIFT = [135, 285, 435, 585, 795, 1140, 1320, 1485, 1665, 1845, 1980];
  const shiftTx = tx => tx + 30 * SHIFT.filter(s => s <= tx).length;
  function migrate2(d) {
    const keys = obj => {
      const o = {};
      for (const [k, v] of Object.entries(obj || {})) {
        const [x, y] = k.split(',').map(Number);
        o[shiftTx(x) + ',' + y] = v;
      }
      return o;
    };
    d.sparkles = keys(d.sparkles); d.friends = keys(d.friends); d.buds = keys(d.buds);
    const px = x => x == null ? x : x + (shiftTx(Math.floor((x + 10) / 32)) - Math.floor((x + 10) / 32)) * 32;
    d.x = px(d.x);
    if (d.bench) d.bench.x = px(d.bench.x);
    // the new boss and puzzle gates the kitten already walked past get
    // opened on the next start (see Play.enter), so walking back is never
    // blocked
    d.openBehind = 1;
    d.v = 3;
    return d;
  }

  // The kingdom became a ring (v3 → v4): the far half (zones 6–11, every
  // tile from column 1125 on) was mirrored so it runs back east → west, and
  // lifted 140 tiles up, with the Cat House in the middle
  const T = 32, PW = 20;
  const ringTile = (x, y) => x >= 1125 ? [2250 - x, y - 140] : [x, y];
  function migrate3(d) {
    const keys = obj => {
      const o = {};
      for (const [k, v] of Object.entries(obj || {})) {
        const [x, y] = k.split(',').map(Number);
        o[ringTile(x, y).join(',')] = v;
      }
      return o;
    };
    for (const f of ['sparkles', 'friends', 'buds', 'pads', 'babies', 'keys']) d[f] = keys(d[f]);
    const pt = p => {
      if (!p || p.x == null || Math.floor((p.x + PW / 2) / T) < 1125) return;
      p.x = 2251 * T - p.x - PW; p.y -= 140 * T;
    };
    pt(d); pt(d.bench);
    // an adventure already under way: the kitten has long since left home,
    // and every zone it has been to has its door in the Cat House
    d.introDone = 1; d.leftHome = 1;
    d.doors = {};
    d.v = 4;
    d.doorsFromVisited = 1;
    return d;
  }

  // v4 → v5: only the Cat House moved. Keep every existing world
  // collectible key and room id; move resume / bench coordinates at home.
  function migrate4(d) {
    const old = { x: 480 * 32, y: -118 * 32, w: 60 * 32, h: 34 * 32 };
    const move = p => {
      if (!p || p.x == null || p.y == null) return;
      if (p.x + 10 >= old.x && p.x + 10 < old.x + old.w &&
          p.y + 12 >= old.y && p.y + 12 < old.y + old.h) {
        p.x -= 630 * 32; p.y += 100 * 32;
      }
    };
    move(d); move(d.bench);
    d.v = 5;
    return d;
  }

  function fresh() {
    return {
      v: 8,
      cat: 'marshmallow',
      room: null, x: null, y: null,        // resume spot (world px)
      bench: null,                          // last bench rested at {x,y}
      abilities: {
        doubleJump: false, wallClimb: false, glow: false, float: false,
        swim: false, dig: false, spring: false, rings: false, bubbleBounce: false, wings: false,
      },
      family: {},                           // family member id → 1 (found)
      sparkles: {},                         // key → 1
      friends: {},                          // key → 1
      toys: {},                             // toy id → 1
      buds: {},                             // bud key → 1
      gates: {},                            // room id → 1 once its gate is open
      bosses: {},                           // arena room id → 1 (cheered up!)
      pads: {},                             // paw pad key → 1 (pressed)
      babies: {},                           // lost baby key → 1 (home with mama)
      keys: {},                             // keyhole key → 1 (unlocked)
      songs: {},                            // room id → 1 (song bells played)
      gestures: {},                         // cat trick id → 1 (learned)
      secrets: {},                          // shy-wall room → 1
      visited: {},                          // room id → 1
      outfits: {},                          // things to wear, from the bosses: id → 1
      wear: { head: null, neck: null, face: null }, // what the kitten has on
      starsSpent: 0, heartsSpent: 0,        // collection totals stay untouched
      purchases: {},                       // optional cosmetic id → 1
      cosmetics: { bubble: 'classic', trail: 'classic' },
      residents: {},                       // invited friend species → 1
      hiddenResidents: {},                 // invited species resting away from the garden
      fountainUses: 0,
      mazeSolved: false,
      mazePosition: null,                  // top-down garden cell, separate from world save point
      inMaze: false, mazeReturn: null,
      mazePuzzleVersion: 1, mazeLegacyAccess: false,
      rainbowUnlocked: false,             // rescued character survives a Rainbow replay
      replayCount: 0,
      glassesFound: {},                   // discoveries in this adventure; clothing stays earned
      doors: {},                            // zone → 1 once its cat flap is found (a door opens at home)
      introDone: 0,                         // the wake-up scene has played
      leftHome: 0,                          // been out of the front door
      finale: false,
      playTicks: 0,
    };
  }

  BB.Save = {
    preview: false, // explicit reward demo: keep the normal save untouched
    data: fresh(),
    fresh,
    exists() {
      if (this.preview) return true;
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },
    load() {
      if (this.preview) return true;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.v === 2) migrate2(d);
          if (d && d.v === 3) {
            if (d.cat === 'pip') d.cat = 'phoebe'; // the tabby's early name
            migrate3(d);
          }
          if (d && d.v === 4) migrate4(d);
          if (d && d.v === 5) d.v = 6; // defaults give existing players their full collected balance
          if (d && d.v === 6) {
            d.v = 7; d.starsSpent = 0; // all collected stars count; keep every old owned item
            // The old platform maze has become a hedge labyrinth. Resume
            // beside its entrance; its stars/pads/progress keep their keys.
            if (d.room === 'nm' || (d.x != null && d.x >= -180 * T && d.x < -150 * T && d.y >= -18 * T && d.y < 16 * T)) {
              d.room = 'hm'; d.x = -148 * T + 6; d.y = 14 * T - 24;
            }
            if (d.bench && d.bench.x >= -180 * T && d.bench.x < -150 * T) d.bench = null;
          }
          if (d && d.v === 7) {
            d.v = 8; d.rainbowUnlocked = !!d.mazeSolved || d.cat === 'rainbow';
            d.inMaze = d.room === 'nm'; // old nm saves were inside the maze game
          }
          if (d && d.v === 8) {
            this.data = Object.assign(fresh(), d);
            this.data.abilities = Object.assign(fresh().abilities, d.abilities || {});
            this.data.wear = Object.assign(fresh().wear, d.wear || {});
            this.data.cosmetics = Object.assign(fresh().cosmetics, d.cosmetics || {});
            for (const field of ['outfits', 'purchases', 'residents', 'hiddenResidents', 'glassesFound']) this.data[field] = Object.assign({}, d[field] || {});
            // An older active maze can finish its existing route. New
            // entries use the lantern gates, keeping every pad/star key.
            if (d.inMaze && !d.mazePuzzleVersion) this.data.mazeLegacyAccess = true;
            return true;
          }
        }
      } catch (e) { /* corrupted or blocked — start fresh */ }
      this.data = fresh();
      return false;
    },
    write() {
      if (this.preview) return;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full / blocked */ }
    },
    reset() {
      const cat = this.data.cat;
      this.data = fresh();
      this.data.cat = cat;
      if (this.preview) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
    rainbowReplay() {
      const old = this.data;
      if (!old.mazeSolved || !old.rainbowUnlocked) return false;
      const next = fresh();
      next.cat = 'rainbow'; next.rainbowUnlocked = true;
      next.replayCount = (Number.isSafeInteger(old.replayCount) && old.replayCount >= 0 ? old.replayCount : 0) + 1;
      for (const key of Object.keys(next.abilities)) next.abilities[key] = !!old.abilities[key];
      for (const field of ['outfits', 'wear', 'cosmetics', 'gestures']) next[field] = Object.assign({}, next[field], old[field] || {});
      // Clothes/styles stay earned; invitations and the fountain belong
      // to the new world and must never leave an old heart debt behind.
      const styles = new Set(BB.Cosmetics.LIST.map(item => item.id));
      next.purchases = Object.fromEntries(Object.entries(old.purchases || {}).filter(([id]) => BB.Wardrobe.BY[id] || styles.has(id)));
      this.data = next;
      this.write(); // one complete replacement, including its new checkpoint defaults
      return true;
    },
    count(obj) { return Object.keys(obj).length; },
  };

  // How brave? A grown-up setting chosen on the title screen, kept on this
  // device (so it applies to Continue and New Game alike):
  //   Easy   — harmless bumps plus generous jump / landing assistance
  //   Medium — the former Easy: original movement and harmless bumps
  //   Hard   — original movement; bumps and sad attacks cost happy suns
  // Existing non-hard adventures keep their old feel as Medium. Only a
  // device with no previous choice or adventure defaults to the new Easy.
  const HARD_KEY = 'bubblepaws_hard', MODE_KEY = 'bubblepaws_difficulty';
  const MODES = ['easy', 'medium', 'hard'];
  BB.Settings = {
    difficulty: (() => {
      let mode = 'easy';
      try {
        const saved = localStorage.getItem(MODE_KEY);
        if (MODES.includes(saved)) return saved;
        const old = localStorage.getItem(HARD_KEY);
        if (old === '1') mode = 'hard';
        else if (old != null || localStorage.getItem(KEY) != null) mode = 'medium';
      } catch (e) { /* storage blocked */ }
      // Save the resolved choice now: a new Easy adventure must still be
      // Easy after its first progress save, even without touching the picker.
      try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* storage blocked */ }
      return mode;
    })(),
    get hard() { return this.difficulty === 'hard'; },
    get assists() { return this.difficulty === 'easy'; },
    setDifficulty(mode) {
      if (!MODES.includes(mode)) return;
      this.difficulty = mode;
      try {
        localStorage.setItem(MODE_KEY, mode);
        localStorage.setItem(HARD_KEY, mode === 'hard' ? '1' : '0');
      } catch (e) { /* storage blocked */ }
    },
    setHard(on) {
      this.setDifficulty(on ? 'hard' : 'medium');
    },
  };
})(window.BB);
