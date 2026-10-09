import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import handler, { sitemapXml } from '../api/sitemap.js';

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { readRoute, productPath, pagePath } = await loadTypeScript('../src/lib/routes.ts');
const { buildSeo } = await loadTypeScript('../src/lib/seo.ts');
const product = { id: 'phone&1', name: 'iPhone 15 Pro', brand: 'Apple', category: 'phones', price: 800000, stock: 3, condition: 'UK used', images: ['https://example.com/phone.jpg'], variants: [{ id: 'a', storage: '128 GB', price: 800000, stock: 2 }, { id: 'b', storage: '256 GB', price: 950000, stock: 1 }, { id: 'c', storage: '512 GB', price: 1200000, stock: 0 }] };

test('clean product URLs round-trip IDs and old hash links still resolve', () => {
  assert.deepEqual(readRoute(productPath(product.id)), { page: 'product', productId: product.id });
  assert.deepEqual(readRoute('/', '#product/phone%261'), { page: 'product', productId: product.id });
  for (const page of ['home', 'devices', 'goodies', 'sell', 'swap', 'admin', 'cart']) {
    assert.equal(readRoute(pagePath(page)).page, page);
    assert.equal(readRoute('/', `#${page}`).page, page);
  }
  assert.equal(readRoute('/product/%E0%A4%A').unknown, true);
  assert.equal(readRoute('/product/a%2Fb').unknown, true);
  assert.equal(readRoute('/unknown').unknown, true);
});

test('product metadata uses the canonical host and only available variant prices', () => {
  const seo = buildSeo('product', productPath(product.id), product);
  assert.equal(seo.title, 'iPhone 15 Pro | CodeTech Gadgets');
  assert.equal(seo.url, 'https://www.codetechgadgets.online/product/phone%261');
  assert.match(seo.description, /UK used/);
  assert.equal(seo.structuredData.offers.lowPrice, 800000);
  assert.equal(seo.structuredData.offers.highPrice, 950000);
  assert.equal(seo.structuredData.offers.offerCount, 2);
  assert.equal(seo.structuredData.offers.offers[0].itemCondition, 'https://schema.org/UsedCondition');
  assert.equal(seo.noindex, false);
  assert.equal('aggregateRating' in seo.structuredData, false);
});

test('private and missing pages are excluded; public pages restore indexing and store metadata', () => {
  for (const page of ['admin', 'cart', 'login', 'signup', 'profile', 'complaint']) {
    const seo = buildSeo(page, pagePath(page), null);
    assert.equal(seo.noindex, true);
    assert.equal(seo.structuredData, null);
  }
  assert.equal(buildSeo('product', '/product/missing', null, true).noindex, true);
  assert.equal(buildSeo('product', '/product/loading', null).structuredData, null);
  const home = buildSeo('home', '/', null);
  assert.equal(home.noindex, false);
  assert.equal(home.structuredData.address.addressLocality, 'Ikeja');
  assert.notEqual(home.title, buildSeo('devices', '/devices', null).title);
});

test('sitemap includes only public pages and valid available inventory', () => {
  const available = { status: 'available', stockQuantity: 1, name: 'Phone', brand: 'Apple', category: 'phones', priceNgn: 100000 };
  const xml = sitemapXml([{ id: 'a&b', data: available }, { id: 'sold', data: { ...available, status: 'sold' } }, { id: 'empty', data: { ...available, stockQuantity: 0 } }, { id: 'invalid', data: { ...available, priceNgn: 0 } }]);
  assert.match(xml, /https:\/\/www.codetechgadgets.online\/product\/a%26b/);
  assert.equal((xml.match(/<url>/g) ?? []).length, 6);
  for (const value of ['sold', 'empty', 'invalid', '/admin', '#product', '/cart']) assert.equal(xml.includes(value), false);
});

test('sitemap configuration failures return an uncached error instead of an empty success', async () => {
  const oldProject = process.env.VITE_FIREBASE_PROJECT_ID;
  delete process.env.VITE_FIREBASE_PROJECT_ID;
  const headers = {};
  const response = { setHeader(key, value) { headers[key] = value; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; } };
  try {
    await handler({}, response);
    assert.equal(response.code, 503);
    assert.equal(headers['Cache-Control'], 'no-store');
  } finally {
    if (oldProject !== undefined) process.env.VITE_FIREBASE_PROJECT_ID = oldProject;
  }
});
