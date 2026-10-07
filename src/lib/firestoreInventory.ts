import { collection, deleteField, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Product, SaleRecord } from '../types';
import { getDatabase } from './firebase';

export type ProductDraft = Omit<Product, 'id'>;

function productDocument(product: ProductDraft) {
  const images = (product.images?.length ? product.images : (product.image ? [product.image] : [])).slice(0, 3);
  const variants = product.variants ?? [];
  const availableVariants = variants.filter(variant => variant.stock > 0);
  const stock = variants.length ? variants.reduce((total, variant) => total + variant.stock, 0) : product.stock ?? 0;
  const price = availableVariants.length ? Math.min(...availableVariants.map(variant => variant.price)) : product.price;
  return {
    name: product.name.trim(),
    brand: product.brand.trim(),
    category: product.category,
    priceNgn: price,
    variants,
    oldPriceNgn: product.oldPrice ?? null,
    condition: product.condition || 'Quality checked',
    conditionNotes: product.conditionNotes?.trim() ?? '',
    listingGroup: product.listingGroup === 'goodies' ? 'goodies' : 'devices',
    stockQuantity: stock,
    status: stock > 0 ? 'available' : 'out_of_stock',
    featured: Boolean(product.badge),
    badge: product.badge ?? null,
    imageUrl: images[0] ?? '',
    imageUrls: images,
    updatedAt: serverTimestamp(),
  };
}

export async function createInventoryProduct(product: ProductDraft) {
  const database = getDatabase();
  const productRef = doc(collection(database, 'products'));
  const batch = writeBatch(database);
  batch.set(productRef, { ...productDocument(product), createdAt: serverTimestamp() });
  await batch.commit();
  return productRef;
}

export async function updateInventoryProduct(id: string, product: ProductDraft) {
  const database = getDatabase();
  const batch = writeBatch(database);
  batch.update(doc(database, 'products', id), {
    ...productDocument(product),
    serialNumber: deleteField(),
    imei: deleteField(),
  });
  return batch.commit();
}

