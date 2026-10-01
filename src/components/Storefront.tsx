import { useEffect, useMemo, useState } from 'react';
import { Product } from '../types';

type StorefrontProps = {
  view: 'home' | 'devices' | 'goodies';
  products: Product[];
  catalogStatus: 'preview' | 'loading' | 'live' | 'error';
  onShop: () => void;
  onSell: () => void;
  onSwap: () => void;
  onGoodies: () => void;
  onAdmin: () => void;
  onOpenProduct: (product: Product) => void;
};

const categories = ['All devices', 'Phones', 'Laptops', 'Tablets', 'Audio', 'Wearables'];
const categoryKeys: Record<string, string> = {
  'All devices': 'all', Phones: 'phones', Laptops: 'laptops', Tablets: 'tablets', Audio: 'audio', Wearables: 'wearables',
};
const money = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="store-arrow">{diagonal ? '↗' : '→'}</span>;
}

function DeviceCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  return (
    <button className="device-card" onClick={onOpen} aria-label={`View ${product.name}`}>
      <div className="device-image-wrap">
        {product.badge && <span className="device-badge">{product.badge}</span>}
        {product.image ? <img className="device-image" src={product.image} alt={product.name} loading="lazy" /> : <div className="device-image-placeholder">CodeTech Gadgets</div>}
        <span className="device-open">View details <Arrow diagonal /></span>
      </div>
      <div className="device-copy">
        <div className="device-meta"><span>{product.brand}</span><span>{product.condition || 'Quality checked'}</span></div>
        <h3>{product.name}</h3>
        {product.conditionNotes && <p className="device-condition-note">{product.conditionNotes}</p>}
        <div className="device-price-line"><strong>{money(product.price)}</strong><span>Available now</span></div>
      </div>
    </button>
  );
}

