import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Product } from '../types';
import { getDatabase } from './firebase';

type CatalogRecord = {
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  priceNgn?: number | string;
  price?: number | string;
  condition?: string;
  conditionNotes?: string;
  listingGroup?: 'devices' | 'goodies';
  stockQuantity?: number | string;
  stock?: number | string;
  featured?: boolean;
  badge?: string | null;
  imageUrl?: string;
  image?: string;
  rating?: number | string;
  reviews?: number | string;
  oldPriceNgn?: number | string;
  status?: 'available' | 'out_of_stock' | 'sold';
  backInStock?: boolean;
  createdAt?: { toMillis?: () => number };
};

function toProduct(id: string, record: CatalogRecord, serialNumber?: string): Product | null {
    const stock = Number(record.stockQuantity ?? record.stock ?? 0);
    const price = Number(record.priceNgn ?? record.price ?? 0);
    const name = record.name ?? record.title ?? '';
    if (!name || !record.brand || !record.category || !Number.isFinite(price) || price <= 0) return null;

    const product: Product = {
      id,
      name,
      brand: record.brand,
      category: record.category,
      price,
      emoji: '●',
      rating: Number(record.rating ?? 0),
      reviews: Number(record.reviews ?? 0),
      badge: record.badge || (record.featured ? 'Featured' : undefined),
      image: record.imageUrl ?? record.image,
      condition: record.condition ?? 'Quality checked',
      conditionNotes: record.conditionNotes ?? '',
      listingGroup: record.listingGroup === 'goodies' ? 'goodies' : 'devices',
      stock,
      listingStatus: record.status ?? (stock > 0 ? 'available' : 'out_of_stock'),
      backInStock: Boolean(record.backInStock),
      ...(serialNumber !== undefined ? { serialNumber } : {}),
    };
    const oldPrice = Number(record.oldPriceNgn ?? 0);
    if (oldPrice > 0) product.oldPrice = oldPrice;
    return product;
}

function productsFromCatalogSnapshot(snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }): Product[] {
  return snapshot.docs
    .map(document => ({ product: toProduct(document.id, document.data() as CatalogRecord), record: document.data() as CatalogRecord }))
    .filter((item): item is { product: Product; record: CatalogRecord } => item.product !== null && (item.product.stock ?? 0) > 0)
    .sort((a, b) => Number(Boolean(b.record.featured)) - Number(Boolean(a.record.featured)) || (b.record.createdAt?.toMillis?.() ?? 0) - (a.record.createdAt?.toMillis?.() ?? 0))
    .map(({ product }) => product);
}

function publicCatalogQuery() {
  return query(collection(getDatabase(), 'products'), where('status', '==', 'available'));
}

export async function loadFirestoreCatalog(): Promise<Product[]> {
  return productsFromCatalogSnapshot(await getDocs(publicCatalogQuery()));
}

export function subscribeFirestoreCatalog(onUpdate: (products: Product[]) => void, onError: (error: Error) => void) {
  return onSnapshot(publicCatalogQuery(), snapshot => onUpdate(productsFromCatalogSnapshot(snapshot)), onError);
}

export async function loadFirestoreInventory(): Promise<Product[]> {
  const [snapshot, privateSnapshot] = await Promise.all([
    getDocs(collection(getDatabase(), 'products')),
    getDocs(collection(getDatabase(), 'privateProductDetails')),
  ]);
  const privateDetails = new Map(privateSnapshot.docs.map(document => [document.id, String(document.data().serialNumber ?? '')]));
  return snapshot.docs
    .map(document => ({ product: toProduct(document.id, document.data() as CatalogRecord, privateDetails.get(document.id) ?? ''), record: document.data() as CatalogRecord }))
    .filter((item): item is { product: Product; record: CatalogRecord } => item.product !== null)
    .sort((a, b) => Number(Boolean(b.record.featured)) - Number(Boolean(a.record.featured)) || (b.record.createdAt?.toMillis?.() ?? 0) - (a.record.createdAt?.toMillis?.() ?? 0))
    .map(({ product }) => product);
}
