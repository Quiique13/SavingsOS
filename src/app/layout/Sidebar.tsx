import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  TrendingUp,
  Settings,
  Sparkles,
  SlidersHorizontal,
  ListOrdered,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Expenses", href: "/expenses", icon: ReceiptText },
  { label: "Income", href: "/income", icon: TrendingUp },
  { label: "Insights", href: "/insights", icon: Sparkles },
  { label: "Simulator", href: "/simulator", icon: SlidersHorizontal },
  { label: "Timeline", href: "/timeline", icon: ListOrdered },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-[var(--app-border)] bg-[var(--app-surface)] p-4 md:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold">SavingsOS</h1>

        <p className="text-sm text-[var(--app-muted)]">
          Personal finance system
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]",
                ].join(" ")
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
