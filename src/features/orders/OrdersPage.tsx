import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Plus, Copy, Trash2, Pencil, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { useOrdersStore } from "./orders.store";
import { useCustomersStore } from "../customers/customers.store";
import { useProductsStore } from "../products/products.store";
import { OrderFormModal } from "./OrderFormModal";
import type { Order } from "../../types";
import { SESSIONS } from "../../types";
import { formatCurrency, todayISO } from "../../utils/format";

const columnHelper = createColumnHelper<Order>();

export function OrdersPage() {
  const { orders, loading, setFilters, remove, duplicate } = useOrdersStore();
  const { customers, fetch: fetchCustomers } = useCustomersStore();
  const { products, fetch: fetchProducts } = useProductsStore();

  const [date, setDate] = useState(todayISO().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [session, setSession] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  useEffect(() => {
    void fetchCustomers();
    void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFilters({ date, customerId: customerId || undefined, productId: productId || undefined, session: session || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, customerId, productId, session]);

  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + o.totalAmount, 0), [orders]);

  const handleDelete = async (order: Order) => {
    if (!confirm(`Delete this order for ${order.customer?.name}?`)) return;
    try {
      await remove(order.id);
      toast.success("Order deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete order");
    }
  };

  const handleDuplicate = async (order: Order) => {
    try {
      await duplicate(order.id);
      toast.success("Order duplicated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to duplicate order");
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.customer?.name, {
        id: "customer",
        header: "Customer",
        cell: (info) => <span className="font-medium text-ink-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.product?.name, {
        id: "product",
        header: "Product",
      }),
      columnHelper.accessor("session", { header: "Session" }),
      columnHelper.accessor("quantity", { header: "Qty" }),
      columnHelper.accessor("priceType", { header: "Price Type" }),
      columnHelper.accessor("unitPrice", {
        header: "Unit Price",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("totalAmount", {
        header: "Total",
        cell: (info) => <span className="font-semibold">{formatCurrency(info.getValue())}</span>,
      }),
      columnHelper.accessor("channel", { header: "Channel" }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button className="btn-ghost !min-h-0 !p-2" aria-label="Duplicate" onClick={() => handleDuplicate(row.original)}>
              <Copy className="h-4 w-4" />
            </button>
            <button
              className="btn-ghost !min-h-0 !p-2"
              aria-label="Edit"
              onClick={() => {
                setEditing(row.original);
                setModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button className="btn-ghost !min-h-0 !p-2 text-red-600" aria-label="Delete" onClick={() => handleDelete(row.original)}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({ data: orders, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} orders • ${formatCurrency(totalRevenue)} total`}
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-5 w-5" /> New Order
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:px-6">
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input type="date" className="input pl-9" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="input" value={session} onChange={(e) => setSession(e.target.value)}>
          <option value="">All Sessions</option>
          {SESSIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        {loading ? (
          <LoadingState label="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="Try a different date or filter, or create a new order."
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus className="h-5 w-5" /> Add Order
              </button>
            }
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-3 py-3">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderFormModal open={modalOpen} onClose={() => setModalOpen(false)} order={editing} />
    </div>
  );
}
