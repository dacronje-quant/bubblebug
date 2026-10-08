'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), zlib = require('node:zlib');
const { readRoute, validateRoute } = require('./lib/recorded-route.cjs');
const { runChild } = require('./lib/playability-runner.cjs');
const { parseArgs, validateTrace } = require('./test-playthrough-browser.js');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubblebug-recorded-inputs-'));
  try {
    const route = { schema:1, recordType:'golden-inputs', captureFingerprint:'a'.repeat(64), complete:true,
      fingerprint:'current', mode:'easy', seed:1, expected:{save:{},runtime:{}}, trace:[{ticks:300,keys:[]}] };
    const file = path.join(dir, 'input.json.gz');
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(route)));
    assert.deepEqual(readRoute(file), route);
    assert.equal(validateRoute(route, {mode:'easy',seed:1,fingerprint:'changed',fixture:true}), route,
      'historical inputs can be re-executed against changed code; historical results are not reused');
    assert.throws(()=>validateRoute(route,{mode:'easy',seed:1,fingerprint:'changed'}), /fingerprint/);
    assert.throws(()=>validateRoute(route,{mode:'hard',seed:1,fixture:true}), /mode/);
    assert.throws(()=>validateRoute({...route,complete:false},{mode:'easy',seed:1,fixture:true}), /completion/);
    assert.throws(()=>validateRoute({...route,trace:[{ticks:-1,keys:[]}]},{mode:'easy',seed:1,fixture:true}), /chunk/);
    assert.equal(validateTrace(route,'changed'),300,'browser accepts historical input fixtures, then checks actual state');
    assert.throws(()=>parseArgs(['--timeout-ms','2147483648']), /timeout-ms/);
    const resultFile = path.join(dir, 'result.json');
    const result = await runChild({ cwd:path.resolve(__dirname,'..'), timeoutMs:10000,
      args:[path.join(__dirname,'playability-worker.cjs'), JSON.stringify({mode:'easy',seed:1,fixture:true,replayFile:file,output:resultFile,fingerprint:'changed'})] });
    const report = JSON.parse(fs.readFileSync(resultFile,'utf8'));
    assert.equal(result.code,1); assert.equal(report.complete,false);
    assert.equal(report.unlocks.complete,false,'a complete marker on an empty adventure cannot pass actual earned input checks');
    assert.equal(report.expectedState.complete,false,'expected save/runtime divergence is reported');
    console.log('Compressed recorded inputs, historical provenance, stale result rejection, and deliberately forged completion negative passed.');
  } finally {
    // Remove only files in this newly created, nonrecursive fixture directory.
    for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir,name)); fs.rmdirSync(dir);
  }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
