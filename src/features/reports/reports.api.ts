import { mapRow, readData, requireSupabase } from "../../services/supabase";

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

function applyDateRange<T extends { gte: (column: string, value: string) => T; lte: (column: string, value: string) => T }>(
  query: T,
  from?: string,
  to?: string,
) {
  let result = query;
  if (from) result = result.gte("delivery_date", from);
  if (to) result = result.lte("delivery_date", to);
  return result;
}

export const reportsApi = {
  dailySales: async (from?: string, to?: string) => {
    const client = requireSupabase();
    const query = applyDateRange(client.from("orders").select("delivery_date, total_amount, quantity"), from, to);
    const rows = mapRow<Array<{ deliveryDate: string; totalAmount: number; quantity: number }>>(readData(await query));
    const daily = new Map<string, DailySalesRow>();
    for (const row of rows) {
      const date = row.deliveryDate.slice(0, 10);
      const item = daily.get(date) ?? { date, orders: 0, revenue: 0, quantity: 0 };
      item.orders += 1;
      item.revenue += row.totalAmount;
      item.quantity += row.quantity;
      daily.set(date, item);
    }
    return [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  },
  productSales: async (from?: string, to?: string) => {
    const client = requireSupabase();
    const query = applyDateRange(
      client.from("orders").select("product_id, quantity, total_amount, product:products(name)"),
      from,
      to,
    );
    const rows = mapRow<Array<{ productId: string; quantity: number; totalAmount: number; product: { name: string } | null }>>(
      readData(await query),
    );
    const totals = new Map<string, ProductSalesRow>();
    for (const row of rows) {
      const item = totals.get(row.productId) ?? {
        productId: row.productId,
        name: row.product?.name ?? "Deleted product",
        quantity: 0,
        revenue: 0,
      };
      item.quantity += row.quantity;
      item.revenue += row.totalAmount;
      totals.set(row.productId, item);
    }
    return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
  },
  customerSales: async (from?: string, to?: string) => {
    const client = requireSupabase();
    const query = applyDateRange(
      client.from("orders").select("customer_id, total_amount, customer:customers(name)"),
      from,
      to,
    );
    const rows = mapRow<Array<{ customerId: string; totalAmount: number; customer: { name: string } | null }>>(
      readData(await query),
    );
    const totals = new Map<string, CustomerSalesRow>();
    for (const row of rows) {
      const item = totals.get(row.customerId) ?? {
        customerId: row.customerId,
        name: row.customer?.name ?? "Deleted customer",
        orders: 0,
        revenue: 0,
      };
      item.orders += 1;
      item.revenue += row.totalAmount;
      totals.set(row.customerId, item);
    }
    return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
  },
  outstanding: async () => {
    const client = requireSupabase();
    const rows = mapRow<Array<{
      customerId: string;
      invoiceAmount: number;
      paidAmount: number;
      balanceAmount: number;
      customer: { name: string } | null;
    }>>(readData(await client.from("payments").select("customer_id, invoice_amount, paid_amount, balance_amount, customer:customers(name)")));
    const totals = new Map<string, OutstandingRow>();
    for (const row of rows) {
      const item = totals.get(row.customerId) ?? {
        customerId: row.customerId,
        name: row.customer?.name ?? "Deleted customer",
        invoiced: 0,
        paid: 0,
        balance: 0,
      };
      item.invoiced += row.invoiceAmount;
      item.paid += row.paidAmount;
      item.balance += row.balanceAmount;
      totals.set(row.customerId, item);
    }
    return [...totals.values()].filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance);
  },
  production: async (from?: string, to?: string) => {
    const client = requireSupabase();
    let query = client.from("production").select("date, session, required_quantity, produced_quantity, product:products(name)");
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    const rows = mapRow<Array<{
      date: string;
      session: string;
      requiredQuantity: number;
      producedQuantity: number;
      product: { name: string } | null;
    }>>(readData(await query.order("date", { ascending: false })));
    return rows.map((row) => ({
      date: row.date.slice(0, 10),
      product: row.product?.name ?? "Deleted product",
      session: row.session,
      requiredQuantity: row.requiredQuantity,
      producedQuantity: row.producedQuantity,
      variance: row.producedQuantity - row.requiredQuantity,
    }));
  },
};
