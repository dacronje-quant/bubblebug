# Prompt patterns (from the Bubble Paws game)

## Music (Lyria 3.5)

Structure: `<scene>. <instruments>. <BPM, meter, key/mode>. <mood>.` then a shared "common" suffix.

Example track prompt:

> Shimmering crystal cave. Slow glass-harmonica and vibraphone tones with long reverb, soft bowed strings, a gentle low pad, distant water-drop chimes. 66 BPM, E major lydian. Spacious, wondrous and safe, not spooky.

Shared suffix for seamless game background loops:

> Instrumental only, no vocals, no singing, no choir words. Background music for a gentle storybook video game for 4-year-old children. Warm, safe and comforting, never dark, tense, sad or scary. No drums, no percussion hits, no sudden loud moments, no build-ups, no dramatic climax. Steady gentle tempo and constant soft dynamics the whole way through. No intro and no ending: it starts already flowing and keeps flowing, so it can loop seamlessly. About 2 minutes long.

Tips:
- Give each zone or scene its own instrument palette, tempo, and key, so the tracks are distinct but cohesive.
- Keep one shared suffix in a plan file, such as `lyria-plan.json` with `model`, `common`, and `tracks[{id, zone, prompt}]`, and append it to every prompt.
- Generate 1 to 3 takes per track, audition, then loop the best with `make-loop.py`.
- Looping needs a long steady section. Prompts without builds or endings loop best.

## Speech (Gemini 3.8 Flash TTS)

- `text` is only the spoken words. Put acting direction in `style`, for example "Tender relief, reassuring and gently happy; natural conversational pace."
- One designed or prebuilt voice per character, reused for all of their lines.
- Voice-design personas should state age, warmth, pitch, accent, and attitude, with negatives such as "never stern or booming" or "no squeaking or baby talk".
- Prebuilt voices are a quick option. Examples: Puck (upbeat), Leda (youthful), Zephyr (bright), Achernar, Sulafat, Aoede, Fenrir, Kore.
- Multi-speaker dialogue in one request supports 2 prebuilt voices. To mix designed voices, render each line separately.
- Free tier is rate limited, so space requests (about 65 s) and cache finished clips.
