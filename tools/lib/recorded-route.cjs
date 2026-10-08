'use strict';
const fs = require('node:fs');
const zlib = require('node:zlib');

function readRoute(file) {
  const bytes = fs.readFileSync(file);
  return JSON.parse((file.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes).toString('utf8'));
}

function validateRoute(route, { mode, seed, fingerprint, fixture = false }) {
  if (route.schema !== 1 || route.complete !== true || !Array.isArray(route.trace) || !route.trace.length ||
      !route.expected?.save || !route.expected.runtime || route.mode !== mode || route.seed !== seed) {
    throw new Error('Input route completion, expected state, mode or seed mismatch');
  }
  // Golden inputs are test cases, not cached results. Their historical source
  // hash is provenance; every input and exact expected state is checked again.
  if (fixture ? route.recordType !== 'golden-inputs' || !/^[a-f0-9]{64}$/.test(route.captureFingerprint || '') : route.fingerprint !== fingerprint) {
    throw new Error('Input route fingerprint or fixture provenance mismatch');
  }
  if (route.trace.some(chunk => !Number.isSafeInteger(chunk.ticks) || chunk.ticks < 1 || !Array.isArray(chunk.keys))) {
    throw new Error('Invalid recorded input chunk');
  }
  return route;
}

module.exports = { readRoute, validateRoute };
