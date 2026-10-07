import { CartItem, Product } from '../types';

interface CartProps {
  cart: CartItem[];
  onChangeQty: (id: Product['id'], delta: number) => void;
  onRemove: (id: Product['id']) => void;
  onClear: () => void;
  onCheckout: (promoDiscount: number) => void;
  onShopNow: () => void;
}

export default function Cart({ cart, onChangeQty, onRemove, onClear, onCheckout, onShopNow }: CartProps) {
  const subtotal = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const totalQty = cart.reduce((s, x) => s + x.qty, 0);

  return (
    <div className="min-h-screen bg-slate-50 pt-[80px] sm:pt-[90px]">
      <div className="max-w-[1100px] mx-auto px-[4%] sm:px-[5%] py-8 pb-16">
        <h2 className="font-['Manrope'] font-extrabold text-2xl sm:text-[2rem] text-blue-950 mb-6">Your purchase request</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* Items */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_1px_3px_rgba(37,99,235,0.08)]">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-['Manrope'] font-bold text-blue-950">{totalQty} Item{totalQty !== 1 ? 's' : ''}</h3>
              {cart.length > 0 && (
                <button onClick={onClear} className="text-slate-400 text-sm font-semibold hover:text-red-500 transition-colors">Remove All</button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="text-4xl mb-4 text-blue-700">—</div>
                <h3 className="font-['Manrope'] font-bold text-blue-950 text-xl mb-2">Your bag is empty</h3>
                <p className="text-slate-500 mb-6 text-sm">Looks like you haven't added anything yet.</p>
                <button onClick={onShopNow} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold px-6 py-2.5 rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all">
                  Shop Now →
                </button>
              </div>
            ) : cart.map(item => (
              <div key={item.cartId} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 border-b border-slate-100 last:border-none hover:bg-slate-50 transition-colors">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">{item.emoji}</span>}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-0.5">{item.brand}</div>
                  <div className="font-['Manrope'] font-bold text-blue-950 text-sm sm:text-base truncate">{item.name}</div>
                  {item.selectedVariantId && <div className="text-xs text-slate-500">{item.variants?.find(option => option.id === item.selectedVariantId)?.storage}</div>}
                  <div className="text-blue-600 font-bold text-sm mt-0.5">₦{(item.price * item.qty).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => onChangeQty(item.cartId, -1)} className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-blue-600 font-bold flex items-center justify-center hover:bg-blue-50 hover:border-blue-400 transition-all">−</button>
                  <span className="font-['Manrope'] font-bold text-blue-950 w-5 text-center text-sm">{item.qty}</span>
                  <button onClick={() => onChangeQty(item.cartId, 1)} className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-blue-600 font-bold flex items-center justify-center hover:bg-blue-50 hover:border-blue-400 transition-all">+</button>
                </div>
                <button onClick={() => onRemove(item.cartId)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all flex-shrink-0 text-sm">✕</button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_1px_3px_rgba(37,99,235,0.08)] lg:sticky lg:top-[90px]">
            <h3 className="font-['Manrope'] font-extrabold text-blue-950 text-lg pb-4 border-b border-slate-100 mb-4">Request summary</h3>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-semibold text-slate-700">₦{subtotal.toLocaleString()}</span></div>
              <p className="text-xs leading-5 text-slate-500">We’ll confirm stock, delivery options, and payment with you on WhatsApp.</p>
            </div>
            <div className="flex justify-between items-center font-['Manrope'] font-extrabold text-blue-950 pt-3 border-t border-slate-200 mb-5">
              <span className="text-base">Items total</span>
              <span className="text-blue-600 text-xl">₦{subtotal.toLocaleString()}</span>
            </div>
            <button onClick={() => onCheckout(0)} disabled={cart.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-sm sm:text-base disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed enabled:hover:shadow-[0_4px_20px_rgba(37,99,235,0.3)] enabled:hover:-translate-y-0.5">
              Send purchase request
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">This sends an enquiry. We’ll confirm availability, delivery and payment before your order is placed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
