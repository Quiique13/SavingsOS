import { categoryLabel, translate, useLanguage } from "../i18n";
import {
  ArrowDownToLine,
  CalendarDays,
  Check,
  LayoutList,
  Pencil,
  Plus,
  Repeat2,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MonthPicker } from "../components/common/MonthPicker";
import { CategoryIcon } from "../components/expenses/CategoryIcon";
import { ExpenseCards } from "../components/expenses/ExpenseCards";
import { ExpenseForm } from "../components/expenses/ExpenseForm";
import { Calendar } from "../components/expenses/PaymentCalendar";
import { PaymentDialog } from "../components/expenses/PaymentDialog";
import { useFinance } from "../hooks/useFinance";
import { type Expense, type Row } from "../types/finance";
import { exportCSV } from "../utils/exportExpenses";
import { dateLabel, getRows, money, monthLabel, today } from "../utils/finance";

export function Expenses() {
  useLanguage();
  const { data, update } = useFinance();
  const [parameters] = useSearchParams();
  const requestedMonth = parameters.get("month");
  const [exportError, setExportError] = useState("");
  const [month, setMonth] = useState(requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today().slice(0, 7));
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);
  const [tab, setTab] = useState("All expenses");
  const [status, setStatus] = useState("All statuses");
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("");
  const [filters, setFilters] = useState(false);
  const [view, setView] = useState("list");
  const activeFilters = Number(Boolean(account)) + Number(status !== "All statuses");
  const rows = getRows(data, month);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.paidDate);
  const paidTotal = paid.reduce((s, r) => s + r.amount, 0);
  const filtered = rows.filter(
    (r) =>
      (tab === "All expenses" ||
        (tab === "Recurring"
          ? r.frequency !== "once"
          : r.frequency === "once")) &&
      (status === "All statuses" ||
        (status === "Unpaid" ? !r.paidDate : r.status === status)) &&
      (!account || r.accountId === account) &&
      (r.name + " " + r.category + " " + categoryLabel(r.category)).toLowerCase().includes(search.toLowerCase()),
  );
  function togglePaid(row: Row) {
    if (row.paidDate)
      update((d) => {
        const payments = { ...d.payments };
        delete payments[row.key];
        return { ...d, payments };
      });
    else setPaying(row);
  }
  const upcoming = rows.filter((r) => !r.paidDate).slice(0, 3);
  return (
    <section className="expenses-page min-w-0">
      {exportError && <p className="user-error" role="alert">{translate(exportError)}</p>}
      <div className="page-heading">
        <div>
          <h1>{translate("Expenses")}</h1>
          <p>{translate("Track your bills and see what’s left to pay.")}</p>
        </div>
        <div className="expense-heading-actions">
          <MonthPicker month={month} setMonth={setMonth} />
          <button className="button primary" onClick={() => setEditing("new")}>
            <Plus size={17} />{translate("Add expense")}</button>
        </div>
      </div>
      <div className="stats-grid expense-summary">
        <div className="stat-card min-w-0">
          <div className="stat-label">{translate("Planned this month")}</div>
          <div className="stat-value">{money(total)}</div>
          <p>
            {translate("{{count}} expenses planned this month", { count: rows.length })}</p>
        </div>
        <div className="stat-card min-w-0">
          <div className="stat-label">{translate("Paid")}</div>
          <div className="stat-value">
            {money(paidTotal)}
            <span className="stat-tag">
              {total ? Math.round((paidTotal / total) * 100) : 0}%
            </span>
          </div>
          <p>
            {translate("{{paid}} of {{total}} expenses paid", { paid: paid.length, total: rows.length })}</p>
          <div className="progress-track">
            <i
              style={{ width: (total ? (paidTotal / total) * 100 : 0) + "%" }}
            />
          </div>
        </div>
        <div className="stat-card min-w-0">
          <div className="stat-label">{translate("Still to pay")}</div>
          <div className="stat-value">{money(total - paidTotal)}</div>
          <p>
            {translate("{{count}} expenses unpaid", { count: rows.length - paid.length })}</p>
          <div className="stat-bottom">
            <span className="tiny-dot amber-dot" />
            {rows.some((r) => r.status === "Overdue")
              ? rows.filter((r) => r.status === "Overdue").length +
              " " + translate("overdue · review your payments")
              : translate("No overdue payments")}
          </div>
        </div>
      </div>
      <div className="expense-columns grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="panel expense-panel">
          <div className="panel-heading">
            <div>
              <h2>{translate("Your expenses") + " "}<span className="count-badge">{rows.length}</span>
              </h2>
            </div>
            <button
              className="button small secondary"
              onClick={() => { setExportError(""); void exportCSV(filtered, data.accounts).catch(error => setExportError(error instanceof Error ? error.message : "Export failed. Try again.")); }}
            >
              <ArrowDownToLine size={14} />{translate("Export")}</button>
          </div>
          <div className="expense-tabs">
            {["All expenses", "Recurring", "One-time"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {translate(t)}
                {t === "Recurring" && <Repeat2 size={13} />}
              </button>
            ))}
            <div className="view-toggle">
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label={translate("List view")}
                aria-pressed={view === "list"}
              >
                <LayoutList size={16} />
                <span className="ml-1.5 text-xs">{translate("List")}</span>
              </button>
              <button
                className={view === "calendar" ? "active" : ""}
                onClick={() => setView("calendar")}
                aria-label={translate("Calendar view")}
                aria-pressed={view === "calendar"}
              >
                <CalendarDays size={16} />
                <span className="ml-1.5 text-xs">{translate("Calendar")}</span>
              </button>
            </div>
          </div>
          <div className="table-controls grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
            <label className="search-field col-span-2 min-w-0 sm:flex-1">
              <Search size={16} />
              <input
                aria-label={translate("Search expenses")}
                placeholder={translate("Search expenses…")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label={translate("Clear search")} onClick={() => setSearch("")}>
                  <X size={13} />
                </button>
              )}
            </label>
            <select
              aria-label={translate("Payment status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["All statuses", "Paid", "Unpaid", "Upcoming", "Overdue"].map(
                (s) => (
                  <option key={s} value={s}>{translate(s)}</option>
                ),
              )}
            </select>
            <button
              className={"button small secondary " + (filters ? "pressed" : "")}
              aria-expanded={filters}
              aria-controls="expense-filters"
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={14} />
              <span>{translate("Filters")}{activeFilters ? ` (${activeFilters})` : ""}</span>
            </button>
          </div>
          {filters && (
            <div id="expense-filters" className="filter-row">
              <label>{translate("Account")}<select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                >
                  <option value="">{translate("All accounts")}</option>
                  {data.accounts.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setAccount("");
                  setStatus("All statuses");
                  setSearch("");
                }}
              >{translate("Reset filters")}</button>
            </div>
          )}
          {view === "list" ? (
            <>
              <div className="table-scroll hidden md:block">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>{translate("Expense")}</th>
                      <th>{translate("Account")}</th>
                      <th>{translate("Due date")}</th>
                      <th>{translate("Amount")}</th>
                      <th>{translate("Status")}</th>
                      <th aria-label={translate("Actions")} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <button
                            className="expense-name"
                            onClick={() => setEditing(r)}
                          >
                            <CategoryIcon category={r.category} name={r.name} />
                            <span>
                              <strong>{r.name}</strong>
                              <small>
                                {categoryLabel(r.category)}
                                <span>·</span>
                                {r.frequency === "once"
                                  ? translate("One-time")
                                  : r.frequency === "monthly"
                                    ? translate("Monthly")
                                    : translate("Yearly")}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className="account-pill">
                            <i
                              style={{
                                background: data.accounts.find(
                                  (a) => a.id === r.accountId,
                                )?.color,
                              }}
                            />
                            {data.accounts.find((a) => a.id === r.accountId)
                              ?.name || translate("Archived account")}
                          </span>
                        </td>
                        <td className="due-cell">
                          {dateLabel(r.date)}
                          <small>
                            {r.paidDate
                              ? translate("Paid") + " " + dateLabel(r.paidDate)
                              : r.status === "Overdue"
                                ? translate("Payment overdue")
                                : ""}
                          </small>
                        </td>
                        <td className="amount-cell">{money(r.amount)}</td>
                        <td>
                          <button
                            className={"status-badge " + r.status.toLowerCase()}
                            title={
                              r.paidDate
                                ? translate("Click to mark unpaid")
                                : translate("Record payment")
                            }
                            onClick={() => {
                              if (r.paidDate)
                                update((d) => {
                                  const p = { ...d.payments };
                                  delete p[r.key];
                                  return { ...d, payments: p };
                                });
                              else setPaying(r);
                            }}
                          >
                            {r.paidDate ? (
                              <Check size={12} />
                            ) : (
                              <span className="status-dot" />
                            )}
                            {translate(r.status)}
                          </button>
                        </td>
                        <td>
                          <button
                            className="row-action"
                            aria-label={translate("Edit") + " " + r.name}
                            onClick={() => setEditing(r)}
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ExpenseCards
                rows={filtered}
                accounts={data.accounts}
                onEdit={setEditing}
                onTogglePayment={togglePaid}
              />
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={27} />
                  <h3>
                    {rows.length
                      ? translate("No matching expenses")
                      : translate("No expenses this month")}
                  </h3>
                  <p>
                    {rows.length
                      ? translate("Try another search or change your filters.")
                      : translate("Add an expense to start tracking this month.")}
                  </p>
                  <button
                    className="button secondary small"
                    onClick={() =>
                      rows.length
                        ? (setSearch(""),
                          setStatus("All statuses"),
                          setAccount(""),
                          setTab("All expenses"))
                        : setEditing("new")
                    }
                  >
                    {rows.length ? translate("Clear filters") : translate("Add an expense")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <Calendar
              key={month}
              month={month}
              rows={filtered}
              onSelect={setEditing}
            />
          )}
          <div className="table-footer">
            <span>
              {translate(filtered.length === 1 ? "{{count}} expense" : "{{count}} expenses", { count: filtered.length })} ·{" "}
              {monthLabel(month)}
            </span>
            <span>{translate("Total")}{" "}
              <strong>
                {money(filtered.reduce((s, r) => s + r.amount, 0))}
              </strong>
            </span>
          </div>
        </section>
        <aside className="expense-aside min-w-0">
          <section className="panel upcoming-panel">
            <div className="aside-title">
              <h3>{translate("Next to pay")}</h3>
              <span className="count-badge">{upcoming.length}</span>
            </div>
            {upcoming.length ? (
              upcoming.map((r) => (
                <button
                  className="upcoming-item"
                  key={r.key}
                  onClick={() => setPaying(r)}
                >
                  <div className="date-tile">
                    <small>{dateLabel(r.date, { month: "short" })}</small>
                    <strong>{r.date.slice(8)}</strong>
                  </div>
                  <div>
                    <strong>{r.name}</strong>
                    <small>
                      {data.accounts.find((a) => a.id === r.accountId)?.name}
                    </small>
                  </div>
                  <b>{money(r.amount)}</b>
                </button>
              ))
            ) : (
              <p className="all-clear">
                <Check size={16} />{translate("All taken care of for this month.")}</p>
            )}
          </section>
        </aside>
      </div>
      {editing && (
        <ExpenseForm
          expense={editing === "new" ? undefined : editing}
          month={month}
          onClose={() => setEditing(null)}
        />
      )}
      {paying && <PaymentDialog row={paying} onClose={() => setPaying(null)} />}
    </section>
  );
}
