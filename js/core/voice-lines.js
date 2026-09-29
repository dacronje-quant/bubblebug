// ════════════════════════════════════════════════════════════════
//  VOICE LINES — everything the game says out loud, in one place.
//  Each key is also the name of a recorded clip, assets/voice/<key>.wav
//  (see assets/voice/README.md). Until a clip exists the game just speaks
//  the text with the device's own voice instead, so nothing is ever silent.
//    toy_* / boss_* / outfit_*  →  the friendly host voice
//    cat_<id>                   →  that cat's own voice, saying who they are
//  tools/make-voices.js reads this file to build the recording script.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  BB.VoiceLines = {
    // ──── The host: a little cheer for every toy found ────
    toy_yarn: 'Ooh, a yarn ball!',
    toy_feather: 'Ooh, a feather wand!',
    toy_bell: 'Ooh, a jingle bell!',
    toy_mouse: 'Ooh, a toy mouse!',
    toy_boat: 'Ooh, a paper boat!',
    toy_star: 'Ooh, a star cushion!',
    toy_shell: 'Ooh, a seashell!',
    toy_bucket: 'Ooh, a sand bucket!',
    toy_mitten: 'Ooh, a mitten!',
    toy_kite: 'Ooh, a kite!',
    toy_duck: 'Ooh, a rubber duck!',
    toy_rocket: 'Ooh, a toy rocket!',

    // ──── The host: a boss becomes a friend ────
    boss_goose: 'Hooray! The goose is happy!',
    boss_toad: 'Hooray! The toad is happy!',
    boss_armadillo: 'Hooray! The armadillo is happy!',
    boss_queenbee: 'Hooray! The queen bee is happy!',
    boss_elephant: 'Hooray! The elephant is happy!',
    boss_king: 'Hooray! The Cloud King is happy!',
    boss_octopus: 'Hooray! The octopus is happy!',
    boss_camel: 'Hooray! The camel is happy!',
    boss_walrus: 'Hooray! The walrus is happy!',
    boss_moose: 'Hooray! The moose is happy!',
    boss_panda: 'Hooray! The panda is happy!',
    boss_moonbunny: 'Hooray! The Moon Rabbit is happy!',

    // ──── The host: a present from a happy boss ────
    outfit_bonnet: 'You got a goose bonnet!',
    outfit_mushroom: 'You got a mushroom hat!',
    outfit_tiara: 'You got a crystal tiara!',
    outfit_crown: 'You got a honey crown!',
    outfit_horn: 'You got a unicorn horn!',
    outfit_ruff: 'You got a cloud collar!',
    outfit_sailor: 'You got a sailor hat!',
    outfit_sunhat: 'You got a sun hat!',
    outfit_bobble: 'You got a bobble hat!',
    outfit_scarf: 'You got a stripy scarf!',
    outfit_nightcap: 'You got a sleepy nightcap!',
    outfit_ears: 'You got bunny ears!',

    // ──── The family: each cat says hello in their own voice ────
    cat_mamaMallow: "Purr-fect timing, sweetie! It's Marshmallow's Mama, and I've got cuddles for days!",
    cat_papaBirman: "Paws for applause! Marshmallow's Papa has arrived, looking fur-ociously handsome!",
    cat_grannyLilac: "Well, fur goodness' sake! It's Marshmallow's Granny. Who wants a biscuit?",
    cat_bigSisterCocoa: "Ta-da! Cocoa, Marshmallow's big sister! I was totally not hiding. Okay, maybe a little!",
    cat_babySnowflake: "Peekaboo! It's me, Snowflake! Marshmallow's baby brother! Mew mew!",
    cat_grandpaSeal: "Whisker-wiggling wonderful! Marshmallow's Grandpa, at your service!",
    cat_mamaTortie: "Oh, you clever kitten! Phoebe's Mama, right here. Come get your snuggle!",
    cat_papaGinger: "Ginger power! Phoebe's Papa reporting for duty, and for tummy rubs!",
    cat_grannyGrey: "Oh my whiskers, you found me! Phoebe's Granny. I knitted you a hug!",
    cat_bigBrotherTiger: "Roar-some! Tiger, Phoebe's big brother! Race you to the next room!",
    cat_babyPatches: "Hee hee! I'm Patches, Phoebe's baby sister! Wanna play?",
    cat_grandpaStripes: "Well, look who found the cat's pajamas! I am Phoebe's Grandpa!",
  };
})(window.BB);
