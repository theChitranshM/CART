// Dev: load a folder of beat-named clips into the extension's custom sounds (PACK=<dir>, EXT_ID fallback).
const fs = await import('fs');
const pack = {};
for (const f of fs.readdirSync(process.env.PACK)) { const m = f.match(/^([a-z]+)\.(mp3|ogg|wav)$/); if (m) pack[m[1]] = `data:audio/${m[2] === 'mp3' ? 'mpeg' : m[2]};base64,` + fs.readFileSync(process.env.PACK + '/' + f).toString('base64'); }
const q = await ctx.newPage();
await q.goto(`chrome-extension://${process.env.EXT_ID}/options/options.html`); await q.waitForTimeout(800);
await q.evaluate((p) => chrome.storage.local.set({ customSounds: p }), pack);
const n = await q.evaluate(() => chrome.storage.local.get('customSounds').then((r) => Object.keys(r.customSounds || {})));
await q.close();
return n;
