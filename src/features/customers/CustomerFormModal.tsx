import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { customerFormSchema, type CustomerFormValues } from "./customers.api";
import { useCustomersStore } from "./customers.store";
import type { Customer } from "../../types";
import { CUSTOMER_TYPES } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

const DEFAULTS: CustomerFormValues = {
  name: "",
  phone: "",
  address: "",
  area: "",
  route: "",
  customerType: "RETAIL",
  notes: "",
  active: true,
};

export function CustomerFormModal({ open, onClose, customer }: Props) {
  const { create, update } = useCustomersStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? {
              name: customer.name,
              phone: customer.phone,
              address: customer.address ?? "",
              area: customer.area ?? "",
              route: customer.route ?? "",
              customerType: customer.customerType,
              notes: customer.notes ?? "",
              active: customer.active,
            }
          : DEFAULTS,
      );
    }
  }, [open, customer, reset]);

  if (!open) return null;

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (customer) {
        await update(customer.id, values);
        toast.success("Customer updated");
      } else {
        await create(values);
        toast.success("Customer created");
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
          <h2 className="text-lg font-bold text-ink-900">{customer ? "Edit Customer" : "New Customer"}</h2>
          <button className="btn-ghost !min-h-0 !p-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
          <div>
            <label className="label" htmlFor="name">
              Name *
            </label>
            <input id="name" className="input" placeholder="Customer / business name" {...register("name")} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="phone">
              Phone *
            </label>
            <input id="phone" className="input" placeholder="98765 43210" {...register("phone")} />
            {errors.phone && <p className="field-error">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="customerType">
              Customer Type *
            </label>
            <select id="customerType" className="input" {...register("customerType")}>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="area">
                Area
              </label>
              <input id="area" className="input" placeholder="e.g. T Nagar" {...register("area")} />
            </div>
            <div>
              <label className="label" htmlFor="route">
                Route
              </label>
              <input id="route" className="input" placeholder="e.g. Route A" {...register("route")} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address">
              Address
            </label>
            <input id="address" className="input" placeholder="Street, landmark" {...register("address")} />
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" className="input" rows={3} placeholder="Internal notes" {...register("notes")} />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <input type="checkbox" className="h-5 w-5 rounded border-ink-300" {...register("active")} />
            Active customer
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : customer ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
