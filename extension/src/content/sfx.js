// CART sound engine. Each takeover beat plays a small stack of layers:
//   s:name  -> synthesised in code below (no audio file)
//   f:name  -> openly licensed clip in extension/sounds/pack (credits in sounds/LICENSES.md)
// Any beat can be replaced by the user's own clip (settings -> Custom sounds), stored only in this browser.
(function (root) {
  const CART = root.CART || (root.CART = {});

  // ---------- synth building blocks (all take an AudioContext, a destination and a start time) ----------
  function env(a, g, t, attack, peak, decay, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(end, t + attack + decay);
  }
  function osc(a, dest, t, { type = 'sine', f = 440, to = null, dur = 0.3, vol = 0.3, attack = 0.005, detune = 0 }) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(a, g, t, attack, vol, dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + attack + dur + 0.05);
    return o;
  }
  function noise(a, dest, t, { dur = 0.3, vol = 0.4, type = 'lowpass', f = 1200, q = 1, sweep = null }) {
    const n = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; g.gain.value = vol;
    if (sweep) sweep.forEach(([hz, at]) => fl.frequency.linearRampToValueAtTime(hz, t + at));
    s.connect(fl).connect(g).connect(dest); s.start(t);
  }
  function drive(a, amount) {
    const ws = a.createWaveShaper(), n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
    ws.curve = c; return ws;
  }
  function brass(a, dest, t, f, dur, vol, vib = 0) {
    const fl = a.createBiquadFilter(), g = a.createGain();
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(2200, t + 0.06); fl.frequency.linearRampToValueAtTime(1100, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + dur - 0.06); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    fl.connect(g).connect(dest);
    [-8, 0, 8].forEach((dt) => {
      const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
      if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur); }
      o.connect(fl); o.start(t); o.stop(t + dur + 0.02);
    });
  }

  const SYNTH = {
    // Deep "vine boom" style thud with a pitch drop and a little grit.
    vineBoom(a, d, t) {
      const g = a.createGain(); g.gain.value = 1; const dr = drive(a, 6); dr.connect(g).connect(d);
      osc(a, dr, t, { f: 120, to: 38, dur: 1.1, vol: 0.9, attack: 0.004 });
      osc(a, dr, t, { type: 'triangle', f: 240, to: 60, dur: 0.35, vol: 0.35 });
      noise(a, d, t, { dur: 0.06, vol: 0.5, f: 3000 });
    },
    // Three-blast air horn: stacked detuned saws, distorted, band-limited.
    airhorn(a, d, t) {
      const bp = a.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 1800; bp.gain.value = 8;
      const dr = drive(a, 3), g = a.createGain(); g.gain.value = 0.5; dr.connect(bp).connect(g).connect(d);
      [[0, 0.13], [0.17, 0.13], [0.34, 0.7]].forEach(([s, len]) => {
        [415, 523, 622, 830].forEach((f, i) => {
          const o = a.createOscillator(), og = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t + s); o.frequency.linearRampToValueAtTime(f, t + s + 0.04); o.detune.value = (i - 1.5) * 9;
          og.gain.setValueAtTime(0.0001, t + s); og.gain.linearRampToValueAtTime(0.22, t + s + 0.015); og.gain.setValueAtTime(0.22, t + s + len - 0.03); og.gain.linearRampToValueAtTime(0.0001, t + s + len);
          o.connect(og).connect(dr); o.start(t + s); o.stop(t + s + len + 0.02);
        });
      });
    },
    // Vinyl record scratch: swept band-passed noise plus a squealing saw.
    recordScratch(a, d, t) {
      noise(a, d, t, { dur: 0.38, vol: 0.9, type: 'bandpass', f: 400, q: 4, sweep: [[2600, 0.12], [500, 0.22], [1800, 0.32]] });
      osc(a, d, t, { type: 'sawtooth', f: 300, to: 900, dur: 0.12, vol: 0.12 });
      osc(a, d, t + 0.13, { type: 'sawtooth', f: 900, to: 220, dur: 0.2, vol: 0.12 });
    },
    // "Dun dun dunnn" dramatic brass sting.
    dunDunDun(a, d, t) {
      brass(a, d, t, 196, 0.22, 0.22); brass(a, d, t + 0.28, 185, 0.22, 0.22); brass(a, d, t + 0.56, 139, 1.2, 0.26, 4);
      osc(a, d, t + 0.56, { f: 70, to: 55, dur: 1.2, vol: 0.3 });
    },
    // "Wah wah wah wahhh" sad trombone.
    sadTrombone(a, d, t) {
      [[233, 0, 0.42], [220, 0.45, 0.42], [208, 0.9, 0.42], [196, 1.35, 1.2]].forEach(([f, s, len], i) => brass(a, d, t + s, f, len, 0.22, i === 3 ? 7 : 2));
    },
    // Cash register: drawer "cha" then a bright "ching".
    chaChing(a, d, t) {
      noise(a, d, t, { dur: 0.09, vol: 0.6, type: 'highpass', f: 2500 });
      [2093, 2637, 3322, 4186].forEach((f, i) => osc(a, d, t + 0.11, { type: 'sine', f, dur: 0.9 - i * 0.12, vol: 0.12 }));
      osc(a, d, t + 0.11, { type: 'triangle', f: 1568, dur: 0.6, vol: 0.12 });
    },
    // Angelic "aaah" chord for APPROVED.
    choir(a, d, t) {
      const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), g = a.createGain();
      f1.type = 'bandpass'; f1.frequency.value = 800; f1.Q.value = 3; f2.type = 'bandpass'; f2.frequency.value = 1200; f2.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.35); g.gain.setValueAtTime(0.9, t + 1.4); g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
      f1.connect(g); f2.connect(g); g.connect(d);
      [261.6, 329.6, 392, 523.3].forEach((f) => [-12, 0, 12].forEach((dt) => {
        const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
        const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 4.8 + Math.random(); lg.gain.value = 3; l.connect(lg).connect(o.frequency);
        const og = a.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(f1); og.connect(f2);
        o.start(t); l.start(t); o.stop(t + 2.2); l.stop(t + 2.2);
      }));
    },
    buzzer(a, d, t) { osc(a, d, t, { type: 'square', f: 110, dur: 0.45, vol: 0.18 }); osc(a, d, t, { type: 'square', f: 116, dur: 0.45, vol: 0.14 }); },
    whoosh(a, d, t) { noise(a, d, t, { dur: 0.3, vol: 0.45, type: 'bandpass', f: 600, q: 1.5, sweep: [[3500, 0.15], [900, 0.3]] }); },
    tick(a, d, t) { osc(a, d, t, { type: 'square', f: 1400, dur: 0.03, vol: 0.09 }); },
    // Classic set (the original CART sounds).
    slam(a, d, t) { osc(a, d, t, { type: 'sawtooth', f: 90, to: 40, dur: 0.5, vol: 0.35 }); noise(a, d, t, { dur: 0.35, vol: 0.5, f: 600 }); osc(a, d, t + 0.05, { type: 'square', f: 880, dur: 0.12, vol: 0.12 }); },
    stamp(a, d, t) { osc(a, d, t, { f: 60, to: 35, dur: 0.35, vol: 0.6 }); noise(a, d, t, { dur: 0.18, vol: 0.7, f: 2500 }); },
    zero(a, d, t) { [523, 659, 784, 1046].forEach((f, i) => osc(a, d, t + i * 0.08, { type: 'triangle', f, dur: 0.25, vol: 0.2 })); },
    approve(a, d, t) { [392, 523, 659, 784].forEach((f, i) => osc(a, d, t + i * 0.1, { f, dur: 0.4, vol: 0.25 })); osc(a, d, t + 0.4, { type: 'triangle', f: 1568, dur: 0.6, vol: 0.08 }); },
  };

  // ---------- beat -> layers ----------
  // Real keystrokes from a Rainy 75 keyboard recording (CC0), picked at random per key.
  const KEY = 'r:keys/key1|keys/key2|keys/key3|keys/key4|keys/key5|keys/key6|keys/key7|keys/key8|keys/key9|keys/key10~0.42', SPACE = 'r:keys/space1|keys/space2~0.5';

  const STYLES = {
    meme: {
      lock: ['s:recordScratch', 's:dunDunDun@0.3'],
      type: [KEY],
      typeSpace: [SPACE],
      next: ['s:whoosh'],
      objection: ['f:boing'],
      stamp: ['s:vineBoom', 'f:slam'],
      tick: ['s:tick'],
      ticked: ['s:chaChing'],
      plea: ['f:mama-mia'],
      zero: ['s:airhorn', 'f:gong@0.05'],
      approved: ['s:choir', 'f:perfect@0.25'],
      dodge: ['f:slide-whistle'],
      nope: ['s:buzzer', 'f:ouch@0.05'],
      unlocked: ['s:sadTrombone'],
    },
    classic: {
      lock: ['s:slam'], type: [KEY], typeSpace: [SPACE], next: ['s:whoosh'], stamp: ['s:stamp'], tick: ['s:tick'], zero: ['s:zero'],
      approved: ['s:approve'], dodge: ['s:whoosh'], nope: ['s:buzzer'], unlocked: ['s:zero'],
    },
    off: {},
    // Trending: clips listed in sounds/trending.json, downloaded locally by `npm run sounds:trending`.
    // Beats without a downloaded clip (and the typing/tick/whoosh beats) use the meme set.
    trending: null,
  };
  const BEATS = ['lock', 'type', 'next', 'objection', 'stamp', 'tick', 'ticked', 'plea', 'zero', 'approved', 'dodge', 'nope', 'unlocked'];
  const BEAT_LABELS = {
    lock: 'Checkout locks', type: 'Caption typing (per key)', next: 'Next item slides in', objection: 'Your excuse pops up', stamp: 'REJECTED stamp',
    tick: 'Total ticking down (per tick)', ticked: 'Item price gone from total', plea: 'You beg for the last item', zero: 'Cart hits $0',
    approved: 'APPROVED stamp', dodge: 'Buy Anyway dodges', nope: 'Paste blocked', unlocked: 'You typed your way out',
  };

  const urlFor = (p) => (root.chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(p) : '../' + p);
  let ctx = null, master = null, style = 'meme', volume = 0.8, custom = {}, debug = false;
  const buffers = new Map();

  function ac() {
    if (!ctx) {
      ctx = new (root.AudioContext || root.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = volume; master.connect(comp).connect(ctx.destination);
    }
    return ctx;
  }

  async function loadBuffer(a, key, src) {
    const id = key + '|' + a.sampleRate;
    if (buffers.has(id)) return buffers.get(id);
    const p = fetch(src).then((r) => r.arrayBuffer()).then((ab) => a.decodeAudioData(ab)).catch(() => null);
    buffers.set(id, p);
    return p;
  }

  let trending = null; // { beat: { start, duration, gainDb } } once sounds/trending.json is loaded
  function loadTrendingList() {
    if (trending) return Promise.resolve(trending);
    return fetch(urlFor('sounds/trending.json')).then((r) => r.json()).then((j) => (trending = j.clips || {})).catch(() => (trending = {}));
  }
  function playClip(a, dest, b, t, clip) {
    const s = a.createBufferSource(), g = a.createGain();
    s.buffer = b; g.gain.value = Math.pow(10, ((clip && clip.gainDb) || 0) / 20);
    const start = (clip && clip.start) || 0, dur = (clip && clip.duration) || b.duration - start;
    g.gain.setValueAtTime(g.gain.value, t + Math.max(0, dur - 0.2));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(g).connect(dest); s.start(t, start, dur);
    return s;
  }

  const playing = {}; // beat -> last custom clip source, so rapid repeats (dodges) cut off instead of piling up

  // Schedule one beat into any AudioContext (live or offline). Returns a promise once file layers are queued.
  async function schedule(beat, a, dest, when) {
    if (custom[beat]) {
      const b = await loadBuffer(a, 'custom:' + beat + ':' + custom[beat].length, custom[beat]);
      if (b) {
        if (a === ctx && playing[beat]) { try { playing[beat].stop(); } catch (e) {} }
        const s = a.createBufferSource(); s.buffer = b; s.connect(dest); s.start(Math.max(when, a.currentTime));
        if (a === ctx) playing[beat] = s;
      }
      return;
    }
    if (style === 'trending' && !/^(type|typeSpace|tick)$/.test(beat)) {
      const list = await loadTrendingList();
      if (list[beat]) {
        const b = await loadBuffer(a, 'trending:' + beat, urlFor('sounds/trending/' + beat + '.mp3'));
        if (b) {
          if (a === ctx && playing[beat]) { try { playing[beat].stop(); } catch (e) {} }
          const src = playClip(a, dest, b, Math.max(when, a.currentTime), list[beat]);
          if (a === ctx) playing[beat] = src;
          return;
        }
      }
    }
    const layers = (STYLES[style] || STYLES.meme)[beat] || [];
    await Promise.all(layers.map(async (spec) => {
      // spec: kind:name[@offsetSeconds][~gain]   kind = s (synth) | f (clip) | r (random clip from name1|name2|...)
      const [kind, restRaw] = spec.split(':');
      const [rest, gainStr] = restRaw.split('~');
      const [nameRaw, off] = rest.split('@');
      const t = when + (Number(off) || 0);
      if (kind === 's' && SYNTH[nameRaw]) SYNTH[nameRaw](a, dest, Math.max(t, a.currentTime));
      if (kind === 'f' || kind === 'r') {
        const opts = nameRaw.split('|');
        const name = kind === 'r' ? opts[Math.floor(Math.random() * opts.length)] : nameRaw;
        const b = await loadBuffer(a, name, urlFor('sounds/' + (name.includes('/') ? name : 'pack/' + name) + '.ogg'));
        if (b) {
          const src = a.createBufferSource(), g = a.createGain();
          src.buffer = b; g.gain.value = gainStr ? Number(gainStr) : 1;
          if (kind === 'r') { src.playbackRate.value = 0.96 + Math.random() * 0.08; g.gain.value *= 0.85 + Math.random() * 0.3; }
          src.connect(g).connect(dest); src.start(Math.max(t, a.currentTime));
        }
      }
    }));
  }

  CART.sfx = {
    BEATS, BEAT_LABELS, STYLES,
    configure(cfg) {
      style = cfg.sounds || 'meme';
      volume = cfg.volume == null ? 0.8 : Number(cfg.volume);
      debug = !!cfg.showDebug;
      if (master) master.gain.value = volume;
      try { chrome.storage.local.get('customSounds', (r) => { custom = (r && r.customSounds) || {}; }); } catch (e) {}
    },
    unlock() {
      try {
        const a = ac(); a.resume();
        // Warm the clip cache so the first stamp lands on time.
        Object.values(STYLES[style] || STYLES.meme).flat().filter((s) => /^[fr]:/.test(s))
          .flatMap((s) => s.slice(2).split('~')[0].split('@')[0].split('|'))
          .forEach((n) => loadBuffer(a, n, urlFor('sounds/' + (n.includes('/') ? n : 'pack/' + n) + '.ogg')));
      } catch (e) {}
    },
    play(beat) {
      if (style === 'off' && !custom[beat]) return;
      try {
        const a = ac();
        schedule(beat, a, master, a.currentTime + 0.01).then(() => { if (debug && !/^(tick|type|typeSpace)$/.test(beat)) console.log('[CART] sound', beat, custom[beat] ? 'custom clip' : style, a.state); });
      } catch (e) { if (debug) console.warn('[CART] sound failed', beat, e); }
    },
    schedule, // used by the offline preview renderer
    setStyle(s) { style = s; },
    setCustom(c) { custom = c || {}; },
    // Which trending clips are actually downloaded (for the settings page).
    async trendingStatus() {
      const list = await loadTrendingList();
      const out = {};
      for (const beat of Object.keys(list)) out[beat] = await fetch(urlFor('sounds/trending/' + beat + '.mp3')).then((r) => r.ok).catch(() => false);
      return out;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
