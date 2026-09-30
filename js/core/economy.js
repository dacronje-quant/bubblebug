// Stars and adventure progress unlock rewards. Hearts still pay once
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
  const earned = (save, item) => !!((save.outfits || {})[item.id] || (save.purchases || {})[item.id]);
  function requirement(save, item) {
    if (Number.isFinite(item.stars)) return { found: balance(save, 'stars'), total: item.stars };
    const goal = item.unlock;
    if (goal) {
      const found = goal.kind === 'rainbow' ? Number(!!save.rainbowUnlocked)
        : Object.values(save[goal.kind] || {}).filter(Boolean).length;
      return { found, total: goal.count };
    }
    // A hidden discovery or a boss present must be found in the world.
    // Having earned every star reward cannot fill its locked bar.
    return { found: 0, total: 1 };
  }
  function unlocked(save, item) {
    if (!item) return false;
    if (earned(save, item)) return true;
    const { found, total } = requirement(save, item);
    return found >= total;
  }
  function progress(save, item) {
    if (!item) return 0;
    if (unlocked(save, item)) return 1;
    const { found, total } = requirement(save, item);
    return BB.clamp(found / total, 0, 1);
  }
  function progressBar(c, save, item, x, y, width, height = 15) {
    c.save();
    c.fillStyle = '#e8deea'; BB.G.rrect(x, y, width, height, height / 2, c); c.fill(); c.clip();
    c.fillStyle = '#ffd665'; c.fillRect(x, y, width * progress(save, item), height);
    c.restore();
  }
  function milestones(save) {
    const items = BB.Wardrobe.LIST.concat(BB.Cosmetics.LIST).filter(a => Number.isFinite(a.stars) || a.unlock);
    save.outfits = save.outfits || {}; save.purchases = save.purchases || {};
    for (const item of items) if (unlocked(save, item)) {
      (item.slot === 'bubble' || item.slot === 'trail' ? save.purchases : save.outfits)[item.id] = 1;
    }
    return items.filter(a => Number.isFinite(a.stars) && !unlocked(save, a)).sort((a, b) => a.stars - b.stars)[0] || null;
  }
  BB.Economy = { balance, spend, buy, pips, unlocked, progress, progressBar, milestones };
})(window.BB);
