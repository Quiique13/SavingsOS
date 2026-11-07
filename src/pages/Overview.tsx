import { categoryLabel, translate, useLanguage } from "../i18n";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight,
  Check, ChevronDown, CirclePlus, Landmark, Plus, ReceiptText, Sprout, Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AccountActivity } from "../components/accounts/AccountActivity";
import { MonthPicker } from "../components/common/MonthPicker";
import { CategoryIcon } from "../components/expenses/CategoryIcon";
import { ExpenseForm } from "../components/expenses/ExpenseForm";
import { PaymentDialog } from "../components/expenses/PaymentDialog";
import { TransferForm } from "../components/transfers/TransferForm";
import { useFinance } from "../hooks/useFinance";
import { useUsers } from "../hooks/useUsers";
import { type Row, type Transfer } from "../types/finance";
import { categoryColors, compactMoney, dateLabel, getRows, money, monthLabel, shiftMonth, today } from "../utils/finance";

export function Overview() {
  useLanguage();
  const { data } = useFinance();
  const { currentUser } = useUsers();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Transfer | "new" | null>(null);
  const [transferMessage, setTransferMessage] = useState("");
  const [paying, setPaying] = useState<Row | null>(null);
  const rows = getRows(data, month);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const paidRows = rows.filter(row => row.paidDate);
  const paid = paidRows.reduce((sum, row) => sum + row.amount, 0);
  const unpaid = rows.filter(row => !row.paidDate);
  const overdue = unpaid.filter(row => row.status === "Overdue");
  const income = data.income.filter(entry => entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.amount, 0);
  const balance = data.accounts.reduce((sum, account) => sum + Math.round(account.balance * 100), 0) / 100;
  const savings = data.accounts.filter(account => account.kind === "Savings").reduce((sum, account) => sum + account.balance, 0);
  const paidPercent = total ? Math.round(paid / total * 100) : 0;
  const categories = [...new Set(rows.map(row => row.category))].map(name => ({
    name, color: categoryColors[name] ?? "#a3b1a8",
    value: rows.filter(row => row.category === name).reduce((sum, row) => sum + row.amount, 0),
  })).sort((a, b) => b.value - a.value);
  const cashflow = Array.from({ length: 6 }, (_, index) => {
    const value = shiftMonth(month, index - 5);
    return {
      month: dateLabel(value + "-01", { month: "short" }), period: monthLabel(value),
      income: data.income.filter(entry => entry.date.startsWith(value)).reduce((sum, entry) => sum + entry.amount, 0),
      expenses: getRows(data, value).reduce((sum, row) => sum + row.amount, 0),
    };
  });
  const hasCashflow = cashflow.some(entry => entry.income || entry.expenses);
  const accountName = (id: string) => data.accounts.find(account => account.id === id)?.name ?? translate("Account");
  const activity = [
    ...data.income.filter(entry => entry.date.startsWith(month)).map(entry => ({
      id: "income-" + entry.id, name: entry.name, date: entry.date,
      detail: accountName(entry.accountId), amount: entry.amount, kind: "income", to: "/income?month=" + month,
    })),
    ...Object.entries(data.payments).filter(([, date]) => date.startsWith(month)).flatMap(([key, date]) => {
      const expense = data.expenses.find(entry => entry.id === key.slice(0, key.lastIndexOf(":")));
      return expense ? [{ id: key, name: expense.name, date, detail: accountName(expense.accountId), amount: expense.amount, kind: "expense", to: "/expenses?month=" + key.slice(key.lastIndexOf(":") + 1, key.lastIndexOf(":") + 8) }] : [];
    }),
    ...(data.transfers ?? []).filter(entry => entry.date.startsWith(month)).map(entry => ({
      id: "transfer-" + entry.id, name: translate("Account transfer"), date: entry.date,
      detail: accountName(entry.fromAccountId) + " → " + accountName(entry.toAccountId),
      amount: entry.amount, kind: "transfer", to: "/transfers?month=" + month,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0, 5);

  return (
    <section className="overview-page min-w-0">
      <div className="page-heading overview-heading">
        <div>
          <span className="welcome-label">{translate("YOUR MONEY, AT A GLANCE")}</span>
          <h1>{translate("Hello,") + " "}<span>{currentUser?.name.split(" ")[0] ?? translate("there")}.</span></h1>
          <p>{translate("A clear view of today. A little more room for tomorrow.")}</p>
        </div>
        <MonthPicker month={month} setMonth={setMonth} />
      </div>
      {transferMessage && <p className="transfer-message" role="status">{translate(transferMessage)}</p>}
      <div className="dashboard-stats">
        <article className="summary-card balance-summary">
          <div className="summary-label">{translate("Total balance") + " "}<span className="summary-icon"><Wallet size={18} /></span></div>
          <strong className="summary-value">{money(balance)}</strong>
          <div className="summary-foot"><span>{translate(data.accounts.length === 1 ? "{{count}} tracked account" : "{{count}} tracked accounts", { count: data.accounts.length })}</span><Link to="/accounts" aria-label={translate("Manage account balances")}><ArrowUpRight size={17} /></Link></div>
        </article>
        <article className="summary-card">
          <div className="summary-label">{translate("Income") + " "}<span className="summary-icon"><ArrowDownLeft size={18} /></span></div>
          <strong className="summary-value">{money(income)}</strong>
          <div className="summary-foot"><span>{translate("Recorded this month")}</span><Link to={"/income?month=" + month} aria-label={translate("Manage income")}><ArrowUpRight size={17} /></Link></div>
        </article>
        <article className="summary-card">
          <div className="summary-label">{translate("Planned expenses") + " "}<span className="summary-icon"><ReceiptText size={18} /></span></div>
          <strong className="summary-value">{money(total)}</strong>
          <div className="summary-foot"><span>{translate("{{amount}} still to pay", { amount: money(total - paid) })}</span><Link to={"/expenses?month=" + month} aria-label={translate("Manage planned expenses")}><ArrowUpRight size={17} /></Link></div>
        </article>
        <article className="summary-card remaining-summary">
          <div className="summary-label">{translate("Left after expenses") + " "}<span className="summary-icon"><Sprout size={18} /></span></div>
          <strong className="summary-value">{money(income - total)}</strong>
          <div className="summary-foot"><span>{translate("Income minus your monthly plan")}</span></div>
        </article>
      </div>
      <div className="quick-actions" aria-label={translate("Quick actions")}>
        <span>{translate("Make your next move")}</span>
        <button onClick={() => { setTransferMessage(""); setMoving("new"); }}><span className="quick-icon blue"><ArrowLeftRight size={18} /></span>{translate("Move money")}<ArrowUpRight size={15} /></button>
        <button onClick={() => setAdding(true)}><span className="quick-icon"><Plus size={19} /></span>{translate("Add expense")}<ArrowUpRight size={15} /></button>
        <Link to={"/income?add=1&month=" + month}><span className="quick-icon"><ArrowDownLeft size={18} /></span>{translate("Record income")}<ArrowUpRight size={15} /></Link>
        <Link to="/accounts"><span className="quick-icon"><Landmark size={18} /></span>{translate("Manage accounts")}<ArrowUpRight size={15} /></Link>
      </div>
      {!data.accounts.length && <Link className="getting-started" to="/accounts"><span className="quick-icon blue"><CirclePlus size={23} /></span><span><strong>{translate("Start with your first account")}</strong><small>{translate("Add a balance, then record income and plan your expenses.")}</small></span><ArrowRight size={20} /></Link>}
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="panel cashflow-panel">
            <div className="panel-heading"><div><h2>{translate("Money in, money out")}</h2><p>{translate("Your income and planned expenses over six months")}</p></div><Link className="text-button" to="/insights">{translate("Insights") + " "}<ArrowUpRight size={15} /></Link></div>
            <div className="cashflow-key"><span><i />{translate("Income")}</span><span><i />{translate("Planned expenses")}</span></div>
            {hasCashflow ? <div className="cashflow-chart" role="img" aria-label={translate("Six month income and planned expenses bar chart. Exact values are available in View chart data below.")}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={cashflow} barGap={6} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 5" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} dy={8} />
                  <YAxis width={54} axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} tickFormatter={value => compactMoney(Number(value))} />
                  <Tooltip cursor={{ fill: "var(--color-surface-alt)" }} formatter={(value, name) => [money(Number(value)), translate(name === "income" ? "Income" : "Planned expenses")]} labelFormatter={(_, entries) => entries[0]?.payload.period ?? ""} contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12, color: "var(--color-text)" }} />
                  <Bar dataKey="income" fill="var(--dashboard-chart-income)" radius={[6, 6, 6, 6]} maxBarSize={15} />
                  <Bar dataKey="expenses" fill="var(--dashboard-chart-expenses)" radius={[6, 6, 6, 6]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div> : <div className="empty-state cashflow-empty"><ChartEmpty /><h3>{translate("Your bigger picture starts here")}</h3><p>{translate("Record income and expenses to see your monthly patterns.")}</p><button className="text-button" onClick={() => setAdding(true)}>{translate("Add your first expense") + " "}<ArrowRight size={15} /></button></div>}
            <details className="chart-data"><summary>{translate("View chart data") + " "}<ChevronDown size={12} /></summary><table><caption>{translate("Income and planned expenses for the six months ending") + " "}{monthLabel(month)}</caption><thead><tr><th scope="col">{translate("Month")}</th><th scope="col">{translate("Income")}</th><th scope="col">{translate("Planned expenses")}</th></tr></thead><tbody>{cashflow.map(entry => <tr key={entry.period}><th scope="row">{entry.period}</th><td>{money(entry.income)}</td><td>{money(entry.expenses)}</td></tr>)}</tbody></table></details>
          </section>
          <section className="panel recent-panel">
            <div className="panel-heading"><div><h2>{translate("Recent activity")}</h2><p>{translate("Income, payments, and transfers in") + " "}{monthLabel(month)}</p></div><span className="activity-period"><span className="live-dot" />{translate("This period")}</span></div>
            {activity.length ? <div className="recent-activity">{activity.map(entry => <Link to={entry.to} className="activity-row" key={entry.id}><span className={"activity-icon " + entry.kind}>{entry.kind === "income" ? <ArrowDownLeft size={19} /> : entry.kind === "transfer" ? <ArrowLeftRight size={18} /> : <ReceiptText size={18} />}</span><span className="activity-description"><strong>{entry.name}</strong><small>{entry.detail}</small></span><time dateTime={entry.date}>{dateLabel(entry.date)}</time><span className={"activity-amount " + entry.kind}>{entry.kind === "income" ? "+" : entry.kind === "expense" ? "−" : ""}{money(entry.amount)}<small>{entry.kind === "income" ? translate("Received") : entry.kind === "expense" ? translate("Paid") : translate("Transferred")}</small></span><ArrowUpRight size={15} /></Link>)}</div> : <div className="empty-state activity-empty"><ReceiptText size={24} /><h3>{translate("A fresh start")}</h3><p>{translate("Your recorded income, payments, and transfers will appear here.")}</p></div>}
          </section>
          {data.accounts.length > 0 && <section className="dashboard-accounts"><div className="section-heading"><h2>{translate("Your accounts")}</h2><Link to="/accounts">{translate("Manage accounts") + " "}<ArrowUpRight size={14} /></Link></div><div className="dashboard-account-grid">{data.accounts.slice(0, 3).map(account => <Link to={account.kind === "Savings" ? "/savings" : "/accounts"} className="mini-account" key={account.id}><div><span className="account-dot" style={{ background: account.color }} /><strong>{account.name}</strong><ArrowUpRight size={14} /></div><strong className="mini-account-value">{money(account.balance)}</strong><small>{account.kind === "Subscriptions" ? translate("Bills & subscriptions") : account.kind === "Savings" ? translate("Savings & investments") : translate("Everyday spending")}</small></Link>)}</div></section>}
        </div>
        <aside className="dashboard-aside" aria-label={translate("Monthly payments and spending")}>
          <section className="panel bills-panel">
            <div className="panel-heading"><div><h2>{translate("On your radar")}</h2><p>{overdue.length ? translate(overdue.length === 1 ? "{{count}} overdue payment to review" : "{{count}} overdue payments to review", { count: overdue.length }) : translate("Your next payments, in one place")}</p></div><span className="count-badge">{unpaid.length}</span></div>
            <div className="bill-completion"><div className="completion-ring" style={{ background: `conic-gradient(var(--dashboard-blue) ${paidPercent}%, var(--color-surface-alt) 0)` }}><span>{paidPercent}%</span></div><div><strong>{translate("{{amount}} paid", { amount: money(paid) })}</strong><small>{translate("{{paid}} of {{total}} expenses this month", { paid: paidRows.length, total: rows.length })}</small></div></div>
            <div className="radar-list">{unpaid.slice(0, 4).map(row => <button className="radar-row" key={row.key} onClick={() => setPaying(row)} aria-label={translate("Record payment for") + " " + row.name}><CategoryIcon category={row.category} name={row.name} /><span><strong>{row.name}</strong><small className={row.status === "Overdue" ? "overdue-text" : ""}>{row.status === "Overdue" ? translate("Overdue ·") + " " : translate("Due") + " "}{dateLabel(row.date)}</small></span><b>{money(row.amount)}</b><ArrowRight size={13} /></button>)}{!unpaid.length && <div className="radar-clear"><Check size={20} /><strong>{rows.length ? translate("You’re all caught up") : translate("Nothing due just yet")}</strong><small>{rows.length ? translate("Every expense for this month is paid.") : translate("Add an expense to start planning ahead.")}</small></div>}</div>
            <Link to={"/expenses?month=" + month} className="panel-bottom-link">{translate("View all expenses") + " "}<ArrowRight size={15} /></Link>
          </section>
          <section className="panel spending-panel"><div className="panel-heading"><div><h2>{translate("Where it’s going")}</h2><p>{translate("Your monthly spending plan")}</p></div><ReceiptText size={17} /></div><div className="spending-breakdown">{categories.length ? categories.map(category => <div className="spending-category" key={categoryLabel(category.name)}><div><span><i style={{ background: category.color }} />{categoryLabel(category.name)}</span><strong>{money(category.value)}</strong></div><div className="category-track"><i style={{ background: category.color, width: (total ? category.value / total * 100 : 0) + "%" }} /></div></div>) : <p className="quiet-empty">{translate("Your expense categories will appear here as you build your plan.")}</p>}</div></section>
          <Link to="/savings" className="savings-spotlight"><span className="savings-spotlight-icon"><Sprout size={24} /></span><span><small>{translate("A LITTLE TODAY. MORE TOMORROW.")}</small><strong>{money(savings)}</strong><span>{translate("Set aside in savings")}</span></span><ArrowUpRight size={19} /></Link>
        </aside>
      </div>
      {data.accounts.length > 0 && <details className="account-detail-disclosure"><summary>{translate("Explore account activity") + " "}<ChevronDown size={15} /></summary><AccountActivity month={month} /></details>}
      <p className="dashboard-note"><Landmark size={13} />{translate("Manually tracked. Balances reflect your latest recorded snapshots.")}</p>
      {moving && <TransferForm transfer={moving === "new" ? undefined : moving} onClose={() => setMoving(null)} onSaved={value => { setMonth(value); setMoving(null); setTransferMessage("Transfer history and recorded balances saved."); }} />}
      {adding && <ExpenseForm month={month} onClose={() => setAdding(false)} />}
      {paying && <PaymentDialog row={paying} onClose={() => setPaying(null)} />}
    </section>
  );
}

function ChartEmpty() {
  useLanguage();
  return <div className="chart-empty-art" aria-hidden="true">{[35, 60, 42, 85, 64, 100].map((height, index) => <span key={index} style={{ height: height + "%" }} />)}</div>;
}
