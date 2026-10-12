import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, PassThrough } from 'node:stream';
import { createHmac } from 'node:crypto';
import { checkoutInput, quoteItems, assertPayment, completeOrder, publicReceipt } from '../server/checkout.js';
import { receiptHash, validReceipt, validSignature, limitCheckout, readBody } from '../server/paystack.js';
import { quoteDelivery } from '../server/dreacot.js';
import { checkoutHandler } from '../api/checkout.js';
import { webhookHandler } from '../api/paystack-webhook.js';
import { deliveryHandler } from '../api/delivery.js';

const reference = 'ct-12345678-1234-1234-1234-123456789abc';
const token = 'a'.repeat(64), secret = 'sk_test_fixture';
const customer = { name: 'Customer', email: 'buyer@example.com', phone: '08012345678', address: '1 Test Street', city: 'Ikeja', state: 'Lagos' };
const product = () => ({ name: 'iPhone', brand: 'Apple', category: 'phones', condition: 'UK Used', priceNgn: 800000, stockQuantity: 3, status: 'available', variants: [{ id: '128', storage: '128GB', stock: 1, price: 800000 }, { id: '256', storage: '256GB', stock: 2, price: 900000 }] });
const input = () => ({ action: 'initialize', customer, fulfillment: 'delivery', deliveryFeeAcknowledged: true, expectedAmount: 90000000, items: [{ productId: 'phone', variantId: '256', quantity: 1 }] });
const order = () => ({ reference, customer, fulfillment: 'delivery', ...input(), items: quoteItems(input().items, new Map([['phone', product()]])).lines, amount: 90000000, status: 'pending', receiptHash: receiptHash(token) });
const payment = () => ({ reference, amount: 90000000, currency: 'NGN', domain: 'test', status: 'success', customer: { email: customer.email }, paid_at: '2026-10-12T12:00:00Z' });

function fakeDatabase(entries = []) {
  const documents = new Map(entries), writes = [], reads = [];
  const snapshot = (path) => ({ exists: documents.has(path), id: path.split('/').at(-1), data: () => documents.get(path) });
  const ref = (path) => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path), create: async data => { assert.equal(documents.has(path), false); documents.set(path, data); writes.push(path); }, update: async data => { documents.set(path, { ...documents.get(path), ...data }); writes.push(path); } });
  return {
    documents, writes, reads,
    collection(path) {
      return { doc: id => ref(`${path}/${id}`), orderBy() { return this; }, limit() { return this; }, async get() { return { docs: [...documents.keys()].filter(key => key.startsWith(path + '/')).map(key => snapshot(key)) }; } };
    },
    async runTransaction(callback) {
      const pending = [];
      const result = await callback({
        async get(ref) { assert.equal(pending.length, 0, 'Firestore requires all reads before writes'); reads.push(ref.path); return snapshot(ref.path); },
        create(ref, data) { assert.equal(documents.has(ref.path), false); pending.push([ref.path, data]); },
        update(ref, data) { pending.push([ref.path, { ...documents.get(ref.path), ...data }]); },
        set(ref, data) { pending.push([ref.path, data]); },
      });
      for (const [path, data] of pending) { documents.set(path, data); writes.push(path); }
      return result;
    },
  };
}
function request(body, headers = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const req = Readable.from([Buffer.from(raw)]); req.method = 'POST'; req.headers = headers; return req;
}
function response() { return { headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = JSON.parse(value); } }; }
const checkout = (db, provider) => checkoutHandler({ getDatabase: () => db, ready: () => true, getSecret: () => secret, provider, rateLimit: async () => {} });

test('checkout rejects invalid contact details, quantities, duplicated lines and missing delivery acknowledgement', () => {
  for (const change of [{ customer: { ...customer, email: 'invalid' } }, { fulfillment: 'free-shipping' }, { deliveryFeeAcknowledged: false }, { items: [{ productId: 'phone', quantity: -1 }] }, { items: [{ productId: 'phone', quantity: 1.5 }] }, { items: [...input().items, ...input().items] }, { items: [{ productId: '../secret', quantity: 1 }] }]) assert.throws(() => checkoutInput({ ...input(), ...change }));
  assert.equal(checkoutInput({ ...input(), fulfillment: 'pickup', deliveryFeeAcknowledged: false }).fulfillment, 'pickup');
});

