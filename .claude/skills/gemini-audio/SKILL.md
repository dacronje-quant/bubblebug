---
name: gemini-audio
description: Generates music with Google's Lyria 3.5 and speech/voice-over with Gemini 3.8 Flash TTS using a Gemini API key. Use when the user wants background music, loops, jingles, soundtracks, narration, character voices, or spoken audio clips for a game, app, or video, including designing custom voices or turning a music take into a seamless loop.
---

# Gemini audio: music (Lyria 3.5) and speech (Gemini 3.8 Flash TTS)

Two dependency-free Node scripts call the Gemini Interactions API directly with `fetch`. They need Node 20+ and ffmpeg plus numpy only for looping.

| Task | Model | Script |
|---|---|---|
| Music / soundtrack | `lyria-3.5` | `scripts/generate-music.mjs` |
| Speech / narration / voices | `gemini-3.8-flash-tts` | `scripts/generate-speech.mjs` |
| Seamless music loop | n/a | `scripts/make-loop.py` |

## API key (do this first)

- The key comes from `GEMINI_API_KEY` or `GOOGLE_API_KEY` in the environment.
- Never ask the user to paste a key into chat. Never echo, log, or commit it.
- If it is missing, tell the user to put it in a local `.env` (gitignored) and run with `node --env-file=.env ...`.
- Check `.gitignore` covers `.env` and generated-take folders before generating.

## Music

```text
node --env-file=.env scripts/generate-music.mjs --prompt="<prompt>" --out=music/forest [--wav]
```

- Writes `<out>.mp3` (or `.wav`) and `<out>.json`, which holds the prompt and any returned structure text.
- Pass `--prompt-file=prompt.txt` for long prompts.
- Prompt recipe: scene or mood, instruments, BPM, key or mode, emotional arc, and exclusions.
  See [references/prompting.md](references/prompting.md).
- For background or loop music, say "instrumental only, no vocals", "no intro and no ending", and "steady dynamics".
- Lyria 3.5 makes full-length songs, about 2 minutes. `lyria-3-clip-preview` makes 30 s clips and is a cheaper way to audition ideas.
- Generate takes one at a time, with a pause between requests.
  Keep existing takes and use a new `--out` suffix such as `-2` for variants. Don't overwrite approved audio.

### Seamless loop

```text
python scripts/make-loop.py take.mp3 loop.wav [--min=60] [--max=100] [--xf=3]
```

Finds a matching start and end point, then crossfades the end into the start. It prints JSON with the loop length and `seamJump`. Values near 1 are smooth, and values well above 2 mean you should try another take or window.

## Speech

```text
node --env-file=.env scripts/generate-speech.mjs --text="You found it!" --voice=Kore --style="Warm, delighted, gentle pace." --out=voice/found
```

- Writes 24 kHz mono `<out>.wav` and `<out>.json`.
- `--voice` takes a prebuilt name (Kore, Puck, Leda, Zephyr, Achernar, Sulafat, Aoede, Fenrir and others) or a designed `voice_...` id.
- `--style` is the delivery direction ("tender relief, natural conversational pace"). Keep `--text` to exactly what should be spoken.
- For long scripts, use `--text-file`.

### Custom voice (voice design)

```text
node --env-file=.env scripts/generate-speech.mjs --design="Loving middle-aged mother, warm rounded voice, soft British accent" --gender=female --language=en-GB --name="Mama"
```

Prints a `voice_...` id. Save it to the project's voice plan and reuse it for every line from that character, so the character stays consistent.

### Batch voice packs

Keep a JSON plan of `{ voices, clips: [{id, speaker, text, style}] }`. Loop over it with the script and skip clips whose `.wav` exists and whose text, voice, and style are unchanged. Space free-tier requests about 65 s apart. A daily-quota 429 ("requests per day") will not recover by retrying, so stop and tell the user.

## After generating

1. Report the file paths and the model used. Don't paste base64 or the key.
2. Verify speech by transcribing it (or having the user listen). Check music duration with `ffprobe`.
3. Normalize speech levels across a pack with a fixed gain, not by changing pitch or speed.
4. For children's or sensitive content, state tone limits in the prompt ("warm, safe, never scary").

## Troubleshooting

- 400 on `--wav` for music: the script retries in the default mp3 format.
- 401/403: the key is invalid, or the API is not enabled for the key's project.
- 429 with "retry in Ns": the scripts retry up to 3 times. Slow down for free-tier quotas.
- "No audio returned": print the first 300 characters of the response (already done) and check for a safety block. Soften or reword the prompt.
- Model names change. If a model is rejected, check https://ai.google.dev/gemini-api/docs/models and pass `--model=`.
