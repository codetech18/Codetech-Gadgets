interface FeaturesProps { onContact: () => void; }

export function BrandsStrip() {
  const brands = ['APPLE', 'SAMSUNG', 'SONY', 'BOSE', 'DJI', 'XIAOMI', 'ANKER', 'GOOGLE'];
  return (
    <div className="bg-slate-50 border-b border-slate-200 py-4 px-[5%] flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
      {brands.map(b => (
        <span key={b} className="font-['Fraunces'] font-bold text-sm sm:text-base text-slate-400 tracking-widest">{b}</span>
      ))}
    </div>
  );
}

export function TradePaths({ onSell, onSwap }: { onSell: () => void; onSwap: () => void }) {
  return (
    <section className="bg-[#f5f7fb] px-[5%] py-12 sm:py-16">
      <div className="mx-auto grid max-w-[1200px] gap-4 md:grid-cols-2">
        <article className="group rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(17,39,87,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(17,39,87,0.1)] sm:p-8">
          <div className="mb-6 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">↗</span><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">SELL A DEVICE</span></div>
          <h2 className="font-['Fraunces'] text-2xl font-black text-[#101a37]">Turn your old tech into cash.</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Tell us what you have. Our team will review it and discuss an offer with you directly on WhatsApp.</p>
          <button onClick={onSell} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#10245d] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">Sell your device <span>→</span></button>
        </article>
        <article className="group rounded-[1.6rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-[0_8px_30px_rgba(17,39,87,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(17,39,87,0.1)] sm:p-8">
          <div className="mb-6 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-blue-700">⇄</span><span className="text-xs font-bold uppercase tracking-[0.14em] text-blue-500">SWAP & UPGRADE</span></div>
          <h2 className="font-['Fraunces'] text-2xl font-black text-[#101a37]">Trade what you have for what’s next.</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Choose the device you want and we’ll help work out your trade-in value and any balance to pay.</p>
          <button onClick={onSwap} className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-800 transition hover:border-blue-400 hover:bg-blue-50">Explore a swap <span>→</span></button>
        </article>
      </div>
    </section>
  );
}

export function Features() {
  const features = [
    { icon: '⌕', title: 'Choose your next device', desc: 'Browse the gadget collection and find something that fits your needs.' },
    { icon: '↗', title: 'Sell on WhatsApp', desc: 'Send us your device details and speak directly with the Gadget team.' },
    { icon: '⇄', title: 'Swap and upgrade', desc: 'Put your current device toward another one and ask us to work out the difference.' },
    { icon: '✓', title: 'Offers confirmed clearly', desc: 'We review the device condition and confirm the final offer with you first.' },
  ];
  return (
    <section className="py-16 sm:py-20 px-[5%] lg:px-[6%] bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3">Why CodeTech Gadgets</span>
          <h2 className="font-['Fraunces'] font-black text-[clamp(1.6rem,3.5vw,2.4rem)] text-blue-950 leading-tight">
            Buy, sell, or swap with a real team.
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-[480px] mx-auto">
            Tell us what you need, what you have, and we’ll help you with the next step.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map(f => (
            <div key={f.title}
              className="p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-[0_4px_20px_rgba(37,99,235,0.12)] hover:-translate-y-1 transition-all bg-white">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="font-['Fraunces'] font-bold text-blue-950 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function About({ onContact }: FeaturesProps) {
  return (
    <section id="about" className="py-16 sm:py-20 px-[5%] lg:px-[6%] bg-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-20 items-center">
        <div className="hidden md:flex bg-gradient-to-br from-blue-700 to-blue-500 rounded-3xl h-[380px] items-center justify-center text-8xl shadow-[0_12px_40px_rgba(37,99,235,0.18)]">
          🌐
        </div>
        <div>
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3">About CodeTech Gadgets</span>
          <h2 className="font-['Fraunces'] font-black text-[clamp(1.5rem,3.5vw,2.2rem)] text-blue-950 leading-tight mb-4">
            A simpler way to move on from tech.
          </h2>
          <p className="text-slate-600 leading-relaxed mb-3 text-sm sm:text-base">
            CodeTech Gadgets makes it easier to find your next device and give your current one a new home.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base">
            Browse the collection, sell directly through WhatsApp, or ask our team to help you swap and upgrade.
          </p>
          <ul className="space-y-2.5 mb-8">
            {['Browse devices in the Gadget collection', 'Sell directly with our team on WhatsApp', 'Swap your current device toward an upgrade', 'Confirm the final offer after inspection'].map(item => (
              <li key={item} className="flex items-center gap-3 text-slate-700 text-sm border-b border-slate-100 pb-2.5 last:border-none">
                <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button onClick={onContact}
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold px-7 py-3 rounded-full text-sm shadow-[0_2px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 transition-all">
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
}

export function Footer({ onNavigate }: { onNavigate: (page: string) => void }) {
  const links = [
    { title: 'Shop', items: [{ label: 'Browse devices', action: () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }, { label: 'Sell your device', action: () => onNavigate('sell') }, { label: 'Swap a device', action: () => onNavigate('swap') }] },
    { title: 'Support', items: [{ label: 'Contact Gadget', action: () => onNavigate('complaint') }, { label: 'About us', action: () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }] },
  ];
  return (
    <footer className="bg-[#0a1628] text-white pt-14 pb-8 px-[5%] lg:px-[6%]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="font-['Fraunces'] font-black text-xl mb-3">CodeTech Gadgets</div>
            <p className="text-blue-200 text-sm leading-relaxed max-w-[240px]">
            Buy, sell, and swap devices with CodeTech Gadgets.
            </p>
          </div>
          {links.map(col => (
            <div key={col.title}>
              <h4 className="font-['Fraunces'] font-bold text-sm text-blue-300 uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map(link => (
                  <li key={link.label}>
                    <button onClick={link.action} className="text-white/65 text-sm hover:text-white transition-colors">{link.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} CodeTech Gadgets. All rights reserved.</p>
          <p className="text-white/40 text-xs">Lagos, Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
