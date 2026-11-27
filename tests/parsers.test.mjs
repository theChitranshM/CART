import test from 'node:test';
import assert from 'node:assert/strict';
import { CART, fixture } from './helpers.mjs';

test('Holt Renfrew: reads every item, price and the page subtotal from the real bag page', () => {
  const { doc, loc } = fixture('holt-cart.html', 'https://www.holtrenfrew.com/en/cart');
  assert.ok(CART.parsers.holt.matches(loc));
  assert.ok(CART.parsers.holt.isCartPage(loc, doc));
  const cart = CART.readCart(loc, doc);
  assert.equal(cart.site, 'holt');
  assert.equal(cart.currency, 'CAD');
  assert.equal(cart.items.length, 5);
  const byName = Object.fromEntries(cart.items.map((i) => [i.name, i]));
  assert.equal(byName['Signature Classic Hoodie'].unitPrice, 290);
  assert.equal(byName['Signature Classic Hoodie'].brand, 'FEAR OF GOD ESSENTIALS');
  assert.equal(byName['Ledger Plaid Wool-Blend Down Jacket'].unitPrice, 1450);
  assert.equal(byName['Super-Star Leather Sneakers'].unitPrice, 780);
  assert.equal(byName['Tobacco Vanille Eau De Parfum'].unitPrice, 600);
  assert.equal(byName['Aviator Sunglasses'].brand, 'GUCCI');
  assert.equal(cart.total, 3710);
  assert.equal(cart.totalSource, 'page');
  assert.equal(cart.itemsSum, cart.total, 'line items add up to the page subtotal');
  for (const i of cart.items) {
    assert.match(i.image, /^https:\/\/[a-z0-9]+\.scene7\.com\/is\/image\/HoltRenfrew1\//);
    assert.match(i.url, /^https:\/\/www\.holtrenfrew\.com\/en\/Products\//);
    assert.equal(i.qty, 1);
  }
});

test('Holt Renfrew: ignores the hidden edit-modal copies of each item', () => {
  const { doc, loc } = fixture('holt-cart.html', 'https://www.holtrenfrew.com/en/cart');
  assert.equal(doc.querySelectorAll('.cart__list li.cart__item').length, 5);
  assert.equal(CART.readCart(loc, doc).items.length, 5);
});

test('Holt Renfrew: checkout button matches the interception selectors', () => {
  const { doc } = fixture('holt-cart.html', 'https://www.holtrenfrew.com/en/cart');
  assert.ok(doc.querySelector(CART.parsers.holt.checkoutSelectors.join(',')));
});

test('Amazon.ca: reads the active cart item, price, subtotal and a real product image', () => {
  const { doc, loc } = fixture('amazon-ca-cart.html', 'https://www.amazon.ca/gp/cart/view.html');
  assert.ok(CART.parsers.amazon.isCartPage(loc, doc));
  const cart = CART.readCart(loc, doc);
  assert.equal(cart.site, 'amazon');
  assert.equal(cart.currency, 'CAD');
  assert.equal(cart.items.length, 1);
  const [it] = cart.items;
  assert.match(it.name, /^FLASHFORGE AD5X Multi-Color 3D Printer/);
  assert.equal(it.unitPrice, 459);
  assert.equal(it.qty, 1);
  assert.equal(cart.total, 459);
  assert.match(it.image, /media-amazon\.com\/images\/I\//);
  assert.doesNotMatch(it.image, /loadIndicator/);
  assert.ok(doc.querySelector(CART.parsers.amazon.checkoutSelectors.join(',')), 'proceed-to-checkout is interceptable');
});

test('Amazon.com host maps to USD', () => {
  const { doc } = fixture('amazon-ca-cart.html', 'https://www.amazon.ca/gp/cart/view.html');
  const cart = CART.readCart(new URL('https://www.amazon.com/gp/cart/view.html'), doc);
  assert.equal(cart.currency, 'USD');
});

test('Best Buy: parses the basket page', { skip: !hasFixture('bestbuy-ca-cart.html') && 'no Best Buy fixture captured yet' }, () => {
  const { doc, loc } = fixture('bestbuy-ca-cart.html', 'https://www.bestbuy.ca/en-ca/basket');
  const cart = CART.readCart(loc, doc);
  assert.equal(cart.site, 'bestbuy');
  assert.ok(cart.items.length >= 1);
  for (const i of cart.items) { assert.ok(i.name.length > 3); assert.ok(i.unitPrice > 0); }
  assert.ok(cart.total > 0);
});

test('Generic fallback finds rows with a link, image and price inside a cart container', () => {
  const { JSDOM } = globalThis.__jsdom || {};
  void JSDOM;
  const { doc } = fixture('generic-cart.html', 'https://shop.example/cart');
  const res = CART.parsers.generic.parse(doc);
  assert.equal(res.items.length, 2);
  assert.deepEqual(res.items.map((i) => i.unitPrice), [49.99, 120]);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
function hasFixture(n) { return fs.existsSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', n)); }
