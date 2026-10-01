# Gemini 3.8 family auditions

Open `gemini-comparison.html` for a portable side-by-side player. The HTML embeds its audio, so it also works when opened directly from disk or copied to another computer.

The experiment contains Mama Mallow, Papa Birman, Granny Lilac, Snowflake and Patches. Each main Gemini take uses the exact dialogue of the corresponding recording currently used by the game. The current baby recordings remain the original WAVs. Two separate babbling experiments compare Gemini against the earlier GPT-4o Mini TTS auditions using identical syllables.

## Audition result, 1 October 2026

Mama, Papa and Granny were successfully generated with Gemini 3.8 Flash TTS. Both custom toddler voice designs were rejected by Google's API with `Voice prompt was blocked by safety policies.`

The follow-up spoken introductions succeeded using Google's prebuilt Puck (Snowflake) and Leda (Patches), with soft, light, playful delivery. Snowflake says his name and that he is Marshmallow's baby brother; Patches says her name and that she is Phoebe's baby sister. They use the exact original game dialogue. These are prebuilt character performances, not custom toddler voice designs. The two babbling experiments remain unavailable. Listen to the introductions before deciding whether their age and character fit the game.

Gemini samples are not ready until they have actually been generated. The player shows the ready count and disables missing takes. It never substitutes another model or labels existing audio as Gemini.

## Generate

Configure `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) outside chat. The generator reads it from its process environment and sends it only in the authentication header to Google's Gemini API. It never puts the key in HTML, output metadata or logs.

From the `game_v2` checkout:

```powershell
# Read a key already configured in the Windows user environment.
$env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY', 'User')
node voice-plan/generate-gemini.mjs
```

This uses three custom adult voice designs and two prebuilt voices for the spoken introductions with `gemini-3.8-flash-tts`. The baby entries skip the earlier blocked custom designs and babbling experiments. No account signup, subscription or voice replication is involved. Delivery notes go in `speech_metadata.style`. All characters are fictional.

```text
node voice-plan/generate-gemini.mjs --id=babyPatches
node voice-plan/generate-gemini.mjs --prepare
```

`--id` auditions one family member. `--prepare` rebuilds the player without calling the API. Existing designs and takes are reused to avoid accidental repeat charges. API failures stop generation and leave existing takes intact. Partial results are explicitly marked in the player.

The earlier audition WAVs and metadata live in `samples/gemini-3.8/`. The follow-up full game pack is defined in `gemini-pack.json`; run `generate-gemini-pack.mjs` with the Gemini key in its process environment, then `install-gemini-pack.mjs` after all twenty takes are ready. Completed takes are cached, and the generator paces API requests for the project's three-requests-per-minute tier. Installation validates all IDs, dialogue, metadata and PCM WAVs before switching the game to the complete pack.

The installed game recordings live in `assets/voice/gemini-3.8/`; its `manifest.json` records the selected voice, model, dialogue, delivery, gain and checksum of every file. Installation approximately matches gated speech RMS to 0.12 with a 0.891 peak limit. The old recordings remain available for earlier comparisons. The baby's Gemini takes are now selected in the game, with generic device speech disabled for the two baby greetings if a recording cannot play.

The user approved installing the seventeen completed Gemini takes after the daily quota blocked `story_family_complete`, `story_replay_choice` and `story_replay_start`. Those three retain their previous GPT-4o Mini TTS recordings and are listed in `retainedClips` in the installed manifest. This was installed with `node voice-plan/install-gemini-pack.mjs --allow-partial`. When quota is available, resume the generator and run the installer without that option to select all twenty Gemini takes. The generator now waits at least 65 seconds between API requests and stops on a daily-quota response.

## Listen fairly

Use Play A → B or Play B → A. Playback is serialized, and Stop or hiding the page cancels it. The loudness option uses gated speech RMS with a peak limit; it is an approximate volume match, not studio LUFS normalization. No pitch shifting, time stretching or speech processing is applied.

Record a preference, Gemini's age fit and notes. Choices are saved in this browser and can be exported as JSON. No audio or ratings are uploaded by the player. The subjective listening test is still needed; successful generation and decoding alone do not establish that Gemini sounds better.

Official references: [Gemini TTS](https://ai.google.dev/gemini-api/docs/speech-generation) and [voice design](https://ai.google.dev/gemini-api/docs/voice-design).
