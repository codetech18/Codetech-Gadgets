import type { Page } from '../types';

const pages: Page[] = ['home', 'devices', 'goodies', 'cart', 'login', 'signup', 'profile', 'complaint', 'admin', 'sell', 'swap'];

export function pagePath(page: Page): string {
  return page === 'home' ? '/' : `/${page}`;
}

export function productPath(id: string | number): string {
  return `/product/${encodeURIComponent(String(id))}`;
}

export function readRoute(pathname: string, hash = ''): { page: Page; productId: string | null; unknown?: boolean } {
  const path = pathname.replace(/\/+$/, '') || '/';
  // Keep existing bookmarks and WhatsApp links working during migration.
  const route = path === '/' && hash ? hash.slice(1) : path.slice(1);
  if (route.startsWith('product/')) {
    try {
      const productId = decodeURIComponent(route.slice(8));
      if (productId && !productId.includes('/')) return { page: 'product', productId };
    } catch { /* Malformed URLs are treated as missing pages. */ }
    return { page: 'home', productId: null, unknown: true };
  }
  return { page: pages.includes(route as Page) ? route as Page : 'home', productId: null, unknown: Boolean(route && !pages.includes(route as Page)) };
}
