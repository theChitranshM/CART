// Local roasts, used only when Claude is unreachable (no bridge, no key, offline).
// Still personal: built from the real item name, real price, configured rate and owned-items notes.
(function (root) {
  const CART = root.CART || (root.CART = {});

  function ownedMatch(item, owned) {
    const words = (item.brand + ' ' + item.name).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    return owned.find((o) => words.some((w) => o.toLowerCase().includes(w)));
  }

  function fallbackRoasts(cart, cfg, opts) {
    const m = CART.money;
    const fmt = (n) => m.formatMoney(n, cart.currency);
    const owned = (cfg.ownedItems || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const survivors = opts.survivorIds || [];
    const last = cart.items.length - 1;
    const items = cart.items.filter((it) => !survivors.includes(it.id)).sort((a, b) => a.lineTotal - b.lineTotal).map((it, i, arr) => {
      const what = [it.brand, it.name].filter(Boolean).join(' ');
      const cost = fmt(it.lineTotal);
      const own = ownedMatch(it, owned);
      let roast;
      if (i === 0) roast = `${what} for ${fmt(it.lineTotal)}. That's ${cost}. I say this with love: no.`;
      else if (i === arr.length - 1) roast = `${what}. ${fmt(it.lineTotal)}. ${cost}. This is the one you'll fight me on, and it's the one I'm most sure about.`;
      else roast = `${cost} for ${what}?${own ? ` You already own ${own}.` : ''} Put it back.`;
      return { id: it.id, objection: i > 0 && i < arr.length - 1 ? 'But it\'s Black Friday pricing' : null, roast };
    });
    const approvals = cart.items.filter((it) => survivors.includes(it.id)).map((it) => ({
      id: it.id, line: `${it.name.split(',')[0]}. This one makes things instead of just costing things. Approved.`,
    }));
    void last;
    return {
      intro: 'Checkout locked. Let\'s talk about what you just tried to do.',
      items, approvals,
      plea_rebuttal: 'You said that about the last three things. Still no.',
      outro: `Cart cleared. ${fmt(cart.total)} still in your account.`,
      source: 'local',
    };
  }

  CART.fallbackRoasts = fallbackRoasts;
  if (typeof module === 'object' && module.exports) module.exports = { fallbackRoasts };
})(typeof globalThis !== 'undefined' ? globalThis : this);
