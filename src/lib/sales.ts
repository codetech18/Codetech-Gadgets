import type { OutsideSaleDraft, SaleRecord } from '../types';

export function summarizeSales(sales: Pick<SaleRecord, 'soldPrice' | 'costPrice' | 'reversedAt'>[]) {
  const completed = sales.filter(sale => !sale.reversedAt);
  const costed = completed.filter(sale => sale.costPrice !== undefined);
  return {
    completedCount: completed.length,
    revenue: completed.reduce((total, sale) => total + sale.soldPrice, 0),
    costedCount: costed.length,
    grossProfit: costed.reduce((total, sale) => total + sale.soldPrice - sale.costPrice!, 0),
  };
}

export function nigeriaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function outsideSaleDocument(sale: OutsideSaleDraft, now = new Date()) {
  const productName = sale.productName.trim();
  if (!productName) throw new Error('Enter the item you sold.');
  if (!Number.isInteger(sale.quantity) || sale.quantity < 1) throw new Error('Enter a whole quantity of at least one.');
  if (!Number.isFinite(sale.soldPrice) || sale.soldPrice < 0) throw new Error('Enter a valid total amount received.');
  if (sale.costPrice !== null && (!Number.isFinite(sale.costPrice) || sale.costPrice < 0)) throw new Error('Enter a valid sourcing cost or leave it empty.');
  if (!['whatsapp', 'in-store', 'other'].includes(sale.saleChannel)) throw new Error('Choose how the sale was made.');
  // Use midday in Lagos to preserve the selected calendar date in Nigerian reports.
  const soldAt = new Date(`${sale.saleDate}T12:00:00+01:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sale.saleDate) || !Number.isFinite(soldAt.getTime()) || nigeriaDate(soldAt) !== sale.saleDate || sale.saleDate > nigeriaDate(now)) {
    throw new Error('Choose a valid sale date of today or earlier.');
  }
  return {
    saleSource: 'outside' as const,
    productId: '',
    productName,
    brand: sale.brand.trim(),
    condition: sale.condition.trim(),
    variantStorage: sale.storage.trim(),
    serialNumber: sale.serialNumber.trim(),
    hasNoIdentifier: !sale.serialNumber.trim(),
    quantity: sale.quantity,
    soldPriceNgn: sale.soldPrice,
    costPriceNgn: sale.costPrice,
    sourcedFrom: sale.sourcedFrom.trim(),
    notes: sale.notes.trim(),
    saleChannel: sale.saleChannel,
    soldAt,
  };
}
