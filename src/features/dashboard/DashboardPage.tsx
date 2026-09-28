import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  IndianRupee,
  Factory,
  CheckCircle2,
  Users,
  Wallet,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { dashboardApi, type DashboardSummary, type TrendPoint } from "./dashboard.api";
import { formatCurrency } from "../../utils/format";

const CARD_CONFIG = [
  { key: "ordersToday", label: "Orders Today", icon: ClipboardList, color: "text-blue-600 bg-blue-50", to: "/orders" },
  { key: "revenueToday", label: "Revenue Today", icon: IndianRupee, color: "text-emerald-600 bg-emerald-50", to: "/orders", currency: true },
  { key: "productionRequired", label: "Production Required", icon: Factory, color: "text-amber-600 bg-amber-50", to: "/production" },
  { key: "productionCompleted", label: "Production Completed", icon: CheckCircle2, color: "text-purple-600 bg-purple-50", to: "/production" },
  { key: "activeCustomers", label: "Active Customers", icon: Users, color: "text-sky-600 bg-sky-50", to: "/customers" },
  { key: "outstandingAmount", label: "Outstanding Amount", icon: Wallet, color: "text-red-600 bg-red-50", to: "/ledger", currency: true },
] as const;

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dashboardApi.summary(), dashboardApi.trend()])
      .then(([s, t]) => {
        if (cancelled) return;
        setSummary(s);
        setTrend(t);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load dashboard data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !summary) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          title="Dashboard could not load"
          description={error ?? "No dashboard data was returned."}
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setLoading(true);
                setError(null);
                setReloadKey((key) => key + 1);
              }}
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Today's snapshot of orders, production, and collections" />

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-6">
        {CARD_CONFIG.map((card) => {
          const value = summary[card.key as keyof DashboardSummary];
          return (
            <Link key={card.key} to={card.to} className="card flex flex-col gap-2 p-4 transition hover:shadow-md">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-ink-400">{card.label}</p>
              <p className="text-lg font-bold text-ink-900">
                {"currency" in card && card.currency ? formatCurrency(value) : value}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 pb-6 sm:px-6 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-ink-800">Revenue Trend (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-ink-800">Session Breakdown</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3">
              <span className="text-sm font-medium text-amber-700">Morning Required</span>
              <span className="font-bold text-amber-800">{summary.morningRequired}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-3">
              <span className="text-sm font-medium text-indigo-700">Evening Required</span>
              <span className="font-bold text-indigo-800">{summary.eveningRequired}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
