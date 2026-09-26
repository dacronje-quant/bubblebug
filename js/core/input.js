// ════════════════════════════════════════════════════════════════
//  INPUT — keyboard, gamepads and chunky touch buttons, merged into
//  one tiny vocabulary a 3-year-old can drive:
//      ◀  ▶  jump  bubble   (plus up/down/pause for menus)
//  `poll()` runs once per simulation tick and produces clean
//  `pressed` edges so a tap is never lost between frames.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';

  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'bubble', 'pause', 'confirm', 'back'];

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
  };

  const blank = () => Object.fromEntries(ACTIONS.map(a => [a, false]));

  const kbHeld = blank();
  const kbLatch = blank();
  const touchHeld = blank();
  const touchLatch = blank();
  let padHeld = blank();
  let prevHeld = blank();

  const Input = BB.Input = {
    held: blank(),
    pressed: blank(),
    any: false,               // any press this tick (wakes title screens)
    device: 'keyboard',       // last used: keyboard | gamepad | touch
    touchEnabled: false,
    pointers: [],             // queued pointer taps in logical coords {x,y}
    pointerPos: null,         // hover position (mouse), logical coords

    poll() {
      padHeld = readGamepads();
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
      };
    },

    takePointers() { const p = this.pointers; this.pointers = []; return p; },

    clearAll() {
      for (const a of ACTIONS) { kbHeld[a] = kbLatch[a] = touchHeld[a] = touchLatch[a] = false; }
    },
  };

  // ──── Keyboard ────
  window.addEventListener('keydown', e => {
    const acts = KEYMAP[e.code];
    if (acts) {
      e.preventDefault();
      if (Input.device === 'touch') document.body.classList.remove('touch');
      Input.device = 'keyboard';
      if (e.repeat) return;
      for (const a of acts) { kbHeld[a] = true; kbLatch[a] = true; }
    } else if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      Input._anyKey = true; // wakes the title screen for mashing toddlers
    }
  });
  window.addEventListener('keyup', e => {
    const acts = KEYMAP[e.code];
    if (acts) for (const a of acts) kbHeld[a] = false;
  });
  window.addEventListener('blur', () => Input.clearAll());

  // ──── Gamepads (standard mapping) ────
  function readGamepads() {
    const out = blank();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
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
      if (b(8)) out.back = true;
    }
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
    const el = document.elementFromPoint(x, y);
    const btn = el && el.closest ? el.closest('.tbtn') : null;
    return btn ? btn.dataset.act : null;
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
