import { z } from "zod";
import { api } from "../../services/api";
import type { Customer, Order, Payment } from "../../types";
import { CUSTOMER_TYPES } from "../../types";

export const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .max(15, "Enter a valid phone number")
    .regex(/^[0-9+\-\s]+$/, "Only digits allowed"),
  address: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  route: z.string().optional().or(z.literal("")),
  customerType: z.enum(CUSTOMER_TYPES),
  notes: z.string().optional().or(z.literal("")),
  active: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export interface CustomerDetail extends Customer {
  orders: Order[];
  payments: Payment[];
  outstandingAmount: number;
}

export interface CustomerFilters {
  search?: string;
  type?: string;
  area?: string;
  active?: boolean;
}

function buildQuery(filters: CustomerFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.area) params.set("area", filters.area);
  if (filters.active !== undefined) params.set("active", String(filters.active));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const customersApi = {
  list: (filters: CustomerFilters = {}) => api.get<Customer[]>(`/customers${buildQuery(filters)}`),
  get: (id: string) => api.get<CustomerDetail>(`/customers/${id}`),
  create: (data: CustomerFormValues) => api.post<Customer>("/customers", data),
  update: (id: string, data: Partial<CustomerFormValues>) => api.put<Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.delete<void>(`/customers/${id}`),
};
