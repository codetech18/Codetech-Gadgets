import { useState, useCallback, useRef, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { Page, Product, CartItem, User } from './types';
import { INITIAL_PRODUCTS } from './data/products';
import Navbar from './components/Navbar';
import Storefront from './components/Storefront';
import Cart from './components/Cart';
import Auth from './components/Auth';
import Support from './components/Support';
import Toast from './components/Toast';
import TradeRequest from './components/TradeRequest';
import ProductDetail from './components/ProductDetail';
import StoreFooter from './components/StoreFooter';
import { unlistedItemEnquiryLink } from './lib/unlistedItemEnquiry';
import type { CatalogCursor } from './lib/firestoreCatalog';

import { readRoute, pagePath, productPath } from './lib/routes';
import { applySeo, buildSeo } from './lib/seo';

const Admin = lazy(() => import('./components/Admin'));

export default function App() {
  const hasFirebaseConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_APP_ID);
  const [initialRoute] = useState(() => readRoute(window.location.pathname, window.location.hash));
  const [page, setPage] = useState<Page>(initialRoute.page);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialRoute.productId);
  const [swapTargetName, setSwapTargetName] = useState('');
  const [products, setProducts] = useState<Product[]>(() => hasFirebaseConfig ? [] : INITIAL_PRODUCTS);
  const [catalogStatus, setCatalogStatus] = useState<'preview' | 'loading' | 'live' | 'error'>(hasFirebaseConfig ? 'loading' : 'preview');
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState('');
  const catalogCursor = useRef<CatalogCursor | null>(null);
  const catalogLoadBusy = useRef(false);
  const catalogGeneration = useRef(0);
  const [lookupProduct, setLookupProduct] = useState<Product | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'missing'>('idle');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState({ msg: '', visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const route = readRoute(window.location.pathname, window.location.hash);
    if (!route.unknown) {
      const target = route.productId ? productPath(route.productId) : pagePath(route.page);
      window.history.replaceState(window.history.state, '', `${target}${window.location.search}`);
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    if (!hasFirebaseConfig) return;
    const generation = ++catalogGeneration.current;
    catalogCursor.current = null;
    setCatalogHasMore(false);
    setCatalogLoadError('');
    setCatalogStatus('loading');
    try {
      const { loadFirestoreCatalogPage } = await import('./lib/firestoreCatalog');
      const nextPage = await loadFirestoreCatalogPage();
      if (generation !== catalogGeneration.current) return;
      catalogCursor.current = nextPage.cursor;
      setProducts(nextPage.products);
      setCatalogHasMore(nextPage.hasMore);
      setCatalogStatus('live');
    } catch {
      if (generation !== catalogGeneration.current) return;
      setProducts([]);
      setCatalogStatus('error');
    }
  }, [hasFirebaseConfig]);

  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);

  const loadMoreCatalog = useCallback(async () => {
    if (!hasFirebaseConfig || !catalogHasMore || catalogLoadBusy.current || !catalogCursor.current) return;
    catalogLoadBusy.current = true;
    const generation = catalogGeneration.current;
    setCatalogLoadingMore(true);
    setCatalogLoadError('');
    try {
      const { loadFirestoreCatalogPage } = await import('./lib/firestoreCatalog');
      const nextPage = await loadFirestoreCatalogPage(catalogCursor.current);
      if (generation !== catalogGeneration.current) return;
      catalogCursor.current = nextPage.cursor;
      setProducts(current => {
        const known = new Set(current.map(item => String(item.id)));
        return [...current, ...nextPage.products.filter(item => !known.has(String(item.id)))];
      });
      setCatalogHasMore(nextPage.hasMore);
    } catch {
      if (generation === catalogGeneration.current) setCatalogLoadError('Could not load more listings. Try again.');
    } finally {
      catalogLoadBusy.current = false;
      if (generation === catalogGeneration.current) setCatalogLoadingMore(false);
    }
  }, [hasFirebaseConfig, catalogHasMore]);

  useEffect(() => {
    if (page !== 'product' || !selectedProductId || products.some(item => String(item.id) === selectedProductId) || !hasFirebaseConfig) return;
    let cancelled = false;
    setLookupStatus('loading');
    void import('./lib/firestoreCatalog').then(({ loadFirestoreProduct }) => loadFirestoreProduct(selectedProductId)).then(product => {
      if (cancelled) return;
      setLookupProduct(product);
      setLookupStatus(product ? 'idle' : 'missing');
    }).catch(() => { if (!cancelled) setLookupStatus('missing'); });
    return () => { cancelled = true; };
  }, [page, selectedProductId, products, hasFirebaseConfig]);

  useEffect(() => {
    const restoreRoute = () => {
      const route = readRoute(window.location.pathname, window.location.hash);
      setPage(route.page);
      setSelectedProductId(route.productId);
      setSwapTargetName('');
    };
    window.addEventListener('popstate', restoreRoute);
    window.addEventListener('hashchange', restoreRoute);
    return () => { window.removeEventListener('popstate', restoreRoute); window.removeEventListener('hashchange', restoreRoute); };
  }, []);

  useLayoutEffect(() => {
    if (page === 'product') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [page, selectedProductId]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  function navigate(p: Page) {
    const target = `${pagePath(p)}${window.location.search}`;
    window.history.pushState(null, '', target);
    setPage(p);
    setSelectedProductId(null);
    if (p !== 'swap') setSwapTargetName('');
    window.scrollTo(0, 0);
  }

  function openProduct(product: Product) {
    window.history.pushState(null, '', `${productPath(product.id)}${window.location.search}`);
    setSelectedProductId(String(product.id));
    setPage('product');
    setSwapTargetName('');
  }

  function swapForProduct(product: Product) {
    setSwapTargetName(product.name);
    navigate('swap');
  }

  function scrollToProducts() {
    navigate('devices');
  }

  // ── Cart ──
  function addToCart(product: Product) {
    const cartId = `${product.id}::${product.selectedVariantId ?? ''}`;
    const existing = cart.find(item => item.cartId === cartId);
    if (existing && product.stock && existing.qty >= product.stock) {
      showToast('This listing is for one specific device.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(x => x.cartId === cartId);
      if (existing) return prev.map(x => x.cartId === cartId ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...product, cartId, qty: 1 }];
    });
    showToast(`${product.name} added to your bag`);
  }

  const changeQty = useCallback((id: Product['id'], delta: number) => {
    setCart(prev => {
      const item = prev.find(x => x.cartId === id);
      if (!item) return prev;
      if (item.qty + delta <= 0) return prev.filter(x => x.cartId !== id);
      if (delta > 0 && item.stock && item.qty >= item.stock) return prev;
      return prev.map(x => x.cartId === id ? { ...x, qty: x.qty + delta } : x);
    });
  }, []);

  const removeFromCart = useCallback((id: Product['id']) => {
    setCart(prev => prev.filter(x => x.cartId !== id));
    showToast('Item removed from cart');
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    showToast('Cart cleared');
  }, []);

  function checkout(promoDiscount: number) {
    void promoDiscount;
    if (!cart.length) return;
    const items = cart.map(item => { const variant = item.variants?.find(option => option.id === item.selectedVariantId); return `• ${item.name}${variant ? ` (${variant.storage})` : ''} × ${item.qty} — ₦${(item.price * item.qty).toLocaleString('en-NG')}`; }).join('\n');
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const message = `Hi CodeTech Gadgets, I’d like to check availability and arrange a purchase:\n\n${items}\n\nEstimated item total: ₦${total.toLocaleString('en-NG')}\nPlease confirm availability, delivery, and payment details.`;
    window.location.assign(`https://wa.me/2349058977101?text=${encodeURIComponent(message)}`);
  }

  // ── Admin: Products ──
  async function addProduct(data: Omit<Product, 'id'>) {
    const { createInventoryProduct } = await import('./lib/firestoreInventory');
    await createInventoryProduct(data);
    await refreshCatalog();
    showToast('Product added to the storefront.');
  }
  async function editProduct(id: Product['id'], data: Omit<Product, 'id'>) {
    if (typeof id !== 'string') throw new Error('This sample item is not saved in Firestore yet.');
    const { updateInventoryProduct } = await import('./lib/firestoreInventory');
    await updateInventoryProduct(id, data);
    await refreshCatalog();
    showToast('Product updated.');
  }
  async function deleteProduct(id: Product['id']) {
    if (typeof id !== 'string') throw new Error('This sample item is not saved in Firestore yet.');
    const { deleteInventoryProduct } = await import('./lib/firestoreInventory');
    await deleteInventoryProduct(id);
    setLookupProduct(previous => String(previous?.id) === id ? null : previous);
    await refreshCatalog();
    setCart(previous => previous.filter(item => item.id !== id));
    showToast('Listing deleted from the storefront.');
  }
  async function restoreProduct(id: Product['id']) {
    if (typeof id !== 'string') throw new Error('This sample item is not saved in Firestore yet.');
    const { restoreInventoryProduct } = await import('./lib/firestoreInventory');
    await restoreInventoryProduct(id);
    await refreshCatalog();
    showToast('Listing restored.');
  }
  async function markProductSold(id: Product['id'], soldPrice: number, serialNumber: string | null, variantId?: string) {
    if (typeof id !== 'string') throw new Error('This sample item is not saved in Firestore yet.');
    const { markInventoryProductSold } = await import('./lib/firestoreInventory');
    await markInventoryProductSold(id, soldPrice, serialNumber, variantId);
    await refreshCatalog();
    showToast('Sale recorded. Inventory updated.');
  }

  async function reverseSale(saleId: string, reason: string) {
    const { reverseInventorySale } = await import('./lib/firestoreInventory');
    await reverseInventorySale(saleId, reason);
    await refreshCatalog();
    showToast('Sale reversed. One unit is back in stock and available for resale.');
  }

  const selectedProduct = page === 'product'
    ? products.find(item => String(item.id) === selectedProductId) ?? (String(lookupProduct?.id) === selectedProductId ? lookupProduct : null)
    : null;
  useEffect(() => {
    const route = readRoute(window.location.pathname, window.location.hash);
    const missing = Boolean(route.unknown) || (page === 'product' && !selectedProduct && (!hasFirebaseConfig || lookupStatus === 'missing'));
    const path = page === 'product' && selectedProductId ? productPath(selectedProductId) : pagePath(page);
    applySeo(buildSeo(page, path, selectedProduct, missing));
  }, [page, selectedProductId, selectedProduct, hasFirebaseConfig, lookupStatus]);

  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  if (page === 'admin') {
    return <div className="admin-app-root"><Suspense fallback={<div className="admin-loading">Opening CodeTech Admin…</div>}><Admin onAddProduct={addProduct} onEditProduct={editProduct} onDeleteProduct={deleteProduct} onRestoreProduct={restoreProduct} onMarkSold={markProductSold} onReverseSale={reverseSale} onBack={() => navigate('home')} /></Suspense><Toast message={toast.msg} visible={toast.visible} /></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        currentPage={page}
        cartCount={cartCount}
        user={user}
        onNavigate={navigate}
        onScrollToProducts={scrollToProducts}
        onLogout={() => { setUser(null); showToast('👋 Logged out!'); navigate('home'); }}
      />

      {(page === 'sell' || page === 'swap') && (
        <TradeRequest mode={page} onBack={() => navigate('home')} desiredProduct={swapTargetName} />
      )}

      {page === 'product' && (() => {
        const product = products.find(item => String(item.id) === selectedProductId) ?? (String(lookupProduct?.id) === selectedProductId ? lookupProduct : null);
        return product
          ? <ProductDetail product={product} onBack={() => navigate(product.listingGroup === 'goodies' ? 'goodies' : 'devices')} onSwap={swapForProduct} onAddToCart={addToCart} />
          : <main className="product-not-found"><p>{hasFirebaseConfig && (catalogStatus === 'loading' || lookupStatus !== 'missing') ? 'Loading device details…' : 'This device is no longer listed.'}</p>{(!hasFirebaseConfig || lookupStatus === 'missing') && <a href={unlistedItemEnquiryLink()} target="_blank" rel="noreferrer">Ask us about this or a similar device ↗</a>}<button onClick={() => navigate('devices')}>Back to devices</button></main>;
      })()}

      {/* HOME */}
      {(page === 'home' || page === 'devices' || page === 'goodies') && (
        <>
          <Storefront view={page} products={products} catalogStatus={catalogStatus} hasMoreProducts={catalogHasMore} loadingMoreProducts={catalogLoadingMore} loadMoreError={catalogLoadError} onLoadMoreProducts={loadMoreCatalog} onShop={scrollToProducts} onSell={() => navigate('sell')} onSwap={() => navigate('swap')} onGoodies={() => navigate('goodies')} onOpenProduct={openProduct} />
        </>
      )}

      {/* CART */}
      {page === 'cart' && (
        <Cart
          cart={cart}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onClear={clearCart}
          onCheckout={checkout}
          onShopNow={scrollToProducts}
        />
      )}

      {/* AUTH */}
      {(page === 'login' || page === 'signup') && (
        <Auth
          mode={page}
          onAuth={u => { setUser(u); showToast(`✅ Welcome, ${u.name}!`); navigate('home'); }}
          onSwitch={() => navigate(page === 'login' ? 'signup' : 'login')}
        />
      )}

      {/* SUPPORT */}
      {page === 'complaint' && <Support onToast={showToast} />}

      <StoreFooter />
      <Toast message={toast.msg} visible={toast.visible} />
    </div>
  );
}
