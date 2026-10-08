'use strict';
const assert = require('node:assert/strict');
const { runChild, runPool, matchingCache } = require('./lib/playability-runner.cjs');
(async () => {
  const pass = await runChild({ args: ['-e', 'console.log("sentinel");'], timeoutMs: 2000 });
  assert.equal(pass.code, 0); assert.match(pass.tail, /sentinel/);
  const failure = await runChild({ args: ['-e', 'throw Error("deliberate failure");'], timeoutMs: 2000 });
  assert.notEqual(failure.code, 0); assert.match(failure.tail, /deliberate failure/);
  const hang = await runChild({ args: ['-e', 'console.log("before hang");while(true){}'], timeoutMs: 400 });
  assert.equal(hang.timedOut, true); assert.match(hang.tail, /before hang/);
  assert.throws(() => runChild({ args: [], timeoutMs: 0x80000000 }), /timeoutMs/);
  assert.throws(() => runChild({ args: [], timeoutMs: 1.5 }), /timeoutMs/);
  assert.equal(matchingCache({ code: 0, complete: true, fingerprint: 'old' }, 'new'), false);
  assert.equal(matchingCache({ code: 0, complete: false, fingerprint: 'new' }, 'new'), false);
  assert.equal(matchingCache({ code: 0, complete: true, timedOut: true, fingerprint: 'new' }, 'new'), false);
  assert.equal(matchingCache({ code: 0, complete: true, fingerprint: 'new' }, 'new'), true);
  let active = 0, maximum = 0;
  const results = await runPool([1, 2, 3, 4, 5], 2, async n => {
    maximum = Math.max(maximum, ++active); await new Promise(resolve => setTimeout(resolve, 10)); active--; return n * 2;
  });
  assert.deepEqual(results, [2, 4, 6, 8, 10]); assert.equal(maximum, 2);
  console.log('External hard-freeze watchdog, runtime exceptions, exact cache invalidation and bounded parallel scheduling passed.');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
