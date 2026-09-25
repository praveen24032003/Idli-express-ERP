import { create } from "zustand";
import type { Production } from "../../types";
import { productionApi } from "./production.api";
import { todayISO } from "../../utils/format";

interface ProductionState {
  date: string;
  records: Production[];
  loading: boolean;
  error: string | null;
  setDate: (date: string) => void;
  fetch: () => Promise<void>;
  updateProduced: (id: string, quantity: number) => Promise<void>;
}

export const useProductionStore = create<ProductionState>((set, get) => ({
  date: todayISO().slice(0, 10),
  records: [],
  loading: false,
  error: null,

  setDate: (date) => {
    set({ date });
    void get().fetch();
  },

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const records = await productionApi.list(get().date);
      set({ records, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load production data", loading: false });
    }
  },

  updateProduced: async (id, quantity) => {
    const record = await productionApi.updateProduced(id, quantity);
    set({ records: get().records.map((r) => (r.id === id ? record : r)) });
  },
}));
