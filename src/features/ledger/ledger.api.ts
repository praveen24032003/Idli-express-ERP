import { z } from "zod";
import { api } from "../../services/api";
import type { Payment } from "../../types";

export const paymentFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  invoiceAmount: z.coerce.number().nonnegative(),
  paidAmount: z.coerce.number().nonnegative(),
  paymentDate: z.string().min(1, "Date is required"),
  remarks: z.string().optional().or(z.literal("")),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export interface LedgerSummaryEntry {
  customerId: string;
  name: string;
  invoiced: number;
  paid: number;
  balance: number;
}

export const ledgerApi = {
  list: (customerId?: string) => api.get<Payment[]>(`/ledger${customerId ? `?customerId=${customerId}` : ""}`),
  summary: () => api.get<LedgerSummaryEntry[]>("/ledger/summary"),
  create: (data: PaymentFormValues) => api.post<Payment>("/ledger", data),
  update: (id: string, data: Partial<PaymentFormValues>) => api.put<Payment>(`/ledger/${id}`, data),
  remove: (id: string) => api.delete<void>(`/ledger/${id}`),
};
