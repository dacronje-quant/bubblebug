# Game voice pack

The game uses seventeen bundled Gemini 3.8 Flash TTS recordings: all twelve family greetings and five story moments. Snowflake uses Puck and Patches uses Leda, with soft, playful spoken introductions that identify their name and family relationship. Rainbow uses Achernar for both lines; the Gemini narrator lines share one designed voice.

Three previous recordings remain selected after Gemini's daily quota was reached: `story_family_complete`, `story_replay_choice` and `story_replay_start`. The user approved retaining these until the remaining Gemini takes can be generated. They are the only legacy audio files kept in `assets/voice/`.

The complete script and character directions are in `gemini-pack.json`. Installed Gemini WAVs and provenance are in `assets/voice/gemini-3.8/`. Its manifest records each line's model, voice ID, dialogue, delivery, normalization and checksum, plus the three retained lines. The game plays offline and never needs an API key.

## Check or regenerate

From the game checkout, using Node 20 or newer:

```text
node voice-plan/generate-gemini-pack.mjs --check
node voice-plan/install-gemini-pack.mjs --allow-partial --check
```

Both checks run offline and leave files unchanged. The tools reuse installed recordings and voice identities, so a fresh checkout does not need old auditions or a private generation cache.

To generate the three remaining lines, configure `GEMINI_API_KEY` or `GOOGLE_API_KEY` in the process environment, or use Node's `--env-file` option with a local `.env` file. Keep keys out of the repository and chat.

```text
node --env-file=/path/to/local/.env voice-plan/generate-gemini-pack.mjs
node voice-plan/install-gemini-pack.mjs
```

The generator caches new WAVs and metadata in ignored `samples/gemini-pack/`, waits at least 65 seconds between requests, and stops on a daily-quota error. It does not change game selections. The installer validates every recording and keeps existing normalized WAVs byte-for-byte; new takes receive a fixed gain for approximate speech RMS of 0.12 with a peak limit of 0.891. No pitch or speed changes are applied. By default, installation requires all twenty Gemini takes. `--allow-partial` retains missing lines explicitly.

Use `--cache-dir=relative-or-absolute-path` to choose a generation cache. An empty path with `--check` verifies that the tools work using only shipped files.

## Playback checks

Run `node tools/test-voice.js` and `node tools/check-audio.js` for queue, mute, cancellation, fallback, music ducking and effect checks. `node tools/test-voice-browser.js` checks actual decoding and playback with Playwright. For interactive checks, run `node voice-plan/serve-voice-test.mjs` and open the URL it prints. That page uses the production voice queue and mixer.

All runtime voice files are selected by `js/core/voice-clips.js`. Old audition pages, generation scripts and duplicate recordings were removed; earlier versions remain in Git history.
