// The full-screen takeover. Pure UI + sequencing; the page integration lives in main.js and replay.js.
// Everything it shows comes from the cart that was read off the live page and the roasts Claude returned.
(function (root) {
  const CART = root.CART || (root.CART = {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DODGE_LABELS = ['Buy anyway', 'nope', 'too slow', 'really?', 'stop it', 'okay fine', 'last chance'];

  class Takeover {
    constructor(opts) {
      this.o = opts; // { cart, cfg, roastPromise, survivorIds, lastSaved, speak, stopSpeak, saveRun, cssText, onUnlock, onClose, replay }
      this.cfg = opts.cfg;
      this.cart = opts.cart;
      this.fmt = (n) => CART.money.formatMoney(n, this.cart.currency);
      this.dodgesLeft = Number(this.cfg.buyAnywayDodges) || 0;
      this.timeline = [];
      this.aborted = false;
    }

    mark(beat, extra) { this.timeline.push({ t: Math.round(performance.now() - this.t0), beat, ...extra }); }

    mount() {
      this.host = document.createElement('div');
      this.host.id = 'cart-takeover-host';
      this.host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
      const sr = this.host.attachShadow({ mode: 'open' });
      sr.innerHTML = `<style>${this.o.cssText || ''}</style>
        <div class="root slam">
          <div class="flash"></div>
          <header class="bar">
            <span class="logo">CART</span>
            <span class="lock"><span class="dot"></span>CHECKOUT LOCKED</span>
            <span class="site">${esc(this.cart.siteName)}</span>
          </header>
          <main class="col">
            <div class="total-wrap"><div class="label">CART TOTAL</div><div class="total">${esc(this.fmt(this.cart.total))}</div></div>
            <div class="status">READING YOUR CART</div>
            <div class="stage"></div>
            <div class="caption"><div class="objection"></div><div class="roast"></div></div>
            <div class="actions"></div>
          </main>
          <div class="queue"></div>
          <button class="buy-anyway" type="button">Buy anyway</button>
          <div class="final hidden"></div>
          <div class="typegate hidden"></div>
          <footer class="debug ${this.cfg.showDebug ? '' : 'hidden'}"></footer>
        </div>`;
      this.sr = sr;
      this.$ = (s) => sr.querySelector(s);
      document.documentElement.appendChild(this.host);
      this.prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      this.keyBlock = (e) => { if (!this.$('.typegate.hidden') && e.composedPath().includes(this.host)) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } };
      root.addEventListener('keydown', this.keyBlock, true);
      this.wireBuyAnyway();
    }

    unmount() {
      this.aborted = true;
      try { this.o.stopSpeak && this.o.stopSpeak(); } catch (e) {}
      root.removeEventListener('keydown', this.keyBlock, true);
      document.documentElement.style.overflow = this.prevOverflow || '';
      this.host && this.host.remove();
    }

    // ---------- helpers ----------
    async say(text, minMs) {
      const start = performance.now();
      const speech = this.o.speak ? this.o.speak(text).catch(() => null) : Promise.resolve();
      const read = Math.max(minMs || 0, 600 + (text || '').split(/\s+/).length * 170); // reading pace when voice is off
      const res = this.cfg.voiceEnabled ? await speech : 'off';
      // If the voice was off or failed, hold the beat for a reading pace instead of skipping it.
      if (res !== 'end') { const left = read - (performance.now() - start); if (left > 0) await sleep(left); }
      const elapsed = performance.now() - start;
      if (elapsed < (minMs || 0)) await sleep(minMs - elapsed);
    }

    // Types the caption one character at a time with a keyboard click per key (beat "type").
    async typewrite(el, text) {
      el.textContent = '';
      el.classList.add('on');
      const chars = [...(text || '')];
      const perChar = Math.max(11, Math.min(22, 2640 / Math.max(1, chars.length))); // long roasts type faster
      // Text appears fast, but key sounds keep a human typing pace (~9 keys/s), so it doesn't sound like a machine gun.
      let nextKeyAt = 0;
      for (let i = 0; i < chars.length && !this.aborted; i++) {
        el.textContent += chars[i];
        const now = performance.now();
        if (CART.sfx && now >= nextKeyAt) {
          CART.sfx.play(chars[i] === ' ' ? 'typeSpace' : 'type');
          nextKeyAt = now + 85 + Math.random() * 35;
        }
        await sleep(perChar + (chars[i] === ' ' ? 12 : Math.random() * 10));
      }
    }

    cardHtml(item, idx, n) {
      return `<div class="card enter">
          <div class="count">ITEM ${idx + 1} / ${n}</div>
          ${item.image ? `<div class="img"><img src="${esc(item.image)}" alt=""></div>` : '<div class="img none"></div>'}
          ${item.brand ? `<div class="brand">${esc(item.brand)}</div>` : ''}
          <div class="name">${esc(item.name)}</div>
          <div class="price">${esc(this.fmt(item.lineTotal))}${item.qty > 1 ? ` <span class="qty">x${item.qty}</span>` : ''}</div>
          <div class="stamp"></div>
        </div>`;
    }

    renderQueue(order, doneIds) {
      this.$('.queue').innerHTML = order.map((it) => `<div class="q ${doneIds.has(it.id) ? 'gone' : ''}" data-id="${it.id}">
        ${it.image ? `<img src="${esc(it.image)}" alt="">` : ''}<span>${esc(this.fmt(it.lineTotal))}</span></div>`).join('');
    }

    async tickTotal(from, to, ms) {
      const el = this.$('.total');
      const steps = Math.max(8, Math.min(40, Math.round(ms / 35)));
      el.classList.add('ticking');
      for (let i = 1; i <= steps && !this.aborted; i++) {
        const v = from + (to - from) * (i / steps);
        el.textContent = this.fmt(i === steps ? to : Math.round(v));
        CART.sfx && CART.sfx.play('tick');
        await sleep(ms / steps);
      }
      el.classList.remove('ticking');
      this.current = to;
    }

    // ---------- Buy Anyway: dodges, shrinks, then demands the roast typed out in full ----------
    wireBuyAnyway() {
      const b = this.$('.buy-anyway');
      let scale = 1, n = 0;
      const dodge = () => {
        if (this.dodgesLeft <= 0) return false;
        this.dodgesLeft--; n++;
        scale = Math.max(0.42, scale * 0.85);
        const W = root.innerWidth, H = root.innerHeight;
        const x = Math.random() < 0.5 ? 20 + Math.random() * (W * 0.22) : W * 0.72 + Math.random() * (W * 0.22);
        const y = 90 + Math.random() * (H - 200);
        b.style.left = Math.round(Math.min(x, W - 160)) + 'px';
        b.style.top = Math.round(y) + 'px';
        b.style.right = 'auto'; b.style.bottom = 'auto';
        b.style.transform = `scale(${scale.toFixed(2)})`;
        b.textContent = DODGE_LABELS[Math.min(n, DODGE_LABELS.length - 1)];
        CART.sfx && CART.sfx.play('dodge');
        this.mark('buyAnywayDodge', { left: this.dodgesLeft });
        return true;
      };
      b.addEventListener('pointerenter', dodge);
      b.addEventListener('pointerdown', (e) => { if (dodge()) { e.preventDefault(); e.stopPropagation(); } });
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.dodgesLeft > 0) { dodge(); return; }
        this.openTypeGate();
      });
    }

    gateText() {
      // The roast for the item they wanted most (most expensive), typed out in full, no pasting.
      const r = this.roast;
      if (!r) return 'I am choosing to spend this money even though I know better.';
      const sorted = [...this.cart.items].sort((a, b) => b.lineTotal - a.lineTotal);
      for (const it of sorted) {
        const hit = r.items.find((x) => x.id === it.id);
        if (hit && hit.roast) return hit.roast;
      }
      return r.outro || 'I am choosing to spend this money even though I know better.';
    }

    openTypeGate() {
      const target = this.gateText();
      const g = this.$('.typegate');
      g.classList.remove('hidden');
      g.innerHTML = `<div class="gate">
          <div class="gate-title">FINE. PROVE YOU MEAN IT.</div>
          <div class="gate-sub">Type the roast out in full. No pasting.</div>
          <div class="gate-target">${[...target].map((c) => `<span>${esc(c)}</span>`).join('')}</div>
          <textarea class="gate-input" spellcheck="false" autocomplete="off" rows="3" placeholder="start typing..."></textarea>
          <div class="gate-row"><div class="gate-progress"><div class="bar-fill"></div></div><button class="gate-cancel" type="button">I give up (good)</button></div>
        </div>`;
      const spans = [...g.querySelectorAll('.gate-target span')];
      const input = g.querySelector('.gate-input');
      const fill = g.querySelector('.bar-fill');
      ['paste', 'drop', 'contextmenu'].forEach((ev) => input.addEventListener(ev, (e) => { e.preventDefault(); CART.sfx && CART.sfx.play('nope'); g.querySelector('.gate-sub').textContent = 'Nice try. Type it.'; }));
      input.addEventListener('keydown', (e) => e.stopPropagation(), true);
      input.addEventListener('input', async () => {
        const v = input.value;
        let ok = 0;
        while (ok < v.length && ok < target.length && v[ok] === target[ok]) ok++;
        spans.forEach((s, i) => { s.className = i < ok ? 'ok' : (i < v.length ? 'bad' : ''); });
        if (ok < v.length) { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); }
        fill.style.width = Math.round((ok / target.length) * 100) + '%';
        if (ok === target.length && v.length === target.length) {
          this.mark('typeGateComplete');
          input.disabled = true;
          g.querySelector('.gate-title').textContent = 'UNLOCKED. IT\'S YOUR MONEY.';
          CART.sfx && CART.sfx.play('unlocked');
          await this.say('Fine. It\'s your money. I\'ll remember this.', 600);
          this.finish('bypassed');
          this.unmount();
          this.o.onUnlock && this.o.onUnlock('bypass');
        }
      });
      g.querySelector('.gate-cancel').addEventListener('click', () => { g.classList.add('hidden'); this.mark('typeGateGaveUp'); });
      setTimeout(() => input.focus(), 50);
      this.mark('typeGateOpened');
    }

    waitForPlea(ms) {
      return new Promise((resolve) => {
        const a = this.$('.actions');
        a.innerHTML = '<button class="plea" type="button">NO WAIT. I NEED THIS ONE.</button>';
        const btn = a.querySelector('.plea');
        const t = setTimeout(() => { a.innerHTML = ''; resolve(false); }, ms);
        btn.addEventListener('click', () => { clearTimeout(t); a.innerHTML = ''; resolve(true); });
      });
    }

    // ---------- main sequence ----------
    async run() {
      this.t0 = performance.now();
      this.mount();
      this.mark('takeover', { site: this.cart.site, total: this.cart.total });
      CART.sfx && CART.sfx.play('lock');
      const survivors = new Set(this.o.survivorIds || []);
      const rejectOrder = this.cart.items.filter((i) => !survivors.has(i.id)).sort((a, b) => a.lineTotal - b.lineTotal);
      const approveOrder = this.cart.items.filter((i) => survivors.has(i.id));
      const order = [...rejectOrder, ...approveOrder];
      const done = new Set();
      this.renderQueue(order, done);
      this.current = this.cart.total;

      // Show the real items being read while the roasts arrive (they are usually prewarmed already).
      const status = this.$('.status');
      let roast;
      const flashing = (async () => { let i = 0; while (!roast && !this.aborted) { const it = order[i++ % order.length]; status.textContent = 'READING: ' + (it.brand ? it.brand + ' ' : '') + it.name; await sleep(300); } })();
      roast = await Promise.race([this.o.roastPromise, sleep(95000).then(() => ({ error: 'timeout' }))]);
      if (!roast || roast.error || !roast.items) {
        this.roastError = roast && roast.error;
        roast = CART.fallbackRoasts(this.cart, this.cfg, { survivorIds: [...survivors] });
      }
      this.roast = roast;
      await flashing;
      status.textContent = '';
      this.$('.debug').textContent = `roasts: ${roast.source || 'claude'}${roast.model ? ' / ' + roast.model : ''}${this.roastError ? ' / fell back: ' + this.roastError : ''} / total from ${this.cart.totalSource}`;
      this.mark('roastsReady', { source: roast.source });
      if (this.aborted) return;

      const cap = this.$('.roast'), obj = this.$('.objection'), stage = this.$('.stage');
      if (rejectOrder.length) {
        await this.typewrite(cap, roast.intro || 'Checkout locked.');
        await this.say(roast.intro || 'Checkout locked.');
      }

      for (let i = 0; i < rejectOrder.length && !this.aborted; i++) {
        const item = rejectOrder[i];
        const r = roast.items.find((x) => x.id === item.id) || { roast: `${item.name}. ${this.fmt(item.lineTotal)}. No.` };
        const isLast = i === rejectOrder.length - 1;
        stage.innerHTML = this.cardHtml(item, i, rejectOrder.length);
        cap.textContent = ''; obj.textContent = ''; obj.classList.remove('on');
        CART.sfx && CART.sfx.play('next');
        this.mark('item', { id: item.id, name: item.name, price: item.lineTotal });
        await sleep(280);
        if (r.objection && !isLast) { obj.textContent = 'you, probably: "' + r.objection + '"'; obj.classList.add('on'); CART.sfx && CART.sfx.play('objection'); await sleep(850); }
        const typing = this.typewrite(cap, r.roast);
        await this.say(r.roast);
        await typing;
        if (isLast && rejectOrder.length > 1) {
          const pled = this.cfg.fightMode === 'auto' ? true : await this.waitForPlea(25000);
          if (pled && !this.aborted) {
            this.mark('plea');
            CART.sfx && CART.sfx.play('plea');
            obj.textContent = 'you: "NO WAIT. I NEED THIS ONE."'; obj.classList.add('on');
            const reb = roast.plea_rebuttal || 'You said that about the last one too.';
            const t2 = this.typewrite(cap, reb);
            await this.say(reb); await t2;
          }
        }
        const card = stage.querySelector('.card');
        const stamp = card.querySelector('.stamp');
        stamp.textContent = 'REJECTED'; stamp.className = 'stamp rejected on';
        CART.sfx && CART.sfx.play('stamp');
        card.classList.add('hit');
        this.mark('rejected', { id: item.id });
        await sleep(420);
        card.classList.add('out');
        done.add(item.id); this.renderQueue(order, done);
        const next = isLast && !approveOrder.length ? 0 : Math.max(0, Math.round((this.current - item.lineTotal) * 100) / 100);
        await this.tickTotal(this.current, next, 600);
        CART.sfx && CART.sfx.play('ticked');
        await sleep(120);
      }

      // Survivors: the only thing that gets through is the thing that makes things.
      for (let i = 0; i < approveOrder.length && !this.aborted; i++) {
        const item = approveOrder[i];
        const a = (roast.approvals || []).find((x) => x.id === item.id) || { line: `${item.name}. This one builds things. Approved.` };
        stage.innerHTML = this.cardHtml(item, i, approveOrder.length).replace('class="card enter"', 'class="card enter approved-card"');
        obj.textContent = ''; obj.classList.remove('on'); cap.textContent = '';
        this.mark('approveItem', { id: item.id, name: item.name, price: item.lineTotal });
        await sleep(300);
        const typing = this.typewrite(cap, a.line);
        await this.say(a.line); await typing;
        const stamp = stage.querySelector('.stamp');
        stamp.textContent = 'APPROVED'; stamp.className = 'stamp approved on';
        CART.sfx && CART.sfx.play('approved');
        this.mark('approved', { id: item.id });
        await sleep(1400);
      }
      if (this.aborted) return;
      await this.showFinal(rejectOrder, approveOrder);
    }

    async showFinal(rejectOrder, approveOrder) {
      const cap = this.$('.roast'), obj = this.$('.objection');
      const saved = Math.round(rejectOrder.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
      const prior = this.o.lastSaved;
      const f = this.$('.final');
      let html;
      if (!approveOrder.length) {
        CART.sfx && CART.sfx.play('zero');
        html = `<div class="final-inner">
          <div class="zero">${esc(this.fmt(0))}</div>
          <div class="saved-label">TOTAL SAVED</div>
          <div class="saved">${esc(this.fmt(saved))}</div>
          <div class="final-note">Checkout stays locked.</div>
          <button class="close" type="button">Close and walk away</button></div>`;
      } else {
        const savedTotal = (rejectOrder.length ? saved : 0) + (prior && prior.amount && !rejectOrder.length ? prior.amount : 0);
        f.classList.add('approve-mode');
        cap.textContent = ''; obj.textContent = '';
        html = `<div class="final-inner approved-final">
          <div class="saved-label">TOTAL SAVED</div>
          <div class="saved green">${esc(this.fmt(savedTotal))}</div>
          ${prior && !rejectOrder.length ? `<div class="saved-hours">rejected at ${esc(prior.site)}</div>` : ''}
          <div class="final-note">THE ONLY THING THAT GOT THROUGH</div>
          <button class="continue" type="button">Continue to checkout</button></div>`;
      }
      f.innerHTML = html;
      f.classList.remove('hidden');
      this.mark('final', { saved });
      this.savedAmount = saved;
      const outro = !approveOrder.length ? (this.roast.outro || '') : '';
      this.finish(approveOrder.length ? 'approved' : 'rejected');
      if (outro) await this.say(outro);
      const close = f.querySelector('.close');
      if (close) close.addEventListener('click', () => { this.unmount(); this.o.onClose && this.o.onClose(); });
      const cont = f.querySelector('.continue');
      if (cont) cont.addEventListener('click', () => { this.unmount(); this.o.onUnlock && this.o.onUnlock('approved'); });
    }

    finish(kind) {
      if (this.finished || this.o.replay) return;
      this.finished = true;
      const run = {
        kind, finishedAt: new Date().toISOString(), saved: kind === 'rejected' ? this.savedAmount : (kind === 'approved' ? (this.savedAmount || 0) : 0),
        cart: this.cart, roast: this.roast, cfg: { strictness: this.cfg.strictness, voiceName: this.cfg.voiceName, voiceRate: this.cfg.voiceRate },
        lastSaved: this.o.lastSaved || null, survivorIds: this.o.survivorIds || [], timeline: this.timeline,
      };
      this.o.saveRun && this.o.saveRun(run);
    }
  }

  CART.Takeover = Takeover;
})(typeof globalThis !== 'undefined' ? globalThis : this);
