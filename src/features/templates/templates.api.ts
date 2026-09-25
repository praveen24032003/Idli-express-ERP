import { z } from "zod";
import { api } from "../../services/api";
import type { OrderTemplate } from "../../types";

const dayInput = z.object({ dayOfWeek: z.number().int().min(0).max(6), quantity: z.coerce.number().nonnegative() });

export const templateFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  productId: z.string().min(1, "Select a product"),
  active: z.boolean(),
  days: z.array(dayInput),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export interface GenerateResult {
  created: number;
  skipped: string[];
  date: string;
}

export const templatesApi = {
  list: (active?: boolean) => api.get<OrderTemplate[]>(`/templates${active !== undefined ? `?active=${active}` : ""}`),
  create: (data: TemplateFormValues) => api.post<OrderTemplate>("/templates", data),
  update: (id: string, data: Partial<TemplateFormValues>) => api.put<OrderTemplate>(`/templates/${id}`, data),
  toggle: (id: string) => api.patch<OrderTemplate>(`/templates/${id}/toggle`),
  remove: (id: string) => api.delete<void>(`/templates/${id}`),
  generateToday: (date?: string) => api.post<GenerateResult>("/templates/generate-today", { date }),
};
