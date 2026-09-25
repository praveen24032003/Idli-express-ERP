import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler, ApiError } from "../utils.js";
import { SESSIONS } from "../../src/types/index.js";

export const productionRouter = Router();

const produceSchema = z.object({
  producedQuantity: z.number().nonnegative(),
});

function startOfDay(input?: string) {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/production?date=&session=
// Recalculates requiredQuantity from live orders, then returns/creates matching Production rows.
productionRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { date, session } = req.query as Record<string, string | undefined>;
    const targetDate = startOfDay(date);

    const products = await prisma.product.findMany({ where: { active: true } });
    const orders = await prisma.order.findMany({ where: { deliveryDate: targetDate } });

    const results = [];
    for (const product of products) {
      for (const s of SESSIONS) {
        if (session && session !== s) continue;

        const requiredQuantity = orders
          .filter((o) => o.productId === product.id && o.session === s)
          .reduce((sum, o) => sum + o.quantity, 0);

        let record = await prisma.production.findUnique({
          where: { date_productId_session: { date: targetDate, productId: product.id, session: s } },
        });

        if (!record) {
          record = await prisma.production.create({
            data: { date: targetDate, productId: product.id, session: s, requiredQuantity, producedQuantity: 0 },
          });
        } else if (record.requiredQuantity !== requiredQuantity) {
          record = await prisma.production.update({
            where: { id: record.id },
            data: { requiredQuantity },
          });
        }

        results.push({ ...record, product });
      }
    }

    res.json(results);
  }),
);

productionRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = produceSchema.parse(req.body);
    const existing = await prisma.production.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Production record not found");

    const production = await prisma.production.update({
      where: { id: req.params.id },
      data: { producedQuantity: data.producedQuantity },
      include: { product: true },
    });
    res.json(production);
  }),
);
