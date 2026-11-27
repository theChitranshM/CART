// Dev: write a test config into the extension through its options page (works even when the service worker is asleep).
// Usage: CFG='{"showDebug":true}' EXT_ID=<id> node dev/cdp.mjs - dev/setcfg.js
const q = await ctx.newPage();
await q.goto(`chrome-extension://${process.env.EXT_ID || 'kdcglliikkjibnjppdmfakhlliohoeie'}/options/options.html`);
await q.waitForTimeout(800);
const saved = await q.evaluate(async (c) => { await chrome.storage.local.set({ config: c }); return (await chrome.storage.local.get('config')).config; }, JSON.parse(process.env.CFG || '{}'));
await q.close();
return saved;
