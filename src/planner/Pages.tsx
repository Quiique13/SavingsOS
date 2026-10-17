import { AccountActivity } from "./AccountActivity";
import { TransferForm, TransferList } from "./Transfers";
import type { Transfer } from "./model";
import { PageHeading } from "./PageHeading";
export { PageHeading } from "./PageHeading";
export { Settings } from "./Settings";
import { useFinance } from "./context";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowLeftRight,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  TrendingUp,
  Check,
  Pencil,
  CircleHelp,
  ReceiptText,
  ArrowRight,
  Landmark,
  Trash2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getRows,
  money,
  today,
  dateLabel,
  monthLabel,
  categoryColors,
  type Account,
  type Income,
} from "./model";
import { Dialog } from "./Dialog";
import {
  CategoryIcon,
  ExpenseForm,
  MonthPicker,
  PaymentDialog,
} from "./Expenses";
import type { Row } from "./model";
export function Overview() {
  const { data } = useFinance();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Transfer | "new" | null>(null);
  const [transferMessage, setTransferMessage] = useState("");
  const transfers = (data.transfers ?? []).filter(transfer => transfer.date.startsWith(month)).slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
  const [paying, setPaying] = useState<Row | null>(null);
  const rows = getRows(data, month);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.paidDate).reduce((s, r) => s + r.amount, 0);
  const income = data.income
    .filter((i) => i.date.startsWith(month))
    .reduce((s, i) => s + i.amount, 0);
  const spending = Object.entries(categoryColors)
    .map(([name, color]) => ({
      name,
      color,
      value: rows
        .filter((r) => r.category === name)
        .reduce((s, r) => s + r.amount, 0),
    }))
    .filter((c) => c.value > 0);
  const other = rows
    .filter((r) => !categoryColors[r.category])
    .reduce((s, r) => s + r.amount, 0);
  if (other)
    spending.push({ name: "Other categories", color: "#a3b1a8", value: other });
  return (
    <section className="overview-page min-w-0">
      <PageHeading
        kicker="A GOOD DAY TO FEEL IN CONTROL"
        title="Your money, at a glance"
        description="A little perspective on where you are and where you're going."
      >
        <div className="page-actions flex flex-col gap-2 sm:flex-row"><button className="button secondary" onClick={() => { setTransferMessage(""); setMoving("new"); }}><ArrowLeftRight size={16}/>Move money</button><button className="button primary" onClick={() => setAdding(true)}><Plus size={17}/>Add expense</button></div>
      </PageHeading>
      {transferMessage && <p className="transfer-message" role="status">{transferMessage}</p>}
      <div className="page-toolbar flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="period-label">
          <span className="live-dot" />
          Your personal finance home
        </span>
        <MonthPicker month={month} setMonth={setMonth} />
      </div>
      <div className="stats-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Income this month
            <TrendingUp size={17} />
          </div>
          <div className="stat-value">{money(income)}</div>
          <p>
            {data.income.filter((i) => i.date.startsWith(month)).length} income
            entries recorded
          </p>
          <Link className="stat-link" to="/income">
            Manage income
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Planned expenses
            <ReceiptText size={17} />
          </div>
          <div className="stat-value">{money(total)}</div>
          <p>
            {money(paid)} paid · {money(total - paid)} remaining
          </p>
          <div className="progress-track">
            <i style={{ width: (total ? (paid / total) * 100 : 0) + "%" }} />
          </div>
        </div>
        <div className="stat-card soft-green">
          <div className="stat-label">
            After planned expenses
            <Wallet size={17} />
          </div>
          <div className="stat-value">{money(income - total)}</div>
          <p>Recorded income minus all bills for this month</p>
          <span className="stat-bottom">A plan for every euro.</span>
        </div>
      </div>
      <div className="overview-grid grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Where your money goes</h2>
              <p>Your planned expenses by category</p>
            </div>
            <Link className="text-button" to="/insights">
              Insights
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="spending-visual">
            {spending.length ? (
              <>
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height={245}>
                    <PieChart>
                      <Pie
                        data={spending}
                        dataKey="value"
                        innerRadius={76}
                        outerRadius={101}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {spending.map((c) => (
                          <Cell key={c.name} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => money(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <small>Total planned</small>
                    <strong>{money(total)}</strong>
                  </div>
                </div>
                <div className="category-legend">
                  {spending.map((c) => (
                    <div key={c.name}>
                      <span>
                        <i style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <strong>{money(c.value)}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <ReceiptText size={28} />
                <h3>Your month is a blank canvas</h3>
                <p>Add expenses to see your spending breakdown.</p>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Next on your list</h2>
              <p>A little heads-up for upcoming payments</p>
            </div>
            <Link className="text-button" to="/expenses">
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="overview-bills">
            {rows
              .filter((r) => !r.paidDate)
              .slice(0, 5)
              .map((r) => (
                <button key={r.key} onClick={() => setPaying(r)}>
                  <CategoryIcon category={r.category} name={r.name} />
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {dateLabel(r.date)} · {r.status}
                    </small>
                  </span>
                  <b>{money(r.amount)}</b>
                  <ArrowRight size={15} />
                </button>
              ))}
            {!rows.some((r) => !r.paidDate) && (
              <div className="empty-state">
                <Check size={28} />
                <h3>All caught up</h3>
                <p>No outstanding payments this month.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <AccountActivity month={month}/>
      <section className="panel overview-transfer-history"><div className="panel-heading"><div><h2>Money moved between accounts</h2><p>Internal transfers in {monthLabel(month)}</p></div><Link to={"/transfers?month=" + month} className="text-button">All transfers<ArrowUpRight size={15}/></Link></div><TransferList transfers={transfers.slice(0, 5)} onEdit={setMoving}/></section>
      {moving && <TransferForm transfer={moving === "new" ? undefined : moving} onClose={() => setMoving(null)} onSaved={value => { setMonth(value); setMoving(null); setTransferMessage("Transfer history and recorded balances saved."); }}/>}
      {adding && <ExpenseForm month={month} onClose={() => setAdding(false)} />}
      {paying && <PaymentDialog row={paying} onClose={() => setPaying(null)} />}
    </section>
  );
}
export function Accounts({ savings = false }: { savings?: boolean }) {
  const { data, update } = useFinance();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [moving, setMoving] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [remove, setRemove] = useState(false);
  const list = data.accounts.filter((a) => !savings || a.kind === "Savings");
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a: Account = {
      id: editing !== "new" && editing ? editing.id : crypto.randomUUID(),
      name: String(f.get("name")).trim(),
      provider: String(f.get("provider")).trim(),
      balance: Number(f.get("balance")),
      kind: String(f.get("kind")) as Account["kind"],
      color: editing !== "new" && editing ? editing.color : "#a4c8b7",
    };
    if (!a.name || !Number.isFinite(a.balance)) return;
    update((d) => ({
      ...d,
      accounts:
        editing === "new"
          ? [...d.accounts, a]
          : d.accounts.map((item) => (item.id === a.id ? a : item)),
    }));
    setEditing(null);
  }
  const actual = editing && editing !== "new" ? editing : null;
  return (
    <section
      className={
        savings ? "accounts-page savings-page min-w-0" : "accounts-page min-w-0"
      }
    >
      <PageHeading
        kicker={
          savings
            ? "A LITTLE TODAY. MORE POSSIBILITIES TOMORROW."
            : "DIFFERENT ACCOUNTS. ONE CLEAR PICTURE."
        }
        title={savings ? "Savings & investments" : "Your accounts"}
        description={
          savings
            ? "Keep an eye on the money you're setting aside."
            : "Bleap for the everyday. moey! for the regulars. Trading 212 for the future."
        }
      >
        <div className="page-actions flex flex-col gap-2 sm:flex-row"><button className="button secondary" onClick={() => { setTransferMessage(""); setMoving(true); }}><ArrowLeftRight size={16}/>Move money</button><button
          className="button primary"
          onClick={() => {
            setEditing("new");
            setRemove(false);
          }}
        >
          <Plus size={16} />
          Add {savings ? "savings account" : "account"}
        </button></div>
      </PageHeading>
      {transferMessage && <p className="transfer-message" role="status">{transferMessage}</p>}
      <div className="account-notice">
        <ShieldCheck size={17} />
        <span>
          Manually tracked · Transfers update both recorded balances. Set a fresh
          balance snapshot whenever you check your bank.
        </span>
      </div>
      <div className="account-cards full-accounts grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <section
            className={
              "panel account-card " +
              (a.kind === "Savings" ? "savings-card" : "")
            }
            key={a.id}
          >
            <div className="account-card-head">
              <div className="account-logo" style={{ background: a.color }}>
                {a.name === "Trading 212"
                  ? "212"
                  : a.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="account-type">{a.kind}</span>
              <button
                className="icon-button"
                aria-label={"Edit " + a.name}
                onClick={() => {
                  setEditing(a);
                  setRemove(false);
                }}
              >
                <Pencil size={16} />
              </button>
            </div>
            <h2>{a.name}</h2>
            <p>{a.provider}</p>
            <span className="eyebrow">RECORDED BALANCE</span>
            <div className="account-balance">{money(a.balance)}</div>
            <div className="account-card-footer">
              <span>EUR · Manual tracking</span>
              <button
                onClick={() => {
                  setEditing(a);
                  setRemove(false);
                }}
              >
                Update balance
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
        ))}
      </div>
      {!list.length && (
        <div className="panel empty-state">
          <Landmark size={30} />
          <h3>Make a little room for the future</h3>
          <p>Add a savings account to track your progress.</p>
        </div>
      )}
      <section className="panel account-explainer">
        <div className="tip-icon">
          <CircleHelp size={21} />
        </div>
        <div>
          <h3>Everything has its place</h3>
          <p>
            {savings
              ? "Update your reported balance whenever you check Trading 212. This keeps your savings overview current without assuming investment returns."
              : "Assign an account to each expense to see which balance needs to cover it. Payment tracking and reported balances are separate, so enter your latest bank balance whenever you need a fresh snapshot."}
          </p>
        </div>
        <Link
          to={savings ? "/accounts" : "/expenses"}
          className="button secondary small"
        >
          {savings ? "All accounts" : "See expenses"}
          <ArrowUpRight size={15} />
        </Link>
      </section>
      {moving && <TransferForm onClose={() => setMoving(false)} onSaved={() => { setMoving(false); setTransferMessage("Transfer history and recorded balances saved."); }}/>}
      {editing && (
        <Dialog
          title={editing === "new" ? "Add an account" : "Update account"}
          onClose={() => setEditing(null)}
        >
          <form className="planner-form" onSubmit={save}>
            <label>
              Account name
              <input
                autoFocus
                name="name"
                defaultValue={actual?.name}
                placeholder="e.g. Trading 212"
                required
                maxLength={80}
              />
            </label>
            <label>
              Description
              <input
                name="provider"
                defaultValue={actual?.provider}
                placeholder="What do you use it for?"
                maxLength={120}
              />
            </label>
            <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                Purpose
                <select
                  name="kind"
                  defaultValue={
                    actual?.kind || (savings ? "Savings" : "Spending")
                  }
                >
                  {["Spending", "Subscriptions", "Savings"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Reported balance (€)
                <input
                  type="number"
                  step="0.01"
                  name="balance"
                  defaultValue={actual?.balance ?? 0}
                  required
                />
              </label>
            </div>
            <p className="form-intro">
              Enter your current balance as a snapshot. Recording a bill payment
              doesn't change this number. Transfers adjust both recorded balances.
            </p>
            {actual &&
              (data.accounts.length === 1 ||
              data.expenses.some((e) => e.accountId === actual.id) ||
              data.income.some((i) => i.accountId === actual.id) ||
              (data.transfers ?? []).some(transfer => transfer.fromAccountId === actual.id || transfer.toAccountId === actual.id) ? (
                <p className="form-intro">
                  Keep at least one account, and reassign its expenses and
                  income before removing it. Accounts linked to transfer history
                  must be kept until those transfers are reassigned or reversed.
                </p>
              ) : (
                <div className="delete-area">
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() =>
                      remove
                        ? (update((d) => ({
                            ...d,
                            accounts: d.accounts.filter(
                              (a) => a.id !== actual.id,
                            ),
                          })),
                          setEditing(null))
                        : setRemove(true)
                    }
                  >
                    <Trash2 size={14} />
                    {remove ? "Confirm remove account" : "Remove account"}
                  </button>
                </div>
              ))}
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button primary">
                Save account
                <Check size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
export function IncomePage() {
  const { data, save: saveData } = useFinance();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [editing, setEditing] = useState<Income | "new" | null>(null);
  const [savingIncome, setSavingIncome] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [message, setMessage] = useState("");
  const [draftId, setDraftId] = useState("");
  const latestIncomeMonth = data.income.reduce((latest, entry) => entry.date.slice(0, 7) > latest ? entry.date.slice(0, 7) : latest, "");
  function openIncome(entry: Income | "new") {
    setDraftId(entry === "new" ? crypto.randomUUID() : entry.id);
    setSaveError(""); setMessage(""); setEditing(entry);
  }
  const rows = data.income
    .filter((i) => i.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingIncome) return;
    setSaveError("");
    const f = new FormData(e.currentTarget);
    const item: Income = {
      id: editing && editing !== "new" ? editing.id : draftId,
      name: String(f.get("name")).trim(),
      amount: Number(f.get("amount")),
      date: String(f.get("date")),
      accountId: String(f.get("account")),
    };
    if (!item.name || item.amount <= 0 || !Number.isFinite(item.amount)) {
      setSaveError("Enter an income source and an amount greater than zero."); return;
    }
    setSavingIncome(true);
    try {
      await saveData(d => ({ ...d, income: d.income.some(entry => entry.id === item.id) ? d.income.map(entry => entry.id === item.id ? item : entry) : [...d.income, item] }));
      setMonth(item.date.slice(0, 7));
      setMessage(item.name + " saved for " + monthLabel(item.date.slice(0, 7)) + ".");
      setEditing(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This income could not be saved. Your form is still here; try again.");
    } finally { setSavingIncome(false); }
  }
  async function removeIncome() {
    if (!editing || editing === "new" || savingIncome) return;
    setSaveError(""); setSavingIncome(true);
    try {
      await saveData(d => ({ ...d, income: d.income.filter(entry => entry.id !== editing.id) }));
      setMessage(editing.name + " deleted."); setEditing(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This income could not be deleted. Try again.");
    } finally { setSavingIncome(false); }
  }
  const item = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="income-page min-w-0">
      <PageHeading
        kicker="KEEP TRACK OF WHAT COMES IN"
        title="Income"
        description="Your salary, side projects, and every little extra."
      >
        <button className="button primary" onClick={() => openIncome("new")}>
          <Plus size={16} />
          Add income
        </button>
      </PageHeading>
      {message && <p className="income-save-message mb-4 rounded-lg border border-finance-border bg-finance-selected px-4 py-3 text-sm text-finance-ink" role="status">{message}</p>}
      <div className="page-toolbar flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="period-label">Your income this month</span>
        <MonthPicker month={month} setMonth={setMonth} />
      </div>
      <div className="stat-card income-stat">
        <div className="stat-label">
          Total received
          <TrendingUp size={18} />
        </div>
        <div className="stat-value">
          {money(rows.reduce((s, i) => s + i.amount, 0))}
        </div>
        <p>
          {rows.length} income entries in {monthLabel(month)}
        </p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Money coming in</h2>
            <p>A record of every income source</p>
          </div>
        </div>
        {rows.map((i) => (
          <div className="income-row" key={i.id}>
            <div className="category-icon">
              <TrendingUp size={20} />
            </div>
            <div>
              <strong>{i.name}</strong>
              <small>
                {dateLabel(i.date)} ·{" "}
                {data.accounts.find((a) => a.id === i.accountId)?.name}
              </small>
            </div>
            <b className="green-text">+{money(i.amount)}</b>
            <button
              className="icon-button"
              aria-label={"Edit " + i.name}
              onClick={() => openIncome(i)}
            >
              <Pencil size={16} />
            </button>
          </div>
        ))}
        {!rows.length && (
          <div className="empty-state">
            <TrendingUp size={28} />
            <h3>A little more coming your way</h3>
            <p>Add income to complete your monthly picture.</p>
            {latestIncomeMonth && latestIncomeMonth !== month && <div className="mt-4"><p>Your latest saved income is in {monthLabel(latestIncomeMonth)}.</p><button type="button" className="button secondary small" onClick={() => setMonth(latestIncomeMonth)}>View {monthLabel(latestIncomeMonth)}</button></div>}
            <button
              className="button secondary small"
              onClick={() => openIncome("new")}
            >
              Add income
            </button>
          </div>
        )}
      </section>
      {editing && (
        <Dialog
          title={item ? "Edit income" : "Add income"}
          onClose={() => setEditing(null)}
          canClose={!savingIncome}
        >
          <form className="planner-form" onSubmit={save}>
            <fieldset className="contents" disabled={savingIncome}>
            <label>
              Source
              <input
                autoFocus
                name="name"
                defaultValue={item?.name}
                placeholder="e.g. Monthly salary"
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
                  step="0.01"
                  defaultValue={item?.amount}
                  required
                />
              </label>
              <label>
                Received on
                <input
                  name="date"
                  type="date"
                  defaultValue={item?.date || today()}
                  max={today()}
                  required
                />
              </label>
            </div>
            <label>
              Received into
              <select name="account" defaultValue={item?.accountId}>
                {data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {saveError && <p className="user-error" role="alert">{saveError}</p>}
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {item && (
                <button
                  type="button"
                  className="danger-link"
                  onClick={() => void removeIncome()}
                >
                  Delete entry
                </button>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={savingIncome}>{savingIncome ? "Saving…" : "Save income"}</button>
            </div>
            </fieldset>
          </form>
        </Dialog>
      )}
    </section>
  );
}
export function Insights() {
  const { data } = useFinance();
  const [year, setYear] = useState(today().slice(0, 4));
  const points = Array.from({ length: 12 }, (_, i) => {
    const month = year + "-" + String(i + 1).padStart(2, "0");
    const r = getRows(data, month);
    return {
      month: dateLabel(month + "-01", { month: "short" }),
      planned: r.reduce((s, r) => s + r.amount, 0),
      paid: r.filter((r) => r.paidDate).reduce((s, r) => s + r.amount, 0),
    };
  });
  const total = points.reduce((s, p) => s + p.planned, 0);
  const paid = points.reduce((s, p) => s + p.paid, 0);
  const annual = data.expenses.filter(
    (e) => e.frequency === "yearly" && e.due.slice(0, 4) <= year,
  );
  const recurring = data.expenses
    .filter((e) => e.frequency !== "once" && e.due.slice(0, 4) <= year)
    .reduce(
      (s, e) => s + (e.frequency === "monthly" ? e.amount : e.amount / 12),
      0,
    );
  return (
    <section className="insights-page min-w-0">
      <PageHeading
        kicker="STEP BACK. SEE THE BIGGER PICTURE."
        title="Insights"
        description="Turn the everyday details into a clearer plan for your year."
      >
        <label className="year-select">
          Year
          <select
            aria-label="Select year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {Array.from(
              new Set([
                Number(today().slice(0, 4)) - 1,
                Number(today().slice(0, 4)),
                Number(today().slice(0, 4)) + 1,
                ...data.expenses.map((e) => Number(e.due.slice(0, 4))),
              ]),
            )
              .sort()
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </label>
      </PageHeading>
      <div className="stats-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Yearly planned expenses
            <ReceiptText size={17} />
          </div>
          <div className="stat-value">{money(total)}</div>
          <p>All scheduled expenses in {year}</p>
        </div>
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">
            Paid so far
            <Check size={17} />
          </div>
          <div className="stat-value">{money(paid)}</div>
          <p>Recorded payments for {year} bills</p>
        </div>
        <div className="stat-card soft-green">
          <div className="stat-label">
            Recurring monthly equivalent
            <TrendingUp size={17} />
          </div>
          <div className="stat-value">{money(recurring)}</div>
          <p>Current recurring bills · annual costs ÷ 12</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>A year of little decisions</h2>
            <p>Your scheduled expenses and recorded payments, month by month</p>
          </div>
          <div className="chart-legend">
            <span>
              <i />
              Planned
            </span>
            <span>
              <i />
              Paid
            </span>
          </div>
        </div>
        <div className="annual-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={points} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                tickFormatter={(v) => "€" + v}
              />
              <Tooltip
                formatter={(v) => money(Number(v))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                }}
              />
              <Bar
                dataKey="planned"
                name="Planned"
                fill="var(--color-chart-planned)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="paid"
                name="Paid"
                fill="var(--color-chart-paid)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel annual-bills">
        <div className="panel-heading">
          <div>
            <h2>Once a year. Always on your radar.</h2>
            <p>Annual bills, with a monthly amount you can set aside</p>
          </div>
        </div>
        {annual.map((e) => (
          <div className="income-row" key={e.id}>
            <CategoryIcon category={e.category} />
            <div>
              <strong>{e.name}</strong>
              <small>Due {dateLabel(e.due)} each year</small>
            </div>
            <div className="annual-amount">
              <strong>{money(e.amount)} / year</strong>
              <small>Set aside {money(e.amount / 12)} / month</small>
            </div>
          </div>
        ))}
        {!annual.length && (
          <div className="empty-state">
            <p>
              No annual expenses yet. Add a yearly bill on the Expenses page.
            </p>
            <Link to="/expenses" className="button secondary small">
              Manage expenses
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
