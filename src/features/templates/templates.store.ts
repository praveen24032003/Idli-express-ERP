import { create } from "zustand";
import type { OrderTemplate } from "../../types";
import { templatesApi, type TemplateFormValues } from "./templates.api";

interface TemplatesState {
  templates: OrderTemplate[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (data: TemplateFormValues) => Promise<OrderTemplate>;
  update: (id: string, data: Partial<TemplateFormValues>) => Promise<OrderTemplate>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const templates = await templatesApi.list();
      set({ templates, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load templates", loading: false });
    }
  },

  create: async (data) => {
    const template = await templatesApi.create(data);
    set({ templates: [template, ...get().templates] });
    return template;
  },

  update: async (id, data) => {
    const template = await templatesApi.update(id, data);
    set({ templates: get().templates.map((t) => (t.id === id ? template : t)) });
    return template;
  },

  toggle: async (id) => {
    const template = await templatesApi.toggle(id);
    set({ templates: get().templates.map((t) => (t.id === id ? template : t)) });
  },

  remove: async (id) => {
    await templatesApi.remove(id);
    set({ templates: get().templates.filter((t) => t.id !== id) });
  },
}));
