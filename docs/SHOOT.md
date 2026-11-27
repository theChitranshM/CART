# Filming CART

Run sheet for the Wed Nov 25 film block. The extension does the same thing every take, so you can shoot as many as you want.

## Before the camera rolls (15 min)

1. Load the extension in the Chrome you'll film (`chrome://extensions` → Developer mode → Load unpacked → `extension/`).
2. Settings (toolbar icon): owned items, strictness. Sound: pick **Trending** (already downloaded on this Mac with `npm run sounds:trending`) or **Meme, built in**, then hit **Play** on a few beats. Press **Test Claude connection**.
3. Start Claude: `npm run bridge` in a terminal (needs a one-time `claude` → `/login`), or paste an API key.
4. Load the real Holt Renfrew bag: hoodie, sneakers, jacket, fragrance, sunglasses/accessory. Open `holtrenfrew.com/en/cart`.
5. Load the real 3D printer in an Amazon.ca (or Best Buy) cart in another tab.
6. Do one full dry run (Holt to $0, then the printer). That run is now saved under **Recorded runs** as your offline backup. Hit **Export JSON** too.
7. Turn **Show debug line** off for clean frames. Browser zoom 100%, bookmarks bar hidden, full screen (ctrl+cmd+F).

## Reset between takes

- Holt: close the takeover and reload the bag page. The cart is untouched, so the next click on CHECKOUT runs it again.
- Roasts are cached per cart for the browser session, so retakes say the same lines. For fresh lines, change strictness and back, or restart the browser.
- The survivor screen always shows the last Holt total saved.

## Video 1 and 2 (Wed tentpole, two hooks, same middle)

- **Hook A:** to camera, the opening line. Cut to the screen.
- **Hook B:** at the laptop, same line, click **CHECKOUT** on "...so I built this". The takeover slams in on the click.
- **Middle:** screen record full runs (x3), plus one clean pass per item for the editor. On the jacket (last item), click **NO WAIT. I NEED THIS ONE.**
- **Survivor:** switch tab to the Amazon cart, click **Proceed to checkout**: green APPROVED, TOTAL SAVED = the Holt total.
- **Closer:** read the real total off the $0 screen for the line.

## Video 3 (cheat sequel)

Mouse toward **Buy anyway**: it runs and shrinks (6 dodges by default, set in settings). Once it stops, click it and type the roast. Pasting is blocked. Hit "I give up (good)" to back out, or finish typing to unlock checkout for 60 seconds.

## Video 4 (build walkthrough)

Repo tour order: `README.md` → `extension/src/parsers/holt.js` (reading the real cart) → `extension/src/roast/prompt.js` (escalation and tone) → `extension/src/content/takeover.js` (stamp, tick-down, dodge, type gate) → `extension/src/content/sfx.js` (the sound engine) → `npm test`.

## If something breaks on camera

- No sound: check the Mac isn't muted and the tab isn't muted, then settings → Play on any beat. The beats still run at reading pace without sound.
- Claude slow or down: the takeover waits while showing the real items being read, then falls back to local roasts. Debug line says which.
- Store page changed: open **Recorded runs → Replay** for the saved real run.
