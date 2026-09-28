import { z } from "zod";
import type { Order, Product } from "../../types";
import { PRICE_TYPES, SESSIONS, CHANNELS } from "../../types";
import { mapRow, readData, requireSupabase, toDatabaseRecord } from "../../services/supabase";

export const orderFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  priceType: z.enum(PRICE_TYPES),
  session: z.enum(SESSIONS),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  channel: z.enum(CHANNELS),
  remarks: z.string().optional().or(z.literal("")),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export interface OrderFilters {
  date?: string;
  customerId?: string;
  productId?: string;
  session?: string;
  channel?: string;
}

async function getProductPrice(productId: string, priceType: "WHOLESALE" | "RETAIL") {
  const client = requireSupabase();
  const row = readData(
    await client.from("products").select("wholesale_price, retail_price").eq("id", productId).single(),
  );
  const product = mapRow<Pick<Product, "wholesalePrice" | "retailPrice">>(row);
  return priceType === "RETAIL" ? product.retailPrice : product.wholesalePrice;
}

export const ordersApi = {
  list: async (filters: OrderFilters = {}) => {
    const client = requireSupabase();
    let query = client.from("orders").select("*, customer:customers(*), product:products(*)").order("created_at", { ascending: false });
    if (filters.date) query = query.eq("delivery_date", filters.date);
    if (filters.customerId) query = query.eq("customer_id", filters.customerId);
    if (filters.productId) query = query.eq("product_id", filters.productId);
    if (filters.session) query = query.eq("session", filters.session);
    if (filters.channel) query = query.eq("channel", filters.channel);
    return mapRow<Order[]>(readData(await query));
  },
  create: async (data: OrderFormValues) => {
    const client = requireSupabase();
    const unitPrice = await getProductPrice(data.productId, data.priceType);
    const row = { ...data, unitPrice };
    return mapRow<Order>(
      readData(
        await client
          .from("orders")
          .insert(toDatabaseRecord(row))
          .select("*, customer:customers(*), product:products(*)")
          .single(),
      ),
    );
  },
  update: async (id: string, data: Partial<OrderFormValues>) => {
    const client = requireSupabase();
    const existing = mapRow<Order>(readData(await client.from("orders").select("*").eq("id", id).single()));
    const productId = data.productId ?? existing.productId;
    const priceType = data.priceType ?? existing.priceType;
    const unitPrice = await getProductPrice(productId, priceType);
    const row = { ...data, unitPrice };
    return mapRow<Order>(
      readData(
        await client
          .from("orders")
          .update(toDatabaseRecord(row))
          .eq("id", id)
          .select("*, customer:customers(*), product:products(*)")
          .single(),
      ),
    );
  },
  remove: async (id: string) => {
    const client = requireSupabase();
    readData(await client.from("orders").delete().eq("id", id).select("id").single());
  },
  duplicate: async (id: string) => {
    const client = requireSupabase();
    const original = mapRow<Order>(readData(await client.from("orders").select("*").eq("id", id).single()));
    return ordersApi.create({
      customerId: original.customerId,
      productId: original.productId,
      quantity: original.quantity,
      priceType: original.priceType,
      session: original.session,
      deliveryDate: original.deliveryDate.slice(0, 10),
      channel: original.channel,
      remarks: original.remarks ?? "",
    });
  },
};
