import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  TrendingUp,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Expenses", href: "/expenses", icon: ReceiptText },
  { label: "Income", href: "/income", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/95 backdrop-blur md:hidden">
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
                  isActive ? "text-white" : "text-zinc-500",
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
