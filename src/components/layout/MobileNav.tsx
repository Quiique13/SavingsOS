import { translate, useLanguage } from "../../i18n";
import { LayoutDashboard, Menu, ReceiptText, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";
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
  useLanguage();
  return (
    <nav
      aria-label={translate("Mobile navigation")}
      inert={menuOpen}
      className="mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-finance-border bg-finance-surface/95 p-1.5 backdrop-blur-lg md:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            "mobile-nav-item flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-[11px] font-medium transition-colors " +
            (isActive
              ? "bg-finance-selected text-finance-accent"
              : "text-finance-muted")
          }
        >
          <tab.icon size={20} />
          <span>{translate(tab.label)}</span>
        </NavLink>
      ))}
      <button
        type="button"
        className="mobile-nav-item flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-[11px] font-medium text-finance-muted"
        aria-label={translate("More pages and user options")}
        aria-expanded={menuOpen}
        aria-controls="sidebar-navigation"
        aria-haspopup="dialog"
        onClick={onOpenMenu}
      >
        <Menu size={20} />
        <span>{translate("More")}</span>
      </button>
    </nav>
  );
}
