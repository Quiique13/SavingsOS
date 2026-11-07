import { translate, useLanguage } from "../../i18n";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings as SettingsIcon,
  ShieldCheck,
  Sprout,
  Wallet,
  X,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useFinance } from "../../hooks/useFinance";
import { useUsers } from "../../hooks/useUsers";
import { initials } from "../../utils/profile";
import { Brand } from "../common/Brand";
import { Dialog } from "../common/Dialog";
import { ThemeToggle } from "../theme/ThemeControls";
import { MobileNav } from "./MobileNav";
const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/income", label: "Income", icon: ArrowDownLeft },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/savings", label: "Savings & investments", icon: Sprout },
  { to: "/insights", label: "Insights", icon: ChartNoAxesCombined },
];
const SIDEBAR_PREFERENCE = "savingsos-sidebar-collapsed";

export function AppLayout() {
  useLanguage();
  const { data, ready, error, clearDemo } = useFinance();
  const { currentUser, busy: userBusy, saving, signOut } = useUsers();
  const [userError, setUserError] = useState("");
  const switchUser = () => {
    setMobile(false);
    void signOut().catch((e) =>
      setUserError(
        e instanceof Error
          ? e.message
          : "Your latest changes could not be saved. Export a backup before switching users.",
      ),
    );
  };
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_PREFERENCE) === "true";
    } catch {
      return false;
    }
  });
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE, String(next));
    } catch {
      // Navigation still works when browser preference storage is unavailable.
    }
  }
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".mobile-close")
      ?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (wide.matches) setMobile(false);
    };
    document.addEventListener("keydown", keyboard);
    wide.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      wide.removeEventListener("change", closeOnDesktop);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobile]);
  const [help, setHelp] = useState(false);
  const [clear, setClear] = useState(false);
  const location = useLocation();
  const page = nav.find((n) => n.to === location.pathname)?.label || "Settings";
  const demo = data.expenses.some((e) => e.demo);
  return (
    <div className={"finance-app" + (collapsed ? " sidebar-collapsed" : "")}>
      <a className="skip-link" href="#main-content">{translate("Skip to content")}</a>
      <aside
        ref={sidebarRef}
        id="sidebar-navigation"
        aria-label={translate("All pages and user options")}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        className={"sidebar " + (mobile ? "is-open" : "")}
      >
        <Brand onClick={() => setMobile(false)} />
        {mobile && (
          <button
            type="button"
            className="mobile-close icon-button md:hidden"
            onClick={() => setMobile(false)}
            aria-label={translate("Close navigation")}
          >
            <X size={20} />
          </button>
        )}
        <span className="nav-section-label">{translate("WORKSPACE")}</span>
        <nav aria-label={translate("Main navigation")}>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              aria-label={translate(n.label)}
              title={translate(n.label)}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <n.icon size={18} aria-hidden="true" />
              <span>{translate(n.label)}</span>
              {n.to === "/expenses" && (
                <span className="nav-count">{data.expenses.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <details className="sidebar-accounts">
          <summary>{translate("Account shortcuts")}</summary>
          <span className="nav-section-label">{translate("YOUR ACCOUNTS")}{" "}
            <Link to="/accounts" aria-label={translate("Manage accounts")}>
              <ArrowUpRight size={13} />
            </Link>
          </span>
          {data.accounts.map((a) => (
            <Link
              to={a.kind === "Savings" ? "/savings" : "/accounts"}
              key={a.id}
              onClick={() => setMobile(false)}
            >
              <i style={{ background: a.color }} />
              {a.name}
              <span>
                {a.kind === "Savings"
                  ? translate("Savings")
                  : a.kind === "Subscriptions"
                    ? translate("Bills")
                    : translate("Everyday")}
              </span>
            </Link>
          ))}
        </details>
        <div className="sidebar-bottom">
          <button className="sidebar-help" onClick={() => setHelp(true)}>
            <span className="sidebar-help-icon">
              <CircleHelp size={19} />
            </span>
            <strong>{translate("A little guidance?")}</strong>
            <span>{translate("Get to know your planner") + " "}<ArrowUpRight size={13} />
            </span>
          </button>
          <NavLink
            to="/settings"
            aria-label={translate("Settings")}
            title={translate("Settings")}
            className={({ isActive }) =>
              "nav-link " + (isActive ? "active" : "")
            }
            onClick={() => setMobile(false)}
          >
            <SettingsIcon size={18} />
            <span>{translate("Settings")}</span>
          </NavLink>
          <div className="profile">
            <span className="profile-avatar">
              {initials(currentUser!.name)}
            </span>
            <div>
              <strong>{currentUser!.name}</strong>
              <small>
                {currentUser!.hasPassword
                  ? translate("Password protected")
                  : translate("Local user profile")}
              </small>
            </div>
            <button
              type="button"
              className="icon-button profile-signout"
              aria-label={
                currentUser!.hasPassword
                  ? translate("Lock and switch user")
                  : translate("Sign out and switch user")
              }
              title={translate("Switch user")}
              disabled={userBusy}
              onClick={switchUser}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-scrim"
          onClick={() => setMobile(false)}
          aria-label={translate("Close navigation")}
        />
      )}
      <div className="main-shell min-w-0" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              type="button"
              className="sidebar-toggle icon-button"
              onClick={toggleSidebar}
              aria-label={
                collapsed ? translate("Expand navigation") : translate("Collapse navigation")
              }
              title={collapsed ? translate("Expand navigation") : translate("Collapse navigation")}
              aria-controls="sidebar-navigation"
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
            <button
              className="mobile-menu icon-button md:hidden"
              onClick={() => setMobile(true)}
              aria-label={translate("Open navigation")}
              aria-controls="sidebar-navigation"
              aria-expanded={mobile}
              aria-haspopup="dialog"
            >
              <Menu size={20} />
            </button>
            <Brand className="mobile-brand" />
            <span>{translate("My workspace")}</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{translate(page)}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <i />
              {error
                ? translate("Review storage notice")
                : saving
                  ? translate("Saving…")
                  : ready
                    ? translate("Saved in the app")
                    : translate("Loading your records")}
            </span>
            <ThemeToggle />
            <button
              className="icon-button"
              aria-label={translate("About your planner")}
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={18} />
            </button>
            <Link
              to="/settings"
              className="topbar-avatar"
              aria-label={translate("Open personal settings")}
            >
              {initials(currentUser!.name)}
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="page-content min-w-0">
          {error && (
            <div className="error-banner" role="alert">
              {translate(error)}
            </div>
          )}
          {!ready ? (
            <div className="loading-state">
              <Leaf size={30} />
              <p>{translate("Loading your workspace…")}</p>
            </div>
          ) : (
            <>
              {demo && (
                <div className="demo-banner">
                  <span>
                    <span className="demo-badge">{translate("Sample data")}</span>{translate("Explore the planner with example expenses.")}</span>
                  <button onClick={() => setClear(true)}>{translate("Start fresh")}<ArrowRight size={14} />
                  </button>
                </div>
              )}
              <Suspense
                fallback={
                  <div className="loading-state">
                    <Leaf size={28} />
                    <p>{translate("Loading page…")}</p>
                  </div>
                }
              >
                <div className="route-view" key={location.pathname}>
                  <Outlet />
                </div>
              </Suspense>
            </>
          )}
        </main>
      </div>
      <MobileNav menuOpen={mobile} onOpenMenu={() => setMobile(true)} />
      {userError && (
        <Dialog
          title={translate("Your changes need attention")}
          onClose={() => setUserError("")}
        >
          <div className="planner-form">
            <p className="user-error" role="alert">
              {translate(userError)}
            </p>
            <p className="form-intro">{translate("Your current planner remains open. Export a finance backup from Settings before reloading.")}</p>
            <Link
              className="button primary"
              to="/settings"
              onClick={() => setUserError("")}
            >{translate("Open settings")}</Link>
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog title={translate("Using your planner")} onClose={() => setHelp(false)}>
          <div className="planner-form">
            <p>{translate("Add everyday, monthly, or yearly expenses. Pick a due date and account, then click a payment status to record when you paid it.")}</p>
            <p>{translate("Recurring bills get their own payment record each month. Use the calendar to see what's due, and Insights for the annual picture.")}</p>
            <p className="form-intro">{translate("Accounts are manually tracked. Data is saved in the app; export a backup from Settings to keep a separate copy.")}</p>
            <button className="button primary" onClick={() => setHelp(false)}>{translate("Got it")}<ShieldCheck size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {clear && (
        <Dialog title={translate("Remove sample expenses?")} onClose={() => setClear(false)}>
          <div className="planner-form">
            <p>{translate("Remove the sample expenses and their payment records? Your own entries and accounts will be kept.")}</p>
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="button secondary"
                onClick={() => setClear(false)}
              >{translate("Keep exploring")}</button>
              <button
                className="button primary"
                onClick={() => {
                  clearDemo();
                  setClear(false);
                }}
              >{translate("Remove samples")}<ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
