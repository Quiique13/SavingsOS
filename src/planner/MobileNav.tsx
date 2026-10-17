import { NavLink } from "react-router-dom";
import { LayoutDashboard, ReceiptText, Wallet, Menu } from "lucide-react";
const tabs = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/accounts", label: "Accounts", icon: Wallet },
];
export function MobileNav({
  menuOpen,
  onOpenMenu,
}: {
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  return (
    <nav
      aria-label="Mobile navigation"
      inert={menuOpen}
      className="mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-finance-border bg-finance-surface/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium transition-colors " +
            (isActive
              ? "bg-finance-selected text-finance-ink"
              : "text-finance-muted")
          }
        >
          <tab.icon size={20} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
      <button
        type="button"
        className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium text-finance-muted"
        aria-label="More pages and user options"
        aria-expanded={menuOpen}
        aria-controls="sidebar-navigation"
        aria-haspopup="dialog"
        onClick={onOpenMenu}
      >
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}
