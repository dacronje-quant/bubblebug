'use strict';
const MAPS = ['abilities', 'bosses', 'family', 'kin', 'sparkles', 'friends', 'toys', 'buds', 'gates', 'pads', 'babies', 'keys', 'songs', 'gestures', 'glassesFound', 'outfits', 'purchases', 'residents', 'shortcuts', 'doors'];
const plain = v => JSON.parse(JSON.stringify(v));
const truthyKeys = obj => Object.keys(obj || {}).filter(k => obj[k]).sort();
const CHECKPOINT_FIELDS = ['room', 'x', 'y', 'bench', 'mazePosition', 'inMaze', 'mazeReturn', 'mazePuzzleVersion', 'mazeLegacyAccess'];
const PRESERVED = [...MAPS, 'visited', 'secrets', 'hiddenResidents', 'cloudMask', 'kinIntro', 'introDone', 'leftHome', 'voiceStory',
  'heartsSpent', 'starsSpent', 'wear', 'cosmetics', 'cat', 'finale', 'mazeSolved', 'rainbowUnlocked', 'fountainUses', 'replayCount', ...CHECKPOINT_FIELDS];
function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalized(value[k])]));
  return value;
}
function persistenceDifferences(before, after) {
  const fields = [...new Set([...PRESERVED, ...Object.keys(before), ...Object.keys(after)])];
  return fields.filter(field => JSON.stringify(normalized(before[field])) !== JSON.stringify(normalized(after[field])));
}
function progressLosses(before, after) {
  const monotone = new Set([...MAPS, 'visited', 'secrets', 'voiceStory']);
  // Continue must restore checkpoints exactly, but a subsequent movement
  // probe can legitimately enter a room, leave a maze or find a new bench.
  return PRESERVED.filter(field => !CHECKPOINT_FIELDS.includes(field) && (field === 'doors'
    ? truthyKeys(before.doors).some(id => !Number.isSafeInteger(after.doors?.[id]) || after.doors[id] < before.doors[id])
    : monotone.has(field)
      ? truthyKeys(before[field]).some(id => JSON.stringify(normalized(before[field][id])) !== JSON.stringify(normalized(after[field]?.[id])))
      : JSON.stringify(normalized(before[field])) !== JSON.stringify(normalized(after[field]))));
}

function catalog(B) {
  const W = B.World, P = B.Play;
  if (!W.rooms.length || !P.ents) throw new Error('Build the fresh runtime before collecting its catalog');
  const out = Object.fromEntries(MAPS.map(k => [k, []]));
  out.abilities = Object.keys(B.Save.fresh().abilities);
  out.family = B.Home.familyOrder();
  out.kin = [...B.RAINBOW_KIN];
  out.gestures = B.Gestures.LIST.map(g => g.id);
  out.outfits = B.Wardrobe.LIST.map(it => it.id);
  out.purchases = B.Cosmetics.LIST.map(it => it.id);
  const friends = [], requirements = [], doorRequirements = {};
  for (const room of W.rooms) {
    if (room.def.boss || room.things.some(t => t.ch === 'K')) out.bosses.push(room.id);
    if (room.grid.some(row => row.includes('G'))) out.gates.push(room.id);
    if (room.def.hatch) out.shortcuts.push(room.def.hatch.id);
    for (const th of room.things) {
      const key = th.tx + ',' + th.ty;
      const field = ({ '*': 'sparkles', o: 'buds', P: 'pads', d: 'babies', Z: 'keys' })[th.ch];
      if (field) out[field].push(key);
      if (th.ch === 'T' && room.def.toy) out.toys.push(room.def.toy);
      if (th.ch === 'V') out.songs.push(room.id);
      if (th.ch === 'a') out.glassesFound.push(th.item);
      if (th.ch === 'h') {
        const zone = String(room.zone);
        out.doors.push(zone); doorRequirements[zone] = (doorRequirements[zone] || 0) + 1;
      }
    }
    for (const b of P.ents[room.id].bugs) if (!b.king) {
      out.friends.push(b.key); friends.push({ key: b.key, kind: b.kind, room: room.id });
    }
  }
  for (const pad of B.GardenMaze.PADS) out.pads.push(pad.key);
  out.residents = [...new Set(friends.map(b => b.kind))];
  out.purchases.push(...out.residents.map(k => 'resident-' + k), 'heart-fountain');
  for (const it of B.Wardrobe.LIST.concat(B.Cosmetics.LIST)) {
    requirements.push({ id: it.id, slot: it.slot, stars: it.stars, unlock: it.unlock && { ...it.unlock }, boss: it.boss, discover: it.discover });
  }
  for (const key of MAPS) out[key] = [...new Set(out[key])].sort();
  return { namespaces: out, friends, doorRequirements, kingKeys: W.findThings('K').map(t => t.tx + ',' + t.ty), requirements, rooms: W.rooms.map(r => r.id).sort(),
    budget: { availableStars: out.sparkles.length, maximumStarMilestone: Math.max(...requirements.map(it => it.stars || 0)),
      availableHearts: out.friends.length, heartsNeeded: out.residents.length + 1 } };
}

