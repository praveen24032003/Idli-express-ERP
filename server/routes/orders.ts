import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler, ApiError } from "../utils.js";
import { PRICE_TYPES, SESSIONS, CHANNELS } from "../../src/types/index.js";

export const ordersRouter = Router();

const orderSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive("Quantity must be greater than 0"),
  priceType: z.enum(PRICE_TYPES),
  unitPrice: z.number().nonnegative().optional(),
  session: z.enum(SESSIONS),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  channel: z.enum(CHANNELS),
  remarks: z.string().optional().nullable(),
});

async function resolveUnitPrice(productId: string, priceType: "WHOLESALE" | "RETAIL", explicit?: number) {
  if (explicit !== undefined) return explicit;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, "Product not found");
  return priceType === "RETAIL" ? product.retailPrice : product.wholesalePrice;
}

// GET /api/orders?date=&customerId=&productId=&session=&channel=
ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { date, from, to, customerId, productId, session, channel } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      where.deliveryDate = d;
    } else if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.deliveryDate = range;
    }
    if (customerId) where.customerId = customerId;
    if (productId) where.productId = productId;
    if (session) where.session = session;
    if (channel) where.channel = channel;

    const orders = await prisma.order.findMany({
      where,
      include: { customer: true, product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  }),
);

ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = orderSchema.parse(req.body);
    const unitPrice = await resolveUnitPrice(data.productId, data.priceType, data.unitPrice);
    const totalAmount = data.quantity * unitPrice;

    const order = await prisma.order.create({
      data: {
        customerId: data.customerId,
        productId: data.productId,
        quantity: data.quantity,
        priceType: data.priceType,
        unitPrice,
        totalAmount,
        session: data.session,
        deliveryDate: new Date(data.deliveryDate),
        channel: data.channel,
        remarks: data.remarks ?? null,
      },
      include: { customer: true, product: true },
    });
    res.status(201).json(order);
  }),
);

ordersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = orderSchema.partial().parse(req.body);
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Order not found");

    const productId = data.productId ?? existing.productId;
    const priceType = (data.priceType ?? existing.priceType) as "WHOLESALE" | "RETAIL";
    const quantity = data.quantity ?? existing.quantity;
    const unitPrice = await resolveUnitPrice(productId, priceType, data.unitPrice);
    const totalAmount = quantity * unitPrice;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...data,
        productId,
        priceType,
        quantity,
        unitPrice,
        totalAmount,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      },
      include: { customer: true, product: true },
    });
    res.json(order);
  }),
);

ordersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

// POST /api/orders/:id/duplicate
ordersRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const source = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!source) throw new ApiError(404, "Order not found");

    const order = await prisma.order.create({
      data: {
        customerId: source.customerId,
        productId: source.productId,
        quantity: source.quantity,
        priceType: source.priceType,
        unitPrice: source.unitPrice,
        totalAmount: source.totalAmount,
        session: source.session,
        deliveryDate: source.deliveryDate,
        channel: source.channel,
        remarks: source.remarks,
      },
      include: { customer: true, product: true },
    });
    res.status(201).json(order);
  }),
);
