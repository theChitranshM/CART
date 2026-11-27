// Dev: record a live takeover as video frames via CDP screencast (no audio), for the offline backup.
const fs = await import('fs');
const out = process.env.HOME + '/cart/recordings/frames-' + process.env.TAG;
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
{ // reload the unpacked extension so the run uses the code on disk (works even if the service worker is asleep)
  const r = await ctx.newPage(); await r.goto(`chrome-extension://${process.env.EXT_ID || 'kdcglliikkjibnjppdmfakhlliohoeie'}/options/options.html`).catch(() => {});
  await r.evaluate(() => chrome.runtime.reload()).catch(() => {}); await r.close().catch(() => {});
}
await p.waitForTimeout(2500);
await p.goto(process.env.URL, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(Number(process.env.WAIT || 8000)); // WAIT lets the Claude prewarm finish before the click
await p.evaluate(()=>document.querySelectorAll('.js-survey__container').forEach(e=>e.remove()));
const c = await p.context().newCDPSession(p);
let n = 0; const times = [];
c.on('Page.screencastFrame', async (f) => { fs.writeFileSync(`${out}/${String(n).padStart(5,'0')}.jpg`, Buffer.from(f.data, 'base64')); times.push(f.metadata.timestamp); n++; c.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(()=>{}); });
await c.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 1 });
await p.waitForTimeout(1500);
const btn = p.locator(process.env.SEL).first(); await btn.scrollIntoViewIfNeeded(); const box = await btn.boundingBox();
await p.mouse.click(box.x + box.width/2, box.y + box.height/2);
const t0 = Date.now(); let pled = false;
while (Date.now() - t0 < Number(process.env.MS || 60000)) {
  await p.waitForTimeout(500);
  const st = await p.evaluate(() => { const h = document.getElementById('cart-takeover-host'); if (!h) return {}; const s = h.shadowRoot; return { plea: !!s.querySelector('.plea'), final: !s.querySelector('.final').classList.contains('hidden') }; });
  if (st.plea && !pled) { await p.waitForTimeout(1200); await p.locator('#cart-takeover-host >> css=.plea').click({ force: true }); pled = true; }
  if (st.final) { await p.waitForTimeout(6000); break; }
}
await c.send('Page.stopScreencast');
fs.writeFileSync(`${out}/times.json`, JSON.stringify(times));
const state = await p.evaluate(() => { const h = document.getElementById('cart-takeover-host'); if (!h) return null; const s = h.shadowRoot; return { final: s.querySelector('.final').innerText, debug: s.querySelector('.debug').textContent }; });
return { frames: n, secs: (times.at(-1) - times[0]).toFixed(1), pled, state };
