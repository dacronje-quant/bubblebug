#!/usr/bin/env node
// Things to find: twelve zones hide a wardrobe item or bubble / trail
// style (rooms list them as `finds`; `glasses` is the older name). Picking
// one up puts it on straight away and the mirror shows it as earned; a
// thing never found still unlocks at its star milestone; and the mirror
// knows where each still-hidden thing is (for its "?" spot marker).
'use strict';
const assert = require('assert/strict');
const { bootGame } = require('./test-neighbourhood');

const g = bootGame(), B = g.BB, P = B.Play, W = B.World;
B.Save.data = B.Save.fresh(); B.Main.set('play', { cat: 'phoebe' });

const finds = W.findThings('a');
const items = finds.map(f => f.item);
assert.equal(new Set(items).size, items.length, 'each thing is hidden once');
const zones = new Set(finds.map(f => f.room.zone));
for (let z = 0; z < 12; z++) assert.ok(zones.has(z), 'zone ' + z + ' hides something');
for (const id of ['partyhat', 'flowers', 'sparkly', 'chef', 'bubble-flower', 'bubble-star', 'pirate', 'scuba',
  'trail-paw', 'jingle', 'bubble-heart', 'heartshades', 'wizard', 'googly', 'disguise', 'starshades']) {
  assert.ok(items.includes(id), id + ' is hidden in the world');
  assert.ok(B.Wardrobe.findItem(id), id + ' is a real wardrobe item or style');
}
// every find sits in the open air of its room (not inside a wall)
for (const f of finds) assert.ok(!B.Physics.solidSide(W.tile(f.tx, f.ty)), f.item + ' is not buried in a wall');

// a hat: found → worn and earned, without any stars
const grab = id => {
  const f = finds.find(x => x.item === id);
  g.place(f.room.id, f.tx - f.room.x, f.ty - f.room.y + 1);
  const th = P.ents[f.room.id].things.find(t => t.type === 'glasses' && t.item === id);
  assert.ok(th, id + ' appears in its room');
  P.pl.body.x = th.x - 10; P.pl.body.y = th.y - 12; g.tick(2);
  assert.ok(th.dead, id + ' is picked up');
};
assert.equal(B.Economy.unlocked(P.save, B.Wardrobe.findItem('partyhat')), false);
grab('partyhat');
assert.equal(P.save.wear.head, 'partyhat', 'a found hat goes straight on');
assert.equal(B.Economy.unlocked(P.save, B.Wardrobe.findItem('partyhat')), true, 'the mirror shows it earned');
assert.equal(P.save.glassesFound.partyhat, 1);
// a bubble style: found → in the bubble wand
grab('bubble-heart');
assert.equal(P.save.cosmetics.bubble, 'heart');
assert.equal(B.Economy.unlocked(P.save, B.Wardrobe.findItem('bubble-heart')), true);
// it doesn't come back once found (this adventure)
B.Main.set('play', { cat: 'phoebe' });
const g5 = finds.find(x => x.item === 'partyhat').room.id;
assert.ok(!P.ents[g5].things.some(t => t.type === 'glasses' && t.item === 'partyhat'));

// never found: the star milestone still unlocks it
const s = B.Save.fresh();
for (let i = 0; i < 100; i++) s.sparkles['x' + i] = 1;
B.Economy.milestones(s);
assert.equal(s.outfits.wizard, 1, 'the wizard hat still unlocks at 100 stars');
assert.equal(s.purchases['bubble-star'], 1, 'star bubbles still unlock at 80 stars');
assert.equal(s.outfits.jingle, undefined, 'the jingle collar waits for 175 stars or its bell');

// the mirror knows where each hidden thing is
assert.equal(B.Wardrobe.hiddenIn('pirate'), 6);
assert.equal(B.Wardrobe.hiddenIn('wizard'), 11);
assert.equal(B.Wardrobe.hiddenIn('bonnet'), null, 'boss presents are not hidden');
console.log('✓ ' + finds.length + ' things to find: they go straight on, show as earned, and still unlock by stars');
