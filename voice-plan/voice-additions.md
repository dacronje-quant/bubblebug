# Bubble Paws: a little voice, a lot of heart

**Updated plan: 20 short clips total — 12 family greetings and 8 story moments.** This replaces the expanded 253-clip proposal. The approved recordings are integrated into the game, with the two original baby recordings preserved unchanged.

## Let the pictures do the talking

No menu narration, difficulty descriptions, wardrobe categories, item names, unlock-bar explanations, cosmetic reward narration, toy announcements, species names, garden switch announcements, travel announcements, maze lantern narration, trick announcements, generic skill narration or repeated hints. Keep familiar picture buttons, strong selection feedback, celebration animations, purrs, meows and musical cues. If playtesting exposes a confusing picture, improve it before adding another voice clip.

## The eight story moments

One warm narrator for the six narrator clips, and a distinct soft magical voice for Rainbow's two lines. The one big-friend celebration can be reused across all bosses, replacing twelve separate boss name recordings in the reduced pack.

| Moment | Speaker | Words |
|---|---|---|
| Kitten wakes at the beginning of a new adventure | narrator | Little kitten, let's find all our family and bring everyone home! |
| A big friend is rescued; same clip for all bosses | narrator | You did it! A little kindness brought a big smile! |
| First homecoming party | narrator | Welcome home, little hero! Let's celebrate with our friends! |
| All twelve family cats found | narrator | The whole family is together! A rainbow surprise is waiting for you! |
| First approach to the gloomy grand maze door | Rainbow | Is someone there? My rainbow has lost its sparkle. Could you help me? |
| First unicorn rescue | Rainbow | You found me! Thank you, little friend. My rainbow is shining again! |
| Sad-cloud replay confirmation opens | narrator | Play again as Rainbow? Our friends will need help again. You keep your skills and outfits! |
| Rainbow replay confirmed | narrator | Here we go, Rainbow! A new adventure, with all your magic! |

Narrator direction: “Warm, loving storybook narrator speaking to a four-year-old. Gentle delight, clear English, natural pace and small pauses. Speak the sentence only; no shouting, extra words, music or sound effects.”

Rainbow direction: “Soft, magical female kitten character. Gentle vulnerability before rescue; relieved affection afterward. Clear, natural English. No crying, whisper-only delivery, squeaking, music or sound effects.”

## The twelve family greetings

Ten speaking cats explicitly name Phoebe or Marshmallow. Snowflake and Patches keep their original baby recordings, including their original spoken words. Their text labels identify their families. Each cat gets one affectionate discovery recording. Age and gender are performance directions to assess by listening.

| Cat | Words or sounds when found | Base voice | Character direction |
|---|---|---|---|
| Marshmallow's Mama | You found Marshmallow's Mama! Come here, little kitten. I've saved you a cuddle! | marin | A loving middle-aged mother with a warm female voice and a soft British accent. Smile warmly; gentle relief and affection. Natural medium pitch, clear and reassuring. |
| Marshmallow's Papa | I'm Marshmallow's Papa! Well done, brave kitten. That was a purr-fect rescue! | cedar | A middle-aged father with a rounded male voice, a gentle American accent and a lower comfortable pitch. Proud, affectionate, slightly playful; a soft chuckle in the tone, not a separate laugh. |
| Marshmallow's Granny | Oh, my darling! You found Marshmallow's Granny. I've got a cuddle for you! | sage | An elderly grandmother with a gentle female voice and a soft British accent. Cozy, patient and lightly textured, with loving warmth. Natural age, not a frail or exaggerated cartoon voice. |
| Marshmallow's Big Sister — Cocoa | Ta-da! I'm Cocoa, Marshmallow's big sister! You found me! Let's play! | coral | A youthful older sister with a bright female voice and a light British accent. Friendly, mischievous and lively, with a smile. Naturally youthful without squeaking, shouting or baby talk. |
| Marshmallow's Baby Brother — Snowflake | Peekaboo! It's me, Snowflake! Marshmallow's baby brother! Mew mew! | original recording | Preserve the original baby recording exactly; do not regenerate. |
| Marshmallow's Grandpa | I'm Marshmallow's Grandpa! Well done, little explorer. You made my whiskers smile! | onyx | An elderly grandfather with a warm male voice, a soft British accent and a deep comfortable pitch. Slightly gravelly but clear, calm and fond, with a gentle smile. Never stern or booming. |
| Phoebe's Mama | You found Phoebe's Mama! Oh, clever kitten. Come and get your snuggle! | nova | A loving middle-aged mother with a mellow female voice and a subtle Canadian English accent. Tender and relieved, slightly lower natural pitch, unhurried and comforting. |
| Phoebe's Papa | I'm Phoebe's Papa! Well done, little sunshine! Cuddle time! | ash | A middle-aged father with an easygoing male voice and a gentle Australian accent. Warm, sunny and proud; natural middle pitch, friendly energy, never loud. |
| Phoebe's Granny | Oh, my whiskers! You found Phoebe's Granny. I knitted you a great big hug! | shimmer | An elderly grandmother with a soft female voice and a gentle American accent. Warm, slightly husky, quietly amused and affectionate; slower natural phrasing, not an exaggerated old-person imitation. |
| Phoebe's Big Brother — Tiger | I'm Tiger, Phoebe's big brother! That was roar-some! Let's explore! | echo | A youthful older brother with a friendly male voice and a light Australian accent. Playful, energetic and protective, bright natural pitch; no roaring sound effects and no shouting. |
| Phoebe's Baby Sister — Patches | Hee hee! I'm Patches, Phoebe's baby sister! Wanna play? | original recording | Preserve the original baby recording exactly; do not regenerate. |
| Phoebe's Grandpa | You found Phoebe's Grandpa! Hello, little adventurer. I've got a story just for you! | fable | An elderly grandfather with a mellow male voice and a gentle American accent. Softly textured, relaxed, affectionate storyteller, medium-low natural pitch with a tiny amused smile. |

The speaking cats use clear English and natural affectionate delivery. The babies reuse the original WAV recordings unchanged; no new baby voices will be generated.

## When the voices play

Family greetings play on discovery, once per adventure. Story cues play once at their milestone; the shared boss celebration plays on each first boss rescue, not when revisiting happy bosses. Each new Rainbow replay resets story cue flags, while preserving unlocked skills/outfits. Do not repeat the original skills narration just because a replay begins. Queue the whole-family cue after the twelfth cat's greeting, and keep homecoming separate. No speech on every approach, hover, step, sparkle, heart, trick or switch.

Lower music during a line; allow the player to keep moving; cancel old queued lines on menu/scene changes or mute. A line should never prevent leaving the maze or obscure a travel indicator. Silence remains part of the game's mood.

## Recordings and implementation status

All 20 recordings are ready for review in `voice-plan/voice-review.html`: eight new story clips, ten new family greetings and two original baby recordings. Six story clips share the narrator voice marin; Rainbow uses shimmer for both lines. Use the optional Keep/Change marks and notes; Export notes downloads them as JSON. The approved set is integrated into the game. Original baby recordings are reused unchanged. Earlier takes are preserved in the working folder. The portable review ZIP includes just the current takes and scripts.

Generation uses `gpt-4o-mini-tts`; the saved key stays in the Windows environment, never in this plan, the audio files or the game. Official OpenAI documentation: https://developers.openai.com/api/docs/guides/text-to-speech .
