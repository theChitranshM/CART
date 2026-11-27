const fs = await import('fs'); const out = process.env.HOME + '/cart/dev/shots/cheat'; fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
await p.goto('https://www.holtrenfrew.com/en/cart', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
await p.evaluate(()=>document.querySelectorAll('.js-survey__container').forEach(e=>e.remove()));
const btn = p.locator('.js-continue-checkout-button').first(); await btn.scrollIntoViewIfNeeded(); const box = await btn.boundingBox();
await p.mouse.click(box.x + box.width/2, box.y + box.height/2);
await p.waitForTimeout(5000);
const ba = () => p.evaluate(() => { const b = document.getElementById('cart-takeover-host').shadowRoot.querySelector('.buy-anyway'); const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, label: b.textContent, t: b.style.transform }; });
const log = [];
for (let i = 0; i < 8; i++) {
  const b = await ba(); log.push(b);
  await p.mouse.move(b.x - 60, b.y - 40); await p.mouse.move(b.x, b.y, { steps: 4 });
  await p.waitForTimeout(400);
  if (i === 2) await p.screenshot({ path: out + '/dodge.png' });
}
const b = await ba(); await p.mouse.click(b.x, b.y); await p.waitForTimeout(800);
const target = await p.evaluate(() => [...document.getElementById('cart-takeover-host').shadowRoot.querySelectorAll('.gate-target span')].map(s => s.textContent).join(''));
const input = p.locator('#cart-takeover-host >> css=.gate-input');
await input.focus();
// paste attempt should be blocked
await p.evaluate(() => { const i = document.getElementById('cart-takeover-host').shadowRoot.querySelector('.gate-input'); const e = new ClipboardEvent('paste', { clipboardData: new DataTransfer(), cancelable: true, bubbles: true }); e.clipboardData.setData('text/plain', 'x'); i.dispatchEvent(e); });
const sub = await p.evaluate(() => document.getElementById('cart-takeover-host').shadowRoot.querySelector('.gate-sub').textContent);
await p.keyboard.type(target.slice(0, 25), { delay: 15 });
await p.screenshot({ path: out + '/gate.png' });
await p.keyboard.type(target.slice(25), { delay: 8 });
await p.waitForTimeout(6000);
return { dodges: log.map(l => l.label + ' ' + l.t), target, pasteMsg: sub, urlAfter: p.url(), overlay: await p.evaluate(() => !!document.getElementById('cart-takeover-host')) };
