// Best Buy cart parser (bestbuy.ca basket, bestbuy.com cart). Selectors confirmed against live pages are listed first;
// the attribute-based fallbacks keep it working through minor markup changes.
(function (root) {
  const CART = root.CART || (root.CART = {});
  const { parseMoney, cleanText } = CART.money || require('../lib/money.js');

  const ITEM_SELECTORS = [
    '[data-automation="basket-line-item"]', '[data-automation*="line-item"]', '[data-testid*="line-item"]',
    '.fluid-item', '.cart-item', '[class*="lineItem_"]', '[class*="LineItem"]',
  ];

  function lowestPrice(el) {
    const found = [...el.querySelectorAll('[data-automation*="price"], [class*="price" i], [class*="Price"]')]
      .map((e) => cleanText(e.textContent)).filter((t) => /\$\s?\d/.test(t) && !/save|was|reg\.?/i.test(t))
      .map(parseMoney).filter((n) => n != null && n > 0);
    return found.length ? Math.min(...found) : null;
  }

  const parser = {
    id: 'bestbuy',
    name: 'Best Buy',
    cartUrl: null,
    matches: (loc) => /(^|\.)bestbuy\.(ca|com)$/.test(loc.hostname),
    isCartPage: (loc, doc) => /\/(basket|cart)\/?$/.test(loc.pathname) && parser.findItems(doc).length > 0,
    checkoutSelectors: ['[data-automation="continue-to-checkout"]', '[data-automation*="checkout-button"]', 'button[data-track="Checkout - Top"]', '.checkout-buttons__checkout button', 'a[href*="/checkout"]', 'button[class*="checkout" i]'],
    findItems(doc) {
      for (const sel of ITEM_SELECTORS) {
        const els = [...doc.querySelectorAll(sel)].filter((e) => !e.parentElement?.closest(sel));
        if (els.length) return els;
      }
      return [];
    },
    parse(doc) {
      const items = [];
      parser.findItems(doc).forEach((el) => {
        const titleEl = el.querySelector('[data-automation*="product-title"], [data-automation*="item-title"], a[href*="/product/"], .cart-item__title a, h2 a, h3 a, h2, h3');
        const name = cleanText(titleEl?.textContent);
        const unitPriceAttr = el.querySelector('[data-automation="product-price"], [data-automation*="item-price"]');
        let lineTotal = unitPriceAttr ? parseMoney(unitPriceAttr.textContent) : lowestPrice(el);
        const qtyEl = el.querySelector('select[aria-label*="uantit" i], select[name*="quantity" i], input[name*="quantity" i], [data-automation*="quantity"] select, [data-automation*="quantity"] input');
        const qty = parseInt(qtyEl?.value || '1', 10) || 1;
        const img = el.querySelector('img');
        const href = (el.querySelector('a[href*="/product/"], a[href*="/site/"]') || {}).getAttribute?.('href') || '';
        if (!name || lineTotal == null) return;
        items.push({ brand: '', name, unitPrice: Math.round((lineTotal / qty) * 100) / 100, qty, lineTotal, image: img?.getAttribute('src') || '', url: href });
      });
      const totalEl = [...doc.querySelectorAll('[data-automation*="subtotal"], [data-automation*="order-total"], [class*="subtotal" i], [class*="orderTotal" i]')]
        .find((e) => /\$\s?\d/.test(e.textContent));
      return { items, total: totalEl ? parseMoney(totalEl.textContent.replace(/^[^$]*/, '')) : null };
    },
  };

  (CART.parsers || (CART.parsers = {})).bestbuy = parser;
  if (typeof module === 'object' && module.exports) module.exports = parser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
