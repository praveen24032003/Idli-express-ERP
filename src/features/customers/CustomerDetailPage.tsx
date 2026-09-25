import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, Wallet } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { customersApi, type CustomerDetail } from "./customers.api";
import { formatCurrency, formatDate } from "../../utils/format";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    customersApi
      .get(id)
      .then((result) => {
        if (!cancelled) setCustomer(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <LoadingState label="Loading customer..." />;
  if (!customer) return <EmptyState title="Customer not found" />;

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.customerCode}
        actions={
          <Link to="/customers" className="btn-secondary">
            <ArrowLeft className="h-5 w-5" /> Back
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-3">
        <div className="card space-y-3 p-4 lg:col-span-1">
          <h2 className="font-semibold text-ink-800">Details</h2>
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <Phone className="h-4 w-4 text-ink-400" /> {customer.phone}
          </p>
          {customer.address && (
            <p className="flex items-center gap-2 text-sm text-ink-600">
              <MapPin className="h-4 w-4 text-ink-400" /> {customer.address}
            </p>
          )}
          <p className="text-sm text-ink-600">
            Area: {customer.area || "—"} &middot; Route: {customer.route || "—"}
          </p>
          {customer.notes && <p className="rounded-lg bg-ink-50 p-3 text-sm text-ink-500">{customer.notes}</p>}
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3">
            <Wallet className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs font-medium text-red-500">Outstanding</p>
              <p className="font-bold text-red-700">{formatCurrency(customer.outstandingAmount)}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-ink-800">Recent Orders</h2>
          {customer.orders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Session</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="border-b border-ink-100 last:border-0">
                      <td className="py-2 pr-3">{formatDate(o.deliveryDate)}</td>
                      <td className="py-2 pr-3">{o.product?.name}</td>
                      <td className="py-2 pr-3">{o.session}</td>
                      <td className="py-2 pr-3">{o.quantity}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(o.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-4 lg:col-span-3">
          <h2 className="mb-3 font-semibold text-ink-800">Payment History</h2>
          {customer.payments.length === 0 ? (
            <EmptyState title="No payment records yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Paid</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.payments.map((p) => (
                    <tr key={p.id} className="border-b border-ink-100 last:border-0">
                      <td className="py-2 pr-3">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 pr-3">{formatCurrency(p.invoiceAmount)}</td>
                      <td className="py-2 pr-3">{formatCurrency(p.paidAmount)}</td>
                      <td className="py-2 text-right font-medium text-red-600">{formatCurrency(p.balanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
