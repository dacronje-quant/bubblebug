// ════════════════════════════════════════════════════════════════
//  CONFIG — every gameplay tuning number lives here.
//  All physics values are per fixed 60 Hz simulation tick, in pixels.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';

  BB.CFG = Object.freeze({
    TILE: 32,
    VIEW_W: 960,            // logical view (16:9)
    VIEW_H: 540,
    STEP: 1000 / 60,        // fixed simulation step (ms)
    INTERACT_HOLD: 60,      // 1 second standing still at doors / home activities
    MAZE_EXIT_HOLD: 120,    // 2 seconds; moving away cancels leaving the maze

    // ── Kitten body ──
    PW: 20,                 // collision width
    PH: 24,                 // collision height

    // ── Running ──
    RUN: 3.6,               // top speed
    ACC_GROUND: 0.75,
    DEC_GROUND: 0.9,        // snappy stop — no ice-skating
    ACC_AIR: 0.55,
    DEC_AIR: 0.3,

    // ── Jumping ──
    JUMP: -10.6,            // ≈ 4 tiles with a full hold
    DJUMP: -9.6,            // butterfly double jump ≈ 3.3 tiles
    G_UP: 0.44,             // gravity while rising and holding jump
    G_CUT: 1.3,             // gravity while rising after releasing (short hops)
    G_DOWN: 0.6,            // gravity while falling
    MAX_FALL: 9.5,
    COYOTE: 8,              // ticks you may still jump after walking off a ledge
    BUFFER: 9,              // ticks a jump press is remembered before landing

    // ── Assists ──
    LEDGE_ASSIST: 18,       // px: feet this far below a ledge top still pop you up
    CORNER_SLIP: 11,        // px: head-bonks this close to a corner slide around it
    EASY_COYOTE: 12,
    EASY_BUFFER: 14,
    EASY_LEDGE_ASSIST: 24,
    EASY_CORNER_SLIP: 14,
    EASY_EDGE_GRACE: 3,
    EASY_ACC_AIR: 0.7,
    EASY_DEC_AIR: 0.45,
    EASY_APEX_GRAVITY: 0.35, // descent only: the jump never goes higher

    // ── Abilities ──
    BOUNCE: -14,            // mushroom bounce ≈ 7 tiles
    CLIMB: 2.6,             // snail wall-climb speed
    CLIMB_DELAY: 5,         // ticks of pushing into a wall before claws engage
    WALLJUMP_X: 4.2,
    WALLJUMP_LOCK: 9,
    FLOAT_FALL: 1.25,       // dandelion glide fall speed
    UPDRAFT: -7.2,          // breeze lift speed (carries you ~1.5 tiles past the top)
    UPDRAFT_ACC: 0.9,
    SWIM_UP: -2.9,          // Sea Turtle: holding jump underwater
    SWIM_SINK: 1.3,
    SWIM_SPEED: 0.8,
    JUMP_SPRING: -12.6,     // Snow Hare: ≈ 5.6 tiles
    BUBBLE_BOUNCE: -10,     // Otter: a bubble under your paws ≈ 3.5 tiles
    FLAP: -7.6,             // Star Whale: each flap of the star wings

    // ── Bubbles ──
    BUBBLE_SPEED: 4.6,
    BUBBLE_LIFE: 75,
    BUBBLE_COOLDOWN: 12,
    BUBBLE_MAX: 4,
    BUBBLE_ASSIST: 0.18,    // gentle homing towards gloomy bugs

    // ── Friends ──
    BUG_MOOD: 3,            // bubbles to cheer up a regular bug
    KING_MOOD: 6,

    // ── Feelings (a gentle kind of danger) ──
    MOOD_MAX: 4,            // happy suns; a gloomy bump or a tumble costs one
    HURT_INVULN: 100,       // ticks of blinking safety after a bump
    BUMP_INVULN: 50,        // (Easy: a shorter breather, since bumps cost nothing)
    RESPAWN_INVULN: 150,
    SAD_TIME: 84,           // the too-sad sniffle before floating home
    IRIS_TIME: 26,

    // ── Bosses ──
    BOSS_WAKE: 7,           // tiles into the arena before the boss notices you
    BOSS_SNIFFLE: 250,      // ticks the boss sits sniffling (bubble now!)

    // ── Presentation ──
    ROOM_SLIDE: 26,         // ticks for the camera to glide between rooms
    RESCUE_TIME: 80,        // ticks of the dandelion float back to safety
    MAX_RENDER_SCALE: 2,
  });
})(window.BB);
