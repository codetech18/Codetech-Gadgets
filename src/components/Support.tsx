import { useState } from 'react';

interface SupportProps {
  onToast: (msg: string) => void;
}

export default function Support({ onToast }: SupportProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    onToast('✅ Complaint submitted!');
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[88px] sm:pt-[90px] px-[5%] pb-16">
      <div className="max-w-[680px] mx-auto py-10">
        <div className="text-center mb-8">
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3">Support</span>
          <h2 className="font-['Fraunces'] font-black text-[clamp(1.6rem,4vw,2.2rem)] text-blue-950 mb-2">Get In Touch</h2>
          <p className="text-slate-500">We're here to help. Send us your complaint or query.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-[0_4px_20px_rgba(37,99,235,0.12)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1.5">First Name</label>
              <input type="text" placeholder="Akorede" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1.5">Last Name</label>
              <input type="text" placeholder="Alao" className="input-field" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-blue-950 mb-1.5">Email</label>
            <input type="email" placeholder="you@example.com" className="input-field" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-blue-950 mb-1.5">Order Number</label>
            <input type="text" placeholder="e.g. ORD-123456" className="input-field" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-blue-950 mb-1.5">Issue Type</label>
            <select className="input-field bg-white">
              <option>Select issue type</option>
              <option>Delayed Delivery</option>
              <option>Wrong Item</option>
              <option>Damaged Product</option>
              <option>Refund Request</option>
              <option>Other</option>
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-blue-950 mb-1.5">Message</label>
            <textarea rows={4} placeholder="Describe your issue in detail..."
              className="input-field resize-none" />
          </div>

          <button onClick={handleSubmit}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all hover:shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5">
            Submit Complaint
          </button>

          {submitted && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-blue-700 font-semibold text-sm">
              ✅ Your complaint has been submitted. We'll respond within 24 hours.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
