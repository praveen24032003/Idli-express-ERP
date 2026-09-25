import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler, ApiError } from "../utils.js";
import { PRODUCT_CATEGORIES } from "../../src/types/index.js";

export const productsRouter = Router();

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(PRODUCT_CATEGORIES).default("OTHER"),
  wholesalePrice: z.number().nonnegative(),
  retailPrice: z.number().nonnegative(),
  active: z.boolean().optional(),
});

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { active, category } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (active !== undefined) where.active = active === "true";
    if (category) where.category = category;

    const products = await prisma.product.findMany({ where, orderBy: { name: "asc" } });
    res.json(products);
  }),
);

productsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, "Product not found");
    res.json(product);
  }),
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { name: data.name } });
    if (existing) throw new ApiError(409, "A product with this name already exists");

    const product = await prisma.product.create({ data: { ...data, active: data.active ?? true } });
    res.status(201).json(product);
  }),
);

productsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    if (data.name) {
      const existing = await prisma.product.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== req.params.id) {
        throw new ApiError(409, "A product with this name already exists");
      }
    }
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  }),
);

// Deactivate rather than hard-delete, since products may be referenced by historical orders.
productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.json(product);
  }),
);
