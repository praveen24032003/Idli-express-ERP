import { create } from "zustand";
import type { Product } from "../../types";
import { productsApi, type ProductFormValues } from "./products.api";

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (data: ProductFormValues) => Promise<Product>;
  update: (id: string, data: Partial<ProductFormValues>) => Promise<Product>;
  deactivate: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const products = await productsApi.list();
      set({ products, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load products", loading: false });
    }
  },

  create: async (data) => {
    const product = await productsApi.create(data);
    set({ products: [product, ...get().products] });
    return product;
  },

  update: async (id, data) => {
    const product = await productsApi.update(id, data);
    set({ products: get().products.map((p) => (p.id === id ? product : p)) });
    return product;
  },

  deactivate: async (id) => {
    const product = await productsApi.deactivate(id);
    set({ products: get().products.map((p) => (p.id === id ? product : p)) });
  },
}));
