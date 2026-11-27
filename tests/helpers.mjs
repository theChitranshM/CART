// Loads the extension's classic scripts into Node and parses fixture HTML with jsdom.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
for (const f of ['lib/money.js', 'lib/config.js', 'parsers/holt.js', 'parsers/amazon.js', 'parsers/bestbuy.js', 'parsers/generic.js', 'parsers/index.js', 'roast/prompt.js', 'roast/fallback.js']) {
  require(path.join(here, '../extension/src', f));
}
export const CART = globalThis.CART;

export function fixture(name, url) {
  const html = fs.readFileSync(path.join(here, 'fixtures', name), 'utf8');
  const dom = new JSDOM(html, { url });
  return { doc: dom.window.document, loc: new URL(url) };
}
