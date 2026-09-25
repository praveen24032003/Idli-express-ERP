import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { useLedgerStore } from "./ledger.store";
import { PaymentFormModal } from "./PaymentFormModal";
import { formatCurrency, formatDate } from "../../utils/format";

export function LedgerPage() {
  const { payments, summary, loading, fetch, fetchSummary, remove } = useLedgerStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void fetch();
    void fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOutstanding = useMemo(() => summary.reduce((sum, s) => sum + s.balance, 0), [summary]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment record?")) return;
    try {
      await remove(id);
      toast.success("Payment record deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete record");
    }
  };

  return (
    <div>
      <PageHeader
        title="Customer Ledger"
        description={`Outstanding: ${formatCurrency(totalOutstanding)}`}
        actions={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-5 w-5" /> Record Payment
          </button>
        }
      />

      <div className="px-4 py-4 sm:px-6">
        <h2 className="mb-3 font-semibold text-ink-800">Outstanding by Customer</h2>
        {summary.filter((s) => s.balance > 0).length === 0 ? (
          <EmptyState title="No outstanding balances" description="All customers are settled." icon={Wallet} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary
              .filter((s) => s.balance > 0)
              .map((s) => (
                <div key={s.customerId} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{s.name}</p>
                    <p className="text-xs text-ink-400">
                      Invoiced {formatCurrency(s.invoiced)} • Paid {formatCurrency(s.paid)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(s.balance)}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <h2 className="mb-3 font-semibold text-ink-800">Payment History</h2>
        {loading ? (
          <LoadingState label="Loading ledger..." />
        ) : payments.length === 0 ? (
          <EmptyState title="No payment records yet" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Paid</th>
                  <th className="px-3 py-3">Balance</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-3 py-3">{formatDate(p.paymentDate)}</td>
                    <td className="px-3 py-3 font-medium">{p.customer?.name}</td>
                    <td className="px-3 py-3">{formatCurrency(p.invoiceAmount)}</td>
                    <td className="px-3 py-3">{formatCurrency(p.paidAmount)}</td>
                    <td className="px-3 py-3 font-semibold text-red-600">{formatCurrency(p.balanceAmount)}</td>
                    <td className="px-3 py-3 text-right">
                      <button className="btn-ghost !min-h-0 !p-2 text-red-600" aria-label="Delete" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaymentFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
