import { z } from "zod";
import type { Payment } from "../../types";
import { mapRow, readData, requireSupabase, toDatabaseRecord } from "../../services/supabase";

export const paymentFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  invoiceAmount: z.coerce.number().nonnegative(),
  paidAmount: z.coerce.number().nonnegative(),
  paymentDate: z.string().min(1, "Date is required"),
  remarks: z.string().optional().or(z.literal("")),
});

export type PaymentFormInput = z.input<typeof paymentFormSchema>;
export type PaymentFormValues = z.output<typeof paymentFormSchema>;

export interface LedgerSummaryEntry {
  customerId: string;
  name: string;
  invoiced: number;
  paid: number;
  balance: number;
}

export const ledgerApi = {
  list: async (customerId?: string) => {
    const client = requireSupabase();
    let query = client.from("payments").select("*, customer:customers(*)").order("payment_date", { ascending: false });
    if (customerId) query = query.eq("customer_id", customerId);
    return mapRow<Payment[]>(readData(await query));
  },
  summary: async () => {
    const payments = await ledgerApi.list();
    const entries = new Map<string, LedgerSummaryEntry>();
    for (const payment of payments) {
      if (!payment.customer) continue;
      const entry = entries.get(payment.customerId) ?? {
        customerId: payment.customerId,
        name: payment.customer.name,
        invoiced: 0,
        paid: 0,
        balance: 0,
      };
      entry.invoiced += payment.invoiceAmount;
      entry.paid += payment.paidAmount;
      entry.balance += payment.balanceAmount;
      entries.set(payment.customerId, entry);
    }
    return [...entries.values()].sort((a, b) => b.balance - a.balance);
  },
  create: async (data: PaymentFormValues) => {
    const client = requireSupabase();
    return mapRow<Payment>(
      readData(
        await client
          .from("payments")
          .insert(toDatabaseRecord(data))
          .select("*, customer:customers(*)")
          .single(),
      ),
    );
  },
  update: async (id: string, data: Partial<PaymentFormValues>) => {
    const client = requireSupabase();
    return mapRow<Payment>(
      readData(
        await client
          .from("payments")
          .update(toDatabaseRecord(data))
          .eq("id", id)
          .select("*, customer:customers(*)")
          .single(),
      ),
    );
  },
  remove: async (id: string) => {
    const client = requireSupabase();
    readData(await client.from("payments").delete().eq("id", id).select("id").single());
  },
};
