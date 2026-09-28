import { z } from "zod";
import type { Product } from "../../types";
import { PRODUCT_CATEGORIES } from "../../types";
import { mapRow, readData, requireSupabase, toDatabaseRecord } from "../../services/supabase";

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(PRODUCT_CATEGORIES),
  wholesalePrice: z.coerce.number().nonnegative("Must be 0 or more"),
  retailPrice: z.coerce.number().nonnegative("Must be 0 or more"),
  active: z.boolean(),
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormValues = z.output<typeof productFormSchema>;

export const productsApi = {
  list: async (params: { active?: boolean } = {}) => {
    const client = requireSupabase();
    let query = client.from("products").select("*").order("name");
    if (params.active !== undefined) query = query.eq("active", params.active);
    return mapRow<Product[]>(readData(await query));
  },
  create: async (data: ProductFormValues) => {
    const client = requireSupabase();
    return mapRow<Product>(readData(await client.from("products").insert(toDatabaseRecord(data)).select().single()));
  },
  update: async (id: string, data: Partial<ProductFormValues>) => {
    const client = requireSupabase();
    return mapRow<Product>(
      readData(await client.from("products").update(toDatabaseRecord(data)).eq("id", id).select().single()),
    );
  },
  deactivate: async (id: string) => {
    const client = requireSupabase();
    return mapRow<Product>(
      readData(await client.from("products").update({ active: false }).eq("id", id).select().single()),
    );
  },
};
