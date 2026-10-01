import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'iPhone 15 Pro', brand: 'Apple', price: 1125000, emoji: '●', category: 'phones', rating: 4.9, reviews: 18, badge: 'Popular', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85', condition: 'Like new', stock: 1 },
  { id: 2, name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 1380000, emoji: '●', category: 'phones', rating: 4.8, reviews: 12, badge: 'New arrival', image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85', condition: 'Excellent', stock: 1 },
  { id: 3, name: 'iPhone 13 Pro', brand: 'Apple', price: 685000, emoji: '●', category: 'phones', rating: 4.7, reviews: 9, badge: 'Good value', image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85', condition: 'Very good', stock: 1 },
  { id: 4, name: 'Google Pixel 8', brand: 'Google', price: 720000, emoji: '●', category: 'phones', rating: 4.8, reviews: 6, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85', condition: 'Excellent', stock: 1 },
  { id: 5, name: 'MacBook Air 13”', brand: 'Apple', price: 1650000, emoji: '●', category: 'laptops', rating: 4.9, reviews: 7, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85', condition: 'Like new', stock: 1 },
  { id: 6, name: 'Sony WH-1000XM5', brand: 'Sony', price: 385000, emoji: '●', category: 'audio', rating: 4.8, reviews: 11, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85', condition: 'Excellent', stock: 1 },
  { id: 7, name: 'iPad Air', brand: 'Apple', price: 845000, emoji: '●', category: 'tablets', rating: 4.8, reviews: 5, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=85', condition: 'Very good', stock: 1 },
  { id: 8, name: 'Apple Watch Series 9', brand: 'Apple', price: 420000, emoji: '●', category: 'wearables', rating: 4.7, reviews: 8, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85', condition: 'Excellent', stock: 1 },
];

export const CATEGORIES = ['all', 'wearables', 'audio', 'smart-home', 'cameras'];
