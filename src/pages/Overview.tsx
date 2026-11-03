import { CategoryIcon } from '../components/expenses/CategoryIcon';
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Plus,
  ReceiptText,
  TrendingUp,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { AccountActivity } from "../components/accounts/AccountActivity";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { ExpenseForm } from "../components/expenses/ExpenseForm";
import { PaymentDialog } from "../components/expenses/PaymentDialog";
import { TransferForm } from "../components/transfers/TransferForm";
import { TransferList } from "../components/transfers/TransferList";
import { useFinance } from "../hooks/useFinance";
import { type Row, type Transfer } from "../types/finance";
import { categoryColors, dateLabel, getRows, money, monthLabel, today } from "../utils/finance";

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
        <div className="page-actions flex flex-col gap-2 sm:flex-row"><button className="button secondary" onClick={() => { setTransferMessage(""); setMoving("new"); }}><ArrowLeftRight size={16} />Move money</button><button className="button primary" onClick={() => setAdding(true)}><Plus size={17} />Add expense</button></div>
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
      <AccountActivity month={month} />
      <section className="panel overview-transfer-history"><div className="panel-heading"><div><h2>Money moved between accounts</h2><p>Internal transfers in {monthLabel(month)}</p></div><Link to={"/transfers?month=" + month} className="text-button">All transfers<ArrowUpRight size={15} /></Link></div><TransferList transfers={transfers.slice(0, 5)} onEdit={setMoving} /></section>
      {moving && <TransferForm transfer={moving === "new" ? undefined : moving} onClose={() => setMoving(null)} onSaved={value => { setMonth(value); setMoving(null); setTransferMessage("Transfer history and recorded balances saved."); }} />}
      {adding && <ExpenseForm month={month} onClose={() => setAdding(false)} />}
      {paying && <PaymentDialog row={paying} onClose={() => setPaying(null)} />}
    </section>
  );
}
