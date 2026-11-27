// Dev: renders the caption typing sound for a sample line at the takeover's real cadence (OUT=<wav>, EXT_ID).
const fs = await import('fs');
const q = await ctx.newPage();
await q.goto(`chrome-extension://${process.env.EXT_ID}/options/options.html`);
await q.waitForTimeout(1000);
const b64 = await q.evaluate(async (text) => {
  const sr = 44100, chars = [...text];
  const perChar = Math.max(11, Math.min(22, 2640 / chars.length)) / 1000; // same formula as takeover.js
  let t = 0.3; const times = [];
  for (const c of chars) { times.push([c, t]); t += perChar + (c === ' ' ? 0.012 : Math.random() * 0.010); }
  const a = new OfflineAudioContext(1, Math.ceil(sr * (t + 0.6)), sr);
  CART.sfx.setStyle('meme'); CART.sfx.setCustom({});
  let nextKeyAt = 0; // same pacing as takeover.js: keys at a human rate while text types faster
  for (const [c, at] of times) if (at >= nextKeyAt) { await CART.sfx.schedule(c === ' ' ? 'typeSpace' : 'type', a, a.destination, at); nextKeyAt = at + 0.085 + Math.random() * 0.035; }
  const buf = await a.startRendering();
  const d = buf.getChannelData(0), n = d.length, out = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * 1.6)) * 32767, true);
  const bytes = new Uint8Array(out.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}, process.env.TEXT || "A $290 Fear of God hoodie. It's a sweatshirt with a mortgage. Your closet already has three.");
fs.writeFileSync(process.env.OUT, Buffer.from(b64, 'base64'));
await q.close();
return 'ok';