test('server prices storage variants itself and checks both variant and total stock', () => {
  const products = new Map([['phone', product()]]);
  assert.equal(quoteItems([{ ...input().items[0], price: 1 }], products).amount, 90000000);
  assert.throws(() => quoteItems([{ ...input().items[0], quantity: 3 }], products));
  assert.throws(() => quoteItems([{ ...input().items[0], variantId: 'missing' }], products));
  assert.throws(() => quoteItems(input().items, new Map([['phone', { ...product(), status: 'deleted' }]])));
  assert.throws(() => quoteItems([{ productId: 'phone', variantId: '128', quantity: 1 }, { productId: 'phone', variantId: '256', quantity: 2 }], new Map([['phone', { ...product(), stockQuantity: 2 }]])));
});

test('checkout initialization rejects changed totals and stores an opaque receipt token; delivery is not charged', async () => {
  const db = fakeDatabase([['products/phone', product()]]); let providerCalls = 0, initialized;
  const handler = checkout(db, async (_path, body) => { providerCalls++; initialized = body; return { authorization_url: 'https://checkout.paystack.com/fixture' }; });
  const wrong = response(); await handler(request({ ...input(), expectedAmount: 100 }), wrong);
  assert.equal(wrong.statusCode, 409); assert.equal(providerCalls, 0); assert.equal(db.writes.length, 0);
  const success = response(); await handler(request(input()), success);
  assert.equal(success.statusCode, 200); assert.equal(initialized.amount, '90000000');
  assert.equal(new URL(initialized.callback_url).pathname, '/cart');
  const saved = db.documents.get(`paymentOrders/${success.body.reference}`);
  assert.equal(validReceipt(success.body.token, saved.receiptHash), true);
  assert.equal(saved.customer.address, customer.address);
  assert.equal(saved.deliveryFeeSeparate, true);
  assert.equal(db.documents.get('products/phone').stockQuantity, 3);
  assert.equal(JSON.stringify(saved).includes(success.body.token), false);
});

test('verification requires receipt ownership and rejects underpayment, wrong currency, email or environment', async () => {
  for (const change of [{ amount: 1 }, { currency: 'USD' }, { domain: 'live' }, { customer: { email: 'someone@example.com' } }]) {
    const db = fakeDatabase([['paymentOrders/' + reference, order()], ['products/phone', product()]]);
    const result = response(); await checkout(db, async () => ({ ...payment(), ...change }))(request({ action: 'verify', reference, token }), result);
    assert.equal(result.statusCode, 409); assert.equal(db.writes.length, 0);
  }
  const db = fakeDatabase([['paymentOrders/' + reference, order()]]);
  const result = response(); await checkout(db, () => { throw new Error('Must not call Paystack'); })(request({ action: 'verify', reference, token: 'b'.repeat(64) }), result);
  assert.equal(result.statusCode, 403);
  assert.throws(() => assertPayment(order(), { ...payment(), reference: 'wrong' }, 'test'));
  assert.equal(validReceipt('malformed', receiptHash(token)), false);
});

test('callback and signed webhook record payment once and deduct the selected storage stock once', async () => {
  const db = fakeDatabase([['paymentOrders/' + reference, order()], ['products/phone', product()]]);
  const webhook = webhookHandler({ getDatabase: () => db, getSecret: () => secret });
  const raw = JSON.stringify({ event: 'charge.success', data: payment() });
  const signed = createHmac('sha512', secret).update(raw).digest('hex');
  const eventResponse = response(); await webhook(request(raw, { 'x-paystack-signature': signed }), eventResponse);
  assert.equal(eventResponse.statusCode, 200);
  const result = response(); await checkout(db, () => { throw new Error('Already verified'); })(request({ action: 'verify', reference, token }), result);
  assert.equal(result.body.status, 'paid');
  assert.equal('customer' in result.body, false); assert.equal('receiptHash' in result.body, false);
  const repeat = response(); await webhook(request(raw, { 'x-paystack-signature': signed }), repeat);
  assert.equal(db.documents.get('products/phone').stockQuantity, 2);
  assert.equal(db.documents.get('products/phone').variants[1].stock, 1);
  assert.equal([...db.documents.keys()].filter(path => path.startsWith('sales/')).length, 1);
  assert.equal(db.writes.filter(path => path === 'products/phone').length, 1);
});

