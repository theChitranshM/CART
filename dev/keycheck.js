// Dev: start a takeover and confirm the keystroke clips load and play in the content script.
await p.goto('https://www.holtrenfrew.com/en/cart', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
const reqs = []; p.on('request', (r) => { if (/sounds\/keys\//.test(r.url())) reqs.push(r.url().split('/').pop()); });
await p.evaluate(() => document.querySelectorAll('.js-survey__container').forEach((e) => e.remove()));
const b = await p.locator('.js-continue-checkout-button').first().boundingBox();
await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await p.waitForTimeout(9000);
const cap = await p.evaluate(() => document.getElementById('cart-takeover-host')?.shadowRoot.querySelector('.roast')?.textContent);
return { keyClipsFetched: [...new Set(reqs)].sort(), caption: cap };
