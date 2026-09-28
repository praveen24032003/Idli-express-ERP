import type { OrderTemplate, SessionType } from "../../types";

export interface GeneratedTemplateOrder {
  id: string;
  deliveryDate: string;
  session: SessionType;
}

export interface GeneratedTemplateOrderUpdate {
  customerId: string;
  productId: string;
  quantity: number;
  priceType: "WHOLESALE";
  unitPrice: number;
  remarks: "Auto-generated from recurring template";
}

export interface TemplateOrderSyncPlan {
  updates: Array<{ id: string; values: GeneratedTemplateOrderUpdate }>;
  removals: string[];
}

export function planPendingTemplateOrderSync(
  template: Pick<OrderTemplate, "customerId" | "productId" | "days"> & { product?: { wholesalePrice: number } | null },
  orders: GeneratedTemplateOrder[],
  fromDate: string,
): TemplateOrderSyncPlan {
  const updates: TemplateOrderSyncPlan["updates"] = [];
  const removals: string[] = [];

  for (const order of orders) {
    if (order.deliveryDate.slice(0, 10) < fromDate) continue;
    const weekday = new Date(`${order.deliveryDate.slice(0, 10)}T00:00:00Z`).getUTCDay();
    const day = template.days.find((item) => item.dayOfWeek === weekday && item.session === order.session);
    if (!day || day.quantity <= 0) {
      removals.push(order.id);
      continue;
    }

    updates.push({
      id: order.id,
      values: {
        customerId: template.customerId,
        productId: template.productId,
        quantity: day.quantity,
        priceType: "WHOLESALE",
        unitPrice: template.product?.wholesalePrice ?? 0,
        remarks: "Auto-generated from recurring template",
      },
    });
  }

  return { updates, removals };
}
