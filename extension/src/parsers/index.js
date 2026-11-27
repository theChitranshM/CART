// Picks the parser for the current site and normalises its output into one cart shape.
(function (root) {
  const CART = root.CART || (root.CART = {});

  function currencyFor(loc) {
    if (/\.ca$/.test(loc.hostname) || /holtrenfrew/.test(loc.hostname)) return 'CAD';
    return 'USD';
  }

  function siteParser(loc) {
    const ps = CART.parsers || {};
    return [ps.holt, ps.amazon, ps.bestbuy].find((p) => p && p.matches(loc)) || null;
  }

  // Returns { site, siteName, currency, items[], total, totalSource } or null if this page has no readable cart.
  function readCart(loc, doc) {
    const p = siteParser(loc);
    let res = p ? p.parse(doc) : { items: [] };
    let used = p;
    if ((!res.items || !res.items.length) && CART.parsers.generic) { res = CART.parsers.generic.parse(doc); used = CART.parsers.generic; }
    if (!res.items || !res.items.length) return null;
    const sum = Math.round(res.items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
    const total = res.total != null && res.total > 0 ? res.total : sum;
    return {
      site: used.id, siteName: p ? p.name : loc.hostname, host: loc.hostname,
      currency: currencyFor(loc), items: res.items.map((it, idx) => ({ ...it, id: idx })),
      total, itemsSum: sum, totalSource: res.total != null && res.total > 0 ? 'page' : 'sum',
      readAt: new Date().toISOString(), url: loc.href,
    };
  }

  CART.siteParser = siteParser;
  CART.readCart = readCart;
  if (typeof module === 'object' && module.exports) module.exports = { readCart, siteParser };
})(typeof globalThis !== 'undefined' ? globalThis : this);
