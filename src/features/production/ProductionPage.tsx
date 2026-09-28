import { useEffect, useMemo, useState } from "react";
import { Sun, Moon } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { useProductionStore } from "./production.store";
import type { SessionType } from "../../types";
import { cn } from "../../utils/format";

export function ProductionPage() {
  const { date, records, loading, setDate, fetch, updateProduced } = useProductionStore();
  const [session, setSession] = useState<SessionType>("MORNING");
  const [drafts, setDrafts] = useState<Record<string, number | "">>({});

  useEffect(() => {
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionRecords = useMemo(() => records.filter((r) => r.session === session), [records, session]);

  const totals = useMemo(() => {
    const required = sessionRecords.reduce((sum, r) => sum + r.requiredQuantity, 0);
    const produced = sessionRecords.reduce((sum, r) => sum + r.producedQuantity, 0);
    const completion = required > 0 ? Math.round((produced / required) * 100) : 0;
    return { required, produced, balance: required - produced, completion };
  }, [sessionRecords]);

  const handleSave = async (id: string) => {
    const value = drafts[id];
    if (value === undefined || value === "") return;
    try {
      await updateProduced(id, value);
      toast.success("Production updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update production");
    }
  };

  return (
    <div>
      <PageHeader
        title="Production Planning"
        description="Track morning and evening production against required demand"
        actions={
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        }
      />

      <div className="flex gap-2 px-4 pt-4 sm:px-6">
        <button
          className={cn("btn-secondary flex-1", session === "MORNING" && "!bg-brand-600 !text-white !border-brand-600")}
          onClick={() => setSession("MORNING")}
        >
          <Sun className="h-5 w-5" /> Morning
        </button>
        <button
          className={cn("btn-secondary flex-1", session === "EVENING" && "!bg-brand-600 !text-white !border-brand-600")}
          onClick={() => setSession("EVENING")}
        >
          <Moon className="h-5 w-5" /> Evening
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:px-6">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Required</p>
          <p className="text-xl font-bold text-ink-900">{totals.required}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Produced</p>
          <p className="text-xl font-bold text-emerald-600">{totals.produced}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Balance</p>
          <p className={cn("text-xl font-bold", totals.balance > 0 ? "text-red-600" : "text-ink-900")}>{totals.balance}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Completion</p>
          <p className="text-xl font-bold text-brand-600">{totals.completion}%</p>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        {loading ? (
          <LoadingState label="Loading production data..." />
        ) : sessionRecords.length === 0 ? (
          <EmptyState title="No production requirement" description="No orders placed for this date/session yet." />
        ) : (
          <div className="space-y-3">
            {sessionRecords.map((record) => {
              const variance = record.producedQuantity - record.requiredQuantity;
              const draftValue = drafts[record.id] ?? (record.producedQuantity === 0 ? "" : record.producedQuantity);
              const pct = record.requiredQuantity > 0 ? Math.min(100, Math.round((record.producedQuantity / record.requiredQuantity) * 100)) : 0;
              return (
                <div key={record.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink-900">{record.product?.name}</p>
                    <span className={cn("badge", variance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {variance >= 0 ? `+${variance}` : variance} variance
                    </span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <p className="text-xs text-ink-400">Required</p>
                      <p className="font-semibold text-ink-800">{record.requiredQuantity}</p>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs text-ink-400" htmlFor={`produced-${record.id}`}>
                        Produced
                      </label>
                      <input
                        id={`produced-${record.id}`}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        className="input"
                        value={draftValue}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [record.id]: e.target.value === "" ? "" : Number(e.target.value) }))
                        }
                      />
                    </div>
                    <button className="btn-primary" onClick={() => handleSave(record.id)}>
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
