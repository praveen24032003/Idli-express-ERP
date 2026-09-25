import { api } from "../../services/api";
import type { Production } from "../../types";

export const productionApi = {
  list: (date: string, session?: string) => {
    const params = new URLSearchParams({ date });
    if (session) params.set("session", session);
    return api.get<Production[]>(`/production?${params.toString()}`);
  },
  updateProduced: (id: string, producedQuantity: number) =>
    api.put<Production>(`/production/${id}`, { producedQuantity }),
};
