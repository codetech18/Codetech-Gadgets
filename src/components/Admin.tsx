import { FormEvent, useEffect, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { Product, SaleRecord } from '../types';
import { getFirebaseAuth } from '../lib/firebase';

interface AdminProps {
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onEditProduct: (id: Product['id'], product: Omit<Product, 'id'>) => Promise<void>;
  onMarkSold: (id: Product['id'], soldPrice: number) => Promise<void>;
  onReverseSale: (saleId: string, reason: string) => Promise<void>;
  onBack: () => void;
}

type ProductForm = {
  name: string;
  brand: string;
  serialNumber: string;
  price: string;
  oldPrice: string;
  category: string;
  condition: string;
  conditionNotes: string;
  stock: string;
  badge: string;
  imageUrl: string;
  listingGroup: 'devices' | 'goodies';
};

type InventoryFilter = 'all' | 'devices' | 'goodies' | 'low-stock';

const EMPTY_FORM: ProductForm = {
  name: '', brand: '', serialNumber: '', price: '', oldPrice: '', category: '', condition: '', conditionNotes: '', stock: '1', badge: '', imageUrl: '', listingGroup: 'devices',
};
const ADMIN_EMAIL = (import.meta.env.VITE_FIREBASE_ADMIN_EMAIL || '').trim().toLowerCase();
const INPUT_CLASS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function Admin({ onAddProduct, onEditProduct, onMarkSold, onReverseSale, onBack }: AdminProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [admin, setAdmin] = useState<FirebaseUser | null>(null);
  const [unverifiedAdmin, setUnverifiedAdmin] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<Product['id'] | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [activeSection, setActiveSection] = useState<'inventory' | 'sales'>('inventory');
  const [search, setSearch] = useState('');
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [saleError, setSaleError] = useState('');
  const [saleBusy, setSaleBusy] = useState(false);
  const [reversingSale, setReversingSale] = useState<SaleRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState('');
  const [reversalBusy, setReversalBusy] = useState(false);

  async function refreshInventory() {
    setInventoryLoading(true);
    setInventoryError('');
    try {
      const { loadFirestoreInventory } = await import('../lib/firestoreCatalog');
      setProducts(await loadFirestoreInventory());
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : 'Could not load inventory.');
    } finally {
      setInventoryLoading(false);
    }
  }

  async function refreshSales() {
    setSalesLoading(true);
    setInventoryError('');
    try {
      const { loadSalesHistory } = await import('../lib/firestoreInventory');
      setSales(await loadSalesHistory());
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : 'Could not load sales history.');
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    if (!ADMIN_EMAIL) {
      setAuthError('Set VITE_FIREBASE_ADMIN_EMAIL in the local environment before signing in.');
      return;
    }
    try {
      const auth = getFirebaseAuth();
      return onAuthStateChanged(auth, user => {
        if (!user) {
          setAdmin(null);
          return;
        }
        if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
          void signOut(auth);
          setAdmin(null);
          setAuthError('This account is not authorized to manage inventory.');
          return;
        }
        if (!user.emailVerified) {
          setUnverifiedAdmin(user);
          setAdmin(null);
          setAuthError('Verify this email address before managing inventory.');
          return;
        }
        setUnverifiedAdmin(null);
        setAuthError('');
        setAdmin(user);
        void refreshInventory();
        void refreshSales();
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Firebase Authentication is not configured.');
    }
  }, []);

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL) throw new Error('Use the authorized admin email address.');
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign in. Check the email and password.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendVerification() {
    if (!unverifiedAdmin) return;
    setAuthBusy(true);
    try {
      await sendEmailVerification(unverifiedAdmin);
      setAuthError('Verification email sent. Verify the account, then sign in again.');
      await signOut(getFirebaseAuth());
      setUnverifiedAdmin(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not send a verification email.');
    } finally {
      setAuthBusy(false);
    }
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditId(product.id);
    setForm({
      name: product.name,
      brand: product.brand,
      serialNumber: product.serialNumber || '',
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : '',
      category: product.category,
      condition: product.condition || '',
      conditionNotes: product.conditionNotes || '',
      stock: String(product.stock ?? 0),
      badge: product.badge || '',
      imageUrl: product.image || '',
      listingGroup: product.listingGroup || 'devices',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploadBusy(true);
    setFormError('');
    try {
      const { uploadProductImage } = await import('../lib/cloudinaryUpload');
      const imageUrl = await uploadProductImage(file);
      setForm(current => ({ ...current, imageUrl }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setUploadBusy(false);
    }
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || !form.brand.trim() || !form.serialNumber.trim() || !form.category || !form.condition || (form.listingGroup === 'goodies' && !form.conditionNotes.trim()) || !form.imageUrl || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      setFormError('Add a name, brand, IMEI or serial number, category, condition, valid price and stock quantity, and a product photo.');
      return;
    }
    const product: Omit<Product, 'id'> = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      serialNumber: form.serialNumber.trim(),
      price,
      oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
      category: form.category,
      condition: form.condition,
      conditionNotes: form.conditionNotes.trim(),
      stock,
      image: form.imageUrl,
      listingGroup: form.listingGroup,
      emoji: '●',
      rating: 0,
      reviews: 0,
      badge: form.badge || null,
    };
    setSaveBusy(true);
    setFormError('');
    try {
      if (editId !== null) await onEditProduct(editId, product);
      else await onAddProduct(product);
      await refreshInventory();
      setModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this product.');
    } finally {
      setSaveBusy(false);
    }
  }

  function openSaleRecord(product: Product) {
    setSaleProduct(product);
    setSalePrice(String(product.price));
    setSaleError('');
  }

  async function recordSale(event: FormEvent) {
    event.preventDefault();
    if (!saleProduct) return;
    const price = Number(salePrice);
    if (!Number.isFinite(price) || price < 0) {
      setSaleError('Enter the final amount received for this sale.');
      return;
    }
    setSaleBusy(true);
    setSaleError('');
    try {
      await onMarkSold(saleProduct.id, price);
      await refreshInventory();
      await refreshSales();
      setSaleProduct(null);
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : 'Could not record this sale.');
    } finally {
      setSaleBusy(false);
    }
  }

  async function recordSaleReversal(event: FormEvent) {
    event.preventDefault();
    if (!reversingSale) return;
    if (reversalReason.trim().length < 5) {
      setReversalError('Please enter a reason of at least five characters.');
      return;
    }
    setReversalBusy(true);
    setReversalError('');
    try {
      await onReverseSale(reversingSale.id, reversalReason);
      await refreshInventory();
      await refreshSales();
      setReversingSale(null);
    } catch (error) {
      setReversalError(error instanceof Error ? error.message : 'Could not reverse this sale.');
    } finally {
      setReversalBusy(false);
    }
  }

  function openReverseSale(sale: SaleRecord) {
    setReversingSale(sale);
    setReversalReason('');
    setReversalError('');
  }

  const activeProducts = products.filter(product => product.listingStatus !== 'sold');
  const deviceCount = activeProducts.filter(product => product.listingGroup !== 'goodies').length;
  const goodiesCount = activeProducts.filter(product => product.listingGroup === 'goodies').length;
  const lowStockCount = activeProducts.filter(product => (product.stock ?? 0) <= 1).length;
  const visibleProducts = products.filter(product => {
    if (product.listingStatus === 'sold') return false;
    const matchesFilter = inventoryFilter === 'all'
      || (inventoryFilter === 'devices' && product.listingGroup !== 'goodies')
      || (inventoryFilter === 'goodies' && product.listingGroup === 'goodies')
      || (inventoryFilter === 'low-stock' && (product.stock ?? 0) <= 1);
    const query = search.trim().toLowerCase();
    return matchesFilter && (!query || `${product.name} ${product.brand} ${product.condition}`.toLowerCase().includes(query));
  });

  if (!admin) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <div className="admin-login-brand"><img src="/codetech-mark.jpg" alt="" /><div><strong>CodeTech</strong><span>GADGETS · ADMIN</span></div></div>
          <p className="admin-login-kicker">PRIVATE STORE WORKSPACE</p>
          <h1>Welcome back.</h1>
          <p className="admin-login-description">Sign in to manage products, pricing, stock, and the images customers see on your storefront.</p>
          {unverifiedAdmin ? (
            <button onClick={sendVerification} disabled={authBusy} className="admin-login-submit">
              {authBusy ? 'Sending…' : 'Send verification email'}
            </button>
          ) : (
            <form onSubmit={handleSignIn} className="admin-login-form">
              <label>Email address
                <input className={INPUT_CLASS} type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
              </label>
              <label>Password
                <input className={INPUT_CLASS} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
              </label>
              <button disabled={authBusy || !ADMIN_EMAIL} className="admin-login-submit">
                {authBusy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
          {authError && <p role="alert" className="admin-auth-error">{authError}</p>}
          <p className="admin-login-footnote">Access is limited to the authorized, verified Firebase admin account. Public sign-up is disabled.</p>
          <button onClick={onBack} className="admin-return-store">← Return to storefront</button>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <button className="admin-sidebar-brand" onClick={onBack}><img src="/codetech-mark.jpg" alt=""/><span><strong>CodeTech</strong><small>GADGETS ADMIN</small></span></button>
          <p className="admin-sidebar-label">STORE MANAGEMENT</p>
          <nav className="admin-sidebar-nav" aria-label="Admin sections">
          <button className={`admin-side-link ${activeSection === 'inventory' && inventoryFilter === 'all' ? 'active' : ''}`} onClick={() => { setActiveSection('inventory'); setInventoryFilter('all'); }}><span>▦</span> Overview</button>
          <button className={`admin-side-link ${activeSection === 'inventory' && inventoryFilter === 'devices' ? 'active' : ''}`} onClick={() => { setActiveSection('inventory'); setInventoryFilter('devices'); }}><span>◫</span> Devices <b>{deviceCount}</b></button>
          <button className={`admin-side-link ${activeSection === 'inventory' && inventoryFilter === 'goodies' ? 'active' : ''}`} onClick={() => { setActiveSection('inventory'); setInventoryFilter('goodies'); }}><span>◈</span> Goodies <b>{goodiesCount}</b></button>
          <button className={`admin-side-link ${activeSection === 'inventory' && inventoryFilter === 'low-stock' ? 'active' : ''}`} onClick={() => { setActiveSection('inventory'); setInventoryFilter('low-stock'); }}><span>◷</span> Low stock <b>{lowStockCount}</b></button>
          <button className={`admin-side-link ${activeSection === 'sales' ? 'active' : ''}`} onClick={() => setActiveSection('sales')}><span>↗</span> Sales history <b>{sales.length}</b></button>
          </nav>
          <div className="admin-sidebar-bottom"><button className="admin-side-link" onClick={onBack}><span>↗</span> View storefront</button><p>Signed in as<br/><strong>{admin.email}</strong></p></div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar"><span>Store workspace <i>/</i> {activeSection === 'sales' ? 'Sales history' : inventoryFilter === 'all' ? 'Overview' : inventoryFilter === 'low-stock' ? 'Low stock' : inventoryFilter === 'goodies' ? 'Goodies' : 'Devices'}</span><div><span className="admin-secure-indicator">● Private admin</span><button onClick={() => void signOut(getFirebaseAuth())}>Sign out</button></div></header>
          <div className="admin-content">
            <header className="admin-page-heading"><div><p className="admin-eyebrow">CODETECH GADGETS</p><h1>{activeSection === 'sales' ? 'Sales history' : inventoryFilter === 'all' ? 'Store overview' : inventoryFilter === 'low-stock' ? 'Low stock' : inventoryFilter === 'goodies' ? 'Goodies inventory' : 'Devices inventory'}</h1><p>{activeSection === 'sales' ? 'Every WhatsApp sale you record, kept for your business history.' : 'Manage the listings customers see on your storefront.'}</p></div>{activeSection === 'inventory' && <button onClick={openAdd} className="admin-primary-button">＋ Add a device</button>}</header>

            {activeSection === 'inventory' && <section className="admin-stat-grid" aria-label="Inventory summary">
              <article><span>Active inventory</span><strong>{activeProducts.length}</strong><small>Not marked fully sold</small></article>
              <article><span>Devices</span><strong>{deviceCount}</strong><small>UK-used and brand-new</small></article>
              <article><span>Goodies</span><strong>{goodiesCount}</strong><small>Special price listings</small></article>
              <article className={lowStockCount ? 'attention' : ''}><span>Low stock</span><strong>{lowStockCount}</strong><small>One or fewer in stock</small></article>
              <article><span>Recorded sales</span><strong>{sales.length}</strong><small>Sold through WhatsApp</small></article>
            </section>}

            {activeSection === 'inventory' ? <section className="admin-inventory-panel">
              <div className="admin-inventory-heading"><div><h2>Product inventory</h2><p>{visibleProducts.length} listing{visibleProducts.length === 1 ? '' : 's'} shown · changes publish to the storefront</p></div><button className="admin-refresh-button" onClick={() => void refreshInventory()} disabled={inventoryLoading}>{inventoryLoading ? 'Refreshing…' : '↻ Refresh'}</button></div>
              <div className="admin-inventory-controls"><div className="admin-filter-tabs">{([['all', 'All'], ['devices', 'Devices'], ['goodies', 'Goodies'], ['low-stock', 'Low stock']] as const).map(([filter, label]) => <button key={filter} className={inventoryFilter === filter ? 'selected' : ''} onClick={() => setInventoryFilter(filter)}>{label}</button>)}</div><label className="admin-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products"/></label></div>
              {inventoryError && <p role="alert" className="admin-inventory-error">{inventoryError}</p>}
              {inventoryLoading ? <p className="admin-inventory-empty">Loading inventory…</p> : visibleProducts.length ? (
                <div className="admin-table-wrap"><table className="admin-product-table admin-inventory-table"><thead><tr><th>Product</th><th>Section</th><th>Condition</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead><tbody>
                  {visibleProducts.map(product => <tr key={product.id}>
                    <td><div className="admin-product-cell">{product.image ? <img src={product.image} alt=""/> : <span className="admin-product-placeholder">CT</span>}<span><strong>{product.name}</strong><small>{product.brand} · {product.category}</small><small>IMEI / serial: {product.serialNumber || 'Not recorded'}</small></span></div></td>
                    <td><span className={`admin-section-pill ${product.listingGroup === 'goodies' ? 'goodies' : ''}`}>{product.listingGroup === 'goodies' ? 'Goodies' : 'Devices'}</span></td>
                    <td>{product.condition || '—'}</td>
                    <td><span className={`admin-stock ${((product.stock ?? 0) <= 1) ? 'low' : ''}`}>{product.stock ?? 0} {((product.stock ?? 0) === 1) ? 'unit' : 'units'}</span></td>
                    <td className="admin-price-cell">₦{product.price.toLocaleString('en-NG')}</td>
                    <td><div className="admin-row-actions"><button onClick={() => openEdit(product)}>Edit</button><button onClick={() => openSaleRecord(product)}>Mark sold</button></div></td>
                  </tr>)}
                </tbody></table></div>
              ) : <div className="admin-inventory-empty"><strong>{products.length ? 'No matching products' : 'Your inventory is empty'}</strong><span>{products.length ? 'Try a different search or filter.' : 'Add your first device to publish it on the storefront.'}</span>{!products.length && <button onClick={openAdd}>Add a device</button>}</div>}
            </section> : <section className="admin-inventory-panel">
              <div className="admin-inventory-heading"><div><h2>Recorded sales</h2><p>Sold inventory stays in Firestore and is listed here for reference.</p></div><button className="admin-refresh-button" onClick={() => void refreshSales()} disabled={salesLoading}>{salesLoading ? 'Refreshing…' : '↻ Refresh'}</button></div>
              {inventoryError && <p role="alert" className="admin-inventory-error">{inventoryError}</p>}
              {salesLoading ? <p className="admin-inventory-empty">Loading sales…</p> : sales.length ? <div className="admin-table-wrap"><table className="admin-product-table admin-sales-table"><thead><tr><th>Item sold</th><th>Section</th><th>Sold via</th><th>Quantity</th><th>Final price</th><th>Sale status</th><th>Action</th></tr></thead><tbody>
                {sales.map(sale => <tr key={sale.id}><td><div className="admin-product-cell">{sale.image ? <img src={sale.image} alt=""/> : <span className="admin-product-placeholder">CT</span>}<span><strong>{sale.productName}</strong><small>{sale.brand} · {sale.condition}</small><small>IMEI / serial: {sale.serialNumber || 'Not recorded'}</small></span></div></td><td><span className={`admin-section-pill ${sale.listingGroup === 'goodies' ? 'goodies' : ''}`}>{sale.listingGroup === 'goodies' ? 'Goodies' : 'Devices'}</span></td><td><span className="admin-sale-channel">WhatsApp</span></td><td>{sale.quantity}</td><td className="admin-price-cell">₦{sale.soldPrice.toLocaleString('en-NG')}</td><td><span className={`admin-sale-status ${sale.reversedAt ? 'reversed' : ''}`}>{sale.reversedAt ? 'Reversed' : 'Completed'}</span>{sale.reversedAt && <small className="admin-reversal-reason">{new Date(sale.reversedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}{sale.restocked ? ' · Restocked' : ' · Not restocked'}{sale.reversalReason ? ` · ${sale.reversalReason}` : ''}</small>}</td><td>{sale.reversedAt ? <span className="admin-action-done">Recorded</span> : <button className="admin-reverse-button" onClick={() => openReverseSale(sale)}>Reverse sale</button>}</td></tr>)}
              </tbody></table></div> : <div className="admin-inventory-empty"><strong>No sales recorded yet</strong><span>When a device sells on WhatsApp, mark it as sold from your inventory to keep a record here.</span></div>}
            </section>}
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="admin-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <form onSubmit={saveProduct} className="admin-modal my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div><h2 className="text-xl font-bold text-slate-900">{editId === null ? 'Add a device' : 'Edit device'}</h2><p className="mt-1 text-sm text-slate-500">This information appears in the public catalogue.</p></div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
            </div>
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Device name *<input className={`${INPUT_CLASS} mt-1.5`} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="iPhone 15 Pro" /></label>
              <label className="text-sm font-semibold text-slate-700">Brand *<input className={`${INPUT_CLASS} mt-1.5`} value={form.brand} onChange={event => setForm({ ...form, brand: event.target.value })} placeholder="Apple" /></label>
              <label className="text-sm font-semibold text-slate-700">IMEI or serial number *<input className={`${INPUT_CLASS} mt-1.5`} value={form.serialNumber} onChange={event => setForm({ ...form, serialNumber: event.target.value })} placeholder="Device identifier" autoComplete="off" /></label>
              <p className="self-center text-xs leading-5 text-slate-500">Stored in the private admin records. It is not sent to or shown on the public storefront.</p>
              <label className="text-sm font-semibold text-slate-700">Price (₦) *<input className={`${INPUT_CLASS} mt-1.5`} type="number" min="1" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="850000" /></label>
              <label className="text-sm font-semibold text-slate-700">Previous price (₦)<input className={`${INPUT_CLASS} mt-1.5`} type="number" min="0" value={form.oldPrice} onChange={event => setForm({ ...form, oldPrice: event.target.value })} placeholder="Optional" /></label>
              <label className="text-sm font-semibold text-slate-700">Category *<select className={`${INPUT_CLASS} mt-1.5`} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option value="">Select</option>{['phones', 'laptops', 'tablets', 'audio', 'wearables', 'cameras', 'accessories', 'smart-home'].map(category => <option key={category} value={category}>{category}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">Catalogue section *<select className={`${INPUT_CLASS} mt-1.5`} value={form.listingGroup} onChange={event => setForm({ ...form, listingGroup: event.target.value as ProductForm['listingGroup'], condition: '', conditionNotes: '' })}><option value="devices">Devices · UK-used & brand-new</option><option value="goodies">Goodies · special deals</option></select></label>
              {form.listingGroup === 'devices' ? <label className="text-sm font-semibold text-slate-700">Stock type *<select className={`${INPUT_CLASS} mt-1.5`} value={form.condition} onChange={event => setForm({ ...form, condition: event.target.value })}><option value="">Select</option><option value="UK Used">UK Used</option><option value="Brand New">Brand New</option></select></label> : <label className="text-sm font-semibold text-slate-700">Condition *<input className={`${INPUT_CLASS} mt-1.5`} value={form.condition} onChange={event => setForm({ ...form, condition: event.target.value })} placeholder="e.g. Goodie · minor screen issue" /></label>}
              {form.listingGroup === 'goodies' && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Condition details customers should know *<textarea className={`${INPUT_CLASS} mt-1.5 min-h-20 resize-y`} value={form.conditionNotes} onChange={event => setForm({ ...form, conditionNotes: event.target.value })} placeholder="Describe any faults, wear, or included accessories clearly." /></label>}
              <label className="text-sm font-semibold text-slate-700">Quantity in stock *<input className={`${INPUT_CLASS} mt-1.5`} type="number" min="0" step="1" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} /></label>
              <label className="text-sm font-semibold text-slate-700">Store badge<select className={`${INPUT_CLASS} mt-1.5`} value={form.badge} onChange={event => setForm({ ...form, badge: event.target.value })}><option value="">No badge</option><option value="New arrival">New arrival</option><option value="Popular">Popular</option><option value="Good value">Good value</option></select></label>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Product photo *</label>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  {form.imageUrl && <img src={form.imageUrl} alt="Selected product preview" className="h-20 w-24 rounded-lg bg-white object-cover" />}
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-800 ring-1 ring-slate-200 hover:bg-blue-50">
                      {uploadBusy ? 'Uploading photo…' : form.imageUrl ? 'Choose another photo' : 'Upload a photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploadBusy} onChange={event => void uploadImage(event.target.files?.[0])} />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Choose a product image up to 8 MB. It uploads to Cloudinary; Firestore stores the resulting image URL.</p>
                  </div>
                </div>
                <label className="mt-3 block text-xs font-semibold text-slate-500">Or paste an existing hosted image URL
                  <input className={`${INPUT_CLASS} mt-1.5 font-normal`} type="url" value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://res.cloudinary.com/..." />
                </label>
              </div>
              {formError && <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button disabled={saveBusy || uploadBusy} className="rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{saveBusy ? 'Saving…' : 'Save and publish'}</button>
            </div>
          </form>
        </div>
      )}

      {saleProduct && (
        <div className="admin-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saleBusy) setSaleProduct(null); }}>
          <form onSubmit={recordSale} className="admin-modal my-6 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-blue-700">WHATSAPP SALE</p><h2 className="mt-2 text-xl font-bold text-slate-900">Record this sale</h2><p className="mt-1 text-sm text-slate-500">{saleProduct.name} · {saleProduct.condition}</p></div>
            <div className="space-y-4 px-6 py-5">
              <label className="block text-sm font-semibold text-slate-700">Final amount received (₦)
                <input className={`${INPUT_CLASS} mt-1.5`} type="number" min="0" step="1" value={salePrice} onChange={event => setSalePrice(event.target.value)} required />
              </label>
              <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">This adds a permanent WhatsApp sale record and reduces the available stock by one. The product record will not be deleted.</p>
              {saleError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saleError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setSaleProduct(null)} disabled={saleBusy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button disabled={saleBusy} className="rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saleBusy ? 'Saving sale…' : 'Record as sold'}</button>
            </div>
          </form>
        </div>
      )}

      {reversingSale && (
        <div className="admin-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !reversalBusy) setReversingSale(null); }}>
          <form onSubmit={recordSaleReversal} className="admin-modal my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-amber-700">SALE CORRECTION</p><h2 className="mt-2 text-xl font-bold text-slate-900">Reverse this sale?</h2><p className="mt-1 text-sm text-slate-500">{reversingSale.productName} · ₦{reversingSale.soldPrice.toLocaleString('en-NG')}</p></div>
            <div className="space-y-4 px-6 py-5">
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">The original sale will stay in your history. This adds a separate reversal record and restores one unit to available stock so it can be resold. Nothing is deleted.</p>
              <label className="block text-xs font-semibold text-slate-700">Reason for reversal
                <textarea className={`${INPUT_CLASS} mt-1.5 min-h-20 resize-y`} value={reversalReason} onChange={event => setReversalReason(event.target.value)} placeholder="For example: customer cancelled before collection" required minLength={5}/>
              </label>
              {reversalError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reversalError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setReversingSale(null)} disabled={reversalBusy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Keep sale</button><button disabled={reversalBusy} className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{reversalBusy ? 'Reversing…' : 'Confirm reversal'}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
