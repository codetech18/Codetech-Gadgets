import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function checkoutInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Invalid checkout request.');
  const customer = { name: text(body.customer?.name, 100), email: text(body.customer?.email, 254).toLowerCase(), phone: text(body.customer?.phone, 30), address: text(body.customer?.address, 500), city: text(body.customer?.city, 100), state: text(body.customer?.state, 100) };
  if (!customer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.phone.replace(/\D/g, '').length < 10) invalid('Enter your name, valid email address and phone number.');
  const fulfillment = body.fulfillment;
  if (!['pickup', 'delivery'].includes(fulfillment)) invalid('Choose store pickup or delivery.');
  if (fulfillment === 'delivery' && (!customer.address || !customer.city || !customer.state)) invalid('Enter your delivery address, city and state.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) invalid('Choose between one and twenty items.');
  const items = body.items.map(item => {
    if (!item || typeof item !== 'object') invalid('Choose valid items and quantities.');
    const productId = text(item.productId, 200), variantId = text(item.variantId, 200);
    if (!productId || productId.includes('/') || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) invalid('Choose valid items and quantities.');
    return { productId, variantId, quantity: item.quantity };
  });
  if (items.reduce((total, item) => total + item.quantity, 0) > 20 || new Set(items.map(item => `${item.productId}:${item.variantId}`)).size !== items.length) invalid('Combine duplicate items and choose at most twenty units.');
  if (body.deliveryFeeAcknowledged !== true && fulfillment === 'delivery') invalid('Confirm that delivery is charged separately.');
  return { customer, fulfillment, items };
}

export function quoteItems(items, products) {
  const requestedByProduct = new Map();
  const lines = items.map(item => {
    const product = products.get(item.productId);
    if (!product || product.status !== 'available') invalid('An item is no longer available. Please update your bag.');
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find(variant => variant.id === item.variantId);
    if (variants.length && !variant) invalid('Select an available storage option.');
    if (!variants.length && item.variantId) invalid('This storage option is no longer available.');
    const stock = Number(variant ? variant.stock : product.stockQuantity ?? product.stock ?? 0);
    const priceKobo = Math.round(Number(variant ? variant.price : product.priceNgn ?? product.price) * 100);
    if (!Number.isSafeInteger(priceKobo) || priceKobo <= 0 || !Number.isInteger(stock) || stock < item.quantity) invalid('An item has insufficient stock or its price has changed. Please update your bag.');
    requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
    return { ...item, name: text(product.name ?? product.title), brand: text(product.brand), category: text(product.category), condition: text(product.condition), listingGroup: product.listingGroup === 'goodies' ? 'goodies' : 'devices', storage: text(variant?.storage), image: text(product.imageUrl ?? product.image, 2000), priceKobo };
  });
  for (const [id, quantity] of requestedByProduct) {
    const stock = Number(products.get(id).stockQuantity ?? products.get(id).stock ?? 0);
    if (!Number.isInteger(stock) || stock < quantity) invalid('There is not enough stock for this selection.');
  }
  const amount = lines.reduce((total, line) => total + line.priceKobo * line.quantity, 0);
  if (!Number.isSafeInteger(amount) || amount <= 0) invalid('The item total is invalid.');
  return { lines, amount };
}

export function assertPayment(order, payment, mode) {
  if (payment.status !== 'success' || payment.reference !== order.reference || payment.currency !== 'NGN' || payment.amount !== order.amount || payment.domain !== mode || text(payment.customer?.email, 254).toLowerCase() !== order.customer.email) {
    throw Object.assign(new Error('Payment details could not be matched to this order.'), { status: 409 });
  }
}

export async function completeOrder(db, reference, payment, mode) {
  const orderRef = db.collection('paymentOrders').doc(reference);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) return null; // Other websites may share this Paystack account.
    const order = snapshot.data();
    assertPayment(order, payment, mode);
    if (['paid', 'paid_needs_review'].includes(order.status)) return order;
    const productIds = [...new Set(order.items.map(item => item.productId))];
    const productRefs = productIds.map(id => db.collection('products').doc(id));
    const products = new Map();
    for (const ref of productRefs) { const product = await transaction.get(ref); products.set(ref.id, product.exists ? product.data() : null); }
    let stockAvailable = true;
    try { quoteItems(order.items, products); } catch { stockAvailable = false; }
    const paidAt = new Date(payment.paid_at || Date.now());
    const timestamp = Timestamp.fromDate(Number.isFinite(paidAt.getTime()) ? paidAt : new Date());
    if (stockAvailable) {
      for (const ref of productRefs) {
        const product = products.get(ref.id);
        const soldLines = order.items.filter(item => item.productId === ref.id);
        const quantity = soldLines.reduce((total, item) => total + item.quantity, 0);
        const stockAfter = Number(product.stockQuantity ?? product.stock ?? 0) - quantity;
        const variants = (product.variants ?? []).map(variant => ({ ...variant, stock: variant.stock - soldLines.filter(line => line.variantId === variant.id).reduce((total, line) => total + line.quantity, 0) }));
        const prices = variants.filter(variant => variant.stock > 0).map(variant => variant.price);
        transaction.update(ref, { stockQuantity: stockAfter, ...(variants.length ? { variants, ...(prices.length ? { priceNgn: Math.min(...prices) } : {}) } : {}), status: stockAfter > 0 ? 'available' : 'sold', backInStock: false, lastSoldAt: timestamp, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    // One private sale per unit preserves the existing inventory sale/reversal model.
    order.items.forEach((item, lineIndex) => {
      for (let unit = 0; unit < item.quantity; unit++) {
        transaction.create(db.collection('sales').doc(`${reference}-${lineIndex}-${unit}`), {
          productId: item.productId, productName: item.name, brand: item.brand, category: item.category, listingGroup: item.listingGroup, condition: item.condition, imageUrl: item.image,
          variantId: item.variantId, variantStorage: item.storage, quantity: 1, soldPriceNgn: item.priceKobo / 100,
          serialNumber: '', hasNoIdentifier: false, saleSource: 'inventory', saleChannel: 'paystack', paymentReference: reference, stockDeducted: stockAvailable, soldAt: timestamp, createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
    const update = { status: stockAvailable ? 'paid' : 'paid_needs_review', paidAt: timestamp, updatedAt: FieldValue.serverTimestamp(), deliveryStatus: order.fulfillment === 'delivery' ? 'awaiting_fee_agreement' : 'store_pickup' };
    transaction.update(orderRef, update);
    return { ...order, ...update };
  });
}

export function publicReceipt(order) {
  return { reference: order.reference, status: order.status, amount: order.amount, fulfillment: order.fulfillment, deliveryStatus: order.deliveryStatus, trackingCode: order.trackingCode || null };
}
