// Dev helper: run a snippet against the CDP browser. Usage: node dev/cdp.mjs <url|-> <js-file-or-inline>
import { chromium } from 'playwright';
import fs from 'fs';
const [, , url, code] = process.argv;
const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = b.contexts()[0];
let p = ctx.pages().find(x => !x.url().startsWith('chrome')) || ctx.pages()[0];
if (url && url !== '-') { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000); }
const src = fs.existsSync(code) ? fs.readFileSync(code, 'utf8') : code;
const fn = new Function('p', 'ctx', `return (async () => { ${src} })()`);
const out = await fn(p, ctx);
if (out !== undefined) console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));

process.exit(0);
