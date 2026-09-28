/**
 * Shared domain types used by both server and client.
 * Kept framework-agnostic (no Prisma or Express imports) so the frontend can import safely.
 */

export const CUSTOMER_TYPES = ["HOTEL", "RESTAURANT", "CATERING", "CORPORATE", "RETAIL"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const PRODUCT_CATEGORIES = ["IDLI", "CHAPATI", "IDIYAPPAM", "SANDHAGAI", "OTHER"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRICE_TYPES = ["WHOLESALE", "RETAIL"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const SESSIONS = ["MORNING", "EVENING"] as const;
export type SessionType = (typeof SESSIONS)[number];

export const CHANNELS = ["PHONE", "DIRECT", "ONLINE"] as const;
export type Channel = (typeof CHANNELS)[number];

export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  address: string | null;
  area: string | null;
  route: string | null;
  customerType: CustomerType;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  wholesalePrice: number;
  retailPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  priceType: PriceType;
  unitPrice: number;
  totalAmount: number;
  session: SessionType;
  deliveryDate: string;
  channel: Channel;
  remarks: string | null;
  orderTemplateId?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  product?: Product;
}

export interface TemplateDay {
  id: string;
  templateId: string;
  dayOfWeek: number;
  session: SessionType;
  quantity: number;
}

export interface OrderTemplate {
  id: string;
  customerId: string;
  productId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  days: TemplateDay[];
  customer?: Customer;
  product?: Product;
}

export interface Production {
  id: string;
  date: string;
  productId: string;
  session: SessionType;
  requiredQuantity: number;
  producedQuantity: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface Payment {
  id: string;
  customerId: string;
  invoiceAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentDate: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
}

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: number;
  productionRequired: number;
  productionCompleted: number;
  activeCustomers: number;
  outstandingAmount: number;
}
