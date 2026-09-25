import { create } from "zustand";
import type { Order } from "../../types";
import { ordersApi, type OrderFilters, type OrderFormValues } from "./orders.api";

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  fetch: () => Promise<void>;
  setFilters: (filters: OrderFilters) => void;
  create: (data: OrderFormValues) => Promise<Order>;
  update: (id: string, data: Partial<OrderFormValues>) => Promise<Order>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Order>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  filters: {},

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const orders = await ordersApi.list(get().filters);
      set({ orders, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load orders", loading: false });
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    void get().fetch();
  },

  create: async (data) => {
    const order = await ordersApi.create(data);
    set({ orders: [order, ...get().orders] });
    return order;
  },

  update: async (id, data) => {
    const order = await ordersApi.update(id, data);
    set({ orders: get().orders.map((o) => (o.id === id ? order : o)) });
    return order;
  },

  remove: async (id) => {
    await ordersApi.remove(id);
    set({ orders: get().orders.filter((o) => o.id !== id) });
  },

  duplicate: async (id) => {
    const order = await ordersApi.duplicate(id);
    set({ orders: [order, ...get().orders] });
    return order;
  },
}));
