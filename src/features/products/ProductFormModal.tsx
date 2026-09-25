import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { productFormSchema, type ProductFormValues } from "./products.api";
import { useProductsStore } from "./products.store";
import type { Product } from "../../types";
import { PRODUCT_CATEGORIES } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

const DEFAULTS: ProductFormValues = {
  name: "",
  category: "OTHER",
  wholesalePrice: 0,
  retailPrice: 0,
  active: true,
};

export function ProductFormModal({ open, onClose, product }: Props) {
  const { create, update } = useProductsStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name: product.name,
              category: product.category,
              wholesalePrice: product.wholesalePrice,
              retailPrice: product.retailPrice,
              active: product.active,
            }
          : DEFAULTS,
      );
    }
  }, [open, product, reset]);

  if (!open) return null;

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (product) {
        await update(product.id, values);
        toast.success("Product updated");
      } else {
        await create(values);
        toast.success("Product created");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-ink-900">{product ? "Edit Product" : "New Product"}</h2>
          <button className="btn-ghost !min-h-0 !p-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
          <div>
            <label className="label" htmlFor="name">
              Product Name *
            </label>
            <input id="name" className="input" placeholder="e.g. Idli" {...register("name")} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="category">
              Category *
            </label>
            <select id="category" className="input" {...register("category")}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="wholesalePrice">
                Wholesale Price *
              </label>
              <input
                id="wholesalePrice"
                type="number"
                step="0.5"
                className="input"
                {...register("wholesalePrice")}
              />
              {errors.wholesalePrice && <p className="field-error">{errors.wholesalePrice.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="retailPrice">
                Retail Price *
              </label>
              <input id="retailPrice" type="number" step="0.5" className="input" {...register("retailPrice")} />
              {errors.retailPrice && <p className="field-error">{errors.retailPrice.message}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <input type="checkbox" className="h-5 w-5 rounded border-ink-300" {...register("active")} />
            Active product
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : product ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
