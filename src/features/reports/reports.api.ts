import { api } from "../../services/api";

export interface DailySalesRow {
  date: string;
  orders: number;
  revenue: number;
  quantity: number;
}

export interface ProductSalesRow {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface CustomerSalesRow {
  customerId: string;
  name: string;
  orders: number;
  revenue: number;
}

export interface OutstandingRow {
  customerId: string;
  name: string;
  invoiced: number;
  paid: number;
  balance: number;
}

export interface ProductionReportRow {
  date: string;
  product: string;
  session: string;
  requiredQuantity: number;
  producedQuantity: number;
  variance: number;
}

function qs(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const reportsApi = {
  dailySales: (from?: string, to?: string) => api.get<DailySalesRow[]>(`/reports/daily-sales${qs(from, to)}`),
  productSales: (from?: string, to?: string) => api.get<ProductSalesRow[]>(`/reports/product-sales${qs(from, to)}`),
  customerSales: (from?: string, to?: string) => api.get<CustomerSalesRow[]>(`/reports/customer-sales${qs(from, to)}`),
  outstanding: () => api.get<OutstandingRow[]>("/reports/outstanding"),
  production: (from?: string, to?: string) => api.get<ProductionReportRow[]>(`/reports/production${qs(from, to)}`),
};
