'use strict';
const fs = require('node:fs');
const { createGame, replay, runtimeState, resumeSmoke } = require('./lib/playability-harness.cjs');
const { catalog, createLedger, persistenceDifferences, progressLosses } = require('./lib/unlock-ledger.cjs');
const { shiftJump } = require('./lib/input-variations.cjs');
const { readRoute, validateRoute } = require('./lib/recorded-route.cjs');

async function main(options) {
  let game, ledger;
  const started = performance.now();
  const report = { schema: 1, runId: options.runId, fingerprint: options.fingerprint, pid: process.pid,
    mode: options.mode, seed: options.seed, complete: false, freshSave: true,
    coverage: { actualProgression: true, inputOnly: true, allUnlocks: false, allCollectibles: false } };
  let lastProgress = 0;
  try {
    game = createGame({ mode: options.mode, seed: options.seed, maxTicks: options.maxTicks || 1000000,
      onStep(g, tick) {
        if (ledger && tick % 30 === 0) ledger.observe(tick, g.trace[g.trace.length - 1]?.keys);
        if (tick - lastProgress >= 3000) {
          lastProgress = tick;
          if (options.progressFile) fs.writeFileSync(options.progressFile, JSON.stringify({ tick, state: runtimeState(g.BB) }));
        }
      } });
    ledger = createLedger(game.BB, catalog(game.BB)); ledger.observe(0);
    const traceFile = options.replayFile;
    let stored;
    if (traceFile && fs.existsSync(traceFile)) {
      stored = validateRoute(readRoute(traceFile), options);
      const varied = options.variation ? shiftJump(stored.trace, options.variation.edgeOrdinal, options.variation.offset) : null;
      replay(game, varied ? varied.trace : stored.trace);
      report.route = options.fixture ? 'golden-inputs' : 'replayed';
      if (varied) {
        report.variation = varied.variation;
        const alreadyEarned = ledger.inspect({ requireAllCollectibles: !!options.allCollectibles });
        // A changed jump may miss its intended landing. The controller must
        // recover using the same legitimately earned live adventure.
        if (alreadyEarned.complete) report.recovery = { complete:true, status:'no-recovery-needed', ticks:0 };
        else {
          const bot = require('./lib/playthrough-bot.cjs');
          report.recovery = await bot.runAdventure(game, { ...options, onProgress(p) { console.log('RECOVERY ' + JSON.stringify(p)); } });
        }
      }
    } else {
      const bot = require('./lib/playthrough-bot.cjs');
      report.bot = await bot.runAdventure(game, { ...options, onProgress(p) {
        console.log('PROGRESS ' + JSON.stringify(p));
        if (options.progressFile) fs.writeFileSync(options.progressFile, JSON.stringify({ tick: game.ticks, milestone: p, state: runtimeState(game.BB) }));
      } });
      report.route = 'discovered';
    }
    ledger.observe(game.ticks);
    const traceEnd = runtimeState(game.BB);
    report.unlocks = ledger.inspect({ requireAllCollectibles: !!options.allCollectibles });
    // Persistence is assessed against an ordinary runtime save, then Continue.
    game.BB.Play.writeSave(); report.persistence = ledger.persisted(game.storage);
    const before = ledger.snapshot();
    if (stored && !options.variation) {
      const saveDifferences = persistenceDifferences(stored.expected.save, before);
      const runtimeMatches = JSON.stringify(traceEnd) === JSON.stringify(stored.expected.runtime);
      report.expectedState = { complete: saveDifferences.length === 0 && runtimeMatches, saveDifferences, runtimeMatches };
    }
    if (!game.BB.Save.load()) throw new Error('Continue could not load the earned adventure');
    game.BB.Main.set('play', {});
    const after = ledger.inspect({ requireAllCollectibles: !!options.allCollectibles });
    report.persistence.continueDifferences = persistenceDifferences(before, game.BB.Play.save);
    report.persistence.afterContinue = after.complete === report.unlocks.complete && report.persistence.continueDifferences.length === 0;
    const continued = resumeSmoke(game, options);
    report.persistence.resume = { responsive: continued.responsive, movement: continued.movement, scene: continued.scene, mode: continued.mode,
      start: continued.start, end: continued.end };
    const resumedProgress = progressLosses(before, continued.game.BB.Play.save);
    report.persistence.resumeProgressLoss = resumedProgress;
    report.persistence.afterContinue = report.persistence.afterContinue && continued.responsive && resumedProgress.length === 0;
    report.complete = report.unlocks.complete && report.persistence.complete && report.persistence.afterContinue &&
      report.expectedState?.complete !== false && (!report.recovery || report.recovery.complete === true);
    if (report.complete && report.route === 'discovered') {
      // Independently replay only the captured inputs from another fresh
      // adventure. A controller-side teleport/grant could not pass this.
      const validation = createGame({ mode: options.mode, seed: options.seed, maxTicks: Math.max(game.ticks + 1, options.maxTicks || 1000000) });
      replay(validation, game.trace);
      const validationLedger = createLedger(validation.BB, catalog(validation.BB));
      const earned = validationLedger.inspect({ requireAllCollectibles: !!options.allCollectibles });
      validation.BB.Play.writeSave();
      const saveDifferences = persistenceDifferences(before, validation.BB.Play.save);
      const runtimeMatches = JSON.stringify(traceEnd) === JSON.stringify(runtimeState(validation.BB));
      report.inputReplayValidation = { complete: earned.complete && saveDifferences.length === 0 && runtimeMatches,
        ticks: validation.ticks, missing: earned.missing, errors: earned.errors, saveDifferences, runtimeMatches };
      report.complete = report.complete && report.inputReplayValidation.complete;
    }
    report.coverage.allUnlocks = report.unlocks.complete;
    report.coverage.allCollectibles = report.unlocks.details.sparkles.missing.length === 0 && report.unlocks.details.friends.missing.length === 0;
    if (report.complete && options.routeFile) {
      fs.writeFileSync(options.routeFile, JSON.stringify({ schema: 1, fingerprint: options.fingerprint, mode: options.mode, seed: options.seed,
        complete: true, expected: { save: before, runtime: traceEnd }, requireAllCollectibles: !!options.allCollectibles,
        jumpEvents: game.jumpEvents, trace: game.trace, ticks: game.ticks }));
    }
  } catch (error) {
    report.error = { message: error.message, code: error.code || 'INCOMPLETE', stack: error.stack };
    if (ledger) { ledger.observe(game.ticks); report.unlocks = ledger.inspect({ requireAllCollectibles: !!options.allCollectibles }); }
  }
  report.seconds = (performance.now() - started) / 1000;
  if (report.bot) delete report.bot.trace;
  if (report.recovery) delete report.recovery.trace;
  if (game) { report.ticks = game.ticks; report.state = runtimeState(game.BB); report.trace = game.trace; report.save = ledger.snapshot(); report.earned = ledger.events; }
  fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
  console.log((report.complete ? 'PASS' : 'INCOMPLETE') + ' actual adventure ' + options.mode + ': ' + report.seconds.toFixed(2) + 's, ' + (report.ticks || 0) + ' ticks');
  if (report.unlocks?.missing.length) console.log('Missing ' + report.unlocks.missing.length + ' earned IDs/milestones: ' + report.unlocks.missing.slice(0, 12).join(', '));
  if (report.error) console.error(report.error.message);
  else if (report.expectedState?.complete === false) console.error('Recorded inputs diverged from expected state: save fields ' + report.expectedState.saveDifferences.join(', ') + '; runtime matches=' + report.expectedState.runtimeMatches);
  else if (!report.complete && report.bot?.failures?.length) console.error(report.bot.failures[0].message);
  else if (!report.complete && report.recovery?.failures?.length) console.error(report.recovery.failures[0].message);
  process.exitCode = report.complete ? 0 : 1;
  return report;
}

if (require.main === module) main(JSON.parse(process.argv[2])).catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = { main };
