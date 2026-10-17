import { CategoryIcon } from "./CategoryIcon";
export { CategoryIcon } from "./CategoryIcon";
import { ExpenseCards } from "./ExpenseCards";
import { useFinance } from "./context";
import { useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ArrowDownToLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  ArrowUpRight,
  Repeat2,
  LayoutList,
  CalendarDays,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  getRows,
  money,
  today,
  dateLabel,
  monthLabel,
  shiftMonth,
  categories,
  type Expense,
  type Row,
} from "./model";
import { Dialog } from "./Dialog";
export function ExpenseForm({
  expense,
  month,
  onClose,
}: {
  expense?: Expense;
  month: string;
  onClose: () => void;
}) {
  const { data, update } = useFinance();
  const [frequency, setFrequency] = useState<Expense["frequency"]>(
    expense?.frequency ?? "monthly",
  );
  const [deleting, setDeleting] = useState(false);
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const entry: Expense = {
      id: expense?.id ?? crypto.randomUUID(),
      name: String(f.get("name")).trim(),
      amount: Number(f.get("amount")),
      category: String(f.get("category")),
      accountId: String(f.get("account")),
      due: String(f.get("due")),
      frequency,
      notes: String(f.get("notes") || ""),
    };
    if (
      !entry.name ||
      !Number.isFinite(entry.amount) ||
      entry.amount <= 0 ||
      !data.accounts.some((a) => a.id === entry.accountId)
    )
      return;
    update((d) => ({
      ...d,
      expenses: expense
        ? d.expenses.map((e) => (e.id === expense.id ? entry : e))
        : [...d.expenses, entry],
    }));
    onClose();
  }
  function remove() {
    update((d) => ({
      ...d,
      expenses: d.expenses.filter((e) => e.id !== expense!.id),
      payments: Object.fromEntries(
        Object.entries(d.payments).filter(
          ([k]) => !k.startsWith(expense!.id + ":"),
        ),
      ),
    }));
    onClose();
  }
  return (
    <Dialog
      title={expense ? "Edit expense" : "Add an expense"}
      onClose={onClose}
    >
      <form onSubmit={save} className="planner-form">
        <p className="form-intro">
          {expense
            ? "Changes apply to this expense and its recurring schedule."
            : "Make room for everything, from your morning coffee to your annual bills."}
        </p>
        <label>
          Expense name
          <input
            autoFocus
            name="name"
            placeholder="e.g. Spotify Premium"
            defaultValue={expense?.name}
            required
            maxLength={100}
          />
        </label>
        <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            Amount (€)
            <input
              name="amount"
              type="number"
              min="0.01"
              max="999999999"
              step="0.01"
              placeholder="0.00"
              defaultValue={expense?.amount}
              required
            />
          </label>
          <label>
            Category
            <select
              name="category"
              defaultValue={expense?.category || "Subscriptions"}
            >
              {Array.from(
                new Set([
                  ...categories,
                  ...(expense ? [expense.category] : []),
                ]),
              ).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            Pay from
            <select
              required
              name="account"
              defaultValue={
                expense?.accountId ||
                data.accounts.find((a) => a.kind !== "Savings")?.id
              }
            >
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {frequency === "once" ? "Due date" : "First due date"}
            <input
              name="due"
              type="date"
              defaultValue={
                expense?.due ||
                (month === today().slice(0, 7) ? today() : month + "-01")
              }
              required
            />
          </label>
        </div>
        <label>
          Repeat
          <div className="frequency-picker">
            {(["once", "monthly", "yearly"] as const).map((f) => (
              <button
                type="button"
                key={f}
                className={frequency === f ? "selected" : ""}
                onClick={() => setFrequency(f)}
              >
                {f === "once"
                  ? "One-time"
                  : f === "monthly"
                    ? "Every month"
                    : "Every year"}
              </button>
            ))}
          </div>
        </label>
        <label>
          Notes <span className="muted">(optional)</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Anything you'd like to remember…"
            defaultValue={expense?.notes}
          />
        </label>
        {expense && (
          <div className="delete-area">
            {deleting ? (
              <>
                <span>Delete this expense and all its payment history?</span>
                <button type="button" className="danger-link" onClick={remove}>
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setDeleting(false)}
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                className="danger-link"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={14} /> Delete expense
              </button>
            )}
          </div>
        )}
        <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            {expense ? "Save changes" : "Add expense"}
            <Plus size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function PaymentDialog({
  row,
  onClose,
}: {
  row: Row;
  onClose: () => void;
}) {
  const { update } = useFinance();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const date = String(new FormData(e.currentTarget).get("paidDate"));
    update((d) => ({ ...d, payments: { ...d.payments, [row.key]: date } }));
    onClose();
  }
  return (
    <Dialog title="Mark as paid" onClose={onClose}>
      <form className="planner-form" onSubmit={submit}>
        <div className="payment-preview">
          <CategoryIcon category={row.category} name={row.name} />
          <div>
            <strong>{row.name}</strong>
            <p>Due {dateLabel(row.date)}</p>
          </div>
          <strong>{money(row.amount)}</strong>
        </div>
        <label>
          Payment date
          <input
            autoFocus
            name="paidDate"
            type="date"
            defaultValue={today()}
            max={today()}
            required
          />
        </label>
        <p className="form-intro">
          This marks only the payment due on {dateLabel(row.date)} as paid.
        </p>
        <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            <Check size={16} />
            Confirm payment
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function MonthPicker({
  month,
  setMonth,
}: {
  month: string;
  setMonth: (m: string) => void;
}) {
  return (
    <div className="month-picker">
      <button
        aria-label="Previous month"
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        <ChevronLeft size={16} />
      </button>
      <label>
        <CalendarDays size={15} />
        <span>{monthLabel(month)}</span>
        <input
          aria-label="Select month"
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
        <ChevronDown size={13} />
      </label>
      <button
        aria-label="Next month"
        onClick={() => setMonth(shiftMonth(month, 1))}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
function exportCSV(
  rows: Row[],
  accounts: ReturnType<typeof useFinance>["data"]["accounts"],
) {
  const csv = [
    [
      "Expense",
      "Amount EUR",
      "Category",
      "Account",
      "Due date",
      "Frequency",
      "Status",
      "Paid date",
    ],
    ...rows.map((r) => [
      r.name,
      r.amount,
      r.category,
      accounts.find((a) => a.id === r.accountId)?.name || "",
      r.date,
      r.frequency,
      r.status,
      r.paidDate || "",
    ]),
  ]
    .map((row) =>
      row
        .map((v) => {
          const s = String(v);
          return (
            '"' + (/^[=+@\-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
          );
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "savingsos-expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
}
export function Expenses() {
  const { data, update } = useFinance();
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
              onClick={() => exportCSV(filtered, data.accounts)}
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
export function Calendar({
  month,
  rows,
  compact = false,
  onSelect,
}: {
  month: string;
  rows: Row[];
  compact?: boolean;
  onSelect: (r: Row) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const first = new Date(month + "-01T12:00:00");
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const selectedRows = rows.filter((r) => r.date === selected);
  return (
    <section
      className={
        "panel calendar-panel " +
        (compact ? "compact-calendar" : "full-calendar")
      }
    >
      <div className="aside-title">
        <h3>{compact ? "Payment calendar" : monthLabel(month)}</h3>
        <CalendarDays size={15} />
      </div>
      {compact && <p className="calendar-month">{monthLabel(month)}</p>}
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = month + "-" + String(i + 1).padStart(2, "0");
          const bills = rows.filter((r) => r.date === date);
          return (
            <button
              aria-label={dateLabel(date) + " · " + bills.length + " expenses"}
              key={date}
              className={
                (date === today() ? "today " : "") +
                (selected === date ? "selected-day " : "") +
                (bills.length ? "has-bills" : "")
              }
              onClick={() => setSelected(selected === date ? null : date)}
            >
              <span>{i + 1}</span>
              {bills.length > 0 && (
                <i
                  style={{
                    background: bills.every((r) => r.paidDate)
                      ? "#458269"
                      : bills.some((r) => r.status === "Overdue")
                        ? "#c67563"
                        : "#caa66e",
                  }}
                />
              )}
              {!compact &&
                bills.map((r) => <small key={r.key}>{r.name}</small>)}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i style={{ background: "#458269" }} />
          Paid
        </span>
        <span>
          <i style={{ background: "#caa66e" }} />
          Upcoming
        </span>
        <span>
          <i style={{ background: "#c67563" }} />
          Overdue
        </span>
      </div>
      {selected && (
        <div className="calendar-selection">
          <strong>{dateLabel(selected)}</strong>
          {selectedRows.length ? (
            selectedRows.map((r) => (
              <button key={r.key} onClick={() => onSelect(r)}>
                {r.name}
                <b>{money(r.amount)}</b>
              </button>
            ))
          ) : (
            <p>No expenses due. A little breathing room.</p>
          )}
        </div>
      )}
    </section>
  );
}
