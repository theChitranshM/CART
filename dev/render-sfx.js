// Dev: renders every beat of a sound style into one WAV (offline, in the extension's options page).
// Usage: STYLE=meme OUT=recordings/sfx-preview.wav node dev/cdp.mjs - dev/render-sfx.js
const fs = await import('fs');
let id = null;
for (const s of ctx.serviceWorkers()) {
  const n = await s.evaluate(() => chrome.runtime.getManifest().name).catch(() => null);
  if (n && n.startsWith('CART')) { id = s.url().split('/')[2]; await s.evaluate(() => chrome.runtime.reload()).catch(() => {}); }
}
await p.waitForTimeout(2500);
id = id || process.env.EXT_ID; // service worker may be asleep; pass EXT_ID from chrome://extensions
if (!id) throw new Error('CART service worker not found; set EXT_ID');
const q = await ctx.newPage();
await q.goto(`chrome-extension://${id}/options/options.html`);
await q.waitForTimeout(1500);
// Optional: PACK=<folder of beat-named clips> previews a custom pack instead of the built-in sounds.
const pack = {};
if (process.env.PACK) for (const f of fs.readdirSync(process.env.PACK)) {
  const m = f.match(/^([a-z]+)\.(mp3|ogg|wav|m4a)$/); if (!m) continue;
  pack[m[1]] = `data:audio/${m[2] === 'mp3' ? 'mpeg' : m[2]};base64,` + fs.readFileSync(process.env.PACK + '/' + f).toString('base64');
}
const b64 = await q.evaluate(async ([style, pack]) => {
  const beats = CART.sfx.BEATS.filter((b) => b !== 'tick');
  const gap = Object.keys(pack).length ? 3.9 : 2.6, sr = 44100;
  const a = new OfflineAudioContext(1, Math.ceil(sr * (beats.length * gap + 1)), sr);
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(a.destination);
  CART.sfx.setStyle(style);
  CART.sfx.setCustom(pack);
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] === 'ticked') for (let k = 0; k < 12; k++) await CART.sfx.schedule('tick', a, comp, i * gap + k * 0.06);
    if (beats[i] === 'type') { for (let k = 0; k < 28; k++) await CART.sfx.schedule('type', a, comp, i * gap + k * 0.075 + Math.random() * 0.02); continue; }
    await CART.sfx.schedule(beats[i], a, comp, i * gap + (beats[i] === 'ticked' ? 0.75 : 0));
  }
  const buf = await a.startRendering();
  const d = buf.getChannelData(0), n = d.length, out = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  const bytes = new Uint8Array(out.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(s), order: beats };
}, [process.env.STYLE || 'meme', pack]);
fs.writeFileSync(process.env.OUT, Buffer.from(b64.b64, 'base64'));
await q.close();
return b64.order;
