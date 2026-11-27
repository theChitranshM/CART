// Dev: tile screenshots into one contact sheet for review.
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
const dir = process.argv[2], outp = process.argv[3], cols = Number(process.argv[4] || 3);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
const imgs = files.map(f => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64'));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: cols * 480, height: 300 } });
await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},480px);gap:2px">${imgs.map((s,i)=>`<div style="position:relative"><img src="${s}" style="width:480px;display:block"><b style="position:absolute;top:4px;left:6px;color:#0f0;font:16px monospace">${files[i]}</b></div>`).join('')}</body>`);
await p.screenshot({ path: outp, fullPage: true }); await b.close();
