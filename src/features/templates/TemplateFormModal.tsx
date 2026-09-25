import { useEffect } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { templateFormSchema, type TemplateFormValues } from "./templates.api";
import { useTemplatesStore } from "./templates.store";
import { useCustomersStore } from "../customers/customers.store";
import { useProductsStore } from "../products/products.store";
import type { OrderTemplate } from "../../types";
import { WEEKDAYS } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  template?: OrderTemplate | null;
}

function defaults(template?: OrderTemplate | null): TemplateFormValues {
  const days = WEEKDAYS.map((wd) => ({
    dayOfWeek: wd.value,
    quantity: template?.days.find((d) => d.dayOfWeek === wd.value)?.quantity ?? 0,
  }));
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema) as Resolver<TemplateFormValues>,
    defaultValues: defaults(template),
  });

  const { fields } = useFieldArray({ control, name: "days" });

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
        toast.success("Template updated");
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

          <div>
            <p className="label mb-2">Daily Quantity</p>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((field, index) => (
                <div key={field.id}>
                  <label className="text-xs font-medium text-ink-500">{WEEKDAYS[index].label}</label>
                  <input type="number" step="1" className="input" {...register(`days.${index}.quantity` as const)} />
                </div>
              ))}
            </div>
          </div>

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
