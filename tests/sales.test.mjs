import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const moduleUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
async function transpile(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
}
const salesUrl = moduleUrl(await transpile('../src/lib/sales.ts'));
const { nigeriaDate, outsideSaleDocument, summarizeSales } = await import(salesUrl);

// Exercise the real persistence functions against a transaction double. No live sales are written.
const firestoreUrl = moduleUrl(`
  let nextId = 0;
  export function collection(database, path) { return { path }; }
  export function doc(first, ...parts) {
    const path = parts.length ? parts.join('/') : first.path + '/test-' + (++nextId);
    return { path, id: path.split('/').at(-1) };
  }
  export function serverTimestamp() { return timestamp(new Date()); }
  function timestamp(date) { return { toDate: () => date, toMillis: () => date.getTime() }; }
  function stored(data) { return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value instanceof Date ? timestamp(value) : value])); }
  export async function runTransaction(database, callback) {
    const pending = [];
    const result = await callback({
      async get(ref) {
        database.reads.push(ref.path);
        const data = database.documents.get(ref.path);
        return { id: ref.id, exists: () => data !== undefined, data: () => data };
      },
      set(ref, data) { pending.push([ref.path, stored(data)]); },
      update(ref, data) { pending.push([ref.path, { ...database.documents.get(ref.path), ...stored(data) }]); },
    });
    for (const [path, data] of pending) { database.documents.set(path, data); database.writes.push(path); }
    return result;
  }
  export function orderBy(...args) { return args; }
  export function query(ref, ...constraints) { return { ...ref, constraints }; }
  export async function getDocs(ref) {
    const docs = [...globalThis.saleTestDatabase.documents.entries()]
      .filter(([path]) => path.startsWith(ref.path + '/'))
      .map(([path, data]) => ({ id: path.split('/').at(-1), data: () => data }));
    if (ref.constraints?.length) docs.sort((a, b) => b.data().soldAt.toMillis() - a.data().soldAt.toMillis());
    return { docs };
  }
  export function writeBatch() { throw new Error('Unexpected inventory batch write'); }
  export function deleteField() { throw new Error('Unexpected inventory field deletion'); }
`);
const databaseUrl = moduleUrl('export function getDatabase() { return globalThis.saleTestDatabase; }');
const inventoryCode = (await transpile('../src/lib/firestoreInventory.ts'))
  .replaceAll("'firebase/firestore'", JSON.stringify(firestoreUrl))
  .replaceAll("'./firebase'", JSON.stringify(databaseUrl))
  .replaceAll("'./sales'", JSON.stringify(salesUrl));
const { recordOutsideSale, reverseInventorySale, loadSalesHistory } = await import(moduleUrl(inventoryCode));

function database(entries = []) {
  const db = { documents: new Map(entries), reads: [], writes: [] };
  globalThis.saleTestDatabase = db;
  return db;
}
const draft = () => ({ productName: ' iPhone 16 Pro ', brand: ' Apple ', condition: 'UK Used', storage: '256GB', serialNumber: 'serial-123', quantity: 2, soldPrice: 1800000, costPrice: 1600000, sourcedFrom: ' Supplier A ', notes: ' Two units collected ', saleDate: '2026-10-01', saleChannel: 'in-store' });

test('outside sale records total selling amount, total cost, source and Lagos sale date', () => {
  const record = outsideSaleDocument(draft(), new Date('2026-10-12T10:00:00Z'));
  assert.equal(record.productName, 'iPhone 16 Pro');
  assert.equal(record.sourcedFrom, 'Supplier A');
  assert.equal(record.saleSource, 'outside');
  assert.equal(record.productId, '');
  assert.equal(record.quantity, 2);
  assert.equal(record.soldPriceNgn, 1800000);
  assert.equal(record.costPriceNgn, 1600000);
  assert.equal(nigeriaDate(record.soldAt), '2026-10-01');
  assert.equal(nigeriaDate(new Date('2026-10-11T23:30:00Z')), '2026-10-12');
  assert.equal(outsideSaleDocument({ ...draft(), costPrice: null, serialNumber: '' }).costPriceNgn, null);
  assert.equal(outsideSaleDocument({ ...draft(), costPrice: 0 }).costPriceNgn, 0);
});

