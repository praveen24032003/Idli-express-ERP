import { z } from "zod";
import { api } from "../../services/api";
import type { Order } from "../../types";
import { PRICE_TYPES, SESSIONS, CHANNELS } from "../../types";

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

function buildQuery(filters: OrderFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const ordersApi = {
  list: (filters: OrderFilters = {}) => api.get<Order[]>(`/orders${buildQuery(filters)}`),
  create: (data: OrderFormValues) => api.post<Order>("/orders", data),
  update: (id: string, data: Partial<OrderFormValues>) => api.put<Order>(`/orders/${id}`, data),
  remove: (id: string) => api.delete<void>(`/orders/${id}`),
  duplicate: (id: string) => api.post<Order>(`/orders/${id}/duplicate`),
};
