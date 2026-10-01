interface HeroProps {
  onShopNow: () => void;
  onSell: () => void;
  onSwap: () => void;
}

export default function Hero({ onShopNow, onSell, onSwap }: HeroProps) {
  return (
    <section className="relative min-h-[540px] flex items-center overflow-hidden
                        bg-gradient-to-br from-[#07133f] via-[#123e9b] to-[#245de0]
                        pt-[104px] pb-14 px-[6%] sm:pt-[104px] sm:pb-12 lg:pt-[112px] lg:pb-16">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(96,165,250,0.25),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center w-full max-w-[1280px] mx-auto">

        {/* Content */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs text-blue-100 font-semibold tracking-[0.16em] mb-5">
            BUY <span className="text-blue-300">·</span> SELL <span className="text-blue-300">·</span> SWAP
          </div>

          <h1 className="font-['Fraunces'] font-black text-white leading-tight mb-4
                         text-[clamp(2.2rem,6vw,4.2rem)]">
            Your next device <em className="text-blue-300 not-italic">starts here.</em>
          </h1>

          <p className="text-blue-100 leading-relaxed mb-8 max-w-md mx-auto md:mx-0
                        text-[0.95rem] sm:text-[1.05rem]">
            Shop quality gadgets, sell the device you’re ready to leave behind, or swap it toward something new.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button onClick={onShopNow}
              className="bg-white text-blue-800 font-extrabold rounded-full px-8 py-3.5
                         shadow-[0_8px_28px_rgba(0,0,0,0.2)] hover:bg-blue-50 hover:-translate-y-0.5
                         transition-all text-sm sm:text-base w-full sm:w-auto">
              Shop devices <span aria-hidden="true">→</span>
            </button>
            <button onClick={onSell}
              className="bg-white/10 text-white border border-white/35 font-bold rounded-full px-8 py-3.5
                         hover:bg-white/15 hover:-translate-y-0.5 transition-all text-sm sm:text-base w-full sm:w-auto">
              Sell your device
            </button>
          </div>
          <button onClick={onSwap} className="mt-4 text-blue-100/80 hover:text-white text-sm underline underline-offset-4 decoration-white/30">Looking to upgrade? Swap with us →</button>
        </div>

        <div className="hidden md:flex justify-center items-center">
          <div className="relative w-full max-w-[420px] rounded-[2rem] bg-white p-7 shadow-[0_28px_80px_rgba(2,12,44,0.3)] rotate-[1deg]">
            <img src="/codetech-logo.jpg" alt="CodeTech Gadgets logo" className="w-full h-auto rounded-2xl" />
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-slate-500 text-xs tracking-wide">GOOD TECH, SECOND LIVES</span>
              <span className="text-blue-700 font-bold text-sm">Shop · Sell · Swap</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
