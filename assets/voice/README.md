# Spoken lines

The game plays `<key>.wav` from this folder for each line in `js/core/voice-lines.js`
(`cat_<id>.wav` is that cat's own voice; `toy_*`, `boss_*` and `outfit_*` are the friendly host).
A line with no clip yet is spoken with the device's own voice instead, so this folder can be
filled in gradually.

To (re)record the lines with VoiceStudio, run `node tools/make-voices.js` and follow the steps it prints.
