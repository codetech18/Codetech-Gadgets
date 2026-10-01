import { Product } from '../types';

type ListingRecord = {
  title: string;
  price_ngn: number | string;
  condition: string;
  stock_quantity: number;
  featured: boolean;
  device_models: { brand: string; category: string; model_name: string };
  listing_images: { secure_url: string; position: number }[];
};

const conditionLabels: Record<string, string> = {
  sealed: 'Sealed', like_new: 'Like new', excellent: 'Excellent', very_good: 'Very good', good: 'Good', fair: 'Fair', faulty: 'Faulty',
};

export async function loadSupabaseCatalog(projectUrl: string, publicKey: string): Promise<Product[]> {
  const root = projectUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const query = new URLSearchParams({
    select: 'title,price_ngn,condition,stock_quantity,featured,device_models!inner(brand,model_name,category),listing_images(secure_url,position)',
    status: 'eq.available',
    stock_quantity: 'gt.0',
    order: 'featured.desc,created_at.desc',
    'listing_images.order': 'position.asc',
  });
  const response = await fetch(`${root}/rest/v1/device_listings?${query.toString()}`, {
    headers: { apikey: publicKey, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Supabase catalog request failed (${response.status}).`);

  const rows = await response.json() as ListingRecord[];
  return rows.map((row, index) => ({
    id: index + 1,
    name: row.title,
    brand: row.device_models.brand,
    category: row.device_models.category,
    price: Number(row.price_ngn),
    emoji: '●',
    rating: 0,
    reviews: 0,
    badge: row.featured ? 'Featured' : undefined,
    image: row.listing_images?.[0]?.secure_url,
    condition: conditionLabels[row.condition] || row.condition,
    stock: row.stock_quantity,
  }));
}
