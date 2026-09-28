import type { Production } from "../../types";
import { SESSIONS } from "../../types";
import { mapRow, readData, requireSupabase } from "../../services/supabase";

export const productionApi = {
  list: async (date: string, session?: string) => {
    const client = requireSupabase();
    const [productsResult, ordersResult, productionResult] = await Promise.all([
      client.from("products").select("*").eq("active", true),
      client.from("orders").select("*").eq("delivery_date", date),
      client.from("production").select("*").eq("date", date),
    ]);
    const products = mapRow<NonNullable<typeof productsResult.data>>(readData(productsResult));
    const orders = readData(ordersResult);
    const existing = mapRow<Production[]>(readData(productionResult));
    const sessions = session ? [session] : SESSIONS;
    const records: Production[] = [];

    for (const product of products) {
      for (const currentSession of sessions) {
        const requiredQuantity = orders
          .filter((order) => order.product_id === product.id && order.session === currentSession)
          .reduce((sum, order) => sum + Number(order.quantity), 0);
        const current = existing.find((record) => record.productId === product.id && record.session === currentSession);
        let result;
        if (current) {
          result = readData(
            await client
              .from("production")
              .update({ required_quantity: requiredQuantity })
              .eq("id", current.id)
              .select("*, product:products(*)")
              .single(),
          );
        } else {
          result = readData(
            await client
              .from("production")
              .insert({ date, product_id: product.id, session: currentSession, required_quantity: requiredQuantity })
              .select("*, product:products(*)")
              .single(),
          );
        }
        records.push(mapRow<Production>(result));
      }
    }
    return records;
  },
  updateProduced: async (id: string, producedQuantity: number) => {
    const client = requireSupabase();
    return mapRow<Production>(
      readData(
        await client
          .from("production")
          .update({ produced_quantity: producedQuantity })
          .eq("id", id)
          .select("*, product:products(*)")
          .single(),
      ),
    );
  },
};
