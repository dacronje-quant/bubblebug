// ════════════════════════════════════════════════════════════════
//  INPUT — keyboard, gamepads and chunky touch buttons, merged into
//  one tiny vocabulary a 3-year-old can drive:
//      ◀  ▶  jump  bubble   (plus up/down/pause/map for menus)
//  `poll()` runs once per simulation tick and produces clean
//  `pressed` edges so a tap is never lost between frames.
//
//  A second kitten (two-player): once a friend joins (press 2 on the
//  keyboard, Start on a second gamepad, or the two-kittens button in the
//  pause menu), the second gamepad drives `Input.p2`, and so do the
//  keys I J K L (with O / U to blow bubbles) and the number pad
//  (4 6 move, 8 jump, 0 or 5 bubble).
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';

  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'bubble', 'pause', 'confirm', 'back', 'map'];

  const KEYMAP = {
    ArrowLeft: ['left'], KeyA: ['left'],
    ArrowRight: ['right'], KeyD: ['right'],
    ArrowUp: ['up', 'jump'], KeyW: ['up', 'jump'],
    ArrowDown: ['down'], KeyS: ['down'],
    Space: ['jump', 'confirm'], KeyK: ['jump'], KeyC: ['jump'],
    KeyX: ['bubble', 'confirm'], KeyZ: ['bubble', 'confirm'], KeyJ: ['bubble'], KeyE: ['bubble'],
    ShiftLeft: ['bubble'], ShiftRight: ['bubble'],
    Enter: ['confirm'], NumpadEnter: ['confirm'],
    Escape: ['pause', 'back'], KeyP: ['pause'], Backspace: ['back'],
    KeyM: ['map'], Tab: ['map'],
  };

  // the second kitten's keys (J and K belong to player one until a friend joins)
  const KEYMAP2 = {
    KeyJ: ['left'], KeyL: ['right'], KeyI: ['jump'], KeyK: ['down'], KeyO: ['bubble'], KeyU: ['bubble'],
    Numpad4: ['left'], Numpad6: ['right'], Numpad8: ['jump'], Numpad5: ['bubble'], Numpad0: ['bubble'],
  };
  const JOIN_KEYS = { Digit2: 1, Numpad2: 1 };

  const blank = () => Object.fromEntries(ACTIONS.map(a => [a, false]));

  const kbHeld = blank();
  const kbCodes = new Set();
  const kbLatch = blank();
  const touchHeld = blank();
  const touchLatch = blank();
  let padHeld = blank();
  let prevHeld = blank();
  const kb2Held = blank(), kb2Latch = blank();
  let pad2Held = blank();
  const prev2Held = blank();
  let joinLatch = false, pad2StartPrev = false;

  // player two's controls, in the same shape as player one's
  const p2 = {
    held: blank(), pressed: blank(), any: false,
    physicsInput() {
      return { left: this.held.left, right: this.held.right, jump: this.held.jump, jumpPressed: this.pressed.jump, bubblePressed: this.pressed.bubble };
    },
  };

  const Input = BB.Input = {
    held: blank(),
    pressed: blank(),
    any: false,               // any press this tick (wakes title screens)
    device: 'keyboard',       // last used: keyboard | gamepad | touch
    touchEnabled: false,
    pointers: [],             // queued pointer taps in logical coords {x,y}
    pointerPos: null,         // hover position (mouse), logical coords
    pointerVersion: 0,        // only a new mouse movement changes menu focus

    p2,
    split: false,             // a second kitten is playing (J/K/I/L/O/U & pad 2 are theirs)
    joinPressed: false,       // someone asked to join as player two this tick

    poll() {
      padHeld = readGamepads();
      this.joinPressed = joinLatch;
      joinLatch = false;
      p2.any = false;
      for (const a of ACTIONS) {
        const h = kb2Held[a] || pad2Held[a];
        p2.held[a] = h;
        p2.pressed[a] = kb2Latch[a] || (h && !prev2Held[a]);
        if (p2.pressed[a]) p2.any = true;
        prev2Held[a] = h;
        kb2Latch[a] = false;
      }
      const anyPad = ACTIONS.some(a => padHeld[a]);
      if (anyPad) this.device = 'gamepad';
      this.any = false;
      for (const a of ACTIONS) {
        const h = kbHeld[a] || padHeld[a] || touchHeld[a];
        this.held[a] = h;
        const p = kbLatch[a] || touchLatch[a] || (h && !prevHeld[a]);
        this.pressed[a] = p;
        if (p) this.any = true;
        prevHeld[a] = h;
        kbLatch[a] = false;
        touchLatch[a] = false;
      }
    },

    // A snapshot in the shape physics expects
    physicsInput() {
      return {
        left: this.held.left, right: this.held.right,
        jump: this.held.jump, jumpPressed: this.pressed.jump,
        bubblePressed: this.pressed.bubble,
      };
    },

    takePointers() { const p = this.pointers; this.pointers = []; return p; },

    clearAll() {
      kbCodes.clear();
      for (const a of ACTIONS) { kbHeld[a] = kbLatch[a] = touchHeld[a] = touchLatch[a] = kb2Held[a] = kb2Latch[a] = false; }
      fingers.clear();
      recomputeTouch();
    },
  };

  // ──── Keyboard ────
  window.addEventListener('keydown', e => {
    if (JOIN_KEYS[e.code] && !e.repeat) joinLatch = true;
    const acts2 = Input.split ? KEYMAP2[e.code] : null;
    if (acts2) {
      e.preventDefault();
      if (!e.repeat) for (const a of acts2) { kb2Held[a] = true; kb2Latch[a] = true; }
      return;
    }
    const acts = KEYMAP[e.code];
    if (acts) {
      e.preventDefault();
      if (Input.device === 'touch') document.body.classList.remove('touch');
      Input.device = 'keyboard';
      if (e.repeat) return;
      kbCodes.add(e.code);
      for (const a of acts) { kbHeld[a] = true; kbLatch[a] = true; }
    } else if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      Input._anyKey = true; // wakes the title screen for mashing toddlers
    }
  });
  window.addEventListener('keyup', e => {
    const acts2 = KEYMAP2[e.code];
    if (acts2) for (const a of acts2) kb2Held[a] = false;
    const acts = KEYMAP[e.code];
    kbCodes.delete(e.code);
    if (acts) for (const a of acts) kbHeld[a] = [...kbCodes].some(code => KEYMAP[code].includes(a));
  });
  window.addEventListener('blur', () => Input.clearAll());

  // ──── Gamepads (standard mapping) ────
  // The first gamepad is player one. Any other gamepad also drives player
  // one, until a friend joins: then it's player two's (Start joins them).
  function readPad(gp, out) {
    const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (ax < -0.35 || b(14)) out.left = true;
    if (ax > 0.35 || b(15)) out.right = true;
    if (ay < -0.5 || b(12)) out.up = true;
    if (ay > 0.5 || b(13)) out.down = true;
    if (b(0) || b(3)) { out.jump = true; out.confirm = true; }
    if (b(1) || b(2) || b(4) || b(5) || b(6) || b(7)) out.bubble = true;
    if (b(2)) out.confirm = true;
    if (b(1)) out.back = true;
    if (b(9)) out.pause = true;
    if (b(8)) { out.back = true; out.map = true; }
    return b(9);
  }

  function readGamepads() {
    const out = blank(), out2 = blank();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let n = 0, start2 = false;
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      if (n++ === 0) { readPad(gp, out); continue; }
      const tmp = blank();
      if (readPad(gp, tmp)) start2 = true;
      if (Input.split) { for (const a of ACTIONS) if (tmp[a]) out2[a] = true; }
      else if (!tmp.pause) { for (const a of ACTIONS) if (tmp[a]) out[a] = true; } // (Start here asks to join instead)
    }
    if (start2 && !pad2StartPrev && !Input.split) joinLatch = true;
    pad2StartPrev = start2;
    pad2Held = out2;
    return out;
  }


  // ──── Touch buttons ────
  // Each finger remembers which button it's on; sliding a finger from
  // ◀ to ▶ switches direction without lifting, the way kids actually play.
  const fingers = new Map(); // pointerId → action
  function recomputeTouch() {
    const next = blank();
    for (const a of fingers.values()) if (a) next[a] = true;
    for (const a of ACTIONS) {
      if (next[a] && !touchHeld[a]) touchLatch[a] = true;
      touchHeld[a] = next[a];
    }
    document.querySelectorAll('.tbtn').forEach(el => {
      el.classList.toggle('down', !!next[el.dataset.act]);
    });
  }
  function actionAt(x, y) {
    const pad = document.getElementById('touch');
    const slop = parseFloat(getComputedStyle(pad).getPropertyValue('--tap-slop')) || 0;
    let closest = null, distance = Infinity;
    for (const btn of pad.querySelectorAll('.tbtn')) {
      if (!btn.getClientRects().length) continue;
      const r = btn.getBoundingClientRect();
      if (x < r.left - slop || x > r.right + slop || y < r.top - slop || y > r.bottom + slop) continue;
      // Split shared margins halfway between neighbours, regardless of DOM order.
      const d = (x - (r.left + r.width / 2)) ** 2 + (y - (r.top + r.height / 2)) ** 2;
      if (d < distance) { closest = btn; distance = d; }
    }
    return closest ? closest.dataset.act : null;
  }

  Input.enableTouch = function () {
    document.body.classList.add('touch');
    if (this.touchEnabled) return;
    this.touchEnabled = true;
    if (BB.onResize) BB.onResize();
  };

  function setupTouch() {
    const pad = document.getElementById('touch');
    if (!pad) return;
    pad.addEventListener('pointerdown', e => {
      const a = actionAt(e.clientX, e.clientY);
      if (!a) return;
      e.preventDefault();
      Input.device = 'touch';
      try { pad.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      fingers.set(e.pointerId, a);
      recomputeTouch();
    });
    pad.addEventListener('pointermove', e => {
      if (!fingers.has(e.pointerId)) return;
      const a = actionAt(e.clientX, e.clientY);
      const cur = fingers.get(e.pointerId);
      // only slide between the two direction pads
      if (a !== cur && (a === 'left' || a === 'right') && (cur === 'left' || cur === 'right')) {
        fingers.set(e.pointerId, a);
        recomputeTouch();
      }
    });
    const end = e => { if (fingers.delete(e.pointerId)) recomputeTouch(); };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('lostpointercapture', end);
  }

  window.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') { Input.enableTouch(); Input.device = 'touch'; }
  }, { passive: true, capture: true });

  // Touch-first devices (tablets, phones) show the buttons from the start;
  // touchscreen laptops get them the moment a finger lands on the screen.
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('DOMContentLoaded', () => { Input.enableTouch(); Input.device = 'touch'; });
  }

  BB.setupInputDom = setupTouch;
})(window.BB);
