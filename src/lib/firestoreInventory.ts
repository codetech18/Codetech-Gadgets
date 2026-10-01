import { collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Product, SaleRecord } from '../types';
import { getDatabase } from './firebase';

export type ProductDraft = Omit<Product, 'id'>;

function productDocument(product: ProductDraft) {
  return {
    name: product.name.trim(),
    brand: product.brand.trim(),
    category: product.category,
    priceNgn: product.price,
    oldPriceNgn: product.oldPrice ?? null,
    condition: product.condition || 'Quality checked',
    conditionNotes: product.conditionNotes?.trim() ?? '',
    listingGroup: product.listingGroup === 'goodies' ? 'goodies' : 'devices',
    stockQuantity: product.stock ?? 0,
    status: product.stock && product.stock > 0 ? 'available' : 'out_of_stock',
    featured: Boolean(product.badge),
    badge: product.badge ?? null,
    imageUrl: product.image ?? '',
    updatedAt: serverTimestamp(),
  };
}

function privateProductDocument(product: ProductDraft) {
  return {
    serialNumber: product.serialNumber?.trim() ?? '',
    updatedAt: serverTimestamp(),
  };
}

export async function createInventoryProduct(product: ProductDraft) {
  const database = getDatabase();
  const productRef = doc(collection(database, 'products'));
  const batch = writeBatch(database);
  batch.set(productRef, { ...productDocument(product), createdAt: serverTimestamp() });
  batch.set(doc(database, 'privateProductDetails', productRef.id), { ...privateProductDocument(product), createdAt: serverTimestamp() });
  await batch.commit();
  return productRef;
}

export async function updateInventoryProduct(id: string, product: ProductDraft) {
  const database = getDatabase();
  const batch = writeBatch(database);
  batch.update(doc(database, 'products', id), productDocument(product));
  batch.set(doc(database, 'privateProductDetails', id), privateProductDocument(product), { merge: true });
  return batch.commit();
}

export async function loadPrivateProductDetails() {
  const snapshot = await getDocs(collection(getDatabase(), 'privateProductDetails'));
  return new Map(snapshot.docs.map(document => [document.id, String(document.data().serialNumber ?? '')]));
}

export async function markInventoryProductSold(id: string, soldPrice: number) {
  if (!Number.isFinite(soldPrice) || soldPrice < 0) throw new Error('Enter a valid final sale price.');
  const database = getDatabase();
  const productRef = doc(database, 'products', id);
  const saleRef = doc(collection(database, 'sales'));

  await runTransaction(database, async transaction => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists()) throw new Error('This inventory item no longer exists.');

    const product = snapshot.data();
    if (product.status === 'sold') throw new Error('This item has already been marked as sold.');
    const privateRef = doc(database, 'privateProductDetails', id);
    const privateSnapshot = await transaction.get(privateRef);

    const stockBefore = Math.max(0, Number(product.stockQuantity ?? 0));
    const stockAfter = Math.max(0, stockBefore - 1);
    transaction.update(productRef, {
      stockQuantity: stockAfter,
      status: stockAfter > 0 ? 'available' : 'sold',
      lastSoldAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(saleRef, {
      productId: snapshot.id,
      productName: String(product.name ?? product.title ?? 'Product'),
      serialNumber: String(privateSnapshot.data()?.serialNumber ?? ''),
      brand: String(product.brand ?? ''),
      category: String(product.category ?? ''),
      listingGroup: product.listingGroup === 'goodies' ? 'goodies' : 'devices',
      condition: String(product.condition ?? ''),
      imageUrl: String(product.imageUrl ?? product.image ?? ''),
      quantity: 1,
      stockBefore,
      soldPriceNgn: soldPrice,
      saleChannel: 'whatsapp',
      soldAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
  return saleRef.id;
}

export async function reverseInventorySale(saleId: string, reason: string, restock: boolean) {
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
    if (restock && (!productSnapshot || !productSnapshot.exists())) {
      throw new Error('The original inventory item could not be found to restock.');
    }

    if (restock && productRef && productSnapshot?.exists()) {
      const currentStock = Math.max(0, Number(productSnapshot.data().stockQuantity ?? 0));
      transaction.update(productRef, {
        stockQuantity: currentStock + 1,
        status: 'available',
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(reversalRef, {
      saleId,
      productId,
      reason: cleanReason,
      restocked: restock,
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
      brand: String(record.brand ?? ''),
      category: String(record.category ?? ''),
      listingGroup: record.listingGroup === 'goodies' ? 'goodies' : 'devices',
      condition: String(record.condition ?? ''),
      image: String(record.imageUrl ?? '') || undefined,
      quantity: Math.max(1, Number(record.quantity ?? 1)),
      soldPrice: Number(record.soldPriceNgn ?? 0),
      saleChannel: 'whatsapp',
      soldAt: timestamp?.toDate?.().toISOString() ?? '',
      reversedAt: reversedTimestamp?.toDate?.().toISOString(),
      reversalReason: reversal ? String(reversal.reason ?? '') : undefined,
      restocked: reversal ? Boolean(reversal.restocked) : undefined,
    };
  });
}
