import { create } from "zustand";
import type { Customer } from "../../types";
import { customersApi, type CustomerFilters, type CustomerFormValues } from "./customers.api";

interface CustomersState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  filters: CustomerFilters;
  fetch: () => Promise<void>;
  setFilters: (filters: CustomerFilters) => void;
  create: (data: CustomerFormValues) => Promise<Customer>;
  update: (id: string, data: Partial<CustomerFormValues>) => Promise<Customer>;
  remove: (id: string) => Promise<void>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,
  filters: {},

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const customers = await customersApi.list(get().filters);
      set({ customers, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load customers", loading: false });
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    void get().fetch();
  },

  create: async (data) => {
    const customer = await customersApi.create(data);
    set({ customers: [customer, ...get().customers] });
    return customer;
  },

  update: async (id, data) => {
    const customer = await customersApi.update(id, data);
    set({ customers: get().customers.map((c) => (c.id === id ? customer : c)) });
    return customer;
  },

  remove: async (id) => {
    await customersApi.remove(id);
    set({ customers: get().customers.filter((c) => c.id !== id) });
  },
}));
