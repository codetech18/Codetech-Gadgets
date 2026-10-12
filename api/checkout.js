import { randomBytes, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { database, checkoutReady, secretKey, receiptHash, validReceipt, paystack, json, readBody, limitCheckout } from '../server/paystack.js';
import { checkoutInput, quoteItems, completeOrder, publicReceipt } from '../server/checkout.js';

export function checkoutHandler({ getDatabase = database, ready = checkoutReady, provider = paystack, getSecret = secretKey, rateLimit = limitCheckout } = {}) {
 return async function handler(request, response) {
  if (request.method === 'GET') return json(response, 200, { enabled: ready() });
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  try {
    if (!ready()) return json(response, 503, { error: 'Online payment is being set up. Please send a purchase request on WhatsApp.' });
    const raw = await readBody(request);
    let body; try { body = JSON.parse(raw.toString()); } catch { return json(response, 400, { error: 'Invalid request.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(response, 400, { error: 'Invalid request.' });
    const db = getDatabase();
    if (body.action === 'verify') {
      if (!/^ct-[a-f0-9-]{36}$/.test(body.reference ?? '')) return json(response, 400, { error: 'Invalid payment reference.' });
      const orderRef = db.collection('paymentOrders').doc(body.reference);
      const snapshot = await orderRef.get();
      if (!snapshot.exists || !validReceipt(body.token, snapshot.data().receiptHash)) return json(response, 403, { error: 'This receipt could not be accessed.' });
      let order = snapshot.data();
      if (!['paid', 'paid_needs_review'].includes(order.status)) {
        const payment = await provider(`/transaction/verify/${encodeURIComponent(body.reference)}`);
        if (payment.status !== 'success') return json(response, 200, { ...publicReceipt(order), status: payment.status === 'failed' || payment.status === 'abandoned' ? 'unpaid' : 'pending' });
        order = await completeOrder(db, body.reference, payment, getSecret().startsWith('sk_test_') ? 'test' : 'live');
      }
      return json(response, 200, publicReceipt(order));
    }
    if (body.action !== 'initialize') return json(response, 400, { error: 'Invalid checkout action.' });
    const input = checkoutInput(body);
    await rateLimit(db, String(request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0]);
    const products = new Map();
    for (const id of new Set(input.items.map(item => item.productId))) {
      const snapshot = await db.collection('products').doc(id).get(); products.set(id, snapshot.exists ? snapshot.data() : null);
    }
    const { lines, amount } = quoteItems(input.items, products);
    if (body.expectedAmount !== amount) return json(response, 409, { error: 'Prices have changed. Remove and re-add the items from their device pages before paying.' });
    const reference = `ct-${randomUUID()}`, token = randomBytes(32).toString('hex');
    const orderRef = db.collection('paymentOrders').doc(reference);
    await orderRef.create({ reference, customer: input.customer, fulfillment: input.fulfillment, items: lines, amount, currency: 'NGN', status: 'pending', receiptHash: receiptHash(token), deliveryFeeSeparate: true, courier: input.fulfillment === 'delivery' ? 'Dreacot Delivery' : '', createdAt: FieldValue.serverTimestamp() });
    const callback = new URL('/cart', process.env.CHECKOUT_ORIGIN || 'https://www.codetechgadgets.online');
    callback.searchParams.set('payment_reference', reference); callback.searchParams.set('payment_token', token);
    const payment = await provider('/transaction/initialize', { email: input.customer.email, amount: String(amount), currency: 'NGN', reference, callback_url: callback.toString(), metadata: JSON.stringify({ store: 'codetech', order_reference: reference }) });
    const url = new URL(payment.authorization_url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com') throw new Error('Unexpected payment link.');
    await orderRef.update({ authorizationUrl: url.toString(), updatedAt: FieldValue.serverTimestamp() });
    return json(response, 200, { authorizationUrl: url.toString(), reference, token });
  } catch (error) {
    return json(response, error.status || 503, { error: error.status ? error.message : 'Payment could not be completed. Try again or contact CodeTech with your payment reference.' });
  }
 };
}
export default checkoutHandler();