export default function Storefront({ view, products, catalogStatus, onShop, onSell, onSwap, onGoodies, onAdmin, onOpenProduct }: StorefrontProps) {
  const [activeCategory, setActiveCategory] = useState('All devices');
  const [search, setSearch] = useState('');
  useEffect(() => setActiveCategory('All devices'), [view]);
  const visibleProducts = useMemo(() => products.filter(product => {
    const matchesGroup = view === 'goodies' ? product.listingGroup === 'goodies' : product.listingGroup !== 'goodies';
    const matchesCategory = categoryKeys[activeCategory] === 'all' || product.category === categoryKeys[activeCategory];
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
    return matchesGroup && matchesCategory && matchesSearch;
  }), [products, activeCategory, search, view]);

  return (
    <main className="storefront">
      {view === 'home' ? <>
      <section className="store-hero">
        <div className="store-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> TECH THAT MOVES WITH YOU</p>
          <h1>Find your next.<br /><span>Pass yours on.</span></h1>
          <p className="store-hero-description">Shop quality devices, sell what you no longer use, or swap it for something new. A better way to make every upgrade count.</p>
          <div className="store-hero-actions">
            <button className="button-primary" onClick={onShop}>Shop devices <Arrow /></button>
            <button className="button-text" onClick={onSwap}>Explore swaps <Arrow /></button>
          </div>
          <div className="hero-caption"><span className="caption-rule" /> A simple way to buy, sell and swap tech.</div>
        </div>
        <div className="store-hero-visual">
          <img className="hero-product-asset" src="/hero-devices.png" alt="A smartphone, laptop, and smartwatch shown together" />
        </div>
        <button className="hero-sell-link" onClick={onSell}>Have a device to sell? <span>Get started <Arrow diagonal /></span></button>
      </section>

      <section className="value-strip" aria-label="How CodeTech works">
        <div><span className="value-number">01</span><p><strong>Buy with clarity</strong><small>Know the condition before you choose.</small></p></div>
        <div><span className="value-number">02</span><p><strong>Sell directly</strong><small>Talk to our team on WhatsApp.</small></p></div>
        <div><span className="value-number">03</span><p><strong>Swap with purpose</strong><small>Put your current device toward an upgrade.</small></p></div>
      </section>
      </> : <section className="catalog-page-intro">
        <p className="eyebrow">{view === 'goodies' ? 'LIMITED DEALS' : 'SHOP THE COLLECTION'}</p>
        <h1>{view === 'goodies' ? 'Goodies' : 'Devices'}</h1>
        <p>{view === 'goodies' ? 'Unusually good prices on available devices. Check each listing for clear condition details.' : 'Browse UK-used and brand-new devices available now.'}</p>
      </section>}

      <section className="catalog-section" id="products">
        <div className="catalog-heading">
          <div><p className="eyebrow">{view === 'goodies' ? 'GOODIES' : view === 'devices' ? 'DEVICES' : 'THE CURRENT COLLECTION'}</p><h2>{view === 'goodies' ? 'Good finds, fair prices.' : 'Good tech, ready for you.'}</h2><p className="section-description">{view === 'goodies' ? 'Reduced-price devices with their condition clearly described.' : 'Browse available devices and compare condition and price.'}</p>{catalogStatus === 'preview' && <p className="sample-note">Preview catalog — sample devices and prices until live inventory is connected.</p>}{catalogStatus === 'live' && <p className="sample-note">Live inventory · Availability can change as devices sell.</p>}</div>
          <label className="catalog-search"><span aria-hidden="true">⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search devices" aria-label="Search devices" /></label>
        </div>
        <div className="catalog-tools">
          <div className="category-tabs" role="tablist" aria-label="Filter by device category">
            {categories.map(category => <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{view === 'goodies' && category === 'All devices' ? 'All goodies' : category}</button>)}
          </div>
          <span className="results-count">{visibleProducts.length} {view === 'goodies' ? 'goodies' : 'devices'}</span>
        </div>
        {catalogStatus === 'loading' ? <div className="empty-catalog"><strong>Loading current inventory…</strong><span>Fetching available devices.</span></div> : catalogStatus === 'error' ? <div className="empty-catalog"><strong>Inventory is temporarily unavailable.</strong><span>Please try again in a moment or contact us on WhatsApp.</span></div> : visibleProducts.length ? <div className="device-grid">
          {visibleProducts.map(product => <DeviceCard key={product.id} product={product} onOpen={() => onOpenProduct(product)} />)}
        </div> : <div className="empty-catalog"><strong>No devices found.</strong><span>Try another search or category.</span></div>}
        <div className="catalog-footnote"><span>Inventory changes as devices sell.</span>{view === 'goodies' ? <button onClick={onShop}>Browse devices <Arrow /></button> : view === 'devices' ? <button onClick={onGoodies}>Explore Goodies <Arrow /></button> : <button onClick={onShop}>Browse all devices <Arrow /></button>}</div>
      </section>

      {view === 'home' && <>
      <section className="trade-section">
        <div className="trade-intro"><p className="eyebrow">MAKE YOUR NEXT MOVE</p><h2>Your current device<br />can take you further.</h2><p>Tell us what you have. We’ll talk through the options and confirm a fair offer after checking its condition.</p></div>
        <article className="trade-card trade-sell">
          <div className="trade-card-top"><span className="trade-number">01 / SELL</span><span className="trade-icon" aria-hidden="true">↗</span></div>
          <div><h3>Ready for a change?</h3><p>Share a few details and continue directly with our team on WhatsApp.</p></div>
          <button onClick={onSell}>Sell your device <Arrow /></button>
        </article>
        <article className="trade-card trade-swap">
          <div className="trade-card-top"><span className="trade-number">02 / SWAP</span><span className="trade-icon" aria-hidden="true">⇄</span></div>
          <div><h3>Trade up, simply.</h3><p>Tell us what you own and what you want next. We’ll help work out the difference.</p></div>
          <button onClick={onSwap}>Start a swap <Arrow /></button>
        </article>
      </section>

      <section className="closing-note">
        <img src="/codetech-mark.jpg" alt="" />
        <div><p className="eyebrow">CODETECH GADGETS</p><h2>Better devices.<br /><span>Better decisions.</span></h2></div>
        <p>Thoughtful tech trading starts with clear information and a real conversation. We’re here to help you make the next move.</p>
        <button onClick={onSell}>Talk to our team <Arrow diagonal /></button>
      </section>
      </>}

      <footer className="store-footer">
        <div className="footer-brand"><img src="/codetech-mark.jpg" alt="" /><div><strong>CodeTech Gadgets</strong><span>Buy · Sell · Swap</span></div></div>
        <p>Devices deserve a good next chapter.</p>
        <a href="https://wa.me/2349058977101" target="_blank" rel="noreferrer">WhatsApp our team <Arrow diagonal /></a>
        <small>© {new Date().getFullYear()} CodeTech Gadgets <button type="button" className="admin-footer-link" onClick={onAdmin}>Admin</button></small>
      </footer>

    </main>
  );
}
