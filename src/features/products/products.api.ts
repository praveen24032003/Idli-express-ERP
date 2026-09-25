import { z } from "zod";
import { api } from "../../services/api";
import type { Product } from "../../types";
import { PRODUCT_CATEGORIES } from "../../types";

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(PRODUCT_CATEGORIES),
  wholesalePrice: z.coerce.number().nonnegative("Must be 0 or more"),
  retailPrice: z.coerce.number().nonnegative("Must be 0 or more"),
  active: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const productsApi = {
  list: (params: { active?: boolean } = {}) => {
    const qs = params.active !== undefined ? `?active=${params.active}` : "";
    return api.get<Product[]>(`/products${qs}`);
  },
  create: (data: ProductFormValues) => api.post<Product>("/products", data),
  update: (id: string, data: Partial<ProductFormValues>) => api.put<Product>(`/products/${id}`, data),
  deactivate: (id: string) => api.delete<Product>(`/products/${id}`),
};
