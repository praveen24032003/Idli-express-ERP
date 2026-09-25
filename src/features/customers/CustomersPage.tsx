import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, Pencil, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { useCustomersStore } from "./customers.store";
import { CustomerFormModal } from "./CustomerFormModal";
import type { Customer, CustomerType } from "../../types";
import { CUSTOMER_TYPES } from "../../types";
import { cn } from "../../utils/format";

const TYPE_COLORS: Record<CustomerType, string> = {
  HOTEL: "bg-amber-100 text-amber-800",
  RESTAURANT: "bg-blue-100 text-blue-800",
  CATERING: "bg-purple-100 text-purple-800",
  CORPORATE: "bg-slate-100 text-slate-800",
  RETAIL: "bg-emerald-100 text-emerald-800",
};

export function CustomersPage() {
  const { customers, loading, fetch, setFilters, remove } = useCustomersStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  useEffect(() => {
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setFilters({ search, type: typeFilter || undefined }), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter]);

  const activeCount = useMemo(() => customers.filter((c) => c.active).length, [customers]);

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return;
    try {
      await remove(customer.id);
      toast.success("Customer deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete customer");
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} total • ${activeCount} active`}
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-5 w-5" /> New Customer
          </button>
        }
      />

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:px-6">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, phone, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-56" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        {loading ? (
          <LoadingState label="Loading customers..." />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Try adjusting your search or add a new customer to get started."
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus className="h-5 w-5" /> Add Customer
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <div key={customer.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/customers/${customer.id}`} className="truncate font-semibold text-ink-900 hover:text-brand-700">
                      {customer.name}
                    </Link>
                    <p className="text-xs font-medium text-ink-400">{customer.customerCode}</p>
                  </div>
                  <span className={cn("badge", TYPE_COLORS[customer.customerType])}>{customer.customerType}</span>
                </div>

                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-ink-600">
                  <Phone className="h-4 w-4 text-ink-400" /> {customer.phone}
                </a>

                {(customer.area || customer.route) && (
                  <p className="text-xs text-ink-400">
                    {customer.area}
                    {customer.area && customer.route ? " • " : ""}
                    {customer.route}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-2 pt-2">
                  {!customer.active && <span className="badge bg-red-100 text-red-700">Inactive</span>}
                  <div className="ml-auto flex gap-1">
                    <button
                      className="btn-ghost !min-h-0 !p-2"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(customer);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost !min-h-0 !p-2 text-red-600" aria-label="Delete" onClick={() => handleDelete(customer)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CustomerFormModal open={modalOpen} onClose={() => setModalOpen(false)} customer={editing} />
    </div>
  );
}
