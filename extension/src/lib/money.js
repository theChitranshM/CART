// Money helpers shared by parsers, the takeover and the tests. No site data lives here.
(function (root) {
  const CART = root.CART || (root.CART = {});

  // "$1,450.00" -> 1450, "1 450,00 $" -> 1450, "CDN$ 459.00" -> 459. Returns null if no number.
  function parseMoney(input) {
    if (input == null) return null;
    if (typeof input === 'number') return isFinite(input) ? input : null;
    let s = String(input).replace(/ | /g, ' ');
    const m = s.match(/-?\d[\d\s.,]*/);
    if (!m) return null;
    s = m[0].trim().replace(/\s/g, '');
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (lastComma > -1) {
      s = /,\d{2}$/.test(s) ? s.replace(/,(?=\d{2}$)/, '.').replace(/,/g, '') : s.replace(/,/g, '');
    }
    s = s.replace(/\.(?=.*\.)/g, '');
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function formatMoney(n, currency, locale) {
    const whole = Math.abs(n - Math.round(n)) < 0.005;
    try {
      return new Intl.NumberFormat(locale || 'en-CA', {
        style: 'currency', currency: currency || 'CAD', currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
      }).format(n);
    } catch (e) {
      return '$' + (whole ? Math.round(n).toLocaleString() : n.toFixed(2));
    }
  }

  function cleanText(t) {
    return (t || '').replace(/\s+/g, ' ').trim();
  }

  CART.money = { parseMoney, formatMoney, cleanText };
  if (typeof module === 'object' && module.exports) module.exports = CART.money;
})(typeof globalThis !== 'undefined' ? globalThis : this);
