import test from 'node:test';
import assert from 'node:assert/strict';
import { CART, fixture } from './helpers.mjs';

const holt = () => { const { doc, loc } = fixture('holt-cart.html', 'https://www.holtrenfrew.com/en/cart'); return CART.readCart(loc, doc); };

test('money parsing handles en-CA, fr-CA and symbols', () => {
  const p = CART.money.parseMoney;
  assert.equal(p('$1,450'), 1450);
  assert.equal(p('CDN$ 459.00'), 459);
  assert.equal(p('1 450,00 $'), 1450);
  assert.equal(p('$3,710.55'), 3710.55);
  assert.equal(p('no price'), null);
});

test('prompt carries real item names, prices and owned items, and no hours', () => {
  const cart = holt();
  const { system, user } = CART.buildPrompt(cart, { ...CART.DEFAULT_CONFIG, ownedItems: 'two grey hoodies' }, {});
  assert.match(user, /Signature Classic Hoodie \| \$290/);
  assert.ok(user.indexOf('Signature Classic Hoodie') < user.indexOf('Aviator Sunglasses'), 'cheapest item listed first');
  assert.ok(user.indexOf('Ledger Plaid') > user.indexOf('Super-Star'), 'most expensive item listed last');
  assert.match(user, /Ledger Plaid Wool-Blend Down Jacket \| \$1,450/);
  assert.doesNotMatch(system + user, /hours of (work|your life)/i);
  assert.match(user, /two grey hoodies/);
  assert.match(system, /LAST item/);
  assert.doesNotMatch(system + user, /—/);
});

test('default model is Sonnet 5.5 and voice is off', () => {
  assert.equal(CART.DEFAULT_CONFIG.model, 'claude-sonnet-5-5');
  assert.equal(CART.DEFAULT_CONFIG.voiceEnabled, false);
  assert.equal(CART.DEFAULT_CONFIG.sounds, 'meme');
});

test('survivor items are marked for approval and mention the earlier saving', () => {
  const cart = { site: 'amazon', siteName: 'Amazon', currency: 'CAD', total: 459, items: [{ id: 0, brand: '', name: 'FLASHFORGE AD5X Multi-Color 3D Printer', lineTotal: 459, qty: 1 }] };
  const { user } = CART.buildPrompt(cart, CART.DEFAULT_CONFIG, { survivorIds: [0], savedSoFar: { amount: 3710, site: 'Holt Renfrew' } });
  assert.match(user, /APPROVE THIS ONE/);
  assert.match(user, /saved them \$3,710 at Holt Renfrew/);
});

test('roast JSON parsing is lenient and strips dashes', () => {
  const r = CART.parseRoastJson('Sure! ```json\n{"intro":"Locked — now.","items":[{"id":"2","objection":null,"roast":"No – never."}],"plea_rebuttal":"x","outro":"y","approvals":[]}\n```');
  assert.equal(r.intro, 'Locked, now.');
  assert.equal(r.items[0].id, 2);
  assert.equal(r.items[0].roast, 'No, never.');
});

test('local fallback roasts escalate in price order and stay item-specific', () => {
  const cart = holt();
  const r = CART.fallbackRoasts(cart, { ...CART.DEFAULT_CONFIG }, { survivorIds: [] });
  const order = r.items.map((i) => cart.items.find((c) => c.id === i.id).lineTotal);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.match(r.items[0].roast, /Signature Classic Hoodie/);
  assert.match(r.items.at(-1).roast, /Ledger Plaid Wool-Blend Down Jacket/);
  assert.match(r.items.at(-1).roast, /fight me/);
});

import fs from 'node:fs';
test('trending sound pack list is complete and the audio itself is not committed', () => {
  const list = JSON.parse(fs.readFileSync(new URL('../extension/sounds/trending.json', import.meta.url), 'utf8'));
  for (const beat of ['lock', 'objection', 'stamp', 'plea', 'zero', 'approved', 'dodge', 'nope', 'unlocked']) {
    const c = list.clips[beat];
    assert.ok(c && c.slug && c.duration > 0 && c.duration <= 4, `clip for ${beat}`);
  }
  assert.match(fs.readFileSync(new URL('../.gitignore', import.meta.url), 'utf8'), /extension\/sounds\/trending\//);
});

test('no hourly-rate setting exists anywhere in the config', () => {
  assert.ok(!Object.keys(CART.DEFAULT_CONFIG).some((k) => /hour/i.test(k)));
  assert.equal(CART.money.toHours, undefined);
});
