import { useEffect, useState } from "react";
import { Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { useProductsStore } from "./products.store";
import { ProductFormModal } from "./ProductFormModal";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/format";

export function ProductsPage() {
  const { products, loading, fetch, deactivate } = useProductsStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = async (product: Product) => {
    try {
      if (product.active) {
        await deactivate(product.id);
        toast.success("Product deactivated");
      } else {
        await useProductsStore.getState().update(product.id, { active: true });
        toast.success("Product activated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update product");
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products`}
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-5 w-5" /> New Product
          </button>
        }
      />

      <div className="px-4 py-4 sm:px-6">
        {loading ? (
          <LoadingState label="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add your first product to start creating orders."
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus className="h-5 w-5" /> Add Product
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs font-medium text-ink-400">{product.category}</p>
                  </div>
                  <span className={cn("badge", product.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                    {product.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-3">
                  <div>
                    <p className="text-xs text-ink-400">Wholesale</p>
                    <p className="font-semibold text-ink-800">{formatCurrency(product.wholesalePrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-400">Retail</p>
                    <p className="font-semibold text-ink-800">{formatCurrency(product.retailPrice)}</p>
                  </div>
                </div>

                <div className="mt-auto flex justify-end gap-1">
                  <button
                    className="btn-ghost !min-h-0 !p-2"
                    aria-label="Edit"
                    onClick={() => {
                      setEditing(product);
                      setModalOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className={cn("btn-ghost !min-h-0 !p-2", product.active ? "text-red-600" : "text-emerald-600")}
                    aria-label={product.active ? "Deactivate" : "Activate"}
                    onClick={() => handleToggleActive(product)}
                  >
                    {product.active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductFormModal open={modalOpen} onClose={() => setModalOpen(false)} product={editing} />
    </div>
  );
}