test('webhook signature covers the exact raw bytes and unrelated account payments are ignored', async () => {
  const raw = '{ "event": "charge.success", "data": {} }', signature = createHmac('sha512', secret).update(raw).digest('hex');
  assert.equal(validSignature(Buffer.from(raw), signature, secret), true);
  assert.equal(validSignature(Buffer.from(JSON.stringify(JSON.parse(raw))), signature, secret), false);
  const db = fakeDatabase();
  const handler = webhookHandler({ getDatabase: () => db, getSecret: () => secret });
  const bad = response(); await handler(request(raw, { 'x-paystack-signature': 'invalid' }), bad); assert.equal(bad.statusCode, 401);
  const ignoredRaw = JSON.stringify({ event: 'charge.success', data: { ...payment(), reference: 'another-store' } });
  const ignored = response(); await handler(request(ignoredRaw, { 'x-paystack-signature': createHmac('sha512', secret).update(ignoredRaw).digest('hex') }), ignored);
  assert.equal(ignored.statusCode, 200); assert.equal(db.writes.length, 0);
});

test('raw body reading works with Vercel restored request streams and rejects oversized payloads', async () => {
  const raw = Buffer.from('{ "event": "charge.success" }');
  const req = new Readable({ read() { this.push(raw); this.push(null); }, autoDestroy: false });
  await new Promise(resolve => { req.on('data', () => {}); req.on('end', resolve); });
  const replica = new PassThrough(), originalOn = req.on.bind(req), restoredOn = replica.on.bind(replica);
  req.read = replica.read.bind(replica);
  req.on = req.addListener = (name, callback) => name === 'data' || name === 'end' ? restoredOn(name, callback) : originalOn(name, callback);
  replica.end(raw);
  assert.deepEqual(await readBody(req), raw);
  await assert.rejects(readBody(request('long payload'), 3), /too large/);
});

test('multi-unit orders record each unit; competing payments with unavailable stock require review', async () => {
  const multi = { ...order(), items: quoteItems([{ ...input().items[0], quantity: 2 }], new Map([['phone', product()]])).lines, amount: 180000000 };
  const db = fakeDatabase([['paymentOrders/' + reference, multi], ['products/phone', product()]]);
  await completeOrder(db, reference, { ...payment(), amount: 180000000 }, 'test');
  assert.equal(db.documents.get('products/phone').variants[1].stock, 0);
  assert.equal([...db.documents.keys()].filter(path => path.startsWith('sales/')).length, 2);
  const nextReference = 'ct-22345678-1234-1234-1234-123456789abc';
  db.documents.set('paymentOrders/' + nextReference, { ...order(), reference: nextReference });
  const next = await completeOrder(db, nextReference, { ...payment(), reference: nextReference }, 'test');
  assert.equal(next.status, 'paid_needs_review');
  assert.equal(db.documents.get('products/phone').stockQuantity, 1);
  assert.equal(db.documents.get(`sales/${nextReference}-0-0`).stockDeducted, false);
  assert.equal('customer' in publicReceipt(next), false);
});

