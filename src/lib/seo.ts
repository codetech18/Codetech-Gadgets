import type { Page, Product } from '../types';

export const SITE_URL = 'https://www.codetechgadgets.online';
export const DEFAULT_DESCRIPTION = 'Buy, sell, or swap devices with CodeTech Gadgets. Shop brand-new and UK-used phones, laptops, tablets, and more. Enquire directly on WhatsApp.';
const pageCopy: Partial<Record<Page, [string, string]>> = {
  home: ['CodeTech Gadgets — Buy, Sell & Swap Devices', DEFAULT_DESCRIPTION],
  devices: ['Shop Phones, Laptops & Tablets | CodeTech Gadgets', 'Browse available brand-new and UK-used phones, laptops, tablets, audio devices, and wearables at CodeTech Gadgets. Ask about availability on WhatsApp.'],
  goodies: ['Shop Goodies | CodeTech Gadgets', 'Explore available Goodies at CodeTech Gadgets. View item details, prices, and condition, then contact our team on WhatsApp.'],
  sell: ['Sell Your Device | CodeTech Gadgets', 'Sell your phone, laptop, or tablet with CodeTech Gadgets. Share your device details and condition with our team on WhatsApp for an assessment.'],
  swap: ['Swap Your Device | CodeTech Gadgets', 'Upgrade with a device swap at CodeTech Gadgets. Tell us about your current device and the device you want, then discuss options on WhatsApp.'],
};

export function buildSeo(page: Page, path: string, product: Product | null, missing = false) {
  const url = new URL(path, SITE_URL).href;
  const title = product ? `${product.name} | CodeTech Gadgets` : missing ? 'Listing unavailable | CodeTech Gadgets' : pageCopy[page]?.[0] ?? `${page.charAt(0).toUpperCase() + page.slice(1)} | CodeTech Gadgets`;
  const description = product ? `Enquire about ${product.name} by ${product.brand} at CodeTech Gadgets. ${product.condition ? `Condition: ${product.condition}. ` : ''}${product.conditionNotes || 'Contact our team on WhatsApp to confirm availability, delivery, and payment details.'}` : pageCopy[page]?.[1] ?? DEFAULT_DESCRIPTION;
  const image = new URL(product?.images?.[0] ?? product?.image ?? '/codetech-logo.jpg', SITE_URL).href;
  const noindex = missing || (page !== 'product' && !pageCopy[page]);
  const organization = { '@context': 'https://schema.org', '@type': 'ElectronicsStore', name: 'CodeTech Gadgets', url: SITE_URL, image: `${SITE_URL}/codetech-logo.jpg`, telephone: '+2349058977101', address: { '@type': 'PostalAddress', streetAddress: '4B Otigba Street, opposite Adeple Street, Computer Village', addressLocality: 'Ikeja', addressRegion: 'Lagos', addressCountry: 'NG' } };
  const variants = product?.variants?.filter(variant => variant.stock > 0 && variant.price > 0) ?? [];
  const prices = variants.length ? variants.map(variant => variant.price) : [product?.price ?? 0];
  const condition = /brand\s*new|^new$/i.test(product?.condition ?? '') ? 'https://schema.org/NewCondition' : /used|like new|excellent|very good/i.test(product?.condition ?? '') ? 'https://schema.org/UsedCondition' : undefined;
  const structuredData = product ? {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description,
    image: (product.images?.length ? product.images : product.image ? [product.image] : []).map(value => new URL(value, SITE_URL).href),
    brand: { '@type': 'Brand', name: product.brand }, category: product.category, url,
    offers: variants.length > 1 ? {
      '@type': 'AggregateOffer', url, priceCurrency: 'NGN', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: variants.length,
      offers: variants.map(variant => ({ '@type': 'Offer', url, name: `${product.name} ${variant.storage}`, priceCurrency: 'NGN', price: variant.price, availability: 'https://schema.org/InStock', ...(condition ? { itemCondition: condition } : {}) })),
    } : { '@type': 'Offer', url, priceCurrency: 'NGN', price: prices[0], availability: (product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', ...(condition ? { itemCondition: condition } : {}) },
  } : noindex || page === 'product' ? null : organization;
  return { title, description, url, image, noindex, structuredData };
}

export function applySeo(seo: ReturnType<typeof buildSeo>) {
  document.title = seo.title;
  function meta(attribute: 'name' | 'property', name: string, content: string) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element); }
    element.content = content;
  }
  meta('name', 'description', seo.description);
  meta('name', 'robots', seo.noindex ? 'noindex, follow' : 'index, follow');
  for (const [name, content] of Object.entries({ 'og:title': seo.title, 'og:description': seo.description, 'og:url': seo.url, 'og:image': seo.image, 'og:type': seo.structuredData?.['@type'] === 'Product' ? 'product' : 'website', 'og:site_name': 'CodeTech Gadgets' })) meta('property', name, content);
  for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': seo.title, 'twitter:description': seo.description, 'twitter:image': seo.image })) meta('name', name, content);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = seo.url;
  document.getElementById('seo-structured-data')?.remove();
  if (seo.structuredData) {
    const script = document.createElement('script');
    script.id = 'seo-structured-data'; script.type = 'application/ld+json'; script.textContent = JSON.stringify(seo.structuredData).replace(/</g, '\\u003c');
    document.head.append(script);
  }
}
