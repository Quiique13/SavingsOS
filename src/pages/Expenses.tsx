import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  LayoutList,
  Pencil,
  Plus,
  Repeat2,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useState } from "react";
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
  const { data, update } = useFinance();
  const [exportError, setExportError] = useState("");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);
  const [tab, setTab] = useState("All expenses");
  const [status, setStatus] = useState("All statuses");
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("");
  const [filters, setFilters] = useState(false);
  const [view, setView] = useState("list");
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
      (r.name + " " + r.category).toLowerCase().includes(search.toLowerCase()),
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
      {exportError && <p className="user-error" role="alert">{exportError}</p>}
      <div className="page-heading flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="page-kicker">A LITTLE CLARITY GOES A LONG WAY</div>
          <h1>
            Expenses<span className="heading-dot">.</span>
          </h1>
          <p>Every bill, every little thing. All in one place.</p>
        </div>
        <button className="button primary" onClick={() => setEditing("new")}>
          <Plus size={17} />
          Add expense
        </button>
      </div>
      <div className="page-toolbar flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="period-label">
          <span className="live-dot" />
          Your month at a glance
        </div>
        <MonthPicker month={month} setMonth={setMonth} />
      </div>
      <div className="stats-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Total expenses
            <span className="stat-icon">
              <LayoutList size={16} />
            </span>
          </div>
          <div className="stat-value">{money(total)}</div>
          <p>
            <span>{rows.length} expenses</span> planned this month
          </p>
          <div className="mini-bars">
            {Array.from({ length: 27 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: 10 + ((i * 17) % 31),
                  background: i > 19 ? "#dcebe2" : "#accbb9",
                }}
              />
            ))}
          </div>
        </div>
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Already paid
            <span className="stat-icon green">
              <Check size={16} />
            </span>
          </div>
          <div className="stat-value">
            {money(paidTotal)}
            <span className="stat-tag">
              {total ? Math.round((paidTotal / total) * 100) : 0}%
            </span>
          </div>
          <p>
            <span>
              {paid.length} of {rows.length} expenses
            </span>{" "}
            taken care of
          </p>
          <div className="progress-track">
            <i
              style={{ width: (total ? (paidTotal / total) * 100 : 0) + "%" }}
            />
          </div>
        </div>
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Left to pay
            <span className="stat-icon amber">
              <Circle size={15} />
            </span>
          </div>
          <div className="stat-value">{money(total - paidTotal)}</div>
          <p>
            <span>{rows.length - paid.length} expenses</span> still on the
            horizon
          </p>
          <div className="stat-bottom">
            <span className="tiny-dot amber-dot" />
            {rows.some((r) => r.status === "Overdue")
              ? rows.filter((r) => r.status === "Overdue").length +
              " overdue · review your payments"
              : "A little planning, a lot less stress."}
          </div>
        </div>
      </div>
      <div className="expense-columns grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <section className="panel expense-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Your expenses <span className="count-badge">{rows.length}</span>
              </h2>
              <p>Small details. A clearer bigger picture.</p>
            </div>
            <button
              className="button small secondary"
              onClick={() => { setExportError(""); void exportCSV(filtered, data.accounts).catch(error => setExportError(error instanceof Error ? error.message : "Export failed. Try again.")); }}
            >
              <ArrowDownToLine size={14} />
              Export
            </button>
          </div>
          <div className="expense-tabs">
            {["All expenses", "Recurring", "One-time"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
                {t === "Recurring" && <Repeat2 size={13} />}
              </button>
            ))}
            <div className="view-toggle">
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <LayoutList size={16} />
                <span className="ml-1.5 text-xs md:hidden">List</span>
              </button>
              <button
                className={view === "calendar" ? "active" : ""}
                onClick={() => setView("calendar")}
                aria-label="Calendar view"
              >
                <CalendarDays size={16} />
                <span className="ml-1.5 text-xs md:hidden">Calendar</span>
              </button>
            </div>
          </div>
          <div className="table-controls grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
            <label className="search-field col-span-2 min-w-0 sm:flex-1">
              <Search size={16} />
              <input
                aria-label="Search expenses"
                placeholder="Search expenses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={13} />
                </button>
              )}
            </label>
            <select
              aria-label="Payment status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["All statuses", "Paid", "Unpaid", "Upcoming", "Overdue"].map(
                (s) => (
                  <option key={s}>{s}</option>
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
              <span>Filters</span>
              {account && <span className="tiny-dot" />}
            </button>
          </div>
          {filters && (
            <div id="expense-filters" className="filter-row">
              <label>
                Account
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                >
                  <option value="">All accounts</option>
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
              >
                Reset filters
              </button>
            </div>
          )}
          {view === "list" ? (
            <>
              <div className="table-scroll hidden md:block">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Expense</th>
                      <th>Account</th>
                      <th>Due date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
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
                                {r.category}
                                <span>·</span>
                                {r.frequency === "once"
                                  ? "One-time"
                                  : r.frequency === "monthly"
                                    ? "Monthly"
                                    : "Yearly"}
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
                              ?.name || "Archived account"}
                          </span>
                        </td>
                        <td className="due-cell">
                          {dateLabel(r.date)}
                          <small>
                            {r.paidDate
                              ? "Paid " + dateLabel(r.paidDate)
                              : r.status === "Overdue"
                                ? "Payment overdue"
                                : ""}
                          </small>
                        </td>
                        <td className="amount-cell">{money(r.amount)}</td>
                        <td>
                          <button
                            className={"status-badge " + r.status.toLowerCase()}
                            title={
                              r.paidDate
                                ? "Click to mark unpaid"
                                : "Record payment"
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
                            {r.status}
                          </button>
                        </td>
                        <td>
                          <button
                            className="row-action"
                            aria-label={"Edit " + r.name}
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
                      ? "No matching expenses"
                      : "A fresh start for your month"}
                  </h3>
                  <p>
                    {rows.length
                      ? "Try another search or change your filters."
                      : "Add your first expense and give every euro a place."}
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
                    {rows.length ? "Clear filters" : "Add an expense"}
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
              {filtered.length} expense{filtered.length !== 1 ? "s" : ""} ·{" "}
              {monthLabel(month)}
            </span>
            <span>
              Total{" "}
              <strong>
                {money(filtered.reduce((s, r) => s + r.amount, 0))}
              </strong>
            </span>
          </div>
        </section>
        <aside className="expense-aside grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Calendar
            key={month}
            month={month}
            rows={rows}
            compact
            onSelect={setEditing}
          />
          <section className="panel upcoming-panel">
            <div className="aside-title">
              <h3>Coming up next</h3>
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
                <Check size={16} />
                All taken care of for this month.
              </p>
            )}
            <div className="aside-note">
              <span className="tiny-dot" />A clear month starts with a little
              plan.
            </div>
          </section>
          <section className="tip-card">
            <span className="tip-icon">
              <Repeat2 size={18} />
            </span>
            <span className="eyebrow">LESS TO REMEMBER</span>
            <h3>
              Set it. Track it.
              <br />
              Breathe a little easier.
            </h3>
            <p>
              Recurring expenses show up every month, so nothing slips through.
            </p>
            <button
              onClick={() => {
                setTab("Recurring");
                setView("list");
              }}
            >
              View recurring expenses
              <ArrowUpRight size={15} />
            </button>
            <div className="tip-art">
              <div />
              <div />
              <div />
              <span>↗</span>
            </div>
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
