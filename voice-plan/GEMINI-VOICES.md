# Game voice pack

The game uses 28 bundled Gemini 3.8 Flash TTS recordings: twelve family greetings, eight story moments, and eight first-time guidance cues. Snowflake uses Puck and Patches uses Leda, with soft, playful spoken introductions that identify their name and family relationship. Rainbow uses Achernar for both lines; the narrator lines share one designed voice.

The whole-family and replay lines now use Gemini, and the welcome includes the instruction to walk through the glowing door. All selected audio is WAV; the three superseded MP3 files were removed.

The complete script and character directions are in `gemini-pack.json`. Installed Gemini WAVs and provenance are in `assets/voice/gemini-3.8/`. Its manifest records each line's model, voice ID, dialogue, delivery, normalization and checksum. The game plays offline and never needs an API key.

## Check or regenerate

From the game checkout, using Node 20 or newer:

```text
node voice-plan/generate-gemini-pack.mjs --check
node voice-plan/install-gemini-pack.mjs --allow-partial --check
```

Both checks run offline and leave files unchanged. The tools reuse installed recordings and voice identities, so a fresh checkout does not need old auditions or a private generation cache.

To generate missing takes after editing the plan, configure `GEMINI_API_KEY` or `GOOGLE_API_KEY` in the process environment, or use Node's `--env-file` option with a local `.env` file. Keep keys out of the repository and chat.

```text
node --env-file=/path/to/local/.env voice-plan/generate-gemini-pack.mjs
node voice-plan/install-gemini-pack.mjs
```

The generator caches new WAVs and metadata in ignored `samples/gemini-pack/` and waits at least 65 seconds between requests. Daily-quota violations stop immediately, even if the response also contains a generic short retry hint. Other rate errors are retried at most three times per request. It does not change game selections. The installer validates every recording and keeps existing normalized WAVs byte-for-byte; new takes receive a fixed gain for approximate speech RMS of 0.12 with a peak limit of 0.891. No pitch or speed changes are applied. By default, installation requires every planned Gemini take. `--allow-partial` retains missing lines explicitly.

Use `--cache-dir=relative-or-absolute-path` to choose a generation cache. An empty path with `--check` verifies that the tools work using only shipped files.

## Playback checks

Run `node tools/test-voice.js` and `node tools/check-audio.js` for queue, mute, cancellation, fallback, music ducking and effect checks. `node tools/test-voice-browser.js` checks actual decoding and playback with Playwright. For interactive checks, run `node voice-plan/serve-voice-test.mjs` and open the URL it prints. That page uses the production voice queue and mixer.

All runtime voice files are selected by `js/core/voice-clips.js`. Old audition pages, generation scripts and duplicate recordings were removed; earlier versions remain in Git history.

## Tutorial recordings

`tutorial-pack.json` contains the nine approved opening guidance lines: the revised welcome and eight first-time cues. They are installed in the main pack. `play-guidance.js` plays cues once per adventure, saves heard cues when playback starts, and cancels hints when the action succeeds or the kitten moves away. Family introductions take priority. Jump help waits for hesitation, and jump/bubble controls appear beside the kitten during those instructions. Rainbow replay resets the heard cues.

```text
node voice-plan/generate-gemini-pack.mjs --plan=tutorial-pack.json --check
node --env-file=/path/to/local/.env voice-plan/generate-gemini-pack.mjs --plan=tutorial-pack.json
```

Recordings and per-line metadata are saved in ignored `samples/tutorial-pack/`. Repeat generation keeps completed takes and requests only missing ones; it can also reuse the installed recordings without a cache. Run `node tools/test-guidance.js` to check first-time triggers, cancellation, saves and replay.

## Portable voice review

Run `node voice-plan/export-voice-review.mjs` to build `voice-review.html`. The single HTML file embeds every current voice, available replacement story takes, and generated tutorial cues, with individual playback/download controls and cat-selection notes. Audio levels for new takes are matched to the installed pack inside the export, and playing a recording pauses the previous one. No API key or local server is needed to use the exported file. It is a local review artifact and is ignored by Git.
