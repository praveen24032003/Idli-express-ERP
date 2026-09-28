import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { orderFormSchema, type OrderFormInput, type OrderFormValues } from "./orders.api";
import { useOrdersStore } from "./orders.store";
import { useCustomersStore } from "../customers/customers.store";
import { useProductsStore } from "../products/products.store";
import type { Order } from "../../types";
import { PRICE_TYPES, SESSIONS, CHANNELS } from "../../types";
import { formatCurrency, todayISO } from "../../utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  order?: Order | null;
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function defaults(order?: Order | null): OrderFormInput {
  if (order) {
    return {
      customerId: order.customerId,
      productId: order.productId,
      quantity: order.quantity,
      priceType: order.priceType,
      session: order.session,
      deliveryDate: toDateInputValue(order.deliveryDate),
      channel: order.channel,
      remarks: order.remarks ?? "",
    };
  }
  return {
    customerId: "",
    productId: "",
    quantity: "",
    priceType: "WHOLESALE",
    session: "MORNING",
    deliveryDate: toDateInputValue(todayISO()),
    channel: "DIRECT",
    remarks: "",
  };
}

export function OrderFormModal({ open, onClose, order }: Props) {
  const { create, update } = useOrdersStore();
  const { customers, fetch: fetchCustomers } = useCustomersStore();
  const { products, fetch: fetchProducts } = useProductsStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: defaults(order),
  });

  useEffect(() => {
    if (open) {
      if (customers.length === 0) void fetchCustomers();
      if (products.length === 0) void fetchProducts();
      reset(defaults(order));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const productId = watch("productId");
  const priceType = watch("priceType");
  const quantity = watch("quantity");

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const unitPrice = selectedProduct
    ? priceType === "RETAIL"
      ? selectedProduct.retailPrice
      : selectedProduct.wholesalePrice
    : 0;
  const totalAmount = (Number(quantity) || 0) * unitPrice;

  if (!open) return null;

  const onSubmit = async (values: OrderFormValues) => {
    try {
      if (order) {
        await update(order.id, values);
        toast.success("Order updated");
      } else {
        await create(values);
        toast.success("Order created");
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
          <h2 className="text-lg font-bold text-ink-900">{order ? "Edit Order" : "New Order"}</h2>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="quantity">
                Quantity *
              </label>
              <input id="quantity" type="number" step="1" className="input" {...register("quantity")} />
              {errors.quantity && <p className="field-error">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="priceType">
                Price Type *
              </label>
              <select id="priceType" className="input" {...register("priceType")}>
                {PRICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="session">
                Session *
              </label>
              <select id="session" className="input" {...register("session")}>
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="channel">
                Channel *
              </label>
              <select id="channel" className="input" {...register("channel")}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="deliveryDate">
              Delivery Date *
            </label>
            <input id="deliveryDate" type="date" className="input" {...register("deliveryDate")} />
            {errors.deliveryDate && <p className="field-error">{errors.deliveryDate.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="remarks">
              Remarks
            </label>
            <input id="remarks" className="input" placeholder="Optional notes" {...register("remarks")} />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-4">
            <div>
              <p className="text-xs font-medium text-brand-600">Unit Price</p>
              <p className="font-semibold text-brand-800">{formatCurrency(unitPrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-brand-600">Total Amount</p>
              <p className="text-lg font-bold text-brand-800">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : order ? "Save Changes" : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
