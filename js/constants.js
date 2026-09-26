// ════════════════════════════════════════════════
//  CONSTANTS & CONFIGURATION
// ════════════════════════════════════════════════
const T = 32;           // tile size in pixels
const RW = 30;          // room width in tiles (960px)
const RH = 17;          // room height in tiles (544px)
const PW = 20;          // player collision width
const PH = 26;          // player collision height

// Physics tuned for young children (forgiving, responsive, joyful)
const GRAVITY = 0.45;
const MAX_FALL = 9;
const MOVE_SPD = 3.2;   // energetic running speed
const JUMP_VEL = -9.8;  // generous single jump (~3.5 tiles height)
const DJUMP_VEL = -8.8; // soaring double jump
const BUBBLE_SPD = 5;
const BUBBLE_LIFE = 50;

// Zone Themes & Aesthetic Palettes
const ZONES = [
  { // 0: Sparkle Gardens (Tutorial)
    name: 'Sparkle Gardens',
    bg1: '#4a9c5e', bg2: '#2d6b3f', tileFill: '#5a8f3e', tileStroke: '#3d6b2a',
    sky: ['#87ceeb', '#b8e6c8'], platformFill: '#7ab356', platformStroke: '#5a8f3e',
    particleColor: '#ffeaa7', ambient: '🌿'
  },
  { // 1: Mushroom Meadow (Double Jump)
    name: 'Mushroom Meadow',
    bg1: '#6c3d6c', bg2: '#4a2555', tileFill: '#8e5ea2', tileStroke: '#6c3d80',
    sky: ['#2d1b4e', '#4a2555'], platformFill: '#a074b6', platformStroke: '#8e5ea2',
    particleColor: '#dda0dd', ambient: '🍄'
  },
  { // 2: Crystal Caves (Wall Climb)
    name: 'Crystal Caves',
    bg1: '#1a1a3e', bg2: '#0d0d2b', tileFill: '#2a3a6e', tileStroke: '#1a2a5e',
    sky: ['#0a0a20', '#1a1a3e'], platformFill: '#3a4a7e', platformStroke: '#2a3a6e',
    particleColor: '#74b9ff', ambient: '💎'
  },
  { // 3: Honey Hive (Glow)
    name: 'Honey Hive',
    bg1: '#8b6914', bg2: '#6b4f10', tileFill: '#c9951a', tileStroke: '#a07816',
    sky: ['#4a3508', '#6b4f10'], platformFill: '#daa520', platformStroke: '#c9951a',
    particleColor: '#ffd700', ambient: '🍯'
  },
  { // 4: Rainy Ruins (Float)
    name: 'Rainy Ruins',
    bg1: '#3a4a5c', bg2: '#2a3a4c', tileFill: '#5a6a7c', tileStroke: '#4a5a6c',
    sky: ['#2a3040', '#3a4a5c'], platformFill: '#6a7a8c', platformStroke: '#5a6a7c',
    particleColor: '#81ecec', ambient: '🌧️'
  },
  { // 5: Cloud Kingdom (Finale)
    name: 'Cloud Kingdom',
    bg1: '#e8f0ff', bg2: '#c8d8f0', tileFill: '#f0f4ff', tileStroke: '#c8d8f0',
    sky: ['#87ceeb', '#c8e8ff'], platformFill: '#fff', platformStroke: '#d0e0f0',
    particleColor: '#ffeaa7', ambient: '☁️'
  }
];
