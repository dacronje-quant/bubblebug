'use strict';
// Exercise complete Play ticks at real horizontal and vertical room seams.
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const g = bootGame(), B = g.BB, P = B.Play, Cam = B.Camera;
B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1;
B.Main.set('play', { cat: 'phoebe' });

let residentTicks = 0, bubbleTicks = 0;
const thingsUpdate = B.Things.update, bubblesUpdate = B.Bubbles.update;
B.Things.update = (th, ctx) => { residentTicks++; return thingsUpdate(th, ctx); };
B.Bubbles.update = targets => { bubbleTicks++; return bubblesUpdate(targets); };

g.place('g2', 29, 14);
const destination = B.World.byId.g3, b = P.pl.body;
b.x = destination.px - b.w / 2 - 1; b.vx = B.CFG.RUN;
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
const moving = { ...P.pl.body, x: destination.px + 550, y: destination.py + 100 };
Cam.snap(B.World.byId.g2, moving); Cam.startSlide(destination, moving, B.World.byId.g2);
const initialTargetX = Cam.slide.to.x;
for (let i = 0; i < B.CFG.ROOM_SLIDE; i++) { moving.x += 12; Cam.update(destination, moving); }
const finalTarget = Cam.targetFor(destination, moving);
assert.ok(finalTarget.x > initialTargetX, 'the target moved across the wide destination room');
assert.equal(Cam.x, finalTarget.x, 'glide ends at the current target rather than its initial position');
assert.equal(Cam.y, finalTarget.y);
B.Save.data = B.Save.fresh(); B.Save.data.introDone = 1; B.Main.set('play', { cat: 'phoebe' });
assert.notEqual(P.ctx(), ctx, 'a new Play lifetime receives a fresh context');
assert.equal(P.ctx().save, B.Save.data);
console.log('Twelve-tick moving camera glides run full gameplay; Jump, Bubble Bounce and Star Wings work at horizontal and shaft seams; contexts reuse callbacks safely.');
