# Recording the game's voices with VoiceStudio

You need Python 3.11+, git, a few GB of free disk and internet (the voice model downloads on first run).
An NVIDIA graphics card makes it fast; without one it still works, just slower.

## One-time setup

    git clone https://github.com/debpalash/VoiceStudio
    cd VoiceStudio
    python -m venv .venv
    .venv\Scripts\activate            (Mac/Linux: source .venv/bin/activate)
    pip install -e .

## Record (run from the bubblebug folder, with that same venv active)

1. Six takes of the friendly host, then keep the one you like best:

       omnivoice-infer-batch --model k2-fsa/OmniVoice --test_list tools/voices/step1-host.jsonl --res_dir tools/voices/host
       copy tools/voices/host/host_take3.wav tools/voices/host_ref.wav      (Mac/Linux: cp)

2. All 48 lines (12 cats, plus the host's toys, bosses and outfits):

       omnivoice-infer-batch --model k2-fsa/OmniVoice --test_list tools/voices/step2-all.jsonl --res_dir assets/voice

3. Open `index.html` and play. Don't like a cat? Delete its `assets/voice/cat_<name>.wav`
   (the game speaks that line the old way) or re-run step 2 for a fresh take.

`step1-host.jsonl` / `step2-all.jsonl` are built from `js/core/voice-lines.js` by `node tools/make-voices.js`
(rerun it after editing a line or a cat's voice description).
