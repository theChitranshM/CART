// Defaults for user config. Everything personal is set in the options page (chrome.storage.local),
// never in code. These defaults are deliberately neutral.
(function (root) {
  const CART = root.CART || (root.CART = {});
  CART.DEFAULT_CONFIG = {
    yourName: '',
    currency: 'CAD',
    ownedItems: '',            // one per line, e.g. "2 black hoodies"
    sounds: 'meme',            // meme | classic | off
    volume: 0.8,
    voiceEnabled: false,       // optional: read roasts out loud with system TTS
    voiceName: '',             // '' = system default
    voiceRate: 1.05,
    strictness: 2,             // 1 gentle, 2 savage, 3 unhinged
    provider: 'auto',          // auto | bridge | api | offline
    bridgeUrl: 'http://127.0.0.1:8787',
    apiKey: '',                // stored only in this browser's local extension storage
    model: 'claude-sonnet-5-5',
    effort: 'low',
    trigger: 'checkout',       // checkout | cart-load
    survivorKeywords: '3d printer',
    buyAnywayDodges: 6,
    fightMode: 'button',       // button | auto
    showDebug: false,
  };
  CART.loadConfig = function () {
    return new Promise((resolve) => {
      if (!root.chrome || !chrome.storage) return resolve({ ...CART.DEFAULT_CONFIG });
      chrome.storage.local.get('config', (r) => resolve({ ...CART.DEFAULT_CONFIG, ...(r && r.config) }));
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