test('invalid amounts, fractional quantity, invalid dates and future dates are rejected', async () => {
  for (const invalid of [{ productName: ' ' }, { quantity: 0 }, { quantity: 1.5 }, { soldPrice: -1 }, { soldPrice: Infinity }, { costPrice: -1 }, { costPrice: NaN }, { saleChannel: 'unknown' }, { saleDate: '2026-02-30' }, { saleDate: 'not-a-date' }, { saleDate: '2099-01-01' }]) {
    const db = database();
    await assert.rejects(recordOutsideSale('invalid', { ...draft(), ...invalid }));
    assert.equal(db.documents.size, 0);
  }
});

test('saving and retrying an outside sale writes one private record and never touches inventory', async () => {
  const db = database();
  await recordOutsideSale('outside-1', draft());
  await recordOutsideSale('outside-1', draft());
  assert.deepEqual(db.writes, ['sales/outside-1']);
  assert.equal(db.reads.every(path => path.startsWith('sales/')), true);
  await assert.rejects(recordOutsideSale('outside-1', { ...draft(), soldPrice: 1900000 }), /already saved/);
  assert.equal(db.documents.get('sales/outside-1').soldPriceNgn, 1800000);
  const [sale] = await loadSalesHistory();
  assert.equal(sale.saleSource, 'outside');
  assert.equal(sale.costPrice, 1600000);
  assert.equal(sale.saleChannel, 'in-store');
  assert.equal(sale.variantStorage, '256GB');
  assert.equal(sale.sourcedFrom, 'Supplier A');
  assert.equal(sale.soldAt, '2026-10-01T11:00:00.000Z');
});

test('outside sale reversal is append-only, never restocks, and cannot happen twice', async () => {
  const db = database();
  await recordOutsideSale('outside-1', draft());
  const original = db.documents.get('sales/outside-1');
  assert.deepEqual(await reverseInventorySale('outside-1', 'Customer cancelled'), { restocked: false });
  assert.equal(db.documents.get('sales/outside-1'), original);
  assert.equal(db.documents.get('saleReversals/outside-1').restocked, false);
  assert.equal(db.reads.some(path => path.startsWith('products/')), false);
  await assert.rejects(reverseInventorySale('outside-1', 'Duplicate correction'), /already been reversed/);
  const history = await loadSalesHistory();
  assert.ok(history[0].reversedAt);
  assert.deepEqual(summarizeSales(history), { completedCount: 0, revenue: 0, costedCount: 0, grossProfit: 0 });
});

test('older inventory sales still restock their original storage option and preserve deleted status', async () => {
  for (const status of ['sold', 'deleted']) {
    const db = database([
      ['sales/legacy', { productId: 'phone', variantId: '256' }],
      ['products/phone', { status, stockQuantity: 0, priceNgn: 800000, variants: [{ id: '256', storage: '256GB', price: 800000, stock: 0 }] }],
    ]);
    assert.deepEqual(await reverseInventorySale('legacy', 'Customer returned device'), { restocked: true });
    const product = db.documents.get('products/phone');
    assert.equal(product.stockQuantity, 1);
    assert.equal(product.variants[0].stock, 1);
    assert.equal(product.status, status === 'deleted' ? 'deleted' : 'available');
  }
  const db = database([['sales/missing', { productId: 'missing' }]]);
  await assert.rejects(reverseInventorySale('missing', 'Customer cancelled'), /could not be found to restock/);
  assert.equal(db.documents.has('saleReversals/missing'), false);
});

test('summary combines completed sales, excludes reversals and treats unknown cost differently from zero', () => {
  assert.deepEqual(summarizeSales([
    { soldPrice: 900000 },
    { soldPrice: 1800000, costPrice: 1600000 },
    { soldPrice: 50000, costPrice: 0 },
    { soldPrice: 100000, costPrice: 120000 },
    { soldPrice: 800000, costPrice: 600000, reversedAt: '2026-10-02' },
  ]), { completedCount: 4, revenue: 2850000, costedCount: 3, grossProfit: 230000 });
});

test('ordinary sale reversals cannot pretend to refund a Paystack payment', async () => {
  const db = database([['sales/online', { productId: 'phone', saleChannel: 'paystack' }]]);
  await assert.rejects(reverseInventorySale('online', 'Refund customer'), /Paystack dashboard/);
  assert.deepEqual(db.writes, []);
});
