// Builds the single Claude request for a whole cart. Used by background.js; the bridge just forwards it.
(function (root) {
  const CART = root.CART || (root.CART = {});

  const TONE = {
    1: 'Dry, witty, a disappointed older sibling. Still funny.',
    2: 'Savage but affectionate. A best friend who has seen your bank statement.',
    3: 'Unhinged. Theatrical outrage. Still clever, never cruel about the person\'s body, identity or family.',
  };

  function buildPrompt(cart, cfg, opts) {
    const money = CART.money;
    const fmt = (n) => money.formatMoney(n, cart.currency);
    const survivors = opts.survivorIds || [];
    // Same order the takeover uses: cheapest first (polite) to most expensive last (the fight), survivors after.
    const ordered = [...cart.items].sort((a, b) => (survivors.includes(a.id) - survivors.includes(b.id)) || (a.lineTotal - b.lineTotal));
    const lines = ordered.map((it, i) =>
      `${i + 1}. id=${it.id} | ${[it.brand, it.name].filter(Boolean).join(' ')} | ${fmt(it.lineTotal)}${it.qty > 1 ? ` (qty ${it.qty})` : ''}` +
        (survivors.includes(it.id) ? ' | APPROVE THIS ONE' : '')).join('\n');
    const owned = (cfg.ownedItems || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const n = cart.items.length;

    const system = [
      'You are CART, a Chrome extension that stops impulse online shopping. The user just clicked checkout and you have locked it.',
      'Your output is shown on screen as big captions, one item at a time, with meme sound effects, right before the item gets a REJECTED stamp. People read it in a short video, so it has to land fast.',
      `Tone: ${TONE[cfg.strictness] || TONE[2]}`,
      'Rules:',
      '- Every roast must name the specific item and use its real price. Generic lines that could fit any product are a failure.',
      '- Make the price hit: compare it to something concrete and funny (what else that money buys).',
      owned.length ? '- When an item overlaps something the user already owns (list below), call it out by name.' : '',
      '- Escalation across the cart, in the order given: item 1 is polite and almost gentle. Middle items argue: include "objection", the excuse the user is probably making in their head (max 10 words, first person), and the roast answers it. The LAST item is the one the user will fight for: make that roast the strongest, and write "plea_rebuttal", your answer when they beg "I need this one" (max 20 words).',
      '- Each roast: 1 to 2 short sentences, max 22 words, punchy like a meme caption, no lists, no hashtags, no emoji, no em dashes or en dashes.',
      '- Items marked APPROVE THIS ONE are the exception: they let the user make things. Write "approval" lines for them instead of roasts: warm, short, max 18 words.',
      '- "intro": max 10 words, shown the moment the screen locks. "outro": max 14 words, shown when the cart hits zero.',
      'Return ONLY a JSON object, no prose, no code fences:',
      '{"intro": string, "items": [{"id": number, "objection": string|null, "roast": string}], "plea_rebuttal": string, "outro": string, "approvals": [{"id": number, "line": string}]}',
    ].filter(Boolean).join('\n');

    const user = [
      cfg.yourName ? `User's name: ${cfg.yourName}` : '',
      `Store: ${cart.siteName}. Cart total: ${fmt(cart.total)} (${cart.currency}).`,
      opts.savedSoFar ? `Earlier today CART already saved them ${fmt(opts.savedSoFar.amount)} at ${opts.savedSoFar.site}. Mention it in the approval line.` : '',
      `Cart, in the order you will roast it (${n} item${n === 1 ? '' : 's'}):`,
      lines,
      owned.length ? `Things the user already owns:\n- ${owned.join('\n- ')}` : '',
    ].filter(Boolean).join('\n\n');

    return { system, user };
  }

  // Lenient JSON extraction + cleanup (no em/en dashes in anything spoken).
  function parseRoastJson(text) {
    if (!text) throw new Error('empty response');
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('no JSON object in response');
    const obj = JSON.parse(text.slice(start, end + 1));
    const clean = (s) => (typeof s === 'string' ? s.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim() : s);
    obj.intro = clean(obj.intro); obj.outro = clean(obj.outro); obj.plea_rebuttal = clean(obj.plea_rebuttal);
    obj.items = (obj.items || []).map((i) => ({ id: Number(i.id), objection: clean(i.objection) || null, roast: clean(i.roast) }));
    obj.approvals = (obj.approvals || []).map((a) => ({ id: Number(a.id), line: clean(a.line) }));
    return obj;
  }

  CART.buildPrompt = buildPrompt;
  CART.parseRoastJson = parseRoastJson;
  if (typeof module === 'object' && module.exports) module.exports = { buildPrompt, parseRoastJson };
})(typeof globalThis !== 'undefined' ? globalThis : this);
