'use strict';
const assert = require('node:assert/strict');
const { withRenderRandom } = require('./lib/render-random.cjs');
const { createGame, runtimeState } = require('./lib/playability-harness.cjs');
const a=createGame({seed:15}), b=createGame({seed:15});
for(let tick=0;tick<1000;tick++) {
  const keys=tick>300&&tick<450?['ArrowRight']:[];
  a.tick(1,keys); b.tick(1,keys);
  if(tick%13===0) withRenderRandom(b.context.Math,()=>0.25,()=>
    b.BB.Particles.burst('spark',b.BB.Play.pl.body.x,b.BB.Play.pl.body.y,2));
}
assert.deepEqual(runtimeState(a.BB),runtimeState(b.BB));
assert.equal(JSON.stringify(a.BB.Play.save),JSON.stringify(b.BB.Play.save),'decorative draw bursts do not disturb deterministic gameplay');
const before=b.context.Math.random;
assert.throws(()=>withRenderRandom(b.context.Math,()=>0.5,()=>{throw Error('deliberate render exception');}),/render exception/);
assert.equal(b.context.Math.random,before,'the gameplay random stream is restored even when drawing throws');
console.log('Cosmetic draw randomness preserves actual gameplay/save replay and rendering exceptions propagate.');
