import { useEffect, useMemo, useState } from 'react';
import { Product } from '../types';
import { displayImageUrl } from '../lib/displayImageUrl';
import { productPath } from '../lib/routes';
import { unlistedItemEnquiryLink } from '../lib/unlistedItemEnquiry';

type StorefrontProps = {
  view: 'home' | 'devices' | 'goodies';
  products: Product[];
  catalogStatus: 'preview' | 'loading' | 'live' | 'error';
  hasMoreProducts: boolean;
  loadingMoreProducts: boolean;
  loadMoreError: string;
  onLoadMoreProducts: () => Promise<void>;
  onShop: () => void;
  onSell: () => void;
  onSwap: () => void;
  onGoodies: () => void;
  onOpenProduct: (product: Product) => void;
};

const categories = ['All categories', 'Phones', 'Laptops', 'Tablets', 'Audio', 'Wearables'];
const stockCollections = [
  { label: 'All items', value: 'all' },
  { label: 'Brand new', value: 'brand-new' },
  { label: 'UK used', value: 'uk-used' },
  { label: 'Goodies', value: 'goodies' },
] as const;
const categoryKeys: Record<string, string> = {
  'All categories': 'all', Phones: 'phones', Laptops: 'laptops', Tablets: 'tablets', Audio: 'audio', Wearables: 'wearables',
};
const money = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="store-arrow">{diagonal ? '↗' : '→'}</span>;
}

function DeviceCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const coverImage = product.images?.[0] ?? product.image;
  const itemLabel = product.listingGroup === 'goodies'
    ? 'Goodies'
    : /brand\s*new/i.test(product.condition || '')
      ? 'Brand New'
      : /uk\s*used|used/i.test(product.condition || '')
        ? 'UK Used'
        : product.condition || 'Quality checked';
  return (
    <a className="device-card" href={productPath(product.id)} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpen(); } }} aria-label={`View ${product.name}`}>
      <div className="device-image-wrap">
        {product.badge && <span className="device-badge">{product.badge}</span>}
        <span className={`device-condition-badge ${itemLabel === 'Goodies' ? 'goodies' : itemLabel === 'Brand New' ? 'brand-new' : ''}`}>{itemLabel}</span>
        {product.backInStock && <span className="device-restock-badge">Back in stock</span>}
        {coverImage ? <img className="device-image" src={displayImageUrl(coverImage)} alt={product.name} loading="lazy" /> : <div className="device-image-placeholder">CodeTech Gadgets</div>}
        <span className="device-open">View details <Arrow diagonal /></span>
      </div>
      <div className="device-copy">
        <div className="device-meta"><span>{product.brand}</span>{product.listingGroup === 'goodies' && product.condition && <span>{product.condition}</span>}</div>
        <h3>{product.name}</h3>
        {product.listingGroup === 'goodies' && product.conditionNotes && <p className="device-condition-note">{product.conditionNotes}</p>}
        <div className="device-price-line"><strong>{product.variants && product.variants.filter(variant => variant.stock > 0).length > 1 ? 'From ' : ''}{money(product.price)}</strong></div>
      </div>
    </a>
  );
}

