#!/usr/bin/env node
// Downloads the trending meme sound pack listed in extension/sounds/trending.json into
// extension/sounds/trending/ (gitignored). The clips come from dankmachine.com and have no
// redistribution license, which is why they are fetched on your machine instead of committed.
// Usage: npm run sounds:trending
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(fs.readFileSync(path.join(root, 'extension/sounds/trending.json'), 'utf8'));
const outDir = path.join(root, 'extension/sounds/trending');
fs.mkdirSync(outDir, { recursive: true });

let ok = 0;
for (const [beat, clip] of Object.entries(list.clips)) {
  const url = list.source.replace('{slug}', clip.slug);
  try {
    let buf = null;
    for (let attempt = 0; attempt < 3 && !buf; attempt++) {
      const r = await fetch(url);
      const b = Buffer.from(await r.arrayBuffer());
      const isMp3 = b.slice(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
      if (r.ok && isMp3) buf = b; else await new Promise((res) => setTimeout(res, 1500));
    }
    if (!buf) throw new Error('not an mp3 after 3 tries');
    fs.writeFileSync(path.join(outDir, beat + '.mp3'), buf);
    console.log(`ok   ${beat.padEnd(10)} ${clip.name} (${(buf.length / 1024).toFixed(0)} KB)`);
    ok++;
  } catch (e) {
    console.log(`fail ${beat.padEnd(10)} ${clip.name}: ${e.message} (CART falls back to the built-in sound for this beat)`);
  }
}
console.log(`\n${ok}/${Object.keys(list.clips).length} clips in extension/sounds/trending/. Reload CART in chrome://extensions, then pick "Trending" under Sound in settings.`);
