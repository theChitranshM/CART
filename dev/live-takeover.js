// Dev: reload the extension, open the real Holt bag, click the real CHECKOUT button, screenshot the beats.
const fs = await import('fs');
const out = process.env.HOME + '/cart/dev/shots/' + (process.env.TAG || 'holt');
fs.mkdirSync(out, { recursive: true });
{ // reload the unpacked extension so the run uses the code on disk (works even if the service worker is asleep)
  const r = await ctx.newPage(); await r.goto(`chrome-extension://${process.env.EXT_ID || 'kdcglliikkjibnjppdmfakhlliohoeie'}/options/options.html`).catch(() => {});
  await r.evaluate(() => chrome.runtime.reload()).catch(() => {}); await r.close().catch(() => {});
}
await p.waitForTimeout(2000);
const logs = []; p.on('console', m => { if (/CART/.test(m.text())) logs.push(m.text().slice(0,300)); });
await p.goto(process.env.URL || 'https://www.holtrenfrew.com/en/cart', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(7000);
await p.evaluate(()=>document.querySelectorAll('.js-survey__container').forEach(e=>e.remove()));
const btn = p.locator(process.env.SEL || '.js-continue-checkout-button').first();
await btn.scrollIntoViewIfNeeded();
const box = await btn.boundingBox();
await p.mouse.click(box.x + box.width/2, box.y + box.height/2);
const urlAfter = [];
for (let i = 0; i < Number(process.env.N || 14); i++) {
  await p.waitForTimeout(Number(process.env.STEP || 2500));
  await p.screenshot({ path: `${out}/${String(i).padStart(2,'0')}.png` });
  urlAfter.push(p.url());
  if (process.env.PLEA && i >= 3) { const pl = p.locator('#cart-takeover-host >> css=.plea'); if (await pl.count()) { await pl.click({force:true}); logs.push('clicked plea at shot ' + i); } }
}
const state = await p.evaluate(() => { const h = document.getElementById('cart-takeover-host'); if (!h) return 'no overlay'; const s = h.shadowRoot; return { total: s.querySelector('.total')?.textContent, final: s.querySelector('.final')?.innerText, debug: s.querySelector('.debug')?.textContent }; });
return { state, urls: [...new Set(urlAfter)], logs };
