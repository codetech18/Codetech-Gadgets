import { FormEvent, useState } from 'react';
import { Page } from '../types';

const WHATSAPP_NUMBER = '2349058977101';

interface TradeRequestProps {
  mode: Extract<Page, 'sell' | 'swap'>;
  onBack: () => void;
  desiredProduct?: string;
}

export default function TradeRequest({ mode, onBack, desiredProduct = '' }: TradeRequestProps) {
  const isSwap = mode === 'swap';
  const [deviceType, setDeviceType] = useState('Phone');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('');
  const [condition, setCondition] = useState('Good');
  const [desiredDevice, setDesiredDevice] = useState(desiredProduct);
  const [notes, setNotes] = useState('');

  function sendToWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = [
      `Hi CodeTech Gadgets, I want to ${isSwap ? 'swap' : 'sell'} my device.`,
      `Device type: ${deviceType}`,
      `Brand: ${brand.trim()}`,
      `Model: ${model.trim()}`,
      storage.trim() ? `Storage: ${storage.trim()}` : '',
      `Condition: ${condition}`,
      isSwap && desiredDevice.trim() ? `Device I want: ${desiredDevice.trim()}` : '',
      notes.trim() ? `More details: ${notes.trim()}` : '',
      'Please let me know the next step and an estimated offer. I understand the final offer is confirmed after inspection.',
    ].filter(Boolean).join('\n');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.location.assign(url);
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500';

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 pb-16 pt-[42px] sm:px-6 sm:pt-[48px]">
      <div className="trade-request-grid mx-auto grid max-w-6xl gap-8 lg:items-start">
        <section className="pt-2 lg:sticky lg:top-28">
          <button onClick={onBack} className="mb-8 text-sm font-semibold text-blue-700 hover:text-blue-900">← Back to CodeTech</button>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            {isSwap ? 'Trade up with CodeTech' : 'Sell with CodeTech'}
          </div>
          <h1 className="max-w-lg font-['Manrope'] text-4xl font-extrabold leading-tight tracking-tight text-[#101a37] sm:text-5xl">
            {isSwap ? <>A new device.<br /><span className="text-blue-700">A smarter swap.</span></> : <>Ready to part<br /><span className="text-blue-700">with your device?</span></>}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
            {isSwap
              ? 'Tell us what you have and what you want next. We’ll assess your device and confirm the trade-in value and any price difference with you on WhatsApp.'
              : 'Share a few details and continue straight to WhatsApp. Our team will review your device and discuss an estimated offer with you.'}
          </p>
          <div className="mt-8 space-y-4">
            {(isSwap ? ['Tell us about your current device', 'Choose what you want to swap for', 'Confirm the offer after inspection'] : ['Tell us about your device', 'Send details to our WhatsApp team', 'Agree on an offer after inspection']).map((step, index) => (
              <div key={step} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">0{index + 1}</span>
                {step}
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-sm border-l-2 border-blue-300 pl-4 text-xs leading-5 text-slate-500">Our team confirms the final offer after reviewing the device condition.</p>
        </section>

        <form onSubmit={sendToWhatsApp} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(13,35,83,0.08)] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="font-['Manrope'] text-2xl font-extrabold tracking-tight text-[#101a37]">Your device</h2>
              <p className="mt-1 text-sm text-slate-500">A few details help us respond with a useful estimate.</p>
            </div>
            <span className="rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700">WhatsApp next</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Device type</span><select className={inputClass} value={deviceType} onChange={e => setDeviceType(e.target.value)}>{['Phone', 'Tablet', 'Laptop', 'Smartwatch', 'Console', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label><span className={labelClass}>Brand</span><input required className={inputClass} value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Apple" /></label>
            <label><span className={labelClass}>Model</span><input required className={inputClass} value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. iPhone 13 Pro" /></label>
            <label><span className={labelClass}>Storage (optional)</span><input className={inputClass} value={storage} onChange={e => setStorage(e.target.value)} placeholder="e.g. 256 GB" /></label>
            <label className={isSwap ? '' : 'sm:col-span-2'}><span className={labelClass}>Condition</span><select className={inputClass} value={condition} onChange={e => setCondition(e.target.value)}>{['Like new', 'Good', 'Fair', 'Damaged / faulty'].map(x => <option key={x}>{x}</option>)}</select></label>
            {isSwap && <label><span className={labelClass}>What would you like?</span><input required className={inputClass} value={desiredDevice} onChange={e => setDesiredDevice(e.target.value)} placeholder="e.g. Samsung S24, iPhone 15" /></label>}
            <label className="sm:col-span-2"><span className={labelClass}>Anything else we should know? (optional)</span><textarea className={`${inputClass} min-h-24 resize-y`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mention faults, repairs, included accessories, or questions." /></label>
          </div>

          <button type="submit" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#146b4b] px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(20,107,75,0.2)] transition hover:-translate-y-0.5 hover:bg-[#105b40] focus:outline-none focus:ring-4 focus:ring-green-100">
            Continue on WhatsApp <span aria-hidden="true">↗</span>
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-400">WhatsApp opens with your device details ready to send. You can review the message before sending.</p>
        </form>
      </div>
    </main>
  );
}
