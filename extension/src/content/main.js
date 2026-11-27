// Page integration: find the real cart, prewarm the roasts, intercept checkout, run the takeover.
(function (root) {
  const CART = root.CART;
  if (!CART || root.__cartLoaded) return;
  root.__cartLoaded = true;

  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => { void chrome.runtime.lastError; resolve(r); }); } catch (e) { resolve(null); }
  });

  let cfg = null, cssText = '', active = null, bypassUntil = 0, prewarmed = null, prewarmSig = '';

  const sig = (cart) => JSON.stringify(cart && cart.items.map((i) => [i.name, i.lineTotal]));
  const survivorIdsFor = (cart) => {
    const kws = (cfg.survivorKeywords || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    return cart.items.filter((i) => kws.some((k) => (i.brand + ' ' + i.name).toLowerCase().includes(k))).map((i) => i.id);
  };

  async function roastOptsFor(cart) {
    const survivorIds = survivorIdsFor(cart);
    const opts = { survivorIds };
    if (survivorIds.length) {
      const last = await send({ type: 'getLastSaved' });
      if (last && last.amount) opts.savedSoFar = { amount: last.amount, site: last.site };
    }
    return opts;
  }

  function readCart() {
    const p = CART.siteParser(location);
    if (p && !p.isCartPage(location, document)) return null;
    return CART.readCart(location, document);
  }

  // Ask Claude while the user is still looking at the cart, so the takeover is instant on click.
  async function prewarm() {
    const cart = readCart();
    if (!cart) return;
    const s = sig(cart);
    if (s === prewarmSig) return;
    prewarmSig = s;
    const opts = await roastOptsFor(cart);
    prewarmed = { sig: s, promise: send({ type: 'roast', cart, opts }) };
    if (cfg.showDebug) console.log('[CART] prewarm', cart);
  }

  async function startTakeover(trigger) {
    if (active) return;
    const cart = readCart();
    if (!cart) return false;
    CART.sfx.unlock();
    const opts = await roastOptsFor(cart);
    const roastPromise = prewarmed && prewarmed.sig === sig(cart) ? prewarmed.promise : send({ type: 'roast', cart, opts });
    const lastSaved = opts.survivorIds.length ? await send({ type: 'getLastSaved' }) : null;
    active = new CART.Takeover({
      cart, cfg, cssText, roastPromise, survivorIds: opts.survivorIds, lastSaved,
      speak: (text) => send({ type: 'speak', text }),
      stopSpeak: () => send({ type: 'stopSpeak' }),
      saveRun: (run) => send({ type: 'saveRun', run }),
      onUnlock: () => { bypassUntil = Date.now() + 60000; active = null; resumeCheckout(trigger); },
      onClose: () => { active = null; },
    });
    active.run().catch((e) => console.error('[CART] takeover failed', e));
    return true;
  }

  function resumeCheckout(trigger) {
    if (!trigger || !trigger.el) return;
    const el = trigger.el;
    if (trigger.form && trigger.form.requestSubmit) trigger.form.requestSubmit(el.type === 'submit' ? el : undefined);
    else el.click();
  }

  function checkoutTarget(e) {
    const p = CART.siteParser(location) || CART.parsers.generic;
    const sels = (p.checkoutSelectors || []).join(',');
    const path = e.composedPath ? e.composedPath() : [e.target];
    for (const n of path) {
      if (n && n.nodeType === 1 && n.matches && n.matches(sels)) return n;
      if (n === document.body) break;
    }
    return null;
  }

  function onClick(e) {
    if (Date.now() < bypassUntil || active) return;
    const el = checkoutTarget(e);
    if (!el) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const p = CART.siteParser(location);
    if (p && !p.isCartPage(location, document) && p.cartUrl) {
      // Checkout from a mini-cart on another page: go to the real cart page and take over there.
      sessionStorage.setItem('cart-takeover-pending', '1');
      location.href = p.cartUrl;
      return;
    }
    startTakeover({ el, form: el.form || el.closest('form') });
  }

  function onSubmit(e) {
    if (Date.now() < bypassUntil || active) return;
    const el = e.submitter && checkoutTarget({ composedPath: () => [e.submitter], target: e.submitter });
    if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    startTakeover({ el, form: e.target });
  }

  async function init() {
    cfg = await send({ type: 'getConfig' }) || { ...CART.DEFAULT_CONFIG };
    CART.sfx.configure(cfg);
    try { cssText = await (await fetch(chrome.runtime.getURL('src/content/takeover.css'))).text(); } catch (e) {}
    if (cfg.showDebug) console.log('[CART] ready on', location.hostname);
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    chrome.storage.onChanged.addListener((c) => { if (c.config) cfg = { ...CART.DEFAULT_CONFIG, ...c.config.newValue }; if (c.config || c.customSounds) CART.sfx.configure(cfg); });

    let timer = null;
    const check = () => { clearTimeout(timer); timer = setTimeout(async () => {
      await prewarm();
      const pending = sessionStorage.getItem('cart-takeover-pending');
      if (readCart() && (pending || cfg.trigger === 'cart-load') && !active && !root.__cartAutoRan) {
        sessionStorage.removeItem('cart-takeover-pending');
        root.__cartAutoRan = true;
        startTakeover(null);
      }
    }, 1200); };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();

    // Dev / recording hook: window.postMessage({cart: 'takeover'}) starts it without clicking.
    root.addEventListener('message', (e) => { if (e.source === root && e.data && e.data.cart === 'takeover') startTakeover(null); });
  }

  init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
