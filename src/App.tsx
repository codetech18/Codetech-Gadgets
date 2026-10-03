import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
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

const Admin = lazy(() => import('./components/Admin'));

function applicationBasePath() {
  const path = window.location.pathname.replace(/admin\/?$/, '');
  return path || '/';
}

function readRoute() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname.endsWith('/admin')) return { page: 'admin' as Page, productId: null };
  const route = decodeURIComponent(window.location.hash.slice(1));
  if (route.startsWith('product/')) return { page: 'product' as Page, productId: route.slice('product/'.length) };
  const validPages: Page[] = ['home', 'devices', 'goodies', 'cart', 'login', 'signup', 'profile', 'complaint', 'admin', 'sell', 'swap'];
  return { page: validPages.includes(route as Page) ? route as Page : 'home', productId: null };
}

export default function App() {
  const hasFirebaseConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_APP_ID);
  const [initialRoute] = useState(readRoute);
  const [page, setPage] = useState<Page>(initialRoute.page);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialRoute.productId);
  const [swapTargetName, setSwapTargetName] = useState('');
  const [products, setProducts] = useState<Product[]>(() => hasFirebaseConfig ? [] : INITIAL_PRODUCTS);
  const [catalogStatus, setCatalogStatus] = useState<'preview' | 'loading' | 'live' | 'error'>(hasFirebaseConfig ? 'loading' : 'preview');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState({ msg: '', visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    if (pathname.endsWith('/admin') && window.location.hash === '#admin') {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    import('./lib/firestoreCatalog').then(({ subscribeFirestoreCatalog }) => {
      if (cancelled) return;
      unsubscribe = subscribeFirestoreCatalog(
        items => { setProducts(items); setCatalogStatus('live'); },
        () => { setCatalogStatus('error'); },
      );
    }).catch(() => { if (!cancelled) { setProducts([]); setCatalogStatus('error'); } });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [hasFirebaseConfig]);

  useEffect(() => {
    const restoreRoute = () => {
      const route = readRoute();
      setPage(route.page);
      setSelectedProductId(route.productId);
      setSwapTargetName('');
    };
    window.addEventListener('popstate', restoreRoute);
    return () => window.removeEventListener('popstate', restoreRoute);
  }, []);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  function navigate(p: Page) {
    const basePath = applicationBasePath();
    const target = p === 'admin'
      ? `${basePath}admin${window.location.search}`
      : `${basePath}${window.location.search}${p === 'home' ? '' : `#${p}`}`;
    window.history.pushState(null, '', target);
    setPage(p);
    setSelectedProductId(null);
    if (p !== 'swap') setSwapTargetName('');
    window.scrollTo(0, 0);
  }

  function openProduct(product: Product) {
    window.history.pushState(null, '', `${applicationBasePath()}${window.location.search}#product/${encodeURIComponent(String(product.id))}`);
    setSelectedProductId(String(product.id));
    setPage('product');
    setSwapTargetName('');
    window.scrollTo(0, 0);
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
    const existing = cart.find(item => item.id === product.id);
    if (existing && product.stock && existing.qty >= product.stock) {
      showToast('This listing is for one specific device.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(x => x.id === product.id);
      if (existing) return prev.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.name} added to your bag`);
  }

  const changeQty = useCallback((id: Product['id'], delta: number) => {
    setCart(prev => {
      const item = prev.find(x => x.id === id);
      if (!item) return prev;
      if (item.qty + delta <= 0) return prev.filter(x => x.id !== id);
      if (delta > 0 && item.stock && item.qty >= item.stock) return prev;
      return prev.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x);
    });
  }, []);

  const removeFromCart = useCallback((id: Product['id']) => {
    setCart(prev => prev.filter(x => x.id !== id));
    showToast('Item removed from cart');
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    showToast('Cart cleared');
  }, []);

  function checkout(promoDiscount: number) {
    void promoDiscount;
    if (!cart.length) return;
    const items = cart.map(item => `• ${item.name} × ${item.qty} — ₦${(item.price * item.qty).toLocaleString('en-NG')}`).join('\n');
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const message = `Hi CodeTech Gadgets, I’d like to check availability and arrange a purchase:\n\n${items}\n\nEstimated item total: ₦${total.toLocaleString('en-NG')}\nPlease confirm availability, delivery, and payment details.`;
    window.location.assign(`https://wa.me/2349058977101?text=${encodeURIComponent(message)}`);
  }

  // ── Admin: Products ──
  async function addProduct(data: Omit<Product, 'id'>) {
    const { createInventoryProduct } = await import('./lib/firestoreInventory');
    await createInventoryProduct(data);
    const { loadFirestoreCatalog } = await import('./lib/firestoreCatalog');
    setProducts(await loadFirestoreCatalog());
    setCatalogStatus('live');
    showToast('Product added to the storefront.');
  }
  async function editProduct(id: Product['id'], data: Omit<Product, 'id'>) {
    if (typeof id !== 'string') throw new Error('This sample item is not saved in Firestore yet.');
    const { updateInventoryProduct } = await import('./lib/firestoreInventory');
    await updateInventoryProduct(id, data);
    const { loadFirestoreCatalog } = await import('./lib/firestoreCatalog');
    setProducts(await loadFirestoreCatalog());
    setCatalogStatus('live');
    showToast('Product updated.');
  }
  async function markProductSold(id: Product['id'], soldPrice: number, serialNumber: string | null) {
    if (typeof id !== 'string') throw new Error('This sample item is not saved in Firestore yet.');
    const { markInventoryProductSold } = await import('./lib/firestoreInventory');
    await markInventoryProductSold(id, soldPrice, serialNumber);
    const { loadFirestoreCatalog } = await import('./lib/firestoreCatalog');
    setProducts(await loadFirestoreCatalog());
    setCatalogStatus('live');
    showToast('Sale recorded. Inventory updated.');
  }

  async function reverseSale(saleId: string, reason: string) {
    const { reverseInventorySale } = await import('./lib/firestoreInventory');
    await reverseInventorySale(saleId, reason);
    const { loadFirestoreCatalog } = await import('./lib/firestoreCatalog');
    setProducts(await loadFirestoreCatalog());
    setCatalogStatus('live');
    showToast('Sale reversed. One unit is back in stock and available for resale.');
  }

  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  if (page === 'admin') {
    return <div className="admin-app-root"><Suspense fallback={<div className="admin-loading">Opening CodeTech Admin…</div>}><Admin onAddProduct={addProduct} onEditProduct={editProduct} onMarkSold={markProductSold} onReverseSale={reverseSale} onBack={() => navigate('home')} /></Suspense><Toast message={toast.msg} visible={toast.visible} /></div>;
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
        const product = products.find(item => String(item.id) === selectedProductId);
        return product
          ? <ProductDetail product={product} onBack={() => navigate(product.listingGroup === 'goodies' ? 'goodies' : 'devices')} onSwap={swapForProduct} onAddToCart={addToCart} />
          : <main className="product-not-found"><p>{catalogStatus === 'loading' ? 'Loading device details…' : 'This device is no longer available.'}</p><button onClick={() => navigate('devices')}>Back to devices</button></main>;
      })()}

      {/* HOME */}
      {(page === 'home' || page === 'devices' || page === 'goodies') && (
        <>
          <Storefront view={page} products={products} catalogStatus={catalogStatus} onShop={scrollToProducts} onSell={() => navigate('sell')} onSwap={() => navigate('swap')} onGoodies={() => navigate('goodies')} onAdmin={() => navigate('admin')} onOpenProduct={openProduct} />
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

      <Toast message={toast.msg} visible={toast.visible} />
    </div>
  );
}
