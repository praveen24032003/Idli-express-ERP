import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils.js";

export const reportsRouter = Router();

function dateRange(from?: string, to?: string) {
  const range: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    range.gte = d;
  }
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    range.lte = d;
  }
  return range;
}

// GET /api/reports/daily-sales?from=&to=
reportsRouter.get(
  "/daily-sales",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const orders = await prisma.order.findMany({
      where: from || to ? { deliveryDate: dateRange(from, to) } : undefined,
    });

    const byDate = new Map<string, { date: string; orders: number; revenue: number; quantity: number }>();
    for (const o of orders) {
      const key = o.deliveryDate.toISOString().slice(0, 10);
      const entry = byDate.get(key) ?? { date: key, orders: 0, revenue: 0, quantity: 0 };
      entry.orders += 1;
      entry.revenue += o.totalAmount;
      entry.quantity += o.quantity;
      byDate.set(key, entry);
    }
    res.json(Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)));
  }),
);

// GET /api/reports/product-sales?from=&to=
reportsRouter.get(
  "/product-sales",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const orders = await prisma.order.findMany({
      where: from || to ? { deliveryDate: dateRange(from, to) } : undefined,
      include: { product: true },
    });

    const byProduct = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
    for (const o of orders) {
      const entry = byProduct.get(o.productId) ?? { productId: o.productId, name: o.product.name, quantity: 0, revenue: 0 };
      entry.quantity += o.quantity;
      entry.revenue += o.totalAmount;
      byProduct.set(o.productId, entry);
    }
    res.json(Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue));
  }),
);

// GET /api/reports/customer-sales?from=&to=
reportsRouter.get(
  "/customer-sales",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const orders = await prisma.order.findMany({
      where: from || to ? { deliveryDate: dateRange(from, to) } : undefined,
      include: { customer: true },
    });

    const byCustomer = new Map<string, { customerId: string; name: string; orders: number; revenue: number }>();
    for (const o of orders) {
      const entry = byCustomer.get(o.customerId) ?? { customerId: o.customerId, name: o.customer.name, orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += o.totalAmount;
      byCustomer.set(o.customerId, entry);
    }
    res.json(Array.from(byCustomer.values()).sort((a, b) => b.revenue - a.revenue));
  }),
);

// GET /api/reports/outstanding
reportsRouter.get(
  "/outstanding",
  asyncHandler(async (_req, res) => {
    const payments = await prisma.payment.findMany({ include: { customer: true } });
    const byCustomer = new Map<string, { customerId: string; name: string; invoiced: number; paid: number; balance: number }>();
    for (const p of payments) {
      const entry = byCustomer.get(p.customerId) ?? { customerId: p.customerId, name: p.customer.name, invoiced: 0, paid: 0, balance: 0 };
      entry.invoiced += p.invoiceAmount;
      entry.paid += p.paidAmount;
      entry.balance += p.balanceAmount;
      byCustomer.set(p.customerId, entry);
    }
    res.json(Array.from(byCustomer.values()).filter((e) => e.balance > 0).sort((a, b) => b.balance - a.balance));
  }),
);

// GET /api/reports/production?from=&to=
reportsRouter.get(
  "/production",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const records = await prisma.production.findMany({
      where: from || to ? { date: dateRange(from, to) } : undefined,
      include: { product: true },
      orderBy: { date: "desc" },
    });
    res.json(
      records.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        product: r.product.name,
        session: r.session,
        requiredQuantity: r.requiredQuantity,
        producedQuantity: r.producedQuantity,
        variance: r.producedQuantity - r.requiredQuantity,
      })),
    );
  }),
);
