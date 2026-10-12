import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../lib/firebase';

type PaymentOrder = {
  reference: string; status: string; amount: number; fulfillment: string; deliveryStatus: string;
  deliveryFee: number | null; trackingCode: string; courierStatus: string; createdAt: string;
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string };
  items: Array<{ name: string; storage: string; quantity: number }>;
};
const money = (amount: number) => `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

async function deliveryRequest(body: unknown) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in to manage orders.');
  const response = await fetch('/api/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(35000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load orders.');
  return result;
}

export default function PaymentOrders() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try { const result = await deliveryRequest({ action: 'list' }); setOrders(result.orders); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load orders.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function action(order: PaymentOrder, action: 'quote' | 'book' | 'track') {
    if (busy) return;
    if (action === 'book' && !window.confirm(`Confirm the separate ${money(order.deliveryFee ?? 0)} delivery fee has been agreed with ${order.customer.name} and payment arrangements are confirmed. Book Dreacot now? The booking uses your Dreacot wallet.`)) return;
    setBusy(order.reference); setError('');
    try {
      await deliveryRequest({ action, reference: order.reference, ...(action === 'book' ? { deliveryFeeConfirmed: true, expectedFee: order.deliveryFee } : {}) });
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update delivery.'); }
    finally { setBusy(null); }
  }
  return <section className="admin-inventory-panel">
    <div className="admin-inventory-heading"><div><h2>Online orders</h2><p>The latest 100 Paystack checkout attempts. Delivery fees are agreed separately.</p></div><button className="admin-refresh-button" onClick={() => void refresh()} disabled={loading || Boolean(busy)}>↻ Refresh</button></div>
    {error && <p role="alert" className="admin-inventory-error">{error}</p>}
    {loading ? <p className="admin-inventory-empty">Loading online orders…</p> : orders.length === 0 ? <p className="admin-inventory-empty">Online orders appear here after customers begin checkout.</p> : <div className="admin-online-orders">
      {orders.map(order => <article key={order.reference} className="admin-online-order">
        <div className="admin-order-title"><div><strong>{order.customer.name}</strong><small>{order.createdAt ? new Date(order.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : ''}</small></div><span className={`admin-sale-status ${order.status === 'paid_needs_review' ? 'reversed' : ''}`}>{order.status === 'paid' ? 'Payment received' : order.status === 'paid_needs_review' ? 'Paid · stock review needed' : 'Awaiting payment'}</span></div>
        <p className="admin-order-reference">{order.reference}</p>
        <p>{order.items.map(item => `${item.name}${item.storage ? ` (${item.storage})` : ''} × ${item.quantity}`).join(' · ')}</p>
        <strong>{money(order.amount / 100)} · items only</strong>
        <p>{order.customer.phone} · {order.customer.email}</p>
        {order.fulfillment === 'pickup' ? <p>Store pickup · confirm collection time with the customer.</p> : <>
          <p><strong>Delivery:</strong> {order.customer.address}, {order.customer.city}, {order.customer.state}</p>
          <p>Dreacot Delivery · {order.courierStatus || (order.deliveryStatus === 'booked' ? 'Booked' : order.deliveryStatus === 'quoted' ? 'Quote ready' : order.deliveryStatus === 'booking_unknown' || order.deliveryStatus === 'booking' ? 'Check booking in Dreacot' : 'Awaiting delivery fee agreement')}</p>
          {order.deliveryFee !== null && <p>Separate delivery quote: <strong>{money(order.deliveryFee)}</strong></p>}
          {order.status === 'paid' && <div className="admin-order-actions">
            {!/^lagos(?: state)?$/i.test(order.customer.state.trim()) ? <p>Dreacot’s current API coverage is Lagos. Arrange this nationwide delivery manually.</p> : <>
              {['awaiting_fee_agreement', 'quoted'].includes(order.deliveryStatus) && <button className="admin-refresh-button" disabled={Boolean(busy)} onClick={() => void action(order, 'quote')}>{busy === order.reference ? 'Working…' : 'Get Dreacot quote'}</button>}
              {order.deliveryStatus === 'quoted' && <button className="admin-primary-button" disabled={Boolean(busy)} onClick={() => void action(order, 'book')}>Confirm fee & book delivery</button>}
              {order.deliveryStatus === 'booked' && <button className="admin-refresh-button" disabled={Boolean(busy)} onClick={() => void action(order, 'track')}>Refresh tracking</button>}
              {['booking', 'booking_unknown'].includes(order.deliveryStatus) && <p>A previous booking may have been accepted. Check your Dreacot account before making another.</p>}
            </>}
            {order.trackingCode && <a className="admin-refresh-button" href={`https://www.dreacotdelivery.com/track/${encodeURIComponent(order.trackingCode)}`} target="_blank" rel="noreferrer">Track delivery ↗</a>}
          </div>}
        </>}
        {order.status === 'paid_needs_review' && <p className="admin-order-attention">Payment was received but stock changed before confirmation. Contact the customer to confirm an alternative or arrange a refund in Paystack before dispatching.</p>}
      </article>)}
    </div>}
  </section>;
}
