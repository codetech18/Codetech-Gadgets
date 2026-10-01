export type Page = 'home' | 'devices' | 'goodies' | 'product' | 'cart' | 'login' | 'signup' | 'profile' | 'complaint' | 'admin' | 'sell' | 'swap';

export type BadgeType = string | null;

export interface Product {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  oldPrice?: number;
  emoji: string;
  category: string;
  rating: number;
  reviews: number;
  badge?: BadgeType;
  image?: string;
  condition?: string;
  conditionNotes?: string;
  listingGroup?: 'devices' | 'goodies';
  stock?: number;
  listingStatus?: 'available' | 'out_of_stock' | 'sold';
  serialNumber?: string;
  backInStock?: boolean;
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  serialNumber: string;
  brand: string;
  category: string;
  listingGroup: 'devices' | 'goodies';
  condition: string;
  image?: string;
  quantity: number;
  soldPrice: number;
  saleChannel: 'whatsapp';
  soldAt: string;
  reversedAt?: string;
  reversalReason?: string;
  restocked?: boolean;
}

export interface CartItem extends Product {
  qty: number;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  emoji: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

export interface Order {
  id: string;
  customer: string;
  email: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: OrderStatus;
}

export interface User {
  name: string;
  email: string;
}
