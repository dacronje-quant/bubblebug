// ════════════════════════════════════════════════════════════════
//  SAVE — progress lives in localStorage. The game autosaves on every
//  room change and at every cozy bench, so little players never lose
//  anything and never need to know what "saving" is.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const KEY = 'bubblebug_kingdom_v2';

  function fresh() {
    return {
      v: 2,
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
          if (d && d.v === 2) {
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
