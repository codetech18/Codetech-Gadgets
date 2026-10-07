import { useEffect, useState } from 'react';
import { Product } from '../types';
import { displayImageUrl } from '../lib/displayImageUrl';

const WHATSAPP_NUMBER = '2349058977101';
const money = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onSwap: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

function whatsappLink(product: Product) {
  const selected = product.variants?.find(variant => variant.id === product.selectedVariantId);
  const message = [
    `Hi CodeTech Gadgets, I’m interested in buying this device: ${product.name}.`,
    `Listed price: ${money(product.price)}`,
    selected ? `Color: ${selected.color}` : '',
    selected ? `Storage: ${selected.storage}` : '',
    `Condition: ${product.condition || 'Please confirm condition'}`,
    product.conditionNotes ? `Condition details: ${product.conditionNotes}` : '',
    'Please confirm current availability, delivery options, and how I can pay. I understand this is an enquiry and my order is only confirmed after your team replies.',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function ProductDetail({ product, onBack, onSwap, onAddToCart }: ProductDetailProps) {
  const images = product.images?.length ? product.images : product.image ? [product.image] : [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  useEffect(() => setActiveImageIndex(0), [product.id]);
  useEffect(() => setSelectedVariantId(product.variants?.find(variant => variant.stock > 0)?.id ?? ''), [product.id, product.variants]);
  const availableVariants = product.variants?.filter(variant => variant.stock > 0) ?? [];
  const selectedVariant = availableVariants.find(variant => variant.id === selectedVariantId) ?? availableVariants[0];
  const selectedProduct = selectedVariant ? { ...product, price: selectedVariant.price, stock: selectedVariant.stock, selectedVariantId: selectedVariant.id } : product;
  const colors = [...new Set(availableVariants.map(variant => variant.color))];
  const storages = [...new Set(availableVariants.filter(variant => variant.color === selectedVariant?.color).map(variant => variant.storage))];
  const activeImage = images[activeImageIndex] ?? images[0];

  return (
    <main className="product-page">
      <div className="product-page-inner">
        <button className="product-back-link" onClick={onBack}>← Back to {product.listingGroup === 'goodies' ? 'Goodies' : 'Devices'}</button>
        <div className="product-detail-layout">
          <div className="product-detail-gallery">
            <div className="product-detail-image">
              {activeImage ? <img src={displayImageUrl(activeImage)} alt={`${product.name}, photo ${activeImageIndex + 1}`} /> : <div className="device-image-placeholder">CodeTech Gadgets</div>}
              {product.badge && <span className="device-badge">{product.badge}</span>}
              <span className={`device-condition-badge ${product.listingGroup === 'goodies' ? 'goodies' : /brand\s*new/i.test(product.condition || '') ? 'brand-new' : ''}`}>{product.listingGroup === 'goodies' ? 'Goodies' : /brand\s*new/i.test(product.condition || '') ? 'Brand New' : 'UK Used'}</span>
              {product.backInStock && <span className="device-restock-badge">Back in stock</span>}
            </div>
            {images.length > 1 && <div className="product-image-thumbnails" aria-label="Product photos">
              {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActiveImageIndex(index)} className={index === activeImageIndex ? 'selected' : ''} aria-label={`Show product photo ${index + 1}`} aria-pressed={index === activeImageIndex}>
                <img src={displayImageUrl(image)} alt="" />
              </button>)}
            </div>}
          </div>
          <section className="product-detail-copy" aria-labelledby="product-title">
            <p className="eyebrow">{product.brand} <span aria-hidden="true">·</span> {product.condition || 'Condition details available'}</p>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-detail-price">{money(selectedProduct.price)}</p>
            <div className="product-availability"><span /> {product.backInStock ? 'Back in stock · Available now' : 'Available to enquire about'}</div>
            {availableVariants.length > 0 && <div className="product-variant-picker">
              <fieldset><legend>Color</legend><div className="product-variant-options">{colors.map(color => <button key={color} type="button" aria-pressed={selectedVariant?.color === color} onClick={() => setSelectedVariantId(availableVariants.find(variant => variant.color === color)?.id ?? '')}>{color}</button>)}</div></fieldset>
              <fieldset><legend>Storage</legend><div className="product-variant-options">{storages.map(storage => <button key={storage} type="button" aria-pressed={selectedVariant?.storage === storage} onClick={() => setSelectedVariantId(availableVariants.find(variant => variant.color === selectedVariant?.color && variant.storage === storage)?.id ?? '')}>{storage}</button>)}</div></fieldset>
            </div>}

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
              <a className="product-whatsapp-button" href={whatsappLink(selectedProduct)} target="_blank" rel="noreferrer">Ask to buy on WhatsApp <span aria-hidden="true">↗</span></a>
              <button className="product-list-button" onClick={() => onAddToCart(selectedProduct)}>Add to purchase list <span aria-hidden="true">＋</span></button>
              <button className="product-swap-button" onClick={() => onSwap(product)}>Use this device in a swap <span aria-hidden="true">→</span></button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
