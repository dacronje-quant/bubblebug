'use strict';
// Exercise complete Play ticks at real horizontal and vertical room seams:
// side-by-side rooms of a zone that share one camera (scrolled straight
// across), and seams the camera glides over.
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const g = bootGame(), B = g.BB, P = B.Play, Cam = B.Camera;
B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
B.Main.set('play', { cat: 'phoebe' });

let residentTicks = 0, bubbleTicks = 0;
const thingsUpdate = B.Things.update, bubblesUpdate = B.Bubbles.update;
B.Things.update = (th, ctx) => { residentTicks++; return thingsUpdate(th, ctx); };
B.Bubbles.update = targets => { bubbleTicks++; return bubblesUpdate(targets); };

// A zone's side-by-side rooms at the same height share one camera strip;
// boss arenas and link trails keep their own framing.
const W = B.World;
assert.ok(W.byId.g2.camGroup && W.byId.g2.camGroup === W.byId.g3.camGroup, 'g2 and g3 share one camera');
assert.equal(W.byId.s1.camGroup, W.byId.s5.camGroup, 'a five-room strip shares one camera');
assert.equal(W.byId.g4.camGroup, null, 'a taller room keeps its own frame');
assert.equal(W.byId.s6.camGroup, null, 'boss arenas keep their own frame');
assert.equal(W.byId.mh.camGroup, null, 'link trails keep their own frame');
assert.equal(W.byId.hm.camGroup, W.byId.g1.camGroup, 'home and its outdoor rooms still share theirs');
for (const g of new Set(W.rooms.map(r => r.camGroup).filter(Boolean))) {
  if (!g.strip) continue;
  assert.ok(g.rooms.length > 1 && g.rooms.every(r => r.zone === g.rooms[0].zone && r.py === g.py && r.py + r.ph === g.py1 && !r.def.arena && !r.def.link), g.id + ' is one zone\'s level row');
}

g.place('g2', 29, 14);
let b = P.pl.body;
const g3 = W.byId.g3, ballX = g3.px - 40;
b.x = g3.px - b.w / 2 - 40; b.vx = B.CFG.RUN;
g.tick(2, ['ArrowRight']);
B.Bubbles.blow(ballX, b.y + 8, 1, 2, P.pl.cat);
const camXs = [];
let crossedAt = -1, bubblesAtSeam = 0;
for (let i = 0; i < 40; i++) {
  g.tick(1, ['ArrowRight']);
  camXs.push(Cam.x);
  if (crossedAt < 0 && P.room === g3) { crossedAt = i; bubblesAtSeam = B.Bubbles.list.length; }
  assert.equal(Cam.sliding, false, 'no glide between rooms that share a camera');
}
assert.ok(crossedAt >= 0, 'running crosses the strip seam');
const steps = camXs.slice(1).map((x, i) => Math.abs(x - camXs[i]));
assert.ok(Math.max(...steps) < 8, 'the camera keeps scrolling smoothly over the seam');
assert.ok(camXs[camXs.length - 1] > camXs[0] + 60, 'and follows the kitten into the next room');
assert.equal(bubblesAtSeam, 1, 'a bubble blown just before the seam keeps floating across it');
g.tick(1, ['ArrowRight', 'Space']);
assert.ok(b.fx & B.FX.JUMP, 'Jump right after the seam fires');

// A seam the camera glides over: g3 (a strip) into the taller g4.
g.place('g3', 44, 14);
b = P.pl.body;
const destination = W.byId.g4;
b.x = destination.px - b.w / 2 - 1; b.vx = B.CFG.RUN;
residentTicks = 0; bubbleTicks = 0;
const stats = P.save.playTicks, age = P.pl.t;
g.tick(1, ['ArrowRight']);
assert.equal(P.room, destination, 'running crosses the real room seam');
assert.equal(Cam.sliding, true);
assert.equal(Cam.slide.t, 1, 'camera advances on the boundary tick');
assert.equal(P.pl.t, age + 1);
assert.equal(P.save.playTicks, stats + 1, 'boundary tick completes gameplay');
assert.ok(residentTicks > 0, 'new-room residents update immediately');
assert.equal(bubbleTicks, 1, 'bubble simulation also advances at the seam');