test('delivery management requires admin access, payment and explicit fee agreement', async () => {
  const db = fakeDatabase([['paymentOrders/' + reference, { ...order(), status: 'paid', deliveryStatus: 'awaiting_fee_agreement' }]]);
  const denied = deliveryHandler({ getDatabase: () => { throw new Error('Must not access private orders'); }, authorize: async () => { throw Object.assign(new Error('Sign in'), { status: 401 }); } });
  const deniedResponse = response(); await denied(request({ action: 'list' }), deniedResponse); assert.equal(deniedResponse.statusCode, 401);
  let bookings = 0;
  const handler = deliveryHandler({ getDatabase: () => db, authorize: async () => {}, checkProvider: () => {}, quoteProvider: async () => ({ fareCode: 'FARE', deliveryFee: 2500 }), provider: async () => { bookings++; return { fare_lock: { order_id: 7 } }; }, taskProvider: async () => ({ trackingCode: 'PROVIDER-CODE', courierStatus: 'Pending' }) });
  const quote = response(); await handler(request({ action: 'quote', reference }), quote); assert.equal(quote.statusCode, 200);
  const noAgreement = response(); await handler(request({ action: 'book', reference }), noAgreement); assert.equal(noAgreement.statusCode, 400);
  const wrongFee = response(); await handler(request({ action: 'book', reference, deliveryFeeConfirmed: true, expectedFee: 1 }), wrongFee); assert.equal(wrongFee.statusCode, 409);
  const booked = response(); await handler(request({ action: 'book', reference, deliveryFeeConfirmed: true, expectedFee: 2500 }), booked); assert.equal(booked.statusCode, 200); assert.equal(booked.body.trackingCode, 'PROVIDER-CODE');
  const duplicate = response(); await handler(request({ action: 'book', reference, deliveryFeeConfirmed: true, expectedFee: 2500 }), duplicate); assert.equal(duplicate.statusCode, 409); assert.equal(bookings, 1);
});

test('courier booking timeouts are held for reconciliation and cannot trigger automatic duplicate bookings', async () => {
  const db = fakeDatabase([['paymentOrders/' + reference, { ...order(), status: 'paid', deliveryStatus: 'quoted', fareCode: 'FARE', deliveryFee: 2500 }]]); let calls = 0;
  const handler = deliveryHandler({ getDatabase: () => db, authorize: async () => {}, checkProvider: () => {}, provider: async () => { calls++; throw new Error('Timed out after provider accepted'); } });
  const first = response(); await handler(request({ action: 'book', reference, deliveryFeeConfirmed: true, expectedFee: 2500 }), first);
  assert.equal(first.statusCode, 502); assert.equal(db.documents.get('paymentOrders/' + reference).deliveryStatus, 'booking_unknown');
  const retry = response(); await handler(request({ action: 'book', reference, deliveryFeeConfirmed: true, expectedFee: 2500 }), retry);
  assert.equal(retry.statusCode, 409); assert.equal(calls, 1);
  await assert.rejects(quoteDelivery({ ...order(), customer: { ...customer, state: 'Abuja' } }), /Lagos/);
});

test('missing courier configuration leaves a quoted order available for setup and retry', async () => {
  const db = fakeDatabase([['paymentOrders/' + reference, { ...order(), status: 'paid', deliveryStatus: 'quoted', fareCode: 'FARE', deliveryFee: 2500 }]]);
  const handler = deliveryHandler({ getDatabase: () => db, authorize: async () => {}, checkProvider: () => { throw Object.assign(new Error('Missing setup'), { status: 503 }); } });
  const result = response(); await handler(request({ action: 'book', reference, deliveryFeeConfirmed: true, expectedFee: 2500 }), result);
  assert.equal(result.statusCode, 503); assert.equal(db.documents.get('paymentOrders/' + reference).deliveryStatus, 'quoted');
});

test('public initialization is rate limited and payment stays disabled without server setup', async () => {
  const previous = { secret: process.env.PAYSTACK_SECRET_KEY, public: process.env.VITE_PAYSTACK_PUBLIC_KEY };
  process.env.PAYSTACK_SECRET_KEY = secret; process.env.VITE_PAYSTACK_PUBLIC_KEY = 'pk_test_fixture';
  try {
    const db = fakeDatabase(); for (let i = 0; i < 20; i++) await limitCheckout(db, '127.0.0.1', 1000000);
    await assert.rejects(limitCheckout(db, '127.0.0.1', 1000000), /Too many/);
    await limitCheckout(db, '127.0.0.1', 1800000);
  } finally {
    if (previous.secret === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previous.secret;
    if (previous.public === undefined) delete process.env.VITE_PAYSTACK_PUBLIC_KEY; else process.env.VITE_PAYSTACK_PUBLIC_KEY = previous.public;
  }
  const result = response(); await checkoutHandler({ ready: () => false })(request(input()), result); assert.equal(result.statusCode, 503);
});
