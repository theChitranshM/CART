// Dev: renders the extension icons with Chromium (no image libs needed).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
for (const s of [16, 48, 128]) {
  await p.setViewportSize({ width: s, height: s });
  await p.setContent(`<body style="margin:0;background:transparent"><svg width="${s}" height="${s}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="26" fill="#ff2a2a"/>
    <path d="M22 34h16l12 46h50l8-32H44" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="56" cy="99" r="8" fill="#fff"/><circle cx="92" cy="99" r="8" fill="#fff"/></svg></body>`);
  await p.screenshot({ path: `extension/icons/${s}.png`, omitBackground: true });
}
await b.close();
