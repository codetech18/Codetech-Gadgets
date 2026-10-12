import { FormEvent, useEffect, useRef, useState } from 'react';
import type { CartItem } from '../types';

type PendingPayment = { reference: string; token: string; items: Array<{ cartId: string; quantity: number }> };
type Receipt = { reference: string; status: string; amount: number; fulfillment: string; deliveryStatus: string; trackingCode?: string };
const storageKey = 'codetech-pending-payment';

function pendingPayment(): PendingPayment | null {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get('payment_reference'), token = params.get('payment_token');
  let saved: PendingPayment | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* Receipt link still works when browser storage is unavailable. */ }
  if (reference && token) saved = { reference, token, items: saved?.reference === reference ? saved.items : [] };
  if (!saved || !/^ct-[a-f0-9-]{36}$/.test(saved.reference) || !/^[a-f0-9]{64}$/i.test(saved.token)) return null;
  return { ...saved, items: Array.isArray(saved.items) ? saved.items.filter(item => typeof item?.cartId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0) : [] };
}

async function requestPayment(body: unknown) {
  const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Payment is temporarily unavailable.');
  return result;
}

export default function PaystackCheckout({ cart, onPaid }: { cart: CartItem[]; onPaid: (items: PendingPayment['items']) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingPayment | null>(pendingPayment);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '' });
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryFeeAcknowledged, setDeliveryFeeAcknowledged] = useState(false);
  const completed = useRef<string | null>(null);
  const verifying = useRef(false);
  const amount = cart.reduce((total, item) => total + Math.round(item.price * 100) * item.qty, 0);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/checkout').then(response => response.json()).then(result => { if (!cancelled) setEnabled(result.enabled === true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!pending) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch { /* Use the in-memory receipt. */ }
    const params = new URLSearchParams(window.location.search);
    for (const key of ['payment_reference', 'payment_token', 'reference', 'trxref']) params.delete(key);
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, [pending]);

  async function verify() {
    if (!pending || verifying.current) return;
    verifying.current = true; setBusy(true); setError('');
    try {
      const result: Receipt = await requestPayment({ action: 'verify', reference: pending.reference, token: pending.token });
      setReceipt(result);
      if (['paid', 'paid_needs_review'].includes(result.status) && completed.current !== pending.reference) {
        let handled = false;
        try { handled = sessionStorage.getItem('codetech-confirmed-payment') === pending.reference; sessionStorage.setItem('codetech-confirmed-payment', pending.reference); } catch { /* The ref also guards repeated checks within this view. */ }
        completed.current = pending.reference;
        if (!handled) onPaid(pending.items);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not confirm payment. Keep your reference and contact CodeTech.'); }
    finally { verifying.current = false; setBusy(false); }
  }
  useEffect(() => { if (pending) void verify(); }, [pending]);

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (busy || !cart.length) return;
    setBusy(true); setError('');
    try {
      const result = await requestPayment({ action: 'initialize', customer, fulfillment, deliveryFeeAcknowledged, expectedAmount: amount, items: cart.map(item => ({ productId: String(item.id), variantId: item.selectedVariantId || '', quantity: item.qty })) });
      const payment = { reference: result.reference, token: result.token, items: cart.map(item => ({ cartId: item.cartId, quantity: item.qty })) };
      try { sessionStorage.setItem(storageKey, JSON.stringify(payment)); } catch { /* The callback carries the receipt token too. */ }
      window.location.assign(result.authorizationUrl);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not open payment. Try again.'); setBusy(false); }
  }

  return <div className="mt-5 border-t border-slate-200 pt-5">
    {pending && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4" aria-live="polite">
      <strong className="block text-sm text-blue-950">{busy ? 'Checking payment…' : receipt?.status === 'paid' ? 'Payment received' : receipt?.status === 'paid_needs_review' ? 'Payment received · confirmation needed' : receipt?.status === 'unpaid' ? 'Payment was not completed' : 'Payment confirmation pending'}</strong>
      <p className="mt-2 break-all text-xs text-slate-600">Reference: {pending.reference}</p>
      {receipt && ['paid', 'paid_needs_review'].includes(receipt.status) && <p className="mt-2 text-xs leading-5 text-slate-600">₦{(receipt.amount / 100).toLocaleString('en-NG')} received for your items. {receipt.status === 'paid_needs_review' ? 'Please contact us with this reference so we can confirm availability or arrange a refund.' : receipt.fulfillment === 'delivery' ? 'We’ll contact you to agree the separate delivery fee and arrange delivery.' : 'Contact us to confirm your collection time at our Ikeja store.'}</p>}
      {receipt?.trackingCode && <a className="mt-2 block text-sm font-semibold text-blue-800 underline" href={`https://www.dreacotdelivery.com/track/${encodeURIComponent(receipt.trackingCode)}`} target="_blank" rel="noreferrer">Track your Dreacot delivery ↗</a>}
      <div className="mt-3 flex gap-3"><button disabled={busy} className="text-xs font-bold text-blue-800 disabled:opacity-50" onClick={() => void verify()}>Check again</button><a className="text-xs font-bold text-blue-800" href={`https://wa.me/2349058977101?text=${encodeURIComponent(`Hi CodeTech, please help with my payment ${pending.reference}.`)}`} target="_blank" rel="noreferrer">Contact CodeTech ↗</a></div>
      {!busy && <button type="button" className="mt-3 text-xs text-slate-500 underline" onClick={() => { setPending(null); setReceipt(null); setError(''); try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ } }}>Close payment details</button>}
    </div>}
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">{error}</p>}
    {enabled && cart.length > 0 && !open && <button type="button" disabled={busy} onClick={() => setOpen(true)} className="w-full rounded-xl bg-green-800 py-3 text-sm font-bold text-white disabled:opacity-50">Pay online with Paystack</button>}
    {enabled && cart.length > 0 && open && <form onSubmit={pay} className="space-y-3">
      <h4 className="text-sm font-bold text-blue-950">Payment and contact details</h4>
      <fieldset disabled={busy} className="space-y-3">
        {(['name', 'email', 'phone'] as const).map(field => <label key={field} className="block text-xs font-semibold text-slate-700">{field === 'name' ? 'Full name' : field === 'email' ? 'Email address' : 'Phone number'}<input required type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} autoComplete={field === 'phone' ? 'tel' : field} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={customer[field]} onChange={event => setCustomer({ ...customer, [field]: event.target.value })} /></label>)}
        <label className="block text-xs font-semibold text-slate-700">Receive your order<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={fulfillment} onChange={event => setFulfillment(event.target.value as 'delivery' | 'pickup')}><option value="delivery">Delivery · fee arranged separately</option><option value="pickup">Collect at our Ikeja store</option></select></label>
        {fulfillment === 'delivery' && <>
          {(['address', 'city', 'state'] as const).map(field => <label key={field} className="block text-xs font-semibold capitalize text-slate-700">{field === 'address' ? 'Delivery address' : field}<input required autoComplete={field === 'address' ? 'street-address' : field === 'city' ? 'address-level2' : 'address-level1'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={customer[field]} onChange={event => setCustomer({ ...customer, [field]: event.target.value })} /></label>)}
          <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950"><input required type="checkbox" className="mt-1" checked={deliveryFeeAcknowledged} onChange={event => setDeliveryFeeAcknowledged(event.target.checked)} /><span>I’m paying for the items only. CodeTech will contact me to agree the separate delivery fee. Dreacot handles supported Lagos deliveries; other locations are arranged with our team.</span></label>
        </>}
        {fulfillment === 'pickup' && <p className="text-xs leading-5 text-slate-500">Pickup: 4b Otigba Street, Computer Village, Ikeja, Lagos. We’ll confirm your collection time.</p>}
        <button disabled={busy} className="w-full rounded-xl bg-green-800 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Opening secure payment…' : `Pay ₦${(amount / 100).toLocaleString('en-NG')} with Paystack`}</button>
        <button type="button" onClick={() => setOpen(false)} className="w-full text-xs text-slate-500">Cancel online checkout</button>
      </fieldset>
    </form>}
  </div>;
}
