import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, ReceiptText, TrendingUp } from "lucide-react";
import { Settings } from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: Wallet,
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: ReceiptText,
  },
  {
    label: "Income",
    href: "/income",
    icon: TrendingUp,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-white/10 bg-zinc-900/60 p-4 md:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold">SavingsOS</h1>
        <p className="text-sm text-zinc-400">Personal finance system</p>
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
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
