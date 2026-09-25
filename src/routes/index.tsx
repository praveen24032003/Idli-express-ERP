import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { CustomersPage } from "../features/customers/CustomersPage";
import { CustomerDetailPage } from "../features/customers/CustomerDetailPage";
import { ProductsPage } from "../features/products/ProductsPage";
import { OrdersPage } from "../features/orders/OrdersPage";
import { TemplatesPage } from "../features/templates/TemplatesPage";
import { ProductionPage } from "../features/production/ProductionPage";
import { LedgerPage } from "../features/ledger/LedgerPage";
import { ReportsPage } from "../features/reports/ReportsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:id", element: <CustomerDetailPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "production", element: <ProductionPage /> },
      { path: "ledger", element: <LedgerPage /> },
      { path: "reports", element: <ReportsPage /> },
    ],
  },
]);
