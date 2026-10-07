'use strict';
const assert = require('node:assert/strict');
const { bootGame } = require('./test-neighbourhood');
const game = bootGame(), B = game.BB, S = B.SkillPrompts;
const plain = x => JSON.parse(JSON.stringify(x));
const full = { doubleJump: true, bubbleBounce: true, wings: true };
const bounce = S.lesson('bubbleBounce', full);
assert.deepEqual(plain(bounce.steps), ['jump', 'doubleJump', 'bubbleBounce']);
assert.deepEqual(plain(bounce.actions), ['jump', 'jump', 'jump']);
assert.deepEqual(plain(S.lesson('bubbleBounce', {}).steps), ['jump', 'bubbleBounce', 'land']);
assert.deepEqual(plain(S.lesson('wings', {}).prefix), ['jump']);
assert.deepEqual(plain(S.lesson('wings', full).prefix), ['jump', 'doubleJump', 'bubbleBounce']);
assert.deepEqual(plain(S.lesson('wings', { spring: true, bubbleBounce: true }).prefix), ['spring', 'bubbleBounce']);
// Actual input edges must cause the effects advertised by the strip.
const oldTile = B.World.tile;
B.World.tile = (x, y) => y >= 100 ? '#' : '.';
for (const ab of [full, { bubbleBounce: true }, { wings: true }, { doubleJump: true, wings: true }]) {
  const skill = ab.wings ? 'wings' : 'bubbleBounce', spec = S.lesson(skill, ab);
  const body = B.Physics.newBody(0, 3200 - B.CFG.PH); body.grounded = true;
  const advertised = spec.prefix.length ? [...spec.prefix, 'wings', 'wings'] : spec.steps.filter(x => x !== 'land');
  const flag = { jump: B.FX.JUMP, doubleJump: B.FX.DJUMP, bubbleBounce: B.FX.BBOUNCE, wings: B.FX.FLAP };
  for (const effect of advertised) {
    const fx = B.Physics.step(body, { jump: true, jumpPressed: true }, ab);
    assert.ok(fx & flag[effect], 'strip follows actual physics: ' + effect);
    for (let t = 0; t < 5; t++) B.Physics.step(body, { jump: false, jumpPressed: false }, ab);
  }
}
B.World.tile = oldTile;
for (let i = 0; i < 3; i++) {
  assert.equal(S.frame(bounce, i * S.BEAT).down, true);
  assert.equal(S.frame(bounce, i * S.BEAT + 24).down, false, 'finger lifts between taps');
}
for (const skill of ['float', 'glow', 'dig', 'rings']) {
  const spec = S.lesson(skill, full);
  for (let i = 0; i < 3; i++) assert.equal(S.frame(spec, i * S.BEAT + 24).down, true, skill + ' keeps the finger down');
}
const swim = S.lesson('swim');
assert.equal(S.frame(swim, S.BEAT + 24).down, true);
assert.equal(S.frame(swim, 2 * S.BEAT + 24).action, null, 'swimming shows release to sink');
const wall = S.lesson('wallClimb');
assert.equal(S.frame(wall, S.BEAT + 24).action, 'right');
assert.equal(S.frame(wall, 2 * S.BEAT).action, 'jump');
assert.equal(S.frame(S.lesson('spring'), S.BEAT + 24).action, null);
// Exercise ceremony input, full-cycle protection, replay, and explicit exit.
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' });
const P = B.Play;
P.intro = null; P.pl.state = 'play';
P.startGift({ ability: 'bubbleBounce', x: P.pl.body.x, y: P.pl.body.y });
P.save.abilities.doubleJump = true; P.gift.t = 110;
P.updateGift(); const start = P.gift.lessonStart;
B.Input.any = true; P.gift.t += 90; P.updateGift(); assert.equal(P.gift.closing, undefined);
P.gift.t = start + P.gift.lesson.duration; P.updateGift(); assert.equal(P.gift.closing, true);
P.gift.closing = false; B.Input.any = false; const oldStart = P.gift.lessonStart;
B.Input.pointers.push(S.layout().replay); P.updateGift(); assert.ok(P.gift.lessonStart > oldStart); assert.equal(P.gift.closing, false);
B.Input.pointers.push(S.layout().next); P.updateGift(); assert.equal(P.gift.closing, true);
console.log('Skill picture strips match real jump effects, learned powers, tap/hold/release timing, replay and dismissal.');
