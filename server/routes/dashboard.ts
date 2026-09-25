import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils.js";

export const dashboardRouter = Router();

function startOfDay(input?: string) {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { date } = req.query as Record<string, string | undefined>;
    const targetDate = startOfDay(date);

    const [todaysOrders, activeCustomers, payments, productionRecords] = await Promise.all([
      prisma.order.findMany({ where: { deliveryDate: targetDate } }),
      prisma.customer.count({ where: { active: true } }),
      prisma.payment.findMany(),
      prisma.production.findMany({ where: { date: targetDate } }),
    ]);

    const ordersToday = todaysOrders.length;
    const revenueToday = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const outstandingAmount = payments.reduce((sum, p) => sum + p.balanceAmount, 0);
    const productionRequired = productionRecords.reduce((sum, p) => sum + p.requiredQuantity, 0);
    const productionCompleted = productionRecords.reduce((sum, p) => sum + p.producedQuantity, 0);

    const morningRequired = todaysOrders.filter((o) => o.session === "MORNING").reduce((sum, o) => sum + o.quantity, 0);
    const eveningRequired = todaysOrders.filter((o) => o.session === "EVENING").reduce((sum, o) => sum + o.quantity, 0);

    res.json({
      ordersToday,
      revenueToday,
      productionRequired,
      productionCompleted,
      activeCustomers,
      outstandingAmount,
      morningRequired,
      eveningRequired,
    });
  }),
);

// Small revenue trend for the last 7 days, used for the dashboard chart.
dashboardRouter.get(
  "/trend",
  asyncHandler(async (_req, res) => {
    const end = startOfDay();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const orders = await prisma.order.findMany({ where: { deliveryDate: { gte: start, lte: end } } });
    const byDate = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDate.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      const key = o.deliveryDate.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + o.totalAmount);
    }
    res.json(Array.from(byDate.entries()).map(([date, revenue]) => ({ date, revenue })));
  }),
);
