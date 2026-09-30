// Stars unlock milestones without being spent. Hearts still pay once
// for invitations and the fountain; collection progress is never removed.
(function (BB) {
  'use strict';
  const spent = (save, currency) => {
    const n = save[currency + 'Spent'];
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  };
  function balance(save, currency) {
    const found = currency === 'stars' ? save.sparkles : save.friends;
    return Math.max(0, BB.Save.count(found || {}) - (currency === 'stars' ? 0 : spent(save, currency)));
  }
  function spend(save, currency, cost) {
    if (currency !== 'hearts' || !Number.isSafeInteger(cost) || cost < 1 || balance(save, currency) < cost) return false;
    save[currency + 'Spent'] = spent(save, currency) + cost;
    return true;
  }
  function buy(save, id, currency, cost) {
    save.purchases = save.purchases || {};
    if (save.purchases[id]) return 'owned';
    if (!spend(save, currency, cost)) return 'poor';
    save.purchases[id] = 1;
    return 'bought'; // caller equips / invites, then saves the complete transaction
  }
  function pips(c, currency, cost, x, y, affordable, columns = 10) {
    const cols = Math.min(columns, cost), rows = Math.ceil(cost / columns);
    c.save(); c.fillStyle = affordable ? (currency === 'stars' ? '#ffd84a' : '#ff7eb6') : '#b7afbf';
    c.strokeStyle = affordable ? '#a47a36' : '#888090'; c.lineWidth = 0.8;
    for (let i = 0; i < cost; i++) {
      const px = x + (i % columns - (cols - 1) / 2) * 13;
      const py = y + (Math.floor(i / columns) - (rows - 1) / 2) * 12;
      if (currency === 'stars') BB.G.star(px, py, 4.5, 5, 0.5, -Math.PI / 2, c);
      else BB.G.heart(px, py, 5, c);
      c.fill(); c.stroke();
    }
    c.restore();
  }
  function unlocked(save, item) {
    if (save.outfits[item.id] || save.purchases[item.id]) return true;
    return Number.isFinite(item.stars) && balance(save, 'stars') >= item.stars;
  }
  function milestones(save) {
    const items = BB.Wardrobe.LIST.concat(BB.Cosmetics.LIST).filter(a => Number.isFinite(a.stars));
    for (const item of items) if (unlocked(save, item)) {
      (item.slot === 'bubble' || item.slot === 'trail' ? save.purchases : save.outfits)[item.id] = 1;
    }
    return items.filter(a => !unlocked(save, a)).sort((a, b) => a.stars - b.stars)[0] || null;
  }
  BB.Economy = { balance, spend, buy, pips, unlocked, milestones };
})(window.BB);
