// Holt Renfrew (holtrenfrew.com) cart parser. Reads the live bag page DOM.
(function (root) {
  const CART = root.CART || (root.CART = {});
  const { parseMoney, cleanText } = CART.money || require('../lib/money.js');

  const parser = {
    id: 'holt',
    name: 'Holt Renfrew',
    currency: 'CAD',
    cartUrl: '/en/cart',
    matches: (loc) => /(^|\.)holtrenfrew\.com$/.test(loc.hostname),
    isCartPage: (loc, doc) => /\/cart\/?$/.test(loc.pathname) && !!doc.querySelector('.cart__list li.cart__item'),
    checkoutSelectors: ['.js-continue-checkout-button', '.btn--continue-checkout', 'button[data-checkout-url]', 'a[href*="/cart/checkout"]'],
    parse(doc) {
      const items = [];
      doc.querySelectorAll('.cart__list li.cart__item').forEach((li) => {
        const details = li.querySelector('.details') || li;
        const brand = cleanText(details.querySelector('p.brand')?.textContent);
        const nameEl = details.querySelector('p.name a') || details.querySelector('p.name');
        const name = cleanText(nameEl?.textContent);
        // Price block may hold an old price and a sale price; the lowest visible amount is what you pay.
        const prices = [...details.querySelectorAll('.price .text-no-wrap')]
          .filter((e) => !e.closest('.hide'))
          .map((e) => parseMoney(e.textContent)).filter((n) => n != null);
        const unitPrice = prices.length ? Math.min(...prices) : null;
        const sel = li.querySelector('select[name="quantity"]');
        const qty = parseInt(sel?.value || sel?.querySelector('option[selected]')?.value || '1', 10) || 1;
        const img = li.querySelector('img');
        const href = nameEl?.getAttribute?.('href') || li.querySelector('a[href*="/p/"]')?.getAttribute('href') || '';
        if (!name || unitPrice == null) return;
        items.push({
          brand, name, unitPrice, qty, lineTotal: Math.round(unitPrice * qty * 100) / 100,
          image: img ? (img.getAttribute('src') || '').replace(/^\/\//, 'https://') : '',
          url: href ? new URL(href, 'https://www.holtrenfrew.com').href : '',
          category: li.getAttribute('data-category') || '',
        });
      });
      const totalText = doc.querySelector('.cart__totals .total-right strong, .js-cart-totals .total-right')?.textContent;
      return { items, total: parseMoney(totalText) };
    },
  };

  (CART.parsers || (CART.parsers = {})).holt = parser;
  if (typeof module === 'object' && module.exports) module.exports = parser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
