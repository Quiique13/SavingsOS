import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  Sparkles,
  ListOrdered,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Expenses", href: "/expenses", icon: ReceiptText },
  { label: "Income", href: "/income", icon: TrendingUp },
  { label: "Insights", href: "/insights", icon: Sparkles },
  { label: "Timeline", href: "/timeline", icon: ListOrdered },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--app-border)] bg-[var(--app-surface)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center gap-1 px-2 py-3 text-[11px]",
                  isActive ? "text-blue-500" : "text-[var(--app-muted)]",
                ].join(" ")
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
