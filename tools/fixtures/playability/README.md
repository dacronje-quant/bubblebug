# Recorded playthrough inputs

These compressed JSON files contain verified ordinary keyboard inputs for
seed 1 in all three difficulties, plus an Easy route that collects all 860
stars and 65 critters. They are test cases, not cached passing results.

Every run starts with a fresh save, executes the actual game updates, checks
the current world's earned-ID catalog, compares the entire expected save and
runtime, and checks persistence and a responsive Continue. No coordinates,
powers, invulnerability or rewards are granted by a recorded route.

`captureFingerprint` records the source version used to capture a route.
It deliberately does not assert that the current source is identical: these
inputs should test code changes. A divergent route fails. Use `--discover`
to search for another route using ordinary inputs; new seeds without a
recording also use the controller. Discovered routes must pass independent
fresh input replay before they can be reused.

`manifest.json` lists durations, collection counts and file hashes. Decode a
file with `require('./tools/lib/recorded-route.cjs').readRoute(path)`.
