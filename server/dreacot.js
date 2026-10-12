export const pickupAddress = '4B Otigba Street, opposite Adeple Street, Computer Village, Ikeja, Lagos';
export function dreacotConfig() {
  const key = process.env.DREACOT_API_KEY, integration = process.env.DREACOT_INTEGRATION_SLUG, vehicle = Number(process.env.DREACOT_VEHICLE_TYPE);
  if (!key || !/^[a-z0-9-]+$/.test(integration ?? '') || !Number.isInteger(vehicle) || vehicle <= 0) throw Object.assign(new Error('Add the Dreacot API key, integration slug and vehicle type in Vercel before quoting delivery.'), { status: 503 });
  if ((process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_') ?? false) !== key.startsWith('dd_test')) throw Object.assign(new Error('Paystack and Dreacot must both use test mode or both use live mode.'), { status: 503 });
  return { key, integration, vehicle };
}
export async function dreacot(path, body) {
  const { key, integration } = dreacotConfig();
  const response = await fetch(`https://api.dreacotdelivery.com/api/partnership/v1/${integration}${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.error !== false || !result.data) throw Object.assign(new Error('Dreacot could not complete this request. Check service coverage and your partner account.'), { status: 502 });
  return result.data;
}
export async function quoteDelivery(order) {
  if (!/^lagos(?: state)?$/i.test(order.customer.state.trim())) throw Object.assign(new Error('Dreacot currently quotes Lagos deliveries. Arrange this nationwide delivery manually.'), { status: 400 });
  const { integration, vehicle } = dreacotConfig();
  const quote = await dreacot('/order/delivery/calculator', { pick_up_address: pickupAddress, drop_off_address: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`, drop_off_details: { name: order.customer.name, phone: order.customer.phone, email: order.customer.email }, vehicle_type: vehicle, source: integration, channel: 'checkout' });
  if (typeof quote.fare_code !== 'string' || !quote.fare_code || !Number.isFinite(Number(quote.delivery_fee)) || Number(quote.delivery_fee) < 0) throw new Error('Invalid Dreacot quote.');
  return { fareCode: quote.fare_code, deliveryFee: Number(quote.delivery_fee) };
}
export async function deliveryTask(orderId) {
  const result = await dreacot('/order/tasks/get');
  const task = result.orders?.find(task => String(task.order?.id) === String(orderId));
  return task ? { trackingCode: typeof task.order?.order_code === 'string' ? task.order.order_code : '', courierStatus: String(task.status ?? 'Pending') } : {};
}
