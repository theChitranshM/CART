const FIELDS = Object.keys(CART.DEFAULT_CONFIG);
const $ = (id) => document.getElementById(id);

function setForm(cfg) {
  for (const k of FIELDS) {
    const el = $(k); if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!cfg[k]; else el.value = cfg[k] ?? '';
  }
}
function readForm() {
  const out = {};
  for (const k of FIELDS) {
    const el = $(k); if (!el) continue;
    const d = CART.DEFAULT_CONFIG[k];
    out[k] = el.type === 'checkbox' ? el.checked : (typeof d === 'number' ? Number(el.value) : el.value);
  }
  return out;
}
async function save(cfg) {
  await chrome.storage.local.set({ config: cfg });
  $('saved').textContent = 'Saved ' + new Date().toLocaleTimeString();
}

chrome.tts.getVoices((voices) => {
  const sel = $('voiceName');
  voices.filter((v) => !v.lang || v.lang.startsWith('en')).forEach((v) => {
    const o = document.createElement('option'); o.value = v.voiceName; o.textContent = `${v.voiceName} (${v.lang || '?'})`; sel.appendChild(o);
  });
  CART.loadConfig().then(setForm);
});

$('save').onclick = () => save(readForm());
$('testVoice').onclick = () => {
  const c = readForm();
  chrome.tts.speak('Checkout locked. Put the hoodie down.', { voiceName: c.voiceName || undefined, rate: Number(c.voiceRate) || 1 });
};
$('testClaude').onclick = async () => {
  await save(readForm());
  $('claudeStatus').textContent = 'asking Claude...';
  const cart = { site: 'test', siteName: 'Test', currency: readForm().currency || 'CAD', total: 1, items: [{ id: 0, brand: '', name: 'Connection test item', unitPrice: 1, qty: 1, lineTotal: 1 }] };
  const t0 = Date.now();
  chrome.runtime.sendMessage({ type: 'roast', cart, opts: { survivorIds: [], nocache: Date.now() } }, (r) => {
    $('claudeStatus').textContent = r && !r.error ? `OK via ${r.source} in ${((Date.now() - t0) / 1000).toFixed(1)}s: "${(r.items[0] || {}).roast}"` : 'Failed: ' + (r && r.error);
  });
};
$('importConfig').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const cfg = { ...readForm() };
    for (const k of FIELDS) if (k in data) cfg[k] = Array.isArray(data[k]) ? data[k].join(k === 'ownedItems' ? '\n' : ', ') : data[k];
    setForm(cfg); await save(cfg);
  } catch (err) { alert('Could not read that file: ' + err.message); }
};
$('exportConfig').onclick = () => {
  const c = readForm(); delete c.apiKey;
  download('cart-config.json', JSON.stringify(c, null, 2));
};

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; a.click();
}

async function renderRuns() {
  const { runs = [], lastSaved } = await chrome.storage.local.get(['runs', 'lastSaved']);
  $('lastSaved').textContent = lastSaved ? `Last total saved: ${CART.money.formatMoney(lastSaved.amount, lastSaved.currency)} at ${lastSaved.site} (${new Date(lastSaved.at).toLocaleString()}). This is what the survivor screen shows.` : 'No saved total yet. Run a takeover on a real cart first.';
  const ul = $('runs'); ul.innerHTML = '';
  runs.forEach((r, i) => {
    const li = document.createElement('li');
    const fmt = (n) => CART.money.formatMoney(n, r.cart.currency);
    li.innerHTML = `<span><b>${r.kind}</b> on ${r.cart.siteName}, ${r.cart.items.length} items, ${fmt(r.cart.total)}, ${new Date(r.finishedAt).toLocaleString()}, roasts: ${r.roast && r.roast.source}</span>`;
    const play = document.createElement('button'); play.textContent = 'Replay';
    play.onclick = () => chrome.tabs ? chrome.tabs.create({ url: chrome.runtime.getURL('replay/replay.html?run=' + i) }) : open('../replay/replay.html?run=' + i);
    const exp = document.createElement('button'); exp.textContent = 'Export JSON';
    exp.onclick = () => download(`cart-run-${r.cart.site}-${r.finishedAt.slice(0, 19).replace(/:/g, '')}.json`, JSON.stringify(r, null, 2));
    li.append(play, exp); ul.appendChild(li);
  });
}
$('importRun').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const run = JSON.parse(await f.text());
  const { runs = [] } = await chrome.storage.local.get('runs');
  runs.unshift(run); await chrome.storage.local.set({ runs: runs.slice(0, 20) }); renderRuns();
};
renderRuns();

// ---------- sound previews + custom uploads ----------
async function renderBeats() {
  const { customSounds = {} } = await chrome.storage.local.get('customSounds');
  const ul = $('beats'); ul.innerHTML = '';
  for (const beat of CART.sfx.BEATS) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="name">${CART.sfx.BEAT_LABELS[beat]}</span><span class="tag">${customSounds[beat] ? 'your clip' : 'built-in'}</span>`;
    const play = document.createElement('button'); play.type = 'button'; play.textContent = 'Play';
    play.onclick = () => { CART.sfx.configure({ ...readForm() }); CART.sfx.unlock(); setTimeout(() => CART.sfx.play(beat), 60); };
    const up = document.createElement('button'); up.type = 'button'; up.textContent = customSounds[beat] ? 'Replace' : 'Upload';
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'audio/*';
    up.onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 1024 * 1024) { alert('Keep clips under 1 MB.'); return; }
      const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
      const cur = (await chrome.storage.local.get('customSounds')).customSounds || {};
      cur[beat] = dataUrl; await chrome.storage.local.set({ customSounds: cur }); renderBeats();
async function renderTrendingStatus() {
  const st = await CART.sfx.trendingStatus();
  const have = Object.values(st).filter(Boolean).length, total = Object.keys(st).length;
  $('trendingStatus').textContent = have === total ? `Trending pack: all ${total} clips downloaded.`
    : `Trending pack: ${have}/${total} clips downloaded. Run "npm run sounds:trending" in the repo, then reload CART. Missing beats use the built-in meme sounds.`;
}
renderTrendingStatus();
$('sounds').addEventListener('change', () => { CART.sfx.configure(readForm()); });
    };
    li.append(play, up, file);
    if (customSounds[beat]) {
      const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'Use built-in';
      rm.onclick = async () => { const cur = (await chrome.storage.local.get('customSounds')).customSounds || {}; delete cur[beat]; await chrome.storage.local.set({ customSounds: cur }); renderBeats(); };
      li.append(rm);
    }
    ul.appendChild(li);
  }
}
CART.loadConfig().then((c) => CART.sfx.configure(c));
renderBeats();

$('importPack').onchange = async (e) => {
  const cur = (await chrome.storage.local.get('customSounds')).customSounds || {};
  const used = [], skipped = [];
  for (const f of e.target.files) {
    const beat = f.name.replace(/\.[^.]+$/, '').toLowerCase();
    if (!CART.sfx.BEATS.includes(beat) || f.size > 1024 * 1024) { skipped.push(f.name); continue; }
    cur[beat] = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
    used.push(beat);
  }
  await chrome.storage.local.set({ customSounds: cur });
  $('packStatus').textContent = `Loaded ${used.length}: ${used.join(', ')}${skipped.length ? `. Skipped: ${skipped.join(', ')}` : ''}`;
  renderBeats();
};
$('clearPack').onclick = async () => { await chrome.storage.local.set({ customSounds: {} }); $('packStatus').textContent = 'Back to built-in sounds.'; renderBeats(); };
