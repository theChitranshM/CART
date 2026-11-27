// Service worker: talks to Claude (local bridge or API key), speaks with chrome.tts, stores runs.
importScripts('src/lib/money.js', 'src/lib/config.js', 'src/roast/prompt.js');

const API_URL = 'https://api.anthropic.com/v1/messages';

async function getConfig() {
  const r = await chrome.storage.local.get('config');
  return { ...CART.DEFAULT_CONFIG, ...(r.config || {}) };
}

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

async function bridgeAlive(cfg) {
  const t = withTimeout(1200);
  try { const r = await fetch(cfg.bridgeUrl + '/health', { signal: t.signal }); return r.ok; }
  catch (e) { return false; } finally { t.done(); }
}

async function callBridge(cfg, prompt) {
  const t = withTimeout(90000);
  try {
    const r = await fetch(cfg.bridgeUrl + '/roast', {
      method: 'POST', signal: t.signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system: prompt.system, user: prompt.user, model: cfg.model }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'bridge HTTP ' + r.status);
    return j.text;
  } finally { t.done(); }
}

// Raw HTTP on purpose: this is an unbundled MV3 extension, so the npm SDK isn't importable without a build step.
async function callApi(cfg, prompt) {
  const t = withTimeout(60000);
  try {
    const r = await fetch(API_URL, {
      method: 'POST', signal: t.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.model, max_tokens: 4000,
        output_config: { effort: cfg.effort || 'low' },
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || 'API HTTP ' + r.status);
    if (j.stop_reason === 'refusal') throw new Error('refusal');
    return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  } finally { t.done(); }
}

async function roast(cart, opts) {
  const cfg = await getConfig();
  const key = 'roast:' + JSON.stringify([cart.site, cart.items.map((i) => [i.name, i.lineTotal]), opts, cfg.strictness, cfg.ownedItems, cfg.model]);
  const cached = (await chrome.storage.session.get(key))[key];
  if (cached) return { ...cached, cached: true };

  const prompt = CART.buildPrompt(cart, cfg, opts || {});
  const order = cfg.provider === 'auto' ? ['bridge', 'api'] : [cfg.provider];
  const errors = [];
  for (const p of order) {
    try {
      let text;
      if (p === 'bridge') {
        if (!(await bridgeAlive(cfg))) throw new Error('bridge not running');
        text = await callBridge(cfg, prompt);
      } else if (p === 'api') {
        if (!cfg.apiKey) throw new Error('no API key set');
        text = await callApi(cfg, prompt);
      } else continue;
      const out = { ...CART.parseRoastJson(text), source: 'claude-' + p, model: cfg.model };
      await chrome.storage.session.set({ [key]: out });
      return out;
    } catch (e) { errors.push(p + ': ' + e.message); }
  }
  return { error: errors.join(' | ') || 'offline mode', source: 'local' };
}

function speak(text, cfg) {
  return new Promise((resolve) => {
    if (!cfg.voiceEnabled || !text) return resolve('skipped');
    const opts = {
      rate: Number(cfg.voiceRate) || 1, enqueue: false,
      onEvent: (e) => { if (['end', 'interrupted', 'cancelled', 'error'].includes(e.type)) resolve(e.type); },
    };
    if (cfg.voiceName) opts.voiceName = cfg.voiceName;
    chrome.tts.speak(text, opts);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'roast') return roast(msg.cart, msg.opts);
    if (msg.type === 'speak') return speak(msg.text, await getConfig());
    if (msg.type === 'stopSpeak') { chrome.tts.stop(); return true; }
    if (msg.type === 'getConfig') return getConfig();
    if (msg.type === 'saveRun') {
      const { runs = [] } = await chrome.storage.local.get('runs');
      runs.unshift(msg.run);
      const update = { runs: runs.slice(0, 20) };
      if (msg.run.kind === 'rejected' && msg.run.saved > 0) update.lastSaved = { amount: msg.run.saved, currency: msg.run.cart.currency, site: msg.run.cart.siteName, at: msg.run.finishedAt };
      await chrome.storage.local.set(update);
      return true;
    }
    if (msg.type === 'getLastSaved') return (await chrome.storage.local.get('lastSaved')).lastSaved || null;
    if (msg.type === 'openOptions') { chrome.runtime.openOptionsPage(); return true; }
    return null;
  })().then(sendResponse, (e) => sendResponse({ error: String(e) }));
  return true;
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
