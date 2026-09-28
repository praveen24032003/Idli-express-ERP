import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { templateFormSchema, type TemplateFormInput, type TemplateFormValues } from "./templates.api";
import { useTemplatesStore } from "./templates.store";
import { useCustomersStore } from "../customers/customers.store";
import { useProductsStore } from "../products/products.store";
import type { OrderTemplate } from "../../types";
import { SESSIONS, WEEKDAYS } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  template?: OrderTemplate | null;
}

function defaults(template?: OrderTemplate | null): TemplateFormInput {
  const days = WEEKDAYS.flatMap((weekday) =>
    SESSIONS.map((session) => ({
      dayOfWeek: weekday.value,
      session,
      quantity:
        template?.days.find((day) => day.dayOfWeek === weekday.value && day.session === session)?.quantity ?? "",
    })),
  );
  return {
    customerId: template?.customerId ?? "",
    productId: template?.productId ?? "",
    active: template?.active ?? true,
    days,
  };
}

export function TemplateFormModal({ open, onClose, template }: Props) {
  const { create, update } = useTemplatesStore();
  const { customers, fetch: fetchCustomers } = useCustomersStore();
  const { products, fetch: fetchProducts } = useProductsStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormInput, unknown, TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: defaults(template),
  });

  useEffect(() => {
    if (open) {
      if (customers.length === 0) void fetchCustomers();
      if (products.length === 0) void fetchProducts();
      reset(defaults(template));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template]);

  if (!open) return null;

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      if (template) {
        await update(template.id, values);
        toast.success("Template updated and pending generated orders synchronized");
      } else {
        await create(values);
        toast.success("Template created");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-ink-900">{template ? "Edit Template" : "New Recurring Template"}</h2>
          <button className="btn-ghost !min-h-0 !p-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
          <div>
            <label className="label" htmlFor="customerId">
              Customer *
            </label>
            <select id="customerId" className="input" {...register("customerId")}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerCode})
                </option>
              ))}
            </select>
            {errors.customerId && <p className="field-error">{errors.customerId.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="productId">
              Product *
            </label>
            <select id="productId" className="input" {...register("productId")}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.productId && <p className="field-error">{errors.productId.message}</p>}
          </div>

          <fieldset className="space-y-2">
            <legend className="label mb-2">Daily Quantity</legend>
            <div className="grid grid-cols-[minmax(76px,1fr)_minmax(88px,1fr)_minmax(88px,1fr)] items-center gap-2 px-1">
              <span className="text-xs font-medium text-ink-400">Day</span>
              <span className="text-xs font-medium text-ink-500">Morning</span>
              <span className="text-xs font-medium text-ink-500">Evening</span>
              {WEEKDAYS.map((weekday, dayIndex) => {
                const morningIndex = dayIndex * SESSIONS.length;
                const eveningIndex = morningIndex + 1;
                return (
                  <div key={weekday.value} className="contents">
                    <span className="text-sm font-medium text-ink-700">{weekday.label}</span>
                    <input
                      aria-label={`${weekday.label} morning quantity`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className="input"
                      {...register(`days.${morningIndex}.quantity` as const)}
                    />
                    <input
                      aria-label={`${weekday.label} evening quantity`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className="input"
                      {...register(`days.${eveningIndex}.quantity` as const)}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <input type="checkbox" className="h-5 w-5 rounded border-ink-300" {...register("active")} />
            Active template
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : template ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
