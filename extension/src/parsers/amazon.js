// Amazon cart parser (amazon.ca / amazon.com share the same cart markup).
(function (root) {
  const CART = root.CART || (root.CART = {});
  const { parseMoney, cleanText } = CART.money || require('../lib/money.js');

  const parser = {
    id: 'amazon',
    name: 'Amazon',
    currency: null, // read from host below
    cartUrl: '/gp/cart/view.html',
    matches: (loc) => /(^|\.)amazon\.(ca|com)$/.test(loc.hostname),
    isCartPage: (loc, doc) => /\/(gp\/cart|cart)/.test(loc.pathname) && !!doc.querySelector('.sc-list-item[data-itemtype="active"]'),
    checkoutSelectors: ['input[name="proceedToRetailCheckout"]', '#sc-buy-box-ptc-button', '[data-feature-id="proceed-to-checkout-action"]', '#hlb-ptc-btn-native'],
    parse(doc) {
      const items = [];
      doc.querySelectorAll('.sc-list-item[data-itemtype="active"]').forEach((el) => {
        if (el.closest('#sc-saved-cart')) return;
        const name = cleanText(el.getAttribute('data-producttitle') || el.querySelector('.a-truncate-full')?.textContent || el.querySelector('.sc-product-title')?.textContent);
        let unitPrice = parseMoney(el.getAttribute('data-price'));
        if (unitPrice == null) unitPrice = parseMoney(el.querySelector('.sc-product-price, .apex-price-to-pay-value .a-offscreen, .a-price .a-offscreen')?.textContent);
        const qty = parseInt(el.getAttribute('data-quantity') || '1', 10) || 1;
        const img = el.querySelector('img.sc-product-image') || [...el.querySelectorAll('img')].find((i) => !/loadIndicator|spinner|transparent-pixel/i.test(i.getAttribute('src') || ''));
        const asin = el.getAttribute('data-asin') || '';
        if (!name || unitPrice == null) return;
        items.push({
          brand: '', name, unitPrice, qty, lineTotal: Math.round(unitPrice * qty * 100) / 100,
          image: ((img?.getAttribute('srcset') || '').match(/(\S+)\s+2x/) || [])[1] || img?.getAttribute('src') || '', url: asin ? '/dp/' + asin : '', asin,
        });
      });
      const totalText = doc.querySelector('#sc-subtotal-amount-buybox, #sc-subtotal-amount-activecart')?.textContent;
      return { items, total: parseMoney(totalText) };
    },
  };

  (CART.parsers || (CART.parsers = {})).amazon = parser;
  if (typeof module === 'object' && module.exports) module.exports = parser;
})(typeof globalThis !== 'undefined' ? globalThis : this);
