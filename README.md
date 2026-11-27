# CART: Claude Against Retail Therapy

A Chrome extension that stops you at checkout. When you click **Checkout** on a real store, CART reads the real cart off the page, locks checkout behind a full-screen takeover, and has Claude roast every item on screen, one at a time, with meme sound effects. Each item gets a **REJECTED** stamp (vine boom included), flies out of the cart, and the total ticks down to **$0**. The one thing it lets through is the thing that makes things.

No fake store, no hardcoded cart. Every name, price and total comes from the page you're on.

## Demo

What one run looks like on a real Holt Renfrew bag (5 items; $3,710 on Nov 25, $3,590 on Black Friday when the Tom Ford went on sale):

1. You click **Checkout**. Record scratch, the screen slams red: `CHECKOUT LOCKED`, the cart total, and your real items in a column.
2. Claude goes cheapest to most expensive. Item 1 gets a polite roast. The middle items get your excuse ("but it's Black Friday pricing", with a boing) and the answer to it. Every roast names the real item and its real price.
3. The last item is the one you fight for. Hit **NO WAIT. I NEED THIS ONE.** and Claude answers your plea before stamping it anyway.
4. **REJECTED**, card flies out, total ticks down with a cha-ching. At $0: air horn and **TOTAL SAVED**.
5. Open a cart on Amazon or Best Buy with a 3D printer in it: green **APPROVED** with a choir, and the screen shows the total saved from the earlier run.

Try to cheat and the **Buy anyway** button runs from your cursor and shrinks. Corner it and you have to type the roast of the item you wanted most, in full, with paste disabled. Finish and you get a sad trombone.

## Install (unpacked)

1. Clone this repo.
2. Open `chrome://extensions`, turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `extension/` folder.
4. Click the CART toolbar icon to open settings. Add the things you already own, pick a sound style, and preview the sounds.
5. Connect Claude, one of:
   - **Local bridge (no API key):** log in to Claude Code once (`claude`, then `/login`), then run `npm run bridge` and leave it running. The extension calls it on `127.0.0.1:8787`.
   - **API key:** paste an Anthropic API key in settings. It is stored only in this browser's local extension storage.
6. Press **Test Claude connection** in settings.

If neither is available, CART still runs with local roasts built from the same real cart data, and the debug line says so.

## How it works

```
store page (real DOM)
   │  content script: site parser → { items[name, brand, price, qty, image], total }
   │  prewarm: roasts are requested while you're still looking at the cart
   ▼
background service worker ── local bridge (claude -p, your Claude Code login)
   │                       └─ or Anthropic Messages API with your key
   │  one request per cart → JSON { intro, items[{objection, roast}], plea_rebuttal, outro, approvals }
   ▼
takeover (shadow DOM, full screen) ── Web Audio meme sound effects (synthesised + licensed clips + your own)
   │  saves the run (cart, roasts, timeline) → replayable offline
   ▼
checkout stays blocked unless an item is approved or you type your way out
```

| Folder | What's in it |
|---|---|
| `extension/src/parsers/` | One parser per site plus a generic fallback. Pure DOM reading, no network. |
| `extension/src/roast/` | Prompt builder (order, tone, owned items) and the local fallback roasts. |
| `extension/src/content/` | Checkout interception, the takeover UI, the sound engine (`sfx.js`). |
| `extension/sounds/` | Licensed clips (CC0 / CC BY 3.0, credits in `LICENSES.md`) and `trending.json`, the trending pack's clip list. |
| `scripts/` | `fetch-trending-sounds.mjs`: downloads the trending pack locally. |
| `extension/background.js` | Claude calls, optional text-to-speech, run storage. |
| `extension/options/` | Settings page and recorded runs. |
| `extension/replay/` | Plays a recorded real run full screen (offline backup). |
| `bridge/` | Local HTTP bridge to the `claude` CLI, bound to 127.0.0.1. |
| `tests/` | Parser and prompt tests against fixtures trimmed from the live cart pages. |

## Site support

