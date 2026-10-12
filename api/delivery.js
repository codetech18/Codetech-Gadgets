import { FieldValue } from 'firebase-admin/firestore';
import { database, requireAdmin, json, readBody } from '../server/paystack.js';
import { dreacot, dreacotConfig, quoteDelivery, deliveryTask } from '../server/dreacot.js';

export function deliveryHandler({ getDatabase = database, authorize = requireAdmin, provider = dreacot, checkProvider = dreacotConfig, quoteProvider = quoteDelivery, taskProvider = deliveryTask } = {}) {
 return async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  try {
    await authorize(request);
    const body = JSON.parse((await readBody(request)).toString()), db = getDatabase();
    if (body.action === 'list') {
      const snapshot = await db.collection('paymentOrders').orderBy('createdAt', 'desc').limit(100).get();
      return json(response, 200, { orders: snapshot.docs.map(document => {
        const order = document.data();
        return { reference: order.reference, customer: order.customer, items: order.items, amount: order.amount, fulfillment: order.fulfillment, status: order.status, deliveryStatus: order.deliveryStatus || 'pending_payment', deliveryFee: order.deliveryFee ?? null, trackingCode: order.trackingCode || '', courierStatus: order.courierStatus || '', createdAt: order.createdAt?.toDate?.().toISOString() || '' };
      }) });
    }
    if (!/^ct-[a-f0-9-]{36}$/.test(body.reference ?? '')) return json(response, 400, { error: 'Invalid order reference.' });
    const ref = db.collection('paymentOrders').doc(body.reference), snapshot = await ref.get();
    if (!snapshot.exists) return json(response, 404, { error: 'Order not found.' });
    const order = snapshot.data();
    if (order.status !== 'paid' || order.fulfillment !== 'delivery') return json(response, 409, { error: 'Only confirmed, in-stock delivery orders can be booked.' });
    if (body.action === 'quote') {
      await db.runTransaction(async transaction => {
        const latest = (await transaction.get(ref)).data();
        if (!['awaiting_fee_agreement', 'quoted'].includes(latest.deliveryStatus)) throw Object.assign(new Error('Check the existing delivery request before getting another quote.'), { status: 409 });
        transaction.update(ref, { deliveryStatus: 'quoting', updatedAt: FieldValue.serverTimestamp() });
      });
      try {
        const quote = await quoteProvider(order);
        await ref.update({ ...quote, deliveryStatus: 'quoted', updatedAt: FieldValue.serverTimestamp() });
        return json(response, 200, quote);
      } catch (error) { await ref.update({ deliveryStatus: 'awaiting_fee_agreement' }); throw error; }
    }
    if (body.action === 'track') {
      if (!order.dreacotOrderId) return json(response, 409, { error: 'This order has no confirmed Dreacot booking yet.' });
      const task = await taskProvider(order.dreacotOrderId);
      await ref.update({ ...task, updatedAt: FieldValue.serverTimestamp() });
      return json(response, 200, task);
    }
    if (body.action !== 'book' || body.deliveryFeeConfirmed !== true) return json(response, 400, { error: 'Confirm the separate delivery fee before booking.' });
    checkProvider();
    const fareCode = await db.runTransaction(async transaction => {
      const latest = (await transaction.get(ref)).data();
      if (latest.deliveryStatus !== 'quoted' || !latest.fareCode || latest.deliveryFee !== body.expectedFee) throw Object.assign(new Error('Refresh the delivery quote before booking. Check Dreacot directly if a previous booking is awaiting confirmation.'), { status: 409 });
      transaction.update(ref, { deliveryStatus: 'booking', updatedAt: FieldValue.serverTimestamp() });
      return latest.fareCode;
    });
    try {
      const created = await provider(`/order/create/${encodeURIComponent(fareCode)}`, { name: order.customer.name, phone: order.customer.phone, email: order.customer.email, confirmation_code: order.reference });
      const dreacotOrderId = created.fare_lock?.order_id;
      if (!dreacotOrderId) throw new Error('Dreacot did not return an order ID.');
      await ref.update({ dreacotOrderId, deliveryStatus: 'booked', deliveryFeeConfirmed: true, updatedAt: FieldValue.serverTimestamp() });
      let task = {}; try { task = await taskProvider(dreacotOrderId); await ref.update(task); } catch { /* Booking succeeded; tracking can be refreshed later. */ }
      return json(response, 200, { deliveryStatus: 'booked', ...task });
    } catch {
      // The courier may have accepted a timed-out request. Do not retry it automatically.
      await ref.update({ deliveryStatus: 'booking_unknown', updatedAt: FieldValue.serverTimestamp() });
      return json(response, 502, { error: 'Check this order in Dreacot before trying another booking. It may already have been accepted.' });
    }
  } catch (error) { return json(response, error.status || 503, { error: error.status ? error.message : 'Orders are temporarily unavailable. Check the server configuration and try again.' }); }
 };
}
export default deliveryHandler();
