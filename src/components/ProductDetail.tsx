import { Product } from '../types';

const WHATSAPP_NUMBER = '2349058977101';
const money = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onSwap: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

function whatsappLink(product: Product) {
  const message = [
    `Hi CodeTech Gadgets, I’m interested in buying this device: ${product.name}.`,
    `Listed price: ${money(product.price)}`,
    `Condition: ${product.condition || 'Please confirm condition'}`,
    product.conditionNotes ? `Condition details: ${product.conditionNotes}` : '',
    'Please confirm current availability, delivery options, and how I can pay. I understand this is an enquiry and my order is only confirmed after your team replies.',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function ProductDetail({ product, onBack, onSwap, onAddToCart }: ProductDetailProps) {
  return (
    <main className="product-page">
      <div className="product-page-inner">
        <button className="product-back-link" onClick={onBack}>← Back to {product.listingGroup === 'goodies' ? 'Goodies' : 'Devices'}</button>
        <div className="product-detail-layout">
          <div className="product-detail-image">
            {product.image ? <img src={product.image} alt={product.name} /> : <div className="device-image-placeholder">CodeTech Gadgets</div>}
            {product.badge && <span className="device-badge">{product.badge}</span>}
            <span className={`device-condition-badge ${product.listingGroup === 'goodies' ? 'goodies' : /brand\s*new/i.test(product.condition || '') ? 'brand-new' : ''}`}>{product.listingGroup === 'goodies' ? 'Goodies' : /brand\s*new/i.test(product.condition || '') ? 'Brand New' : 'UK Used'}</span>
            {product.backInStock && <span className="device-restock-badge">Back in stock</span>}
          </div>
          <section className="product-detail-copy" aria-labelledby="product-title">
            <p className="eyebrow">{product.brand} <span aria-hidden="true">·</span> {product.condition || 'Condition details available'}</p>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-detail-price">{money(product.price)}</p>
            <div className="product-availability"><span /> {product.backInStock ? 'Back in stock · Available now' : 'Available to enquire about'}</div>

            <div className="product-detail-rule" />
            <h2>Device details</h2>
            <dl className="product-facts">
              <div><dt>Brand</dt><dd>{product.brand}</dd></div>
              <div><dt>Category</dt><dd>{product.category}</dd></div>
              <div><dt>Condition</dt><dd>{product.condition || 'Ask us for details'}</dd></div>
            </dl>
            {product.conditionNotes && <div className="product-condition-panel"><strong>Condition notes</strong><p>{product.conditionNotes}</p></div>}
            <p className="product-order-note">Send an enquiry and our team will confirm that this device is still available, explain delivery options, and share payment instructions. Your order is not placed until we confirm it with you.</p>

            <div className="product-actions">
              <a className="product-whatsapp-button" href={whatsappLink(product)} target="_blank" rel="noreferrer">Ask to buy on WhatsApp <span aria-hidden="true">↗</span></a>
              <button className="product-list-button" onClick={() => onAddToCart(product)}>Add to purchase list <span aria-hidden="true">＋</span></button>
              <button className="product-swap-button" onClick={() => onSwap(product)}>Use this device in a swap <span aria-hidden="true">→</span></button>
            </div>
            <p className="product-payment-note">Online payment and order accounts aren’t available yet. We’ll add online checkout when payment processing is set up.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
