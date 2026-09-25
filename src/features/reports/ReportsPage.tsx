import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import {
  reportsApi,
  type CustomerSalesRow,
  type DailySalesRow,
  type OutstandingRow,
  type ProductSalesRow,
  type ProductionReportRow,
} from "./reports.api";
import { exportToCSV, exportToPDF } from "../../utils/export";
import { formatCurrency, todayISO } from "../../utils/format";
import { cn } from "../../utils/format";

type ReportKey = "daily" | "product" | "customer" | "outstanding" | "production";

const REPORT_TABS: { key: ReportKey; label: string }[] = [
  { key: "daily", label: "Daily Sales" },
  { key: "product", label: "Product Sales" },
  { key: "customer", label: "Customer Sales" },
  { key: "outstanding", label: "Outstanding" },
  { key: "production", label: "Production" },
];

function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [active, setActive] = useState<ReportKey>("daily");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayISO().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const [dailySales, setDailySales] = useState<DailySalesRow[]>([]);
  const [productSales, setProductSales] = useState<ProductSalesRow[]>([]);
  const [customerSales, setCustomerSales] = useState<CustomerSalesRow[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingRow[]>([]);
  const [production, setProduction] = useState<ProductionReportRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      if (active === "daily") setDailySales(await reportsApi.dailySales(from, to));
      if (active === "product") setProductSales(await reportsApi.productSales(from, to));
      if (active === "customer") setCustomerSales(await reportsApi.customerSales(from, to));
      if (active === "outstanding") setOutstanding(await reportsApi.outstanding());
      if (active === "production") setProduction(await reportsApi.production(from, to));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from, to]);

  const handleExportCSV = () => {
    if (active === "daily") exportToCSV("daily-sales", dailySales);
    if (active === "product") exportToCSV("product-sales", productSales);
    if (active === "customer") exportToCSV("customer-sales", customerSales);
    if (active === "outstanding") exportToCSV("outstanding", outstanding);
    if (active === "production") exportToCSV("production", production);
  };

  const handleExportPDF = () => {
    if (active === "daily") {
      exportToPDF(
        "Daily Sales Report",
        "daily-sales",
        ["Date", "Orders", "Quantity", "Revenue"],
        dailySales.map((r) => [r.date, r.orders, r.quantity, formatCurrency(r.revenue)]),
      );
    }
    if (active === "product") {
      exportToPDF(
        "Product Sales Report",
        "product-sales",
        ["Product", "Quantity", "Revenue"],
        productSales.map((r) => [r.name, r.quantity, formatCurrency(r.revenue)]),
      );
    }
    if (active === "customer") {
      exportToPDF(
        "Customer Sales Report",
        "customer-sales",
        ["Customer", "Orders", "Revenue"],
        customerSales.map((r) => [r.name, r.orders, formatCurrency(r.revenue)]),
      );
    }
    if (active === "outstanding") {
      exportToPDF(
        "Outstanding Report",
        "outstanding",
        ["Customer", "Invoiced", "Paid", "Balance"],
        outstanding.map((r) => [r.name, formatCurrency(r.invoiced), formatCurrency(r.paid), formatCurrency(r.balance)]),
      );
    }
    if (active === "production") {
      exportToPDF(
        "Production Report",
        "production",
        ["Date", "Product", "Session", "Required", "Produced", "Variance"],
        production.map((r) => [r.date, r.product, r.session, r.requiredQuantity, r.producedQuantity, r.variance]),
      );
    }
  };

  const isEmpty =
    (active === "daily" && dailySales.length === 0) ||
    (active === "product" && productSales.length === 0) ||
    (active === "customer" && customerSales.length === 0) ||
    (active === "outstanding" && outstanding.length === 0) ||
    (active === "production" && production.length === 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, customer, outstanding, and production reports"
        actions={
          <>
            <button className="btn-secondary" onClick={handleExportCSV}>
              <Download className="h-5 w-5" /> CSV
            </button>
            <button className="btn-secondary" onClick={handleExportPDF}>
              <FileText className="h-5 w-5" /> PDF
            </button>
          </>
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pt-4 sm:px-6">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold",
              active === tab.key ? "bg-brand-600 text-white" : "bg-white text-ink-600 border border-ink-200",
            )}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active !== "outstanding" && (
        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:w-96 sm:px-6">
          <div>
            <label className="label" htmlFor="from">
              From
            </label>
            <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="to">
              To
            </label>
            <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}

      <div className="px-4 pb-6 sm:px-6">
        {loading ? (
          <LoadingState label="Loading report..." />
        ) : isEmpty ? (
          <EmptyState title="No data for this period" />
        ) : (
          <div className="card overflow-x-auto">
            {active === "daily" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Orders</th>
                    <th className="px-3 py-3">Quantity</th>
                    <th className="px-3 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.map((r) => (
                    <tr key={r.date} className="border-b border-ink-100 last:border-0">
                      <td className="px-3 py-3">{r.date}</td>
                      <td className="px-3 py-3">{r.orders}</td>
                      <td className="px-3 py-3">{r.quantity}</td>
                      <td className="px-3 py-3 font-semibold">{formatCurrency(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {active === "product" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Quantity</th>
                    <th className="px-3 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {productSales.map((r) => (
                    <tr key={r.productId} className="border-b border-ink-100 last:border-0">
                      <td className="px-3 py-3 font-medium">{r.name}</td>
                      <td className="px-3 py-3">{r.quantity}</td>
                      <td className="px-3 py-3 font-semibold">{formatCurrency(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {active === "customer" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Orders</th>
                    <th className="px-3 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSales.map((r) => (
                    <tr key={r.customerId} className="border-b border-ink-100 last:border-0">
                      <td className="px-3 py-3 font-medium">{r.name}</td>
                      <td className="px-3 py-3">{r.orders}</td>
                      <td className="px-3 py-3 font-semibold">{formatCurrency(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {active === "outstanding" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Invoiced</th>
                    <th className="px-3 py-3">Paid</th>
                    <th className="px-3 py-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map((r) => (
                    <tr key={r.customerId} className="border-b border-ink-100 last:border-0">
                      <td className="px-3 py-3 font-medium">{r.name}</td>
                      <td className="px-3 py-3">{formatCurrency(r.invoiced)}</td>
                      <td className="px-3 py-3">{formatCurrency(r.paid)}</td>
                      <td className="px-3 py-3 font-semibold text-red-600">{formatCurrency(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {active === "production" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Session</th>
                    <th className="px-3 py-3">Required</th>
                    <th className="px-3 py-3">Produced</th>
                    <th className="px-3 py-3">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {production.map((r, i) => (
                    <tr key={`${r.date}-${r.product}-${r.session}-${i}`} className="border-b border-ink-100 last:border-0">
                      <td className="px-3 py-3">{r.date}</td>
                      <td className="px-3 py-3 font-medium">{r.product}</td>
                      <td className="px-3 py-3">{r.session}</td>
                      <td className="px-3 py-3">{r.requiredQuantity}</td>
                      <td className="px-3 py-3">{r.producedQuantity}</td>
                      <td className={cn("px-3 py-3 font-semibold", r.variance >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {r.variance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
