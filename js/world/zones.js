// ════════════════════════════════════════════════════════════════
//  ZONES — the six biomes of the Whispering Kingdom.
//  Palettes drive the procedural tile art, parallax painter, ambient
//  particles and lighting; `bugs` picks which gloomy critter a `b`/`c`
//  map character becomes.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';

  BB.ZONES = [
    { // 0 ─ Sunlit Sparkle Gardens
      key: 'gardens', name: 'Sparkle Gardens',
      sky: ['#8fd3ff', '#d9f4ff', '#fff4d6'],
      far: '#9fd8c0', mid: '#6fbf8e', near: '#4f9e6c',
      ground: '#7a5236', groundDark: '#5b3b26', groundLight: '#9a6d48',
      top: '#6cc24a', topLight: '#a4e36b', topDark: '#3f8f35',
      ledge: '#8bd15a', ledgeDark: '#4e9a3a',
      accent: '#ffd1e8', light: '#fff2b3', water: '#6fd0f0',
      ambient: 'pollen', dark: 0,
      bugs: { b: 'ladybug', c: 'beetle' },
    },
    { // 1 ─ Bioluminescent Mushroom Meadow
      key: 'meadow', name: 'Mushroom Meadow',
      sky: ['#2b1b52', '#5a3a8a', '#b07ac0'],
      far: '#4a3378', mid: '#6a4598', near: '#3a2462',
      ground: '#4b2f5e', groundDark: '#321d42', groundLight: '#6b4a82',
      top: '#5ed6b0', topLight: '#a8ffe0', topDark: '#2f9c83',
      ledge: '#e08ad0', ledgeDark: '#9a4c92',
      accent: '#7cf5d4', light: '#aaffee', water: '#7a8cff',
      ambient: 'spores', dark: 0.18,
      bugs: { b: 'caterpillar', c: 'beetle' },
    },
    { // 2 ─ Glimmering Crystal Caverns
      key: 'caves', name: 'Crystal Caverns',
      sky: ['#0b1030', '#1a2458', '#2c3a78'],
      far: '#1c2a60', mid: '#26377a', near: '#141d48',
      ground: '#2f3a70', groundDark: '#1d2550', groundLight: '#46559a',
      top: '#8fdcff', topLight: '#dff6ff', topDark: '#4d8fd0',
      ledge: '#9fb8ff', ledgeDark: '#5a6fc0',
      accent: '#c9a6ff', light: '#b8e8ff', water: '#58c8ff',
      ambient: 'glints', dark: 0.5,
      bugs: { b: 'pillbug', c: 'beetle' },
    },
    { // 3 ─ Amber Honeycomb Hive
      key: 'hive', name: 'Honeycomb Hive',
      sky: ['#7a3e0c', '#c77716', '#f2b33d'],
      far: '#b8661a', mid: '#d88a22', near: '#8f4a10',
      ground: '#d99a2b', groundDark: '#a8661a', groundLight: '#f2c25a',
      top: '#ffd766', topLight: '#fff0b0', topDark: '#d9a22e',
      ledge: '#f7c948', ledgeDark: '#c38a1e',
      accent: '#fff3c4', light: '#ffe09a', water: '#ffc34a',
      ambient: 'honey', dark: 0.3,
      bugs: { b: 'bee', c: 'beetle' },
    },
    { // 4 ─ Serene Rainy Ruins
      key: 'ruins', name: 'Rainy Ruins',
      sky: ['#46566e', '#6f8299', '#a9b9c6'],
      far: '#5c6d84', mid: '#4d5d73', near: '#3a4859',
      ground: '#7d8a96', groundDark: '#58636e', groundLight: '#9aa6b1',
      top: '#6fae7a', topLight: '#a6d6a0', topDark: '#4a8458',
      ledge: '#9c7a5a', ledgeDark: '#6e523a',
      accent: '#bfe7ff', light: '#d8f0ff', water: '#5fb3d6',
      ambient: 'rain', dark: 0.12,
      bugs: { b: 'spider', c: 'snailet' },
    },
    { // 5 ─ Dreamy Cloud Castles
      key: 'clouds', name: 'Cloud Castles',
      sky: ['#9fc6ff', '#ffd6ec', '#fff3dc'],
      far: '#e6dcff', mid: '#f4ecff', near: '#ffffff',
      ground: '#f4f1ff', groundDark: '#cfc6f0', groundLight: '#ffffff',
      top: '#ffffff', topLight: '#ffffff', topDark: '#dcd4ff',
      ledge: '#ffffff', ledgeDark: '#cdbff5',
      accent: '#ffe27a', light: '#fff6d8', water: '#e8f0ff',
      ambient: 'wisps', dark: 0,
      bugs: { b: 'moth', c: 'bee' },
    },
  ];
})(window.BB);
