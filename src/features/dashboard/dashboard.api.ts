import { mapRow, readData, requireSupabase } from "../../services/supabase";
import type { Order, Production, Payment } from "../../types";

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: number;
  productionRequired: number;
  productionCompleted: number;
  activeCustomers: number;
  outstandingAmount: number;
  morningRequired: number;
  eveningRequired: number;
}

export interface TrendPoint {
  date: string;
  revenue: number;
}

export const dashboardApi = {
  summary: async () => {
    const client = requireSupabase();
    const date = new Date().toLocaleDateString("en-CA");
    const [ordersResult, customersResult, productionResult, paymentsResult] = await Promise.all([
      client.from("orders").select("*").eq("delivery_date", date),
      client.from("customers").select("id", { count: "exact", head: true }).eq("active", true),
      client.from("production").select("*").eq("date", date),
      client.from("payments").select("balance_amount"),
    ]);
    const orders = mapRow<Order[]>(readData(ordersResult));
    const production = mapRow<Production[]>(readData(productionResult));
    const payments = mapRow<Pick<Payment, "balanceAmount">[]>(readData(paymentsResult));
    return {
      ordersToday: orders.length,
      revenueToday: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      productionRequired: production.reduce((sum, item) => sum + item.requiredQuantity, 0),
      productionCompleted: production.reduce((sum, item) => sum + item.producedQuantity, 0),
      activeCustomers: customersResult.count ?? 0,
      outstandingAmount: payments.reduce((sum, payment) => sum + payment.balanceAmount, 0),
      morningRequired: orders.filter((order) => order.session === "MORNING").reduce((sum, order) => sum + order.quantity, 0),
      eveningRequired: orders.filter((order) => order.session === "EVENING").reduce((sum, order) => sum + order.quantity, 0),
    } satisfies DashboardSummary;
  },
  trend: async () => {
    const client = requireSupabase();
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    const start = startDate.toLocaleDateString("en-CA");
    const end = endDate.toLocaleDateString("en-CA");
    const orders = mapRow<Order[]>(
      readData(await client.from("orders").select("delivery_date, total_amount").gte("delivery_date", start).lte("delivery_date", end)),
    );
    const values = new Map<string, number>();
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + offset);
      values.set(day.toLocaleDateString("en-CA"), 0);
    }
    for (const order of orders) {
      const date = order.deliveryDate.slice(0, 10);
      values.set(date, (values.get(date) ?? 0) + order.totalAmount);
    }
    return [...values].map(([date, revenue]) => ({ date, revenue }));
  },
};
