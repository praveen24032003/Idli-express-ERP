import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler, ApiError } from "../utils.js";

export const ledgerRouter = Router();

const paymentSchema = z.object({
  customerId: z.string().min(1),
  invoiceAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  paymentDate: z.string().min(1),
  remarks: z.string().optional().nullable(),
});

// GET /api/ledger?customerId= — list payment entries with customer info
ledgerRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { customerId } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;

    const payments = await prisma.payment.findMany({
      where,
      include: { customer: true },
      orderBy: { paymentDate: "desc" },
    });
    res.json(payments);
  }),
);

// GET /api/ledger/summary — outstanding balance per customer
ledgerRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const payments = await prisma.payment.findMany({ include: { customer: true } });
    const byCustomer = new Map<string, { customerId: string; name: string; invoiced: number; paid: number; balance: number }>();

    for (const p of payments) {
      const existing = byCustomer.get(p.customerId) ?? {
        customerId: p.customerId,
        name: p.customer.name,
        invoiced: 0,
        paid: 0,
        balance: 0,
      };
      existing.invoiced += p.invoiceAmount;
      existing.paid += p.paidAmount;
      existing.balance += p.balanceAmount;
      byCustomer.set(p.customerId, existing);
    }

    res.json(Array.from(byCustomer.values()).sort((a, b) => b.balance - a.balance));
  }),
);

ledgerRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = paymentSchema.parse(req.body);
    const balanceAmount = data.invoiceAmount - data.paidAmount;

    const payment = await prisma.payment.create({
      data: {
        customerId: data.customerId,
        invoiceAmount: data.invoiceAmount,
        paidAmount: data.paidAmount,
        balanceAmount,
        paymentDate: new Date(data.paymentDate),
        remarks: data.remarks ?? null,
      },
      include: { customer: true },
    });
    res.status(201).json(payment);
  }),
);

ledgerRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = paymentSchema.partial().parse(req.body);
    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Payment record not found");

    const invoiceAmount = data.invoiceAmount ?? existing.invoiceAmount;
    const paidAmount = data.paidAmount ?? existing.paidAmount;
    const balanceAmount = invoiceAmount - paidAmount;

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        ...data,
        invoiceAmount,
        paidAmount,
        balanceAmount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      },
      include: { customer: true },
    });
    res.json(payment);
  }),
);

ledgerRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