let x = b.x, y = b.y;
g.tick(1, ['ArrowRight', 'Space']);
assert.ok(b.fx & B.FX.JUMP, 'a Jump press during the glide fires immediately');
assert.ok(b.x > x && b.y < y, 'running and jumping continue during the glide');
P.save.abilities.doubleJump = P.save.abilities.bubbleBounce = P.save.abilities.wings = true;
g.tick(3, ['ArrowRight']);
g.tick(1, ['ArrowRight', 'Space']);
assert.ok(b.fx & B.FX.DJUMP, 'second Jump fires during the same glide');
g.tick(1, ['ArrowRight']); g.tick(1, ['ArrowRight', 'Space']);
assert.ok(b.fx & B.FX.BBOUNCE, 'Bubble Bounce also remains responsive');
g.tick(1, ['ArrowRight']); g.tick(1, ['ArrowRight', 'Space']);
assert.ok(b.fx & B.FX.FLAP, 'Star Wings presses are never lost to a glide');
assert.equal(Cam.sliding, true);
const target = Cam.targetFor(P.room, b);
g.tick(2, ['ArrowRight']);
assert.equal(Cam.sliding, false, 'glide completes in twelve simulation ticks');
assert.equal(bubbleTicks, 12, 'the entire glide ran full game ticks');
assert.ok(Cam.x >= target.x, 'camera follows the moving target to its final position');

// The tower has an open, vertical shaft between these actual rooms.
g.place('tx', 16, 2);
P.save.abilities.doubleJump = P.save.abilities.bubbleBounce = P.save.abilities.wings = true;
let crossed = false;
for (let i = 0; i < 30; i++) {
  g.tick(1, ['Space']);
  if (P.room.id === 'tw') { crossed = true; break; }
}
assert.ok(crossed && Cam.sliding, 'jump climbs through the tower room boundary');
const shaftBody = P.pl.body, shaftY = shaftBody.y;
g.tick(1); g.tick(1, ['Space']);
assert.ok(shaftBody.fx & B.FX.DJUMP, 'air jump works at the shaft boundary');
g.tick(1); g.tick(1, ['Space']);
assert.ok(shaftBody.fx & B.FX.BBOUNCE);
g.tick(1); g.keys(['Space']); g.keys([]); g.tick(1);
assert.ok(shaftBody.fx & B.FX.FLAP, 'a quick Wings tap between ticks survives the glide');
assert.ok(shaftBody.y < shaftY);

// Entity contexts keep callbacks stable, while room and save references refresh.
const ctx = P.ctx(), gardenCtx = P.ctx(true);
assert.notEqual(ctx, gardenCtx);
assert.equal(gardenCtx.garden, true);
assert.equal(ctx.garden, undefined, 'garden movement mode cannot leak into adventure residents');
const funcs = Object.keys(ctx).filter(key => typeof ctx[key] === 'function');
assert.ok(funcs.length >= 30, 'the large entity callback bundle is covered');
const refs = funcs.map(key => ctx[key]);
g.tick(20);
assert.equal(P.ctx(), ctx);
funcs.forEach((key, i) => assert.equal(P.ctx()[key], refs[i], key + ' stays cached'));
assert.equal(P.ctx().room, P.room);
const followers = P.followers = [];
assert.equal(P.ctx().followers, followers, 'replaced follower lists refresh');
assert.equal(P.ctx(true).followers, followers);
assert.equal(P.ctx(true).onFriend, ctx.onFriend, 'garden wrapper shares callbacks');
const revision = Cam.revision;
Cam.snap(P.room, P.pl.body);
assert.equal(Cam.revision, revision + 1, 'camera snaps mark an interpolation discontinuity');
// (the strip is wider than the screen, so the target moves during the glide)
const moving = { ...P.pl.body, x: g3.px + 550, y: g3.py + 100 };
Cam.snap(W.byId.g4, moving); Cam.startSlide(g3, moving, W.byId.g4);
const initialTargetX = Cam.slide.to.x;
for (let i = 0; i < B.CFG.ROOM_SLIDE; i++) { moving.x += 12; Cam.update(g3, moving); }
const finalTarget = Cam.targetFor(g3, moving);
assert.ok(finalTarget.x > initialTargetX, 'the target moved across the wide destination room');
assert.equal(Cam.x, finalTarget.x, 'glide ends at the current target rather than its initial position');
assert.equal(Cam.y, finalTarget.y);
B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', { cat: 'phoebe' });
assert.notEqual(P.ctx(), ctx, 'a new Play lifetime receives a fresh context');
assert.equal(P.ctx().save, B.Save.data);
console.log('Side-by-side rooms scroll as one camera strip; twelve-tick moving camera glides run full gameplay; Jump, Bubble Bounce and Star Wings work at horizontal and shaft seams; contexts reuse callbacks safely.');
