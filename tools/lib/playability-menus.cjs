'use strict';
// These helpers assume the bot reached the real hotspot and opened its menu.
// Every choice is made through normal keyboard input.
function press(game, key) { game.tick(1, [key]); game.tick(1, []); }

function serviceGardenMenu(game) {
  const B = game.BB, P = B.Play;
  if (B.Main.name !== 'play' || !P.gardenChoice || !['friends', 'fountain'].includes(P.gardenChoice.kind)) throw new Error('Reach a real garden/fountain menu before servicing it');
  game.tick(10);
  if (P.gardenChoice.kind === 'fountain') {
    const usesBefore = P.save.fountainUses;
    if (B.Economy.balance(P.save, 'hearts') < (P.save.purchases['heart-fountain'] ? 0 : 1)) throw new Error('Insufficient earned hearts for fountain');
    for (let n = 0; P.gardenChoice && P.fountainCd > 0 && n < 150; n++) game.tick(1);
    press(game, 'Enter');
    if (P.gardenChoice || !P.save.purchases['heart-fountain'] || !P.save.gestures.twirl || P.save.fountainUses !== usesBefore + 1) throw new Error('Fountain did not complete one celebration through normal input');
    return { kind: 'fountain', unlocked: ['heart-fountain', 'twirl'] };
  }
  const kinds = [...P.gardenChoice.kinds], newlyInvited = [];
  for (const kind of kinds) {
    if (P.save.residents[kind]) continue;
    if (B.Economy.balance(P.save, 'hearts') < 1) throw new Error('Insufficient earned hearts for invitation: ' + kind);
    for (let n = 0; P.gardenChoice.kinds[P.gardenChoice.sel] !== kind && n <= kinds.length; n++) press(game, 'ArrowRight');
    press(game, 'Enter');
    if (!P.save.residents[kind] || !P.save.purchases['resident-' + kind]) throw new Error('Invitation did not unlock through normal input: ' + kind);
    newlyInvited.push(kind);
  }
  press(game, 'Escape');
  return { kind: 'friends', unlocked: newlyInvited };
}

function exerciseWardrobe(game) {
  const B = game.BB, P = B.Play;
  if (B.Main.name !== 'play' || !P.wardrobe) throw new Error('Reach the mirror before exercising wardrobe');
  game.tick(10);
  const worn = [], unavailable = [];
  for (let tab = 0; tab < 5; tab++) {
    // Navigate to tabs from the first row, then use ordinary directions.
    for (let n = 0; P.wardrobe.focus !== 'tabs' && n < 20; n++) press(game, 'ArrowUp');
    for (let n = 0; P.wardrobe.tab !== tab && n < 6; n++) press(game, 'ArrowRight');
    if (P.wardrobe.focus !== 'tabs' || P.wardrobe.tab !== tab) throw new Error('Mirror tab navigation failed: ' + tab);
    press(game, 'ArrowDown');
    const items = [...P.wardrobeItems()];
    for (let i = 0; i < items.length; i++) {
      for (let n = 0; P.wardrobe.sel !== i && n <= items.length; n++) press(game, 'ArrowRight');
      if (P.wardrobe.focus !== 'items' || P.wardrobe.sel !== i) throw new Error('Mirror item navigation failed: ' + items[i].id);
      const item = items[i];
      if (!B.Economy.unlocked(P.save, item)) { unavailable.push(item.id); continue; }
      press(game, 'Enter');
      const current = item.slot === 'bubble' ? B.Cosmetics.bubbleFor(P.save, P.pl.cat) : item.slot === 'trail' ? P.save.cosmetics.trail : P.save.wear[item.slot];
      // Already worn accessories toggle off; a second press equips them.
      if (current !== (item.value || item.id)) press(game, 'Enter');
      const equipped = item.slot === 'bubble' ? B.Cosmetics.bubbleFor(P.save, P.pl.cat) : item.slot === 'trail' ? P.save.cosmetics.trail : P.save.wear[item.slot];
      if (equipped !== (item.value || item.id)) throw new Error('Mirror did not equip the selected reward: ' + item.id);
      worn.push(item.id);
    }
  }
  press(game, 'Escape');
  return { worn, unavailable };
}

module.exports = { serviceGardenMenu, exerciseWardrobe, press };
