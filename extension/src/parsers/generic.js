// Generic cart detection: fallback for cart pages whose dedicated parser finds nothing.
// Looks inside cart/basket/bag containers for repeated rows that each hold a product link and a price.
(function (root) {
  const CART = root.CART || (root.CART = {});
  const { parseMoney, cleanText } = CART.money || require('../lib/money.js');

  const parser = {
    id: 'generic',
    name: 'this store',
    matches: () => true,
    isCartPage: (loc, doc) => /cart|basket|bag/i.test(loc.pathname) && parser.parse(doc).items.length > 0,
    checkoutSelectors: ['button[name*="checkout" i]', 'a[href*="checkout" i]', 'input[value*="checkout" i]', 'button[class*="checkout" i]'],
    parse(doc) {
      const containers = [...doc.querySelectorAll('[class*="cart" i], [id*="cart" i], [class*="basket" i], [class*="bag" i]')];
      let best = [];
      for (const c of containers) {
        const rows = [...c.children].filter((r) => r.querySelector('a') && /\$\s?\d/.test(r.textContent) && r.querySelector('img'));
        if (rows.length > best.length) best = rows;
      }
      const items = best.map((r) => {
        const link = [...r.querySelectorAll('a')].map((a) => cleanText(a.textContent)).sort((a, b) => b.length - a.length)[0];
        const price = (r.textContent.match(/\$\s?[\d,]+(\.\d{2})?/) || [])[0];
        return { brand: '', name: link, unitPrice: parseMoney(price), qty: 1, lineTotal: parseMoney(price), image: r.querySelector('img')?.getAttribute('src') || '', url: '' };
      }).filter((i) => i.name && i.unitPrice != null);
      return { items, total: null };
    },
  };

  (CART.parsers || (CART.parsers = {})).generic = parser;
  if (typeof module === 'object' && module.exports) module.exports = parser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
