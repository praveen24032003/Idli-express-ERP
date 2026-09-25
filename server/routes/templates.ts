import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler, ApiError } from "../utils.js";

export const templatesRouter = Router();

const dayInputSchema = z.object({ dayOfWeek: z.number().int().min(0).max(6), quantity: z.number().nonnegative() });

const templateSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  active: z.boolean().optional(),
  days: z.array(dayInputSchema).min(1, "At least one day quantity is required"),
});

templatesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { active } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (active !== undefined) where.active = active === "true";

    const templates = await prisma.orderTemplate.findMany({
      where,
      include: { customer: true, product: true, days: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(templates);
  }),
);

templatesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = templateSchema.parse(req.body);
    const template = await prisma.orderTemplate.create({
      data: {
        customerId: data.customerId,
        productId: data.productId,
        active: data.active ?? true,
        days: { create: data.days },
      },
      include: { customer: true, product: true, days: true },
    });
    res.status(201).json(template);
  }),
);

templatesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = templateSchema.partial().parse(req.body);
    const existing = await prisma.orderTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Template not found");

    if (data.days) {
      await prisma.templateDay.deleteMany({ where: { templateId: req.params.id } });
    }

    const template = await prisma.orderTemplate.update({
      where: { id: req.params.id },
      data: {
        customerId: data.customerId,
        productId: data.productId,
        active: data.active,
        ...(data.days ? { days: { create: data.days } } : {}),
      },
      include: { customer: true, product: true, days: true },
    });
    res.json(template);
  }),
);

templatesRouter.patch(
  "/:id/toggle",
  asyncHandler(async (req, res) => {
    const existing = await prisma.orderTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Template not found");
    const template = await prisma.orderTemplate.update({
      where: { id: req.params.id },
      data: { active: !existing.active },
      include: { customer: true, product: true, days: true },
    });
    res.json(template);
  }),
);

templatesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.orderTemplate.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

// POST /api/templates/generate-today — creates today's orders from all active templates
templatesRouter.post(
  "/generate-today",
  asyncHandler(async (req, res) => {
    const dateInput = (req.body as { date?: string })?.date;
    const targetDate = dateInput ? new Date(dateInput) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const dayOfWeek = targetDate.getDay();

    const templates = await prisma.orderTemplate.findMany({
      where: { active: true },
      include: { days: true, product: true, customer: true },
    });

    let created = 0;
    const skipped: string[] = [];

    for (const template of templates) {
      const dayEntry = template.days.find((d) => d.dayOfWeek === dayOfWeek);
      if (!dayEntry || dayEntry.quantity <= 0) continue;

      const existing = await prisma.order.findFirst({
        where: {
          customerId: template.customerId,
          productId: template.productId,
          deliveryDate: targetDate,
        },
      });
      if (existing) {
        skipped.push(`${template.customer.name} - ${template.product.name}`);
        continue;
      }

      const unitPrice = template.product.wholesalePrice;
      await prisma.order.create({
        data: {
          customerId: template.customerId,
          productId: template.productId,
          quantity: dayEntry.quantity,
          priceType: "WHOLESALE",
          unitPrice,
          totalAmount: unitPrice * dayEntry.quantity,
          session: "MORNING",
          deliveryDate: targetDate,
          channel: "DIRECT",
          remarks: "Auto-generated from recurring template",
        },
      });
      created++;
    }

    res.json({ created, skipped, date: targetDate.toISOString() });
  }),
);
