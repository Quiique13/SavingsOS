import { translate, useLanguage } from "../../i18n";
import { ArrowDownLeft, LayoutDashboard, Menu, ReceiptText, Settings, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { isDesignTheme } from "../../utils/appearance";
const tabs = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/income", label: "Income", icon: ArrowDownLeft },
  { to: "/accounts", label: "Accounts", icon: Wallet },
];
export function MobileNav({
  menuOpen,
  onOpenMenu,
}: {
  menuOpen: boolean;
  onOpenMenu?: () => void;
}) {
  useLanguage();
  const { uiTheme } = useTheme();
  const studio = isDesignTheme(uiTheme);
  const visibleTabs = studio ? tabs : [...tabs.slice(0, 2), { to: "/settings", label: "Settings", icon: Settings }];
  return (
    <nav
      aria-label={translate("Mobile navigation")}
      inert={menuOpen}
      className={"mobile-nav fixed inset-x-0 bottom-0 z-40 grid border-t border-finance-border bg-finance-surface/95 p-1.5 backdrop-blur-lg md:hidden " + (studio ? "grid-cols-5" : "grid-cols-3")}
    >
      {visibleTabs.map((tab) => (
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
      {studio && <button type="button" className="mobile-nav-item" onClick={onOpenMenu}
        aria-label={translate("More pages and user options")} aria-controls="sidebar-navigation"
        aria-haspopup="dialog" aria-expanded={menuOpen}>
        <Menu size={20} /><span>{translate("More")}</span>
      </button>}
    </nav>
  );
}