export async function deleteInventoryProduct(id: string) {
  const database = getDatabase();
  const productRef = doc(database, 'products', id);
  await runTransaction(database, async transaction => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists()) throw new Error('This inventory item no longer exists.');
    if (snapshot.data().status === 'deleted') return;
    transaction.update(productRef, { status: 'deleted', deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

export async function restoreInventoryProduct(id: string) {
  const database = getDatabase();
  const productRef = doc(database, 'products', id);
  await runTransaction(database, async transaction => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists()) throw new Error('This inventory item no longer exists.');
    if (snapshot.data().status !== 'deleted') throw new Error('This listing is not deleted.');
    const stock = Math.max(0, Number(snapshot.data().stockQuantity ?? 0));
    transaction.update(productRef, { status: stock > 0 ? 'available' : 'out_of_stock', restoredAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

export async function markInventoryProductSold(id: string, soldPrice: number, serialNumber: string | null, variantId?: string) {
  if (!Number.isFinite(soldPrice) || soldPrice < 0) throw new Error('Enter a valid final sale price.');
  if (serialNumber !== null && !serialNumber.trim()) throw new Error('Enter the sold item identifier or choose that it has no identifier.');
  const database = getDatabase();
  const productRef = doc(database, 'products', id);
  const saleRef = doc(collection(database, 'sales'));

  await runTransaction(database, async transaction => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists()) throw new Error('This inventory item no longer exists.');

    const product = snapshot.data();
    if (product.status === 'sold') throw new Error('This item has already been marked as sold.');
    if (product.status === 'deleted') throw new Error('Restore this listing before recording another sale.');
    const variants = Array.isArray(product.variants) ? product.variants as Product['variants'] : [];
    const selectedVariant = variants?.find(variant => variant.id === variantId);
    if (variants?.length && (!selectedVariant || selectedVariant.stock <= 0)) throw new Error('Choose an available storage option.');
    const stockBefore = Math.max(0, Number(product.stockQuantity ?? 0));
    if (stockBefore <= 0) throw new Error('This item is out of stock.');
    const stockAfter = Math.max(0, stockBefore - 1);
    const nextVariants = variants?.map(variant => variant.id === variantId ? { ...variant, stock: variant.stock - 1 } : variant) ?? [];
    const availablePrices = nextVariants.filter(variant => variant.stock > 0).map(variant => variant.price);
    transaction.update(productRef, {
      stockQuantity: stockAfter,
      ...(variants?.length ? { variants: nextVariants, priceNgn: availablePrices.length ? Math.min(...availablePrices) : product.priceNgn } : {}),
      status: stockAfter > 0 ? 'available' : 'sold',
      backInStock: false,
      lastSoldAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(saleRef, {
      productId: snapshot.id,
      productName: String(product.name ?? product.title ?? 'Product'),
      serialNumber: serialNumber?.trim() ?? '',
      hasNoIdentifier: serialNumber === null,
      brand: String(product.brand ?? ''),
      category: String(product.category ?? ''),
      listingGroup: product.listingGroup === 'goodies' ? 'goodies' : 'devices',
      condition: String(product.condition ?? ''),
      imageUrl: String(product.imageUrl ?? product.image ?? ''),
      imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : (product.imageUrl ? [String(product.imageUrl)] : []),
      quantity: 1,
      variantId: selectedVariant?.id ?? '',
      variantStorage: selectedVariant?.storage ?? '',
      stockBefore,
      soldPriceNgn: soldPrice,
      saleChannel: 'whatsapp',
      soldAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
  return saleRef.id;
}

export async function reverseInventorySale(saleId: string, reason: string) {
  const cleanReason = reason.trim();
  if (cleanReason.length < 5) throw new Error('Add a short reason for reversing this sale.');

  const database = getDatabase();
  const saleRef = doc(database, 'sales', saleId);
  const reversalRef = doc(database, 'saleReversals', saleId);

  await runTransaction(database, async transaction => {
    const saleSnapshot = await transaction.get(saleRef);
    const reversalSnapshot = await transaction.get(reversalRef);
    if (!saleSnapshot.exists()) throw new Error('This sale record could not be found.');
    if (reversalSnapshot.exists()) throw new Error('This sale has already been reversed.');

    const sale = saleSnapshot.data();
    const productId = String(sale.productId ?? '');
    const productRef = productId ? doc(database, 'products', productId) : null;
    const productSnapshot = productRef ? await transaction.get(productRef) : null;
    if (!productSnapshot || !productSnapshot.exists()) {
      throw new Error('The original inventory item could not be found to restock.');
    }

    const currentStock = Math.max(0, Number(productSnapshot.data().stockQuantity ?? 0));
    const variants = Array.isArray(productSnapshot.data().variants) ? productSnapshot.data().variants as Product['variants'] : [];
    const nextVariants = variants?.map(variant => variant.id === sale.variantId ? { ...variant, stock: variant.stock + 1 } : variant) ?? [];
    if (sale.variantId && !nextVariants.some(variant => variant.id === sale.variantId)) throw new Error('The original storage option no longer exists.');
    const availablePrices = nextVariants.filter(variant => variant.stock > 0).map(variant => variant.price);
    transaction.update(productRef!, {
      stockQuantity: currentStock + 1,
      ...(variants?.length ? { variants: nextVariants, priceNgn: availablePrices.length ? Math.min(...availablePrices) : productSnapshot.data().priceNgn } : {}),
      status: productSnapshot.data().status === 'deleted' ? 'deleted' : 'available',
      backInStock: productSnapshot.data().status !== 'deleted',
      restockedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(reversalRef, {
      saleId,
      productId,
      reason: cleanReason,
      restocked: true,
      reversedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
}

export async function loadSalesHistory(): Promise<SaleRecord[]> {
  const salesQuery = query(collection(getDatabase(), 'sales'), orderBy('soldAt', 'desc'));
  const [snapshot, reversals] = await Promise.all([
    getDocs(salesQuery),
    getDocs(collection(getDatabase(), 'saleReversals')),
  ]);
  const reversalBySale = new Map(reversals.docs.map(document => [document.id, document.data()]));
  return snapshot.docs.map(document => {
    const record = document.data();
    const timestamp = record.soldAt as { toDate?: () => Date } | undefined;
    const reversal = reversalBySale.get(document.id);
    const reversedTimestamp = reversal?.reversedAt as { toDate?: () => Date } | undefined;
    return {
      id: document.id,
      productId: String(record.productId ?? ''),
      productName: String(record.productName ?? 'Product'),
      serialNumber: String(record.serialNumber ?? ''),
      hasNoIdentifier: Boolean(record.hasNoIdentifier),
      brand: String(record.brand ?? ''),
      category: String(record.category ?? ''),
      listingGroup: record.listingGroup === 'goodies' ? 'goodies' : 'devices',
      condition: String(record.condition ?? ''),
      image: String(record.imageUrl ?? '') || undefined,
      quantity: Math.max(1, Number(record.quantity ?? 1)),
      soldPrice: Number(record.soldPriceNgn ?? 0),
      variantId: record.variantId ? String(record.variantId) : undefined,
      variantStorage: record.variantStorage ? String(record.variantStorage) : undefined,
      saleChannel: 'whatsapp',
      soldAt: timestamp?.toDate?.().toISOString() ?? '',
      reversedAt: reversedTimestamp?.toDate?.().toISOString(),
      reversalReason: reversal ? String(reversal.reason ?? '') : undefined,
      restocked: reversal ? Boolean(reversal.restocked) : undefined,
    };
  });
}
