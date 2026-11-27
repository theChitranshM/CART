// Dev: cut a parser fixture out of a saved live cart page. Keeps only the cart region, drops scripts/tokens.
// Usage: node dev/make-fixture.mjs <saved.html> <out.html> <css selector>[,<css selector>...]
import fs from 'fs'; import { JSDOM } from 'jsdom';
const [, , src, out, sels] = process.argv;
const doc = new JSDOM(fs.readFileSync(src, 'utf8')).window.document;
const parts = sels.split('|').map((s) => { const el = doc.querySelector(s); if (!el) throw new Error('missing ' + s); return el; });
for (const el of parts) {
  [el, ...el.querySelectorAll('*')].forEach((n) => [...n.attributes].forEach((a) => { if (/csrf|session|customerid|token"?\s*[:=]/i.test(a.value) || /token/i.test(a.name) && a.name !== 'data-tokens') n.removeAttribute(a.name); }));
  el.querySelectorAll('script, style, noscript, iframe, svg, link').forEach((e) => e.remove());
  el.querySelectorAll('input[name="CSRFToken"], input[name*="token" i], input[type="hidden"][name="encodedOffering"]').forEach((e) => e.remove());
  el.querySelectorAll('[data-cart], [data-encoded-offering], [data-csa-c-id], [data-itemid]').forEach((e) => { e.removeAttribute('data-cart'); e.removeAttribute('data-encoded-offering'); e.removeAttribute('data-csa-c-id'); e.removeAttribute('data-itemid'); });
}
let body = parts.map((p) => p.outerHTML.replace(/\n\s*\n+/g, '\n')).join('\n');
body = body.replace(/<!-- sp:csrf -->[\s\S]*?<!-- sp:end-csrf -->/g, '').replace(/<input type="hidden"[^>]*value="[A-Za-z0-9+/=_-]{40,}"[^>]*>/g, '').replace(/value="[A-Za-z0-9+/=_-]{40,}"/g, 'value=""');
const html = `<!-- Trimmed from the live cart page on ${new Date().toISOString().slice(0, 10)} for parser tests. Not used at runtime. -->\n<html><body>\n${body}\n</body></html>\n`;
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(1) + ' KB');
