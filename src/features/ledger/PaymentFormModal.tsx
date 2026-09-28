import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { paymentFormSchema, type PaymentFormInput, type PaymentFormValues } from "./ledger.api";
import { useLedgerStore } from "./ledger.store";
import { useCustomersStore } from "../customers/customers.store";
import { todayISO } from "../../utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultCustomerId?: string;
}

export function PaymentFormModal({ open, onClose, defaultCustomerId }: Props) {
  const { create } = useLedgerStore();
  const { customers, fetch: fetchCustomers } = useCustomersStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      customerId: defaultCustomerId ?? "",
      invoiceAmount: "",
      paidAmount: "",
      paymentDate: todayISO().slice(0, 10),
      remarks: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (customers.length === 0) void fetchCustomers();
      reset({
        customerId: defaultCustomerId ?? "",
        invoiceAmount: "",
        paidAmount: "",
        paymentDate: todayISO().slice(0, 10),
        remarks: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCustomerId]);

  if (!open) return null;

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      await create(values);
      toast.success("Payment recorded");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-ink-900">Record Payment</h2>
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
                  {c.name}
                </option>
              ))}
            </select>
            {errors.customerId && <p className="field-error">{errors.customerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="invoiceAmount">
                Invoice Amount *
              </label>
              <input id="invoiceAmount" type="number" min="0" step="0.01" placeholder="0" className="input" {...register("invoiceAmount")} />
            </div>
            <div>
              <label className="label" htmlFor="paidAmount">
                Paid Amount *
              </label>
              <input id="paidAmount" type="number" min="0" step="0.01" placeholder="0" className="input" {...register("paidAmount")} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="paymentDate">
              Payment Date *
            </label>
            <input id="paymentDate" type="date" className="input" {...register("paymentDate")} />
          </div>

          <div>
            <label className="label" htmlFor="remarks">
              Remarks
            </label>
            <input id="remarks" className="input" placeholder="Optional notes" {...register("remarks")} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