export default function Storefront({ view, products, catalogStatus, hasMoreProducts, loadingMoreProducts, loadMoreError, onLoadMoreProducts, onShop, onSell, onSwap, onGoodies, onOpenProduct }: StorefrontProps) {
  const [activeCategory, setActiveCategory] = useState('All categories');
  const [activeCollection, setActiveCollection] = useState<(typeof stockCollections)[number]['value']>('all');
  const [search, setSearch] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  useEffect(() => { setActiveCategory('All categories'); setActiveCollection('all'); }, [view]);
  useEffect(() => { const timer = window.setTimeout(() => setEffectiveSearch(search.trim().toLowerCase()), 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => setPageNumber(1), [view, activeCategory, activeCollection, effectiveSearch]);
  const visibleProducts = useMemo(() => products.filter(product => {
    const matchesGroup = view !== 'goodies'
      ? activeCollection === 'all'
        || (activeCollection === 'goodies' && product.listingGroup === 'goodies')
        || (activeCollection === 'brand-new' && product.listingGroup !== 'goodies' && /brand\s*new/i.test(product.condition || ''))
        || (activeCollection === 'uk-used' && product.listingGroup !== 'goodies' && /uk\s*used|used/i.test(product.condition || ''))
      : product.listingGroup === 'goodies';
    const matchesCategory = categoryKeys[activeCategory] === 'all' || product.category === categoryKeys[activeCategory];
    const query = effectiveSearch;
    const matchesSearch = !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
    return matchesGroup && matchesCategory && matchesSearch;
  }), [products, activeCategory, activeCollection, effectiveSearch, view]);
  const displayedProducts = view === 'home' ? visibleProducts.slice(0, 8) : visibleProducts.slice((pageNumber - 1) * 12, pageNumber * 12);
  const canGoNext = view !== 'home' && (visibleProducts.length > pageNumber * 12 || hasMoreProducts);

  useEffect(() => {
    const targetCount = view === 'home' ? 8 : pageNumber * 12;
    if (catalogStatus === 'live' && visibleProducts.length < targetCount && hasMoreProducts && !loadingMoreProducts && !loadMoreError) void onLoadMoreProducts();
  }, [view, catalogStatus, visibleProducts.length, pageNumber, hasMoreProducts, loadingMoreProducts, loadMoreError, onLoadMoreProducts]);

  useEffect(() => {
    if (view !== 'home' && catalogStatus === 'live' && !hasMoreProducts && !loadingMoreProducts && displayedProducts.length === 0 && pageNumber > 1) setPageNumber(current => current - 1);
  }, [view, catalogStatus, hasMoreProducts, loadingMoreProducts, displayedProducts.length, pageNumber]);

  function changePage(nextPage: number) {
    setPageNumber(nextPage);
    window.requestAnimationFrame(() => document.getElementById('products')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }

  return (
    <main className="storefront">
      {view === 'home' ? <>
      <section className="store-hero">
        <div className="store-hero-copy">
          <h1>Find your next device.</h1>
          <p className="store-hero-description">Shop UK-used, brand-new and Goodies. Sell or swap yours.</p>
          <div className="store-hero-actions">
            <button className="button-primary" onClick={onShop}>Shop devices <Arrow /></button>
            <button className="button-text" onClick={onSell}>Sell a device <Arrow /></button>
            <button className="button-text" onClick={onSwap}>Swap <Arrow /></button>
          </div>
        </div>
        <div className="store-hero-visual">
          <img className="hero-product-asset" src="/hero-devices.png" alt="A smartphone, laptop, and smartwatch shown together" />
        </div>
      </section>
      </> : <section className="catalog-page-intro">
        <h1>{view === 'goodies' ? 'Goodies' : 'Devices'}</h1>
        <p>{view === 'goodies' ? 'Lower prices, with each item’s condition clearly shown.' : 'Browse brand-new devices, UK-used devices, and Goodies.'}</p>
      </section>}

      <section className="catalog-section" id="products">
        <div className="catalog-heading">
          <div>{view === 'home' && <h2>{activeCollection === 'goodies' ? 'Goodies' : 'Shop what’s available'}</h2>}{catalogStatus === 'preview' && <p className="sample-note">Sample listings shown. Live inventory is not connected.</p>}</div>
          <label className="catalog-search"><span aria-hidden="true">⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search devices" aria-label="Search devices" /></label>
        </div>
        <div className={`catalog-tools ${view === 'devices' ? 'catalog-tools-primary' : ''}`}>
          <div className="category-tabs" role="tablist" aria-label={view === 'goodies' ? 'Filter by device category' : 'Filter by stock type'}>
            {view === 'goodies' ? categories.map(category => <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category === 'All categories' ? 'All goodies' : category}</button>) : stockCollections.map(collection => <button key={collection.value} role="tab" aria-selected={activeCollection === collection.value} className={activeCollection === collection.value ? 'active' : ''} onClick={() => setActiveCollection(collection.value)}>{collection.label}</button>)}
          </div>
          <span className="results-count">{view !== 'home' ? `Page ${pageNumber} · ` : ''}{displayedProducts.length} {view === 'goodies' || activeCollection === 'goodies' ? 'goodies' : activeCollection === 'all' ? 'items' : 'devices'} shown</span>
        </div>
        {view === 'devices' && <div className="catalog-tools catalog-tools-secondary">
          <span className="catalog-filter-label">Category</span>
          <div className="category-tabs" role="tablist" aria-label="Filter by device category">
            {categories.map(category => <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>
        </div>}
        {catalogStatus !== 'loading' && catalogStatus !== 'error' && displayedProducts.length > 0 && <aside className="catalog-enquiry">
          <div><strong>Can’t find the device you want?</strong><p>Some items may not be listed here. Send us what you’re looking for and we’ll check availability.</p></div>
          <a href={unlistedItemEnquiryLink(search)} target="_blank" rel="noreferrer">Ask us on WhatsApp <Arrow diagonal /></a>
        </aside>}
        {catalogStatus === 'loading' ? <div className="empty-catalog"><strong>Loading current inventory…</strong><span>Fetching available devices.</span></div> : catalogStatus === 'error' ? <div className="empty-catalog"><strong>Inventory is temporarily unavailable.</strong><span>You can still ask our team about a device.</span><a href={unlistedItemEnquiryLink(search)} target="_blank" rel="noreferrer">Enquire on WhatsApp ↗</a></div> : displayedProducts.length ? <div className="device-grid">
          {displayedProducts.map(product => <DeviceCard key={product.id} product={product} onOpen={() => onOpenProduct(product)} />)}
        </div> : hasMoreProducts ? <div className="empty-catalog"><strong>{loadMoreError ? 'Could not load this page.' : 'Checking more listings…'}</strong><span>{loadMoreError ? 'Try again below.' : 'Looking for items that match your filters.'}</span></div> : <div className="empty-catalog"><strong>No matching listings right now.</strong><span>Tell us what you’re looking for and we’ll check for you.</span><a href={unlistedItemEnquiryLink(search)} target="_blank" rel="noreferrer">Enquire on WhatsApp ↗</a></div>}
        {view !== 'home' && catalogStatus === 'live' && (pageNumber > 1 || canGoNext || loadMoreError) && <div className="catalog-pagination">
          {loadMoreError && <span role="alert">{loadMoreError}</span>}
          <div className="catalog-page-controls"><button type="button" disabled={pageNumber === 1 || loadingMoreProducts} onClick={() => changePage(pageNumber - 1)}>← Previous</button><span>Page {pageNumber}</span><button type="button" disabled={!canGoNext || loadingMoreProducts || Boolean(loadMoreError)} onClick={() => changePage(pageNumber + 1)}>Next →</button></div>
          {loadMoreError && <button type="button" onClick={() => void onLoadMoreProducts()}>Try again</button>}
        </div>}
        {view === 'home' && loadMoreError && <div className="catalog-pagination"><span role="alert">{loadMoreError}</span><button type="button" onClick={() => void onLoadMoreProducts()}>Try again</button></div>}
        <div className="catalog-footnote">{view === 'goodies' ? <button onClick={onShop}>Browse devices <Arrow /></button> : view === 'devices' ? <button onClick={onGoodies}>Explore Goodies <Arrow /></button> : activeCollection === 'goodies' ? <button onClick={onGoodies}>See all Goodies <Arrow /></button> : <button onClick={onShop}>See all devices <Arrow /></button>}</div>
      </section>

      {view === 'home' && <>
      <section className="trade-section">
        <article className="trade-card trade-sell">
          <div><h3>Sell a device</h3><p>Get an offer from our team on WhatsApp.</p></div>
          <button onClick={onSell}>Start selling <Arrow /></button>
        </article>
        <article className="trade-card trade-swap">
          <div><h3>Swap a device</h3><p>Trade yours toward your next device.</p></div>
          <button onClick={onSwap}>Start a swap <Arrow /></button>
        </article>
      </section>
      </>}

    </main>
  );
}
