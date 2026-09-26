// ════════════════════════════════════════════════════════════════
//  BB — the Bubble Paws namespace
//  Every module attaches itself to this single global object. Plain
//  classic scripts (not ES modules) are used on purpose: browsers block
//  ES-module imports from file:// URLs, and the game must run by simply
//  double-clicking index.html.
// ════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const BB = root.BB = root.BB || {};

  // ──── Math helpers ────
  BB.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  BB.lerp = (a, b, t) => a + (b - a) * t;
  BB.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  BB.sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  BB.easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  BB.easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  BB.easeOutElastic = t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1);
  BB.TAU = Math.PI * 2;

  // Deterministic hash → [0,1) — used for procedural decoration so every
  // room looks the same on every visit.
  BB.hash = (a, b, c) => {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263 + ((c | 0) * 2147483647 | 0);
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };

  // Small seeded PRNG (mulberry32)
  BB.rng = seed => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  BB.rand = (lo, hi) => lo + Math.random() * (hi - lo);
  BB.pick = arr => arr[(Math.random() * arr.length) | 0];

  // ──── Colour helpers ────
  BB.hexToRgb = hex => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  BB.rgba = (hex, a) => {
    const [r, g, b] = BB.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  BB.mix = (hexA, hexB, t) => {
    const a = BB.hexToRgb(hexA), b = BB.hexToRgb(hexB);
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