| Site | Status | Notes |
|---|---|---|
| Holt Renfrew (holtrenfrew.com) | Verified live | Bag page `/en/cart`. Checkout from the mini-bag on other pages jumps to the bag first. |
| Amazon (amazon.ca, amazon.com) | Verified live on amazon.ca | Reads the active cart only, not Saved for Later. |
| Best Buy (bestbuy.ca, bestbuy.com) | Partial | Parser written against attribute patterns; not yet checked against a filled basket (see below). |
| Generic fallback | Backup | Used on the sites above if their parser finds nothing (say, after a redesign). Add a site by adding a parser and a `matches` entry in the manifest. |

Best Buy Canada blocks add-to-cart from automated browsers, so the basket parser has not been tested on a filled basket. To check it in your own Chrome: add any item, open the basket, turn on **Show debug line** in settings, reload, and look for `[CART] prewarm` with your items in the DevTools console.

## Permissions

| Permission | Why |
|---|---|
| Content scripts on holtrenfrew.com, amazon.ca/.com, bestbuy.ca/.com | To read the cart and intercept the checkout click on those sites only. |
| `storage` | Your settings, recorded runs and the last total saved, kept in this browser. |
| `tts` | Optional: reads roasts out loud with your system voices (off by default). |
| `https://api.anthropic.com/*` | Only used if you choose API-key mode. |
| `http://127.0.0.1:8787/*` | The optional local bridge on your own machine. |

No analytics, no remote code, no other hosts.

## Privacy

- What leaves your machine: the item names, prices, quantities and cart total of the cart you're checking out, your owned-items notes and your name if you set one. They go to Claude (directly or through your local bridge) to write the roasts. Nothing else on the page is sent.
- Your API key, if you use one, stays in `chrome.storage.local` in this browser. It is never written to a file in this repo.
- Recorded runs and any sound clips you upload stay in this browser until you export or remove them.

## Configuration

Everything personal lives in the settings page, not in code. You can also load a JSON file: copy `config.example.json` to `config.local.json` (gitignored), fill it in, and import it from settings.

| Setting | Default |
|---|---|
| Owned items | empty |
| Strictness | 2 (savage) |
| Sounds | meme (built in) |
| Read roasts out loud | off |
| Model | `claude-sonnet-5-5` |
| Allowed through | `3d printer` |
| Buy Anyway dodges | 6 |
| Last item | waits for your "I need this one" click |
| Take over on | clicking checkout |

## Sounds

Every beat of the takeover has a sound: checkout locks, each caption typing out (a keyboard click per key), next item, your excuse, REJECTED, the total dropping, you begging, $0, APPROVED, Buy Anyway dodging, paste blocked, you giving in. Pick a style in **Settings → Sound**:

| Style | What you get | Setup |
|---|---|---|
| **Meme, built in** (default) | Synthesised in code (vine-boom-style thud, air horn, record scratch, dun dun dunnn, sad trombone, cha-ching, choir) plus openly licensed clips (boing, slide whistle, gong, "mama mia", "perfect", "ouch"). Credits in `extension/sounds/LICENSES.md`. | None |
| **Trending** | Real meme clips from [Dank Machine](https://dankmachine.com): oh no no no laugh, huh cat, vine boom, "please Speed, I need this", anime wow, heavenly music, run (Vine), game show buzzer, womp womp womp. Cut points and levels are in `extension/sounds/trending.json`. | `npm run sounds:trending`, then reload the extension |
| **Classic** | Quiet, minimal blips. | None |
| **Off** | Silence. | None |

The trending clips are downloaded to your machine instead of being committed, because they're user uploads with no redistribution license. Any beat the script couldn't fetch falls back to the built-in sound.

You can also replace any single beat with your own clip (**Upload** next to the beat) or load a folder of files named after the beats (**Import sound pack**: `lock.mp3`, `stamp.mp3`, `plea.mp3`...). Your uploads beat whichever style is selected and stay in your browser.

## Offline backup

Every real takeover is saved with the cart it read and the roasts it got. **Settings → Recorded runs → Replay** plays it full screen with the same sounds, and **Export JSON** saves it to a file you can import on another machine. It replays a real run; it does not invent one.

## Development

```bash
npm install
npm test
npm run sounds:trending   # optional: download the trending meme pack
```

`dev/` holds the scripts used to verify against live sites; see `dev/README.md`. Captured pages, screenshots and recordings are gitignored.

## License

MIT
