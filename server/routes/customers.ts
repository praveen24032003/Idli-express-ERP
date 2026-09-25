import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler, ApiError } from "../utils.js";
import { CUSTOMER_TYPES } from "../../src/types/index.js";

export const customersRouter = Router();

const customerSchema = z.object({
  customerCode: z.string().min(1).optional(),
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(15),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  customerType: z.enum(CUSTOMER_TYPES).default("RETAIL"),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

async function nextCustomerCode() {
  const count = await prisma.customer.count();
  return `CUST${String(count + 1).padStart(3, "0")}`;
}

// GET /api/customers?search=&type=&area=&active=
customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, type, area, active } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { customerCode: { contains: search } },
      ];
    }
    if (type) where.customerType = type;
    if (area) where.area = area;
    if (active !== undefined) where.active = active === "true";

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(customers);
  }),
);

// GET /api/customers/:id (with order history + outstanding balance)
customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        orders: { orderBy: { deliveryDate: "desc" }, take: 50, include: { product: true } },
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const outstanding = customer.payments.reduce((sum, p) => sum + p.balanceAmount, 0);
    res.json({ ...customer, outstandingAmount: outstanding });
  }),
);

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);

    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
    if (existing) throw new ApiError(409, "A customer with this phone number already exists");

    const customerCode = data.customerCode || (await nextCustomerCode());
    const customer = await prisma.customer.create({
      data: { ...data, customerCode, active: data.active ?? true },
    });
    res.status(201).json(customer);
  }),
);

customersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = customerSchema.partial().parse(req.body);

    if (data.phone) {
      const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
      if (existing && existing.id !== req.params.id) {
        throw new ApiError(409, "A customer with this phone number already exists");
      }
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
    });
    res.json(customer);
  }),
);

customersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
