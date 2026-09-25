import { create } from "zustand";
import type { Payment } from "../../types";
import { ledgerApi, type LedgerSummaryEntry, type PaymentFormValues } from "./ledger.api";

interface LedgerState {
  payments: Payment[];
  summary: LedgerSummaryEntry[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  create: (data: PaymentFormValues) => Promise<Payment>;
  remove: (id: string) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  payments: [],
  summary: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const payments = await ledgerApi.list();
      set({ payments, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load ledger", loading: false });
    }
  },

  fetchSummary: async () => {
    const summary = await ledgerApi.summary();
    set({ summary });
  },

  create: async (data) => {
    const payment = await ledgerApi.create(data);
    set({ payments: [payment, ...get().payments] });
    void get().fetchSummary();
    return payment;
  },

  remove: async (id) => {
    await ledgerApi.remove(id);
    set({ payments: get().payments.filter((p) => p.id !== id) });
    void get().fetchSummary();
  },
}));
