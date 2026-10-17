import { Settings } from "./Settings";
import { MobileNav } from "./MobileNav";
import { Brand } from "./Brand";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ThemeToggle } from "./theme/ThemeControls";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  Sprout,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  ArrowRight,
  Leaf,
  CircleHelp,
  LogOut,
} from "lucide-react";
import { UsersProvider } from "./data";
import { useUsers } from "./users/context";
import { UserGate, initials } from "./users/Users";
import { useFinance } from "./context";
import { Expenses } from "./Expenses";
import { Dialog } from "./Dialog";
const Overview = lazy(() =>
  import("./Pages").then((module) => ({ default: module.Overview })),
);
const Accounts = lazy(() =>
  import("./Pages").then((module) => ({ default: module.Accounts })),
);
const IncomePage = lazy(() =>
  import("./Pages").then((module) => ({ default: module.IncomePage })),
);
const Insights = lazy(() =>
  import("./Pages").then((module) => ({ default: module.Insights })),
);

const Transfers = lazy(() => import("./Transfers").then(module => ({ default: module.Transfers })));
const AdminPortal = lazy(() =>
  import("./AdminPortal").then((module) => ({ default: module.AdminPortal })),
);
const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/income", label: "Income", icon: ArrowDownLeft },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/savings", label: "Savings & investments", icon: Sprout },
  { to: "/insights", label: "Insights", icon: ChartNoAxesCombined },
];
function Shell() {
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
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
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
    <div className="finance-app">
      <aside
        ref={sidebarRef}
        id="sidebar-navigation"
        aria-label="All pages and user options"
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        className={"sidebar " + (mobile ? "is-open" : "")}
      >
        <Brand onClick={() => setMobile(false)} />
        <button
          className="mobile-close icon-button"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <button
          type="button"
          className="workspace-switch"
          aria-label="Switch user"
          onClick={switchUser}
          disabled={userBusy}
        >
          <span className="workspace-avatar">
            {initials(currentUser!.name)}
          </span>
          <span>
            <strong>{currentUser!.name}</strong>
            <small>
              {currentUser!.hasPassword ? "Password protected" : "Switch user"}
            </small>
          </span>
          <ChevronDown size={13} />
        </button>
        <span className="nav-section-label">YOUR FINANCES</span>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.to === "/expenses" && (
                <span className="nav-count">{data.expenses.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-accounts">
          <span className="nav-section-label">
            YOUR ACCOUNTS{" "}
            <Link to="/accounts" aria-label="Manage accounts">
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
                  ? "Savings"
                  : a.kind === "Subscriptions"
                    ? "Bills"
                    : "Everyday"}
              </span>
            </Link>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <span className="sprout-art">
              <Sprout size={32} />
            </span>
            <strong>A little more intentional.</strong>
            <p>
              A little less money stress.
              <br />
              You've got this.
            </p>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              "nav-link " + (isActive ? "active" : "")
            }
            onClick={() => setMobile(false)}
          >
            <SettingsIcon size={18} />
            Settings
          </NavLink>
          <div className="profile">
            <span className="profile-avatar">
              {initials(currentUser!.name)}
            </span>
            <div>
              <strong>{currentUser!.name}</strong>
              <small>
                {currentUser!.hasPassword
                  ? "Password protected"
                  : "Local user profile"}
              </small>
            </div>
            <button
              type="button"
              className="icon-button profile-signout"
              aria-label={
                currentUser!.hasPassword
                  ? "Lock and switch user"
                  : "Sign out and switch user"
              }
              title="Switch user"
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
          aria-label="Close navigation"
        />
      )}
      <div className="main-shell min-w-0" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
              aria-controls="sidebar-navigation"
              aria-expanded={mobile}
              aria-haspopup="dialog"
            >
              <Menu size={20} />
            </button>
            <Brand className="mobile-brand" />
            <span>{currentUser!.name} · Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <i />
              {error
                ? "Review storage notice"
                : saving
                  ? "Saving…"
                  : ready
                    ? "Saved in the app"
                    : "Loading your records"}
            </span>
            <ThemeToggle />
            <button
              className="icon-button"
              aria-label="About your planner"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={18} />
            </button>
            <Link
              to="/settings"
              className="topbar-avatar"
              aria-label="Open personal settings"
            >
              {initials(currentUser!.name)}
            </Link>
          </div>
        </header>
        <main className="page-content min-w-0">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {!ready ? (
            <div className="loading-state">
              <Leaf size={30} />
              <p>Making room for your finances…</p>
            </div>
          ) : (
            <>
              <div className="workspace-caption">
                <span>
                  <span className="tiny-dot" />A calmer kind of money management
                </span>
                <span>PERSONAL FINANCE, AT YOUR PACE</span>
              </div>
              {demo && (
                <div className="demo-banner">
                  <span>
                    <span className="demo-badge">A LITTLE PREVIEW</span>You're
                    exploring sample expenses. Make this space yours when you're
                    ready.
                  </span>
                  <button onClick={() => setClear(true)}>
                    Start fresh
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <Suspense
                fallback={
                  <div className="loading-state">
                    <Leaf size={28} />
                    <p>Putting your finances in perspective…</p>
                  </div>
                }
              >
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/expenses" replace />}
                  />
                  <Route path="/dashboard" element={<Overview />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/income" element={<IncomePage />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/transfers" element={<Transfers />} />
                  <Route path="/savings" element={<Accounts savings />} />
                  <Route
                    path="/investments"
                    element={<Navigate to="/savings" replace />}
                  />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="*"
                    element={<Navigate to="/expenses" replace />}
                  />
                </Routes>
              </Suspense>
              <footer className="page-footer">
                <span>
                  <Leaf size={13} />A little more clarity. A little more you.
                </span>
                <span>Made for your everyday.</span>
              </footer>
            </>
          )}
        </main>
      </div>
      <MobileNav menuOpen={mobile} onOpenMenu={() => setMobile(true)} />
      {userError && (
        <Dialog
          title="Your changes need attention"
          onClose={() => setUserError("")}
        >
          <div className="planner-form">
            <p className="user-error" role="alert">
              {userError}
            </p>
            <p className="form-intro">
              Your current planner remains open. Export a finance backup from
              Settings before reloading.
            </p>
            <Link
              className="button primary"
              to="/settings"
              onClick={() => setUserError("")}
            >
              Open settings
            </Link>
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog
          title="A calmer place for your money"
          onClose={() => setHelp(false)}
        >
          <div className="planner-form">
            <p>
              Add everyday, monthly, or yearly expenses. Pick a due date and
              account, then click a payment status to record when you paid it.
            </p>
            <p>
              Recurring bills get their own payment record each month. Use the
              calendar to see what's due, and Insights for the annual picture.
            </p>
            <p className="form-intro">
              Accounts are manually tracked. Data is saved in the app; export a
              backup from Settings to keep a separate copy.
            </p>
            <button className="button primary" onClick={() => setHelp(false)}>
              Got it
              <ShieldCheck size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {clear && (
        <Dialog
          title="A fresh start, just for you"
          onClose={() => setClear(false)}
        >
          <div className="planner-form">
            <p>
              Remove the sample expenses and their payment records? Your own
              entries and accounts will be kept.
            </p>
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="button secondary"
                onClick={() => setClear(false)}
              >
                Keep exploring
              </button>
              <button
                className="button primary"
                onClick={() => {
                  clearDemo();
                  setClear(false);
                }}
              >
                Remove samples
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
export function PlannerRoutes() {
  return (
    <Suspense
      fallback={
        <div className="loading-state">
          <p>Opening your space…</p>
        </div>
      }
    >
      <Routes>
        <Route path="/admin" element={<AdminPortal />} />
        <Route
          path="*"
          element={
            <UserGate>
              <Shell />
            </UserGate>
          }
        />
      </Routes>
    </Suspense>
  );
}
export default function Planner() {
  return (
    <ThemeProvider>
      <UsersProvider>
        <PlannerRoutes />
      </UsersProvider>
    </ThemeProvider>
  );
}
