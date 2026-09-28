import { z } from "zod";
import type { OrderTemplate, SessionType } from "../../types";
import { SESSIONS } from "../../types";
import { mapRow, readData, requireSupabase, toDatabaseRecord } from "../../services/supabase";
import { todayISO } from "../../utils/format";

const dayInput = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  session: z.enum(SESSIONS),
  quantity: z.coerce.number().nonnegative(),
});

export const templateFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  productId: z.string().min(1, "Select a product"),
  active: z.boolean(),
  days: z.array(dayInput),
});

export type TemplateFormInput = z.input<typeof templateFormSchema>;
export type TemplateFormValues = z.output<typeof templateFormSchema>;

export interface GenerateResult {
  created: number;
  skipped: string[];
  date: string;
}

const TEMPLATE_SESSIONS: SessionType[] = ["MORNING", "EVENING"];

export const templatesApi = {
  list: async (active?: boolean) => {
    const client = requireSupabase();
    let query = client
      .from("order_templates")
      .select("*, customer:customers(*), product:products(*), days:template_days(*)")
      .order("created_at", { ascending: false });
    if (active !== undefined) query = query.eq("active", active);
    return mapRow<OrderTemplate[]>(readData(await query));
  },
  create: async (data: TemplateFormValues) => {
    const client = requireSupabase();
    const template = mapRow<OrderTemplate>(
      readData(
        await client
          .from("order_templates")
          .insert(toDatabaseRecord({ customerId: data.customerId, productId: data.productId, active: data.active }))
          .select("*, customer:customers(*), product:products(*)")
          .single(),
      ),
    );
    const days = data.days.map((day) => ({
      template_id: template.id,
      day_of_week: day.dayOfWeek,
      session: day.session,
      quantity: day.quantity,
    }));
    const insertedDays = readData(await client.from("template_days").insert(days).select());
    return { ...template, days: mapRow<OrderTemplate["days"]>(insertedDays) };
  },
  update: async (id: string, data: Partial<TemplateFormValues>) => {
    const client = requireSupabase();
    const fields = toDatabaseRecord({ customerId: data.customerId, productId: data.productId, active: data.active });
    if (Object.keys(fields).length > 0) {
      readData(await client.from("order_templates").update(fields).eq("id", id).select("id").single());
    }
    if (data.days) {
      readData(await client.from("template_days").delete().eq("template_id", id).select("id"));
      if (data.days.length > 0) {
        const days = data.days.map((day) => ({
          template_id: id,
          day_of_week: day.dayOfWeek,
          session: day.session,
          quantity: day.quantity,
        }));
        readData(await client.from("template_days").insert(days).select("id"));
      }
    }
    return mapRow<OrderTemplate>(
      readData(
        await client
          .from("order_templates")
          .select("*, customer:customers(*), product:products(*), days:template_days(*)")
          .eq("id", id)
          .single(),
      ),
    );
  },
  toggle: async (id: string) => {
    const client = requireSupabase();
    const current = readData(await client.from("order_templates").select("active").eq("id", id).single()) as {
      active: boolean;
    };
    return mapRow<OrderTemplate>(
      readData(
        await client
          .from("order_templates")
          .update({ active: !current.active })
          .eq("id", id)
          .select("*, customer:customers(*), product:products(*), days:template_days(*)")
          .single(),
      ),
    );
  },
  remove: async (id: string) => {
    const client = requireSupabase();
    readData(await client.from("order_templates").delete().eq("id", id).select("id").single());
  },
  generateToday: async (date?: string) => {
    const client = requireSupabase();
    const targetDate = date ?? todayISO();
    const dayOfWeek = new Date(`${targetDate}T00:00:00`).getDay();
    const templates = mapRow<OrderTemplate[]>(
      readData(
        await client
          .from("order_templates")
          .select("*, customer:customers(*), product:products(*), days:template_days(*)")
          .eq("active", true),
      ),
    );
    const ordersToday = readData(
      await client.from("orders").select("customer_id, product_id, session").eq("delivery_date", targetDate),
    );
    const existing = new Set(ordersToday.map((order) => `${order.customer_id}:${order.product_id}:${order.session}`));
    const skipped: string[] = [];
    const toInsert = templates.flatMap((template) => {
      return TEMPLATE_SESSIONS.flatMap((session) => {
        const day = template.days.find((item) => item.dayOfWeek === dayOfWeek && item.session === session);
        if (!day || day.quantity <= 0) return [];
        const key = `${template.customerId}:${template.productId}:${session}`;
        if (existing.has(key)) {
          skipped.push(`${template.customer?.name ?? "Customer"} - ${template.product?.name ?? "Product"} (${session.toLowerCase()})`);
          return [];
        }
        existing.add(key);
        const unitPrice = template.product?.wholesalePrice ?? 0;
        return [{
          customer_id: template.customerId,
          product_id: template.productId,
          quantity: day.quantity,
          price_type: "WHOLESALE",
          unit_price: unitPrice,
          session,
          delivery_date: targetDate,
          channel: "DIRECT",
          remarks: "Auto-generated from recurring template",
        }];
      });
    });
    if (toInsert.length > 0) readData(await client.from("orders").insert(toInsert).select("id"));
    return { created: toInsert.length, skipped, date: `${targetDate}T00:00:00.000Z` };
  },
};
