// Optional spending uses a separate ledger. Collectible keys, map stars,
// family, powers and story progress are never removed by a purchase.
(function (BB) {
  'use strict';
  const spent = (save, currency) => {
    const n = save[currency + 'Spent'];
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  };
  function balance(save, currency) {
    const found = currency === 'stars' ? save.sparkles : save.friends;
    return Math.max(0, BB.Save.count(found || {}) - spent(save, currency));
  }
  function spend(save, currency, cost) {
    if (!['stars', 'hearts'].includes(currency) || !Number.isSafeInteger(cost) || cost < 1 || balance(save, currency) < cost) return false;
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
  BB.Economy = { balance, spend, buy, pips };
})(window.BB);
