# dev/

Tools used to verify CART against the live sites. Nothing here ships in the extension.

| File | Use |
|---|---|
| `browser.sh` | Starts Playwright's Chromium with the unpacked extension and a CDP port (9333). Branded Chrome no longer accepts `--load-extension`. Turn on Developer mode in `chrome://extensions` once. |
| `cdp.mjs` | `node dev/cdp.mjs <url\|-> <script.js>` runs a snippet against that browser (`p` = page, `ctx` = context). |
| `setcfg.js` | Writes a test config into the extension (via its options page): `CFG='{"showDebug":true}' node dev/cdp.mjs - dev/setcfg.js`. |
| `holt-add.js` | Adds real Holt listings to a guest bag: `URLS=<product urls, comma-separated> node dev/cdp.mjs - dev/holt-add.js`. |
| `live-takeover.js` | Clicks the real checkout button and screenshots each beat (`URL`, `SEL`, `N`, `STEP`, `PLEA`). |
| `live-bypass.js` | Chases the Buy Anyway button, checks paste is blocked, types the roast, confirms checkout unlocks. |
| `record.js` + `encode.py` | Screencasts a live run and encodes a silent mp4 into `recordings/` (gitignored). |
| `make-fixture.mjs` | Cuts a test fixture out of a saved cart page and strips scripts and tokens. |
| `montage.mjs`, `make-icons.mjs` | Contact sheets for review; renders the icons. |
| `render-sfx.js` | Renders every sound beat offline to a WAV for listening (`STYLE`, optional `PACK=<folder>`, `OUT`). |
| `load-pack.js` | Loads a folder of beat-named clips into the test browser's custom sounds (`PACK`, `EXT_ID`). |
| `render-typing.js` | Renders the caption typing sound for a sample line (`OUT`, `EXT_ID`). |
| `keycheck.js` | Starts a takeover and lists which keystroke clips loaded. |
