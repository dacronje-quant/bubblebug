#!/usr/bin/env node
// Rendering must neither advance effects nor change the simulation's random
// sequence. Exercise actual play drawing at tablet/display refresh cadences.
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { bootGame } = require('./test-neighbourhood');

function canvasFactory(width, height) {
  const ctx = new Proxy({ globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return text => ({ width: String(text).length * 9 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (key === 'getLineDash') return () => [];
      return () => {};
    },
  });
  return { width, height, getContext: () => ctx };
}

function fresh() {
  const game = bootGame(canvasFactory);
  vm.runInContext(`
    globalThis.effectRandomState = 7319;
    Math.random = () => {
      effectRandomState = (Math.imul(effectRandomState, 1664525) + 1013904223) >>> 0;
      return effectRandomState / 4294967296;
    };
  `, game.context);
  const B = game.BB;
  B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
  B.Main.set('play', {});
  B.Play.intro = null; B.Play.iris = null;
  return game;
}

function state(B, context) {
  return JSON.stringify({
    play: B.Play, particles: B.Particles.list,
    ambient: B.Particles.ambient, rain: B.Particles.rain,
    camera: B.Camera, random: context.effectRandomState,
  }, (key, value) => ['visibleRooms', '_ctx', '_gardenCtx', 'homeRooms'].includes(key) ? undefined : value);
}

function sameState(actual, expected, message) {
  if (actual === expected) return;
  const changes = [];
  function compare(a, b, at) {
    if (a === b) return;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') { changes.push(`${at}: ${b} -> ${a}`); return; }
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compare(a[key], b[key], `${at}.${key}`);
  }
  compare(JSON.parse(actual), JSON.parse(expected), 'state');
  assert.deepEqual(changes, [], message);
}

// Snow, pollen and rain move by exactly the same distance and phase after one
// second, even if the drawing frequency differs from the 60 Hz game clock.
for (const [key, rainy] of [['frost', false], ['gardens', false], ['ruins', true]]) {
  let expected;
  for (const hz of [30, 60, 90, 120]) {
    const game = fresh(), B = game.BB;
    B.Particles.clearAmbient();
    let ticks = 0;
    const cam = { x: 0, y: 0 }, previous = { x: 0, y: 0 };
    for (let frame = 1; frame <= hz; frame++) {
      const due = Math.floor(frame * 60 / hz);
      while (ticks < due) {
        ticks++; cam.x = ticks * 0.6; cam.y = ticks * 0.15;
        B.Particles.ambientUpdate(key, rainy, cam, previous);
        Object.assign(previous, cam);
      }
      B.Particles.ambientDraw(B.G.ctx, ticks);
    }
    const actual = JSON.stringify({ ambient: B.Particles.ambient, rain: B.Particles.rain, random: game.context.effectRandomState });
    if (expected == null) expected = actual;
    else assert.equal(actual, expected, `${key} drift and random sequence at ${hz} Hz`);
    assert.equal(ticks, 60);
    assert.ok(B.Particles.ambient.length > 0);
    assert.equal(B.Particles.rain.length, rainy ? 90 : 0);
  }
}

// Full gameplay parity includes HUD collection bounce, flash and gate fades,
// lantern spark emission, particles and the actual game's drawing helpers.
let expectedPlay;
for (const hz of [30, 60, 90, 120]) {
  const game = fresh(), B = game.BB, P = B.Play;
  game.place('hm', 9, 32);
  P.flash = 16; P.signFade.g1 = 1;
  P.lantern = { x: P.pl.body.x + 10, y: P.pl.body.y + 24, t: 0 };
  // A new collectible changes the counter on the first update.
  const star = B.World.findThings('*')[0]; P.save.sparkles[star.tx + ',' + star.ty] = 1;
  let ticks = 0;
  const originalStar = B.G.star;
  let counterRadius = null;
  B.G.star = function (x, y, radius, ...args) {
    if (x === 192 && y === 31) counterRadius = radius;
    return originalStar.call(this, x, y, radius, ...args);
  };
  for (let frame = 1; frame <= hz; frame++) {
    const due = Math.floor(frame * 60 / hz);
    while (ticks < due) { game.tick(); ticks++; }
    B.Main.draw();
  }
  const actual = state(B, game.context);
  if (expectedPlay == null) expectedPlay = actual;
  else sameState(actual, expectedPlay, `full gameplay effects at ${hz} Hz`);
  assert.equal(P.flash, 0, 'portal flash expires after game ticks');
  assert.equal(P.signFade.g1, 0, 'gate sign fade expires after game ticks');
  assert.ok(counterRadius != null && counterRadius > 11 && counterRadius < 11.02, 'HUD bounce decays for 60 ticks');
  const before = state(B, game.context), radiusBefore = counterRadius;
  for (let i = 0; i < 20; i++) P.draw(B.G.ctx);
  sameState(state(B, game.context), before, 'repeated draws leave all simulation state and random sequence unchanged');
  assert.equal(counterRadius, radiusBefore, 'repeated draws never consume HUD bounce');
  B.Main.set('pause');
  const paused = state(B, game.context);
  for (let i = 0; i < 20; i++) { game.tick(); B.Main.draw(); }
  sameState(state(B, game.context), paused, 'pause drawing cannot advance world effects');
}

// Draw at emission boundaries. They used to emit a particle every render,
// duplicating bursts at 120 Hz and spawning indefinitely while paused.
{
  const game = fresh(), B = game.BB, P = B.Play;
  P.t = 60; P.flash = 16; P.signFade.g1 = 12;
  P.lantern = { x: P.pl.body.x + 10, y: P.pl.body.y + 24, t: 4 };
  const toy = Object.values(P.ents).flatMap(e => e.things).find(th => th.type === 'toy');
  toy.t = 20;
  toy.x = P.pl.body.x + 100; toy.y = P.pl.body.y;
  P.ents[P.room.id].things.push(toy);
  P.party = {
    cx: P.pl.body.x + 100, floor: P.pl.body.y + 24, t: 60, card: 0, total: 12, found: 0,
    guests: [
      { kind: 'bunny', x: P.pl.body.x + 60, y: P.pl.body.y, t: 70, facing: 1 },
      { cat: 'marshmallow', ring: true, ang: 0, t: 80 },
    ],
  };
  const before = state(B, game.context);
  for (let i = 0; i < 10; i++) P.draw(B.G.ctx);
  sameState(state(B, game.context), before, 'draw-only emission boundaries stay pure');
}

// All biome residents/artwork draw without consuming simulation RNG. Home
// family/nest hearts are checked at their precise former draw boundaries.
{
  const game = fresh(), B = game.BB, P = B.Play;
  for (const id of B.Home.familyOrder()) P.save.family[id] = 1;
  for (const id of B.RAINBOW_KIN) P.save.kin[id] = 1;
  for (const room of B.World.rooms) {
    P.room = room;
    P.pl.body = B.Physics.newBody(room.px + room.pw / 2, room.py + room.ph / 2);
    B.Camera.snap(room, P.pl.body);
    const before = state(B, game.context);
    P.draw(B.G.ctx); P.draw(B.G.ctx);
    sameState(state(B, game.context), before, `resident and scenery drawing in ${room.id}`);
  }
  const home = B.World.byId.hm;
  P.room = home;
  const family = B.Home.familySpots(home, P)[0];
  P.t = 60 - family.i * 37;
  Object.assign(P.pl.body, { x: family.x, y: family.y - 24 });
  let before = state(B, game.context);
  B.Home.drawFamily(B.G.ctx, home, B.Camera, P.t, P);
  sameState(state(B, game.context), before, 'home family heart boundary is draw-pure');
  const relative = B.RainbowFamily.seat(home, B.RainbowFamily.SEATS[0]);
  P.t = 70;
  Object.assign(P.pl.body, { x: relative.x - 10, y: relative.y - 24 });
  B.Camera.snap(home, P.pl.body);
  before = state(B, game.context);
  P.drawRainbowNest(B.G.ctx, home, B.Camera, P.t);
  sameState(state(B, game.context), before, 'Rainbow Nest heart boundary is draw-pure');
}

console.log('Effects have equal 30/60/90/120 Hz timing; repeated and paused draws preserve simulation, HUD bounce and RNG.');
