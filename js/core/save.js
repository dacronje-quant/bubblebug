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

  function fresh() {
    return {
      v: 3,
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
      secrets: {},                          // shy-wall room → 1
      visited: {},                          // room id → 1
      finale: false,
      playTicks: 0,
    };
  }

  BB.Save = {
    data: fresh(),
    fresh,
    exists() {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.v === 2) migrate2(d);
          if (d && d.v === 3) {
            if (d.cat === 'pip') d.cat = 'phoebe'; // the tabby's early name
            this.data = Object.assign(fresh(), d);
            this.data.abilities = Object.assign(fresh().abilities, d.abilities || {});
            return true;
          }
        }
      } catch (e) { /* corrupted or blocked — start fresh */ }
      this.data = fresh();
      return false;
    },
    write() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full / blocked */ }
    },
    reset() {
      const cat = this.data.cat;
      this.data = fresh();
      this.data.cat = cat;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
    count(obj) { return Object.keys(obj).length; },
  };
})(window.BB);
