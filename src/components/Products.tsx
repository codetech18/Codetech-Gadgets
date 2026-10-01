import { useState } from 'react';
import { Product } from '../types';

interface ProductsProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All', wearables: 'Wearables', audio: 'Audio',
  'smart-home': 'Smart Home', cameras: 'Cameras',
  phones: 'Phones', laptops: 'Laptops', accessories: 'Accessories',
};

function badgeClass(badge: string) {
  if (badge === 'Sale') return 'bg-red-500';
  if (badge === 'Hot') return 'bg-orange-500';
  return 'bg-blue-600';
}

export default function Products({ products, onAddToCart }: ProductsProps) {
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const [active, setActive] = useState('all');

  const filtered = active === 'all' ? products : products.filter(p => p.category === active);

  return (
    <section id="products" className="py-16 sm:py-20 px-[5%] lg:px-[6%] bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 max-w-[1280px] mx-auto">
        <div>
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2">
            Our Collection
          </span>
          <h2 className="font-['Fraunces'] font-black text-[clamp(1.6rem,3.5vw,2.4rem)] text-blue-950 leading-tight">
            Featured Gadgets
          </h2>
        </div>

        {/* Filter tabs — scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`px-3.5 py-1.5 rounded-lg border text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                ${active === cat
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-slate-200 text-slate-500 bg-white hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}>
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 max-w-[1280px] mx-auto">
        {filtered.map(p => (
          <div key={p.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300
                       hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:border-blue-300 cursor-pointer">
            {/* Image */}
            <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 h-[150px] sm:h-[180px] md:h-[200px] flex items-center justify-center text-5xl sm:text-6xl">
              {p.badge && (
                <span className={`absolute top-3 left-3 ${badgeClass(p.badge)} text-white text-xs font-bold px-2 py-0.5 rounded-md tracking-wide`}>
                  {p.badge}
                </span>
              )}
              {p.emoji}
            </div>

            {/* Info */}
            <div className="p-3 sm:p-4">
              <div className="text-xs sm:text-xs uppercase tracking-widest text-blue-400 font-bold mb-1">{p.brand}</div>
              <div className="font-['Fraunces'] font-bold text-blue-950 leading-snug mb-2 text-sm sm:text-base line-clamp-2">
                {p.name}
              </div>
              <div className="flex items-center gap-1 mb-2.5">
                <span className="text-amber-400 text-xs">{'★'.repeat(Math.floor(p.rating))}</span>
                <span className="text-slate-400 text-xs">({p.reviews.toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <div>
                  <div className="font-['Fraunces'] font-black text-blue-700 text-sm sm:text-base">
                    ₦{p.price.toLocaleString()}
                  </div>
                  {p.oldPrice && (
                    <div className="text-slate-400 text-xs line-through">₦{p.oldPrice.toLocaleString()}</div>
                  )}
                </div>
                <button
                  onClick={() => onAddToCart(p)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0">
                  + Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-semibold">No products in this category yet.</p>
        </div>
      )}
    </section>
  );
}
