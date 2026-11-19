import { translate, useLanguage } from "../../i18n";
import type { UITheme } from "../../utils/appearance";

export type PageSkeletonProps = { page?: string; uiTheme?: UITheme; label?: string };

function Line({ kind = "label" }: { kind?: string }) {
  return <span className={`skeleton-block skeleton-${kind}`} />;
}

function Heading({ overview = false, controls = 2 }: { overview?: boolean; controls?: number }) {
  return <div className={`page-heading${overview ? " overview-heading" : ""}`}>
    <div className="skeleton-heading"><Line kind="detail" /><Line kind="title" /><Line kind="subtitle" /></div>
    {controls > 0 && <div className="skeleton-heading-actions">{Array.from({ length: controls }, (_, index) => <Line kind="control" key={index} />)}</div>}
  </div>;
}

function Metrics({ count, dashboard = false }: { count: number; dashboard?: boolean }) {
  return <div className={dashboard ? "dashboard-stats" : "stats-grid skeleton-stats"} style={count === 1 ? { gridTemplateColumns: "1fr" } : undefined} data-skeleton-part="metrics">
    {Array.from({ length: count }, (_, index) => <div className={`${dashboard ? "summary-card" : "stat-card"} skeleton-metric`} key={index}>
      <Line /><Line kind="value" /><Line kind="detail" />
    </div>)}
  </div>;
}

function Records({ cards = false, className = "" }: { cards?: boolean; className?: string }) {
  return <div className={`panel skeleton-records ${className}${cards ? " skeleton-record-cards" : ""}`} data-skeleton-part="records">
    <Line />
    {Array.from({ length: 4 }, (_, index) => <div className="skeleton-row" key={index}>
      <Line kind="avatar" /><div className="skeleton-row-text"><Line /><Line kind="detail" /></div><Line kind="amount" />
    </div>)}
  </div>;
}

function Chart({ donut = false, className = "" }: { donut?: boolean; className?: string }) {
  return <div className={`panel skeleton-chart ${className}`} data-skeleton-part={donut ? "donut" : "chart"}>
    <Line /><Line kind="subtitle" />
    {donut ? <div className="skeleton-donut-layout"><div className="skeleton-block skeleton-ring" /><div className="skeleton-row-text"><Line /><Line /><Line /></div></div> :
      <div className="skeleton-bars">{[45, 72, 58, 90, 64, 80].map((height, index) => <span className="skeleton-block" key={index} style={{ height: `${height}%` }} />)}</div>}
  </div>;
}

function Controls() {
  return <div className="skeleton-controls"><Line kind="control" /><Line kind="control" /><Line kind="control" /></div>;
}

function Preferences({ appearance = false, studio = false }: { appearance?: boolean; studio?: boolean }) {
  return <div className="panel skeleton-preferences" data-skeleton-part={appearance ? "appearance" : "preferences"}>
    <Line /><Line kind="subtitle" />
    {appearance && <div className={`skeleton-theme-options${studio ? " skeleton-theme-buttons" : ""}`}>{[0, 1, 2, 3].map(index => <span className="skeleton-block" key={index} />)}</div>}
    <div className="skeleton-mode-options"><Line kind="control" /><Line kind="control" /></div>
    {studio && appearance && <><Line /><Line kind="input" /><Line /><Line kind="input" /></>}
  </div>;
}

function Simulator() {
  return <div className="panel skeleton-simulator" data-skeleton-part="simulator">
    <div className="skeleton-form"><Line /><Line kind="subtitle" />{[0, 1, 2, 3].map(index => <div key={index}><Line /><Line kind="input" /></div>)}</div>
    <div className="skeleton-estimate"><Line /><Line kind="hero-value" /><Line kind="subtitle" /><Line kind="input" /></div>
  </div>;
}

/** Uses each page's existing responsive grids, so placeholders follow its theme. */
export function PageSkeleton({ page = "/dashboard", uiTheme = "default", label = "Loading your records" }: PageSkeletonProps) {
  useLanguage();
  const path = page.replace(/\/$/, "") || "/dashboard";
  const studio = uiTheme !== "default";
  const concept = uiTheme === "signal-studio" || uiTheme === "paper-ledger";
  let body;
  switch (path) {
    case "/settings":
      body = <><div className="settings-save-bar"><Line kind="subtitle" /><Line kind="control" /></div>
        {studio ? <div className="studio-settings-grid"><Preferences appearance studio /><Preferences /><Preferences /><Preferences /></div> :
          <div className="settings-stack flex w-full min-w-0 flex-col gap-4"><Preferences appearance /><Preferences /><Preferences /><Preferences /></div>}</>;
      break;
    case "/accounts":
    case "/savings":
      body = <>{studio && <div className="studio-account-summary"><div className="panel skeleton-balance"><Line /><Line kind="hero-value" /><Line kind="subtitle" /></div>{path !== "/savings" && <Records />}</div>}
        <div className="skeleton-controls"><Line kind="subtitle" /></div>
        <div className="account-cards full-accounts grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(index => <div className="panel account-card skeleton-account" key={index}><Line kind="avatar" /><Line /><Line kind="detail" /><Line kind="value" /><Line kind="control" /></div>)}
        </div></>;
      break;
    case "/income":
      body = <><Metrics count={studio ? 4 : 1} />{!studio && <Simulator />}<Records />{studio && <div className="studio-income-footer"><Preferences /><Preferences /></div>}</>;
      break;
    case "/expenses":
      body = <><Metrics count={studio ? 4 : 3} /><Controls /><Records cards /></>;
      break;
    case "/transfers":
      body = <><Metrics count={studio ? 4 : 3} /><Controls /><Records /></>;
      break;
    case "/insights":
      body = <><Metrics count={3} /><Chart /><Records /></>;
      break;
    case "/simulator":
      body = <Simulator />;
      break;
    case "/profile":
    case "/admin":
      body = <div className="studio-profile-grid"><Preferences /><Preferences /></div>;
      break;
    default:
      body = <>{concept ? <div className="concept-overview"><div className="concept-statement skeleton-concept-statement"><Line /><Line kind="hero-value" /><Line kind="subtitle" /><div className="skeleton-funding">{[0, 1, 2].map(index => <div key={index}><Line /><Line kind="value" /></div>)}</div></div>
        <div className="concept-ledger">{uiTheme === "signal-studio" && <Chart donut />}<Records /></div></div> : <Metrics count={4} dashboard />}
        <Controls />
        <div className="dashboard-columns">{studio ? <><Chart className="cashflow-panel" /><Records className="bills-panel" /><Chart donut className="flow-payment-progress" /><Chart donut className="spending-panel" /><Records className="dashboard-accounts" /></> : <><div className="dashboard-main"><Chart /><Records /></div><div className="dashboard-aside"><Records /><Chart donut /></div></>}</div>
      </>;
  }
  return <div className="workspace-skeleton" data-skeleton-page={path} data-skeleton-theme={uiTheme} role="status" aria-label={translate(label)}>
    <span className="sr-only">{translate(label)}</span>
    <div className="skeleton-layout" aria-hidden="true"><Heading overview={path === "/dashboard"} controls={path === "/settings" || path === "/profile" || path === "/admin" ? 0 : path === "/simulator" || path === "/insights" || path === "/accounts" || path === "/savings" ? 1 : 2} />{body}</div>
  </div>;
}
