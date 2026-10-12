import { database, secretKey, validSignature, json, readBody } from '../server/paystack.js';
import { completeOrder } from '../server/checkout.js';

export function webhookHandler({ getDatabase = database, getSecret = secretKey } = {}) {
 return async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  try {
    const key = getSecret(), raw = await readBody(request, 262144);
    if (!validSignature(raw, request.headers['x-paystack-signature'], key)) return json(response, 401, { error: 'Invalid signature.' });
    const event = JSON.parse(raw.toString());
    if (event.event === 'charge.success' && /^ct-[a-f0-9-]{36}$/.test(event.data?.reference ?? '')) await completeOrder(getDatabase(), event.data.reference, event.data, key.startsWith('sk_test_') ? 'test' : 'live');
    return json(response, 200, { received: true });
  } catch (error) { return json(response, error.status || 503, { error: 'Payment notification could not be processed.' }); }
 };
}
export default webhookHandler();
