import { z } from "zod";
import type { OrderTemplate, SessionType } from "../../types";
import { SESSIONS } from "../../types";
import { mapRow, readData, requireSupabase, toDatabaseRecord } from "../../services/supabase";
import { todayISO } from "../../utils/format";
import { planPendingTemplateOrderSync } from "./template-order-sync";

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
  updated: number;
  removed: number;
  skipped: string[];
  date: string;
}

const TEMPLATE_SESSIONS: SessionType[] = ["MORNING", "EVENING"];
const GENERATED_ORDER_REMARK = "Auto-generated from recurring template";

async function synchronizePendingGeneratedOrders(template: OrderTemplate) {
  const client = requireSupabase();
  const generated = readData(
    await client
      .from("orders")
      .select("id, delivery_date, session")
      .eq("order_template_id", template.id)
      .gte("delivery_date", todayISO()),
  ) as Array<{ id: string; delivery_date: string; session: SessionType }>;
  const plan = planPendingTemplateOrderSync(
    template,
    generated.map((order) => ({ id: order.id, deliveryDate: order.delivery_date, session: order.session })),
    todayISO(),
  );

  for (const order of plan.updates) {
    readData(
      await client
        .from("orders")
        .update(toDatabaseRecord({ ...order.values }))
        .eq("id", order.id)
        .select("id")
        .single(),
    );
  }
  for (const id of plan.removals) {
    readData(await client.from("orders").delete().eq("id", id).select("id").single());
  }
  return { updated: plan.updates.length, removed: plan.removals.length };
}

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
    const updatedTemplate = mapRow<OrderTemplate>(
      readData(
        await client
          .from("order_templates")
          .select("*, customer:customers(*), product:products(*), days:template_days(*)")
          .eq("id", id)
          .single(),
      ),
    );
    await synchronizePendingGeneratedOrders(updatedTemplate);
    return updatedTemplate;
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
      await client
        .from("orders")
        .select("id, order_template_id, customer_id, product_id, session, remarks")
        .eq("delivery_date", targetDate),
    ) as Array<{
      id: string;
      order_template_id: string | null;
      customer_id: string;
      product_id: string;
      session: SessionType;
      remarks: string | null;
    }>;
    const skipped: string[] = [];
    let created = 0;
    let updated = 0;
    let removed = 0;

    for (const template of templates) {
      for (const session of TEMPLATE_SESSIONS) {
        const day = template.days.find((item) => item.dayOfWeek === dayOfWeek && item.session === session);
        const linkedOrder = ordersToday.find(
          (order) => order.order_template_id === template.id && order.session === session,
        );
        if (!day || day.quantity <= 0) {
          if (linkedOrder) {
            readData(await client.from("orders").delete().eq("id", linkedOrder.id).select("id").single());
            removed++;
          }
          continue;
        }

        if (linkedOrder) {
          readData(
            await client
              .from("orders")
              .update({
                customer_id: template.customerId,
                product_id: template.productId,
                quantity: day.quantity,
                price_type: "WHOLESALE",
                unit_price: template.product?.wholesalePrice ?? 0,
                remarks: GENERATED_ORDER_REMARK,
              })
              .eq("id", linkedOrder.id)
              .select("id")
              .single(),
          );
          updated++;
          continue;
        }

        const duplicateManualOrder = ordersToday.some(
          (order) =>
            !order.order_template_id &&
            order.customer_id === template.customerId &&
            order.product_id === template.productId &&
            order.session === session,
        );
        if (duplicateManualOrder) {
          skipped.push(`${template.customer?.name ?? "Customer"} - ${template.product?.name ?? "Product"} (${session.toLowerCase()})`);
          continue;
        }

        const inserted = readData(
          await client
            .from("orders")
            .insert({
              order_template_id: template.id,
              customer_id: template.customerId,
              product_id: template.productId,
              quantity: day.quantity,
              price_type: "WHOLESALE",
              unit_price: template.product?.wholesalePrice ?? 0,
              session,
              delivery_date: targetDate,
              channel: "DIRECT",
              remarks: GENERATED_ORDER_REMARK,
            })
            .select("id")
            .single(),
        ) as { id: string };
        ordersToday.push({
          id: inserted.id,
          order_template_id: template.id,
          customer_id: template.customerId,
          product_id: template.productId,
          session,
          remarks: GENERATED_ORDER_REMARK,
        });
        created++;
      }
    }
    return { created, updated, removed, skipped, date: `${targetDate}T00:00:00.000Z` };
  },
};
