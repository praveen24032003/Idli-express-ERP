import { api } from "../../services/api";

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: number;
  productionRequired: number;
  productionCompleted: number;
  activeCustomers: number;
  outstandingAmount: number;
  morningRequired: number;
  eveningRequired: number;
}

export interface TrendPoint {
  date: string;
  revenue: number;
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
  trend: () => api.get<TrendPoint[]>("/dashboard/trend"),
};
