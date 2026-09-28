import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { useTemplatesStore } from "./templates.store";
import { templatesApi } from "./templates.api";
import { TemplateFormModal } from "./TemplateFormModal";
import type { OrderTemplate } from "../../types";
import { SESSIONS, WEEKDAYS } from "../../types";
import { cn } from "../../utils/format";

export function TemplatesPage() {
  const { templates, loading, fetch, toggle, remove } = useTemplatesStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrderTemplate | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (template: OrderTemplate) => {
    if (!confirm(`Delete template for ${template.customer?.name}?`)) return;
    try {
      await remove(template.id);
      toast.success("Template deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete template");
    }
  };

  const handleGenerateToday = async () => {
    setGenerating(true);
    try {
      const result = await templatesApi.generateToday();
      toast.success(`Generated ${result.created} orders for today`);
      if (result.skipped.length > 0) {
        toast(`${result.skipped.length} template(s) already had orders today`, { icon: "ℹ️" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate orders");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Recurring Templates"
        description={`${templates.length} templates for daily/weekly repeat orders`}
        actions={
          <>
            <button className="btn-secondary" onClick={handleGenerateToday} disabled={generating}>
              <Zap className="h-5 w-5" /> {generating ? "Generating..." : "Generate Today's Orders"}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-5 w-5" /> New Template
            </button>
          </>
        }
      />

      <div className="px-4 py-4 sm:px-6">
        {loading ? (
          <LoadingState label="Loading templates..." />
        ) : templates.length === 0 ? (
          <EmptyState
            title="No recurring templates"
            description="Set up a template so daily orders for hotels/restaurants generate automatically."
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus className="h-5 w-5" /> Add Template
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{template.customer?.name}</p>
                    <p className="text-sm text-ink-500">{template.product?.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn("badge", template.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {template.active ? "Active" : "Disabled"}
                    </span>
                    <button className="btn-ghost !min-h-0 !p-2" aria-label="Toggle active" onClick={() => toggle(template.id)}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-ghost !min-h-0 !p-2"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(template);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost !min-h-0 !p-2 text-red-600" aria-label="Delete" onClick={() => handleDelete(template)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[minmax(72px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)] gap-2">
                  <span className="text-center text-[10px] font-medium uppercase text-ink-400">Day</span>
                  <span className="text-center text-[10px] font-medium uppercase text-ink-400">Morning</span>
                  <span className="text-center text-[10px] font-medium uppercase text-ink-400">Evening</span>
                  {WEEKDAYS.map((weekday) => (
                    <div key={weekday.value} className="contents">
                      <span className="self-center text-xs font-medium text-ink-600">{weekday.label.slice(0, 3)}</span>
                      {SESSIONS.map((session) => {
                        const quantity = template.days.find(
                          (day) => day.dayOfWeek === weekday.value && day.session === session,
                        )?.quantity ?? 0;
                        return (
                          <span key={`${weekday.value}-${session}`} className="rounded-lg bg-ink-50 p-2 text-center font-semibold text-ink-800">
                            {quantity}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateFormModal open={modalOpen} onClose={() => setModalOpen(false)} template={editing} />
    </div>
  );
}
