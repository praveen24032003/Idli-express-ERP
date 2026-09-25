import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Repeat,
  Factory,
  Wallet,
  FileBarChart,
  Soup,
} from "lucide-react";
import { cn } from "../utils/format";
import { OfflineBanner } from "./OfflineBanner";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/templates", label: "Templates", icon: Repeat },
  { to: "/production", label: "Production", icon: Factory },
  { to: "/ledger", label: "Ledger", icon: Wallet },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

// Primary items shown in the mobile bottom nav (limited to fit the screen).
const MOBILE_NAV_ITEMS = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], NAV_ITEMS[5], NAV_ITEMS[6]];

export function AppShell() {
  return (
    <div className="min-h-screen bg-ink-50">
      <OfflineBanner />
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
          <div className="flex items-center gap-2 px-5 py-5">
            <Soup className="h-7 w-7 text-brand-600" />
            <div>
              <p className="text-base font-bold leading-tight text-ink-900">Idly Express</p>
              <p className="text-xs font-medium text-ink-400">ERP System</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-100",
                    isActive && "bg-brand-50 text-brand-700",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-200 bg-white/95 backdrop-blur md:hidden">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-500",
                isActive && "text-brand-600",
              )
            }
          >
            <item.icon className="h-6 w-6" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
