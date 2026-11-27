// Emergency playback: replays a recorded real run (same cart, same roasts) full-screen with voice.
(async () => {
  const idx = Number(new URLSearchParams(location.search).get('run') || 0);
  const { runs = [] } = await chrome.storage.local.get('runs');
  const run = runs[idx];
  const info = document.getElementById('info');
  if (!run) { info.textContent = 'No recorded run found. Do one live takeover first.'; return; }
  info.textContent = `${run.kind} run on ${run.cart.siteName}, ${run.cart.items.length} items, recorded ${new Date(run.finishedAt).toLocaleString()}. Press F11 / full screen for filming.`;
  const cfg = await CART.loadConfig();
  const css = await (await fetch('../src/content/takeover.css')).text();
  document.getElementById('go').onclick = () => {
    document.getElementById('start').remove();
    CART.sfx.configure(cfg);
    CART.sfx.unlock();
    const speak = (text) => new Promise((res) => {
      if (!cfg.voiceEnabled || !text) return res();
      chrome.tts.speak(text, { voiceName: cfg.voiceName || undefined, rate: Number(cfg.voiceRate) || 1, onEvent: (e) => { if (['end', 'interrupted', 'cancelled', 'error'].includes(e.type)) res(); } });
    });
    new CART.Takeover({
      cart: run.cart, cfg: { ...cfg, showDebug: false }, cssText: css, roastPromise: Promise.resolve(run.roast),
      survivorIds: run.survivorIds || [], lastSaved: run.lastSaved, replay: true,
      speak, stopSpeak: () => chrome.tts.stop(), onUnlock: () => location.reload(), onClose: () => location.reload(),
    }).run();
  };
})();