function inspect(B, expected, { requireAllCollectibles = false } = {}) {
  const save = B.Play.save || B.Save.data, details = {}, missing = [];
  const required = new Set(['abilities', 'bosses', 'family', 'kin', 'toys', 'buds', 'gates', 'pads', 'babies', 'keys', 'songs', 'gestures', 'glassesFound', 'outfits', 'purchases', 'residents', 'shortcuts', 'doors']);
  if (requireAllCollectibles) { required.add('sparkles'); required.add('friends'); required.add('shortcuts'); }
  for (const [field, ids] of Object.entries(expected.namespaces)) {
    const absent = ids.filter(id => field === 'doors'
      ? !Number.isSafeInteger(save.doors?.[id]) || save.doors[id] < expected.doorRequirements[id]
      : !save[field]?.[id]);
    details[field] = { earned: ids.length - absent.length, total: ids.length, missing: absent, required: required.has(field) };
    if (field === 'doors') {
      details[field].requirements = { ...expected.doorRequirements };
      details[field].flaps = { earned: ids.reduce((sum, id) => sum + (Number.isSafeInteger(save.doors?.[id])
        ? Math.max(0, Math.min(save.doors[id], expected.doorRequirements[id])) : 0), 0),
      total: Object.values(expected.doorRequirements).reduce((sum, count) => sum + count, 0) };
    }
    if (required.has(field) && absent.length) missing.push(...absent.map(id => field + ':' + id));
  }
  const milestones = { finale: !!save.finale, rainbowUnlocked: !!save.rainbowUnlocked, mazeSolved: !!save.mazeSolved,
    fountain: !!save.purchases?.['heart-fountain'] && save.fountainUses > 0 };
  for (const [key, earned] of Object.entries(milestones)) if (!earned) missing.push('milestone:' + key);
  const unknownFriends = truthyKeys(save.friends).filter(k => !expected.namespaces.friends.includes(k) && !(save.friends[k] === 'king' && expected.kingKeys.includes(k)));
  const heartsCollected = B.Save.count(save.friends), spent = save.heartsSpent || 0;
  const budget = { ...expected.budget, starsCollected: B.Save.count(save.sparkles), heartsCollected, heartsSpent: spent,
    heartsRemaining: B.Economy.balance(save, 'hearts') };
  const errors = [];
  if (!Number.isSafeInteger(spent) || spent < 0 || spent > heartsCollected) errors.push('Invalid heart spending ledger');
  if (unknownFriends.length) errors.push('Unknown rescued critter IDs: ' + unknownFriends.join(', '));
  if (expected.budget.availableStars < expected.budget.maximumStarMilestone) errors.push('World cannot fund its highest star milestone');
  if (expected.budget.availableHearts < expected.budget.heartsNeeded) errors.push('World cannot fund all invitations and fountain');
  for (const item of B.Wardrobe.LIST.concat(B.Cosmetics.LIST)) {
    const field = item.slot === 'bubble' || item.slot === 'trail' ? 'purchases' : 'outfits';
    if (save[field]?.[item.id] && !B.Economy.unlocked(save, item)) errors.push('Reward is saved but cannot be used: ' + item.id);
  }
  return { complete: missing.length === 0 && errors.length === 0, missing, errors, milestones, budget, details };
}

function createLedger(B, expected = catalog(B)) {
  const observed = new Set(), events = [];
  function observe(tick = 0, keys = []) {
    const save = B.Play.save || B.Save.data;
    for (const field of MAPS) for (const id of truthyKeys(save[field])) {
      const key = field + ':' + id + (field === 'doors' ? ':' + save[field][id] : '');
      if (!observed.has(key)) { observed.add(key); events.push({ tick, field, id, ...(field === 'doors' ? { value: save[field][id] } : {}), room: B.Play.room?.id, keys: [...keys] }); }
    }
    for (const field of ['finale', 'rainbowUnlocked', 'mazeSolved']) if (save[field] && !observed.has(field)) {
      observed.add(field); events.push({ tick, field, value: true, room: B.Play.room?.id });
    }
  }
  function persisted(storage) {
    const serialized = storage.get('bubblebug_kingdom_v2');
    if (!serialized) return { complete: false, differences: ['save missing'] };
    const saved = JSON.parse(serialized), current = B.Play.save || B.Save.data, differences = [];
    differences.push(...persistenceDifferences(current, saved));
    return { complete: differences.length === 0, differences };
  }
  return { expected, observe, events, inspect: options => inspect(B, expected, options), persisted,
    snapshot: () => plain(B.Play.save || B.Save.data) };
}

module.exports = { catalog, inspect, createLedger, MAPS, persistenceDifferences, progressLosses };
