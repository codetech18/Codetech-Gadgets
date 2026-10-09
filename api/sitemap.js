import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, limit, startAfter, getDocs } from 'firebase/firestore/lite';

const origin = 'https://www.codetechgadgets.online';
const publicPaths = ['/', '/devices', '/goodies', '/sell', '/swap'];
const escapeXml = value => value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]));

export function sitemapXml(products) {
  const paths = [...publicPaths, ...products.filter(({ data }) => data.status === 'available' && Number(data.stockQuantity ?? data.stock ?? 0) > 0 && (data.name || data.title) && data.brand && data.category && Number(data.priceNgn ?? data.price ?? 0) > 0).map(({ id }) => `/product/${encodeURIComponent(id)}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>${escapeXml(origin + path)}</loc></url>`).join('\n')}\n</urlset>`;
}

export default async function handler(_request, response) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!projectId || !apiKey) throw new Error('Missing Firebase public catalog configuration');
    const app = getApps().find(app => app.name === 'sitemap') ?? initializeApp({ projectId, apiKey }, 'sitemap');
    const database = getFirestore(app);
    const products = [];
    let cursor;
    // Paginate the public catalog; private inventory and customer data are never queried.
    while (true) {
      const constraints = [where('status', '==', 'available'), ...(cursor ? [startAfter(cursor)] : []), limit(500)];
      const snapshot = await getDocs(query(collection(database, 'products'), ...constraints));
      products.push(...snapshot.docs.map(document => ({ id: document.id, data: document.data() })));
      if (products.length > 45000) throw new Error('Catalog needs a split sitemap');
      if (snapshot.docs.length < 500) break;
      cursor = snapshot.docs.at(-1);
    }
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.status(200).send(sitemapXml(products));
  } catch {
    // Never cache an incomplete sitemap as if the catalog was empty.
    response.setHeader('Cache-Control', 'no-store');
    response.status(503).send('Sitemap temporarily unavailable.');
  }
}
