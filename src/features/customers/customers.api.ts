import { z } from "zod";
import type { Customer, Order, Payment } from "../../types";
import { CUSTOMER_TYPES } from "../../types";
import { mapRow, readData, requireSupabase, toDatabaseRecord } from "../../services/supabase";

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

export const customersApi = {
  list: async (filters: CustomerFilters = {}) => {
    const client = requireSupabase();
    let query = client.from("customers").select("*").order("created_at", { ascending: false });
    if (filters.type) query = query.eq("customer_type", filters.type);
    if (filters.area) query = query.eq("area", filters.area);
    if (filters.active !== undefined) query = query.eq("active", filters.active);
    let customers = mapRow<Customer[]>(readData(await query));
    if (filters.search) {
      const search = filters.search.trim().toLocaleLowerCase();
      customers = customers.filter((customer) =>
        [customer.name, customer.phone, customer.customerCode].some((value) => value.toLocaleLowerCase().includes(search)),
      );
    }
    return customers;
  },
  get: async (id: string) => {
    const client = requireSupabase();
    const result = readData(
      await client
        .from("customers")
        .select("*, orders(*, product:products(*)), payments(*)")
        .eq("id", id)
        .single(),
    );
    const customer = mapRow<Omit<CustomerDetail, "outstandingAmount">>(result);
    const outstandingAmount = customer.payments.reduce((sum, payment) => sum + payment.balanceAmount, 0);
    return { ...customer, outstandingAmount };
  },
  create: async (data: CustomerFormValues) => {
    const client = requireSupabase();
    const row = { ...data, customerCode: `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}` };
    return mapRow<Customer>(readData(await client.from("customers").insert(toDatabaseRecord(row)).select().single()));
  },
  update: async (id: string, data: Partial<CustomerFormValues>) => {
    const client = requireSupabase();
    return mapRow<Customer>(
      readData(await client.from("customers").update(toDatabaseRecord(data)).eq("id", id).select().single()),
    );
  },
  remove: async (id: string) => {
    const client = requireSupabase();
    readData(await client.from("customers").delete().eq("id", id).select("id").single());
  },
};
