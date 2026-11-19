import { NumberPop } from "../components/common/NumberPop";
import { categoryLabel, translate, useLanguage } from "../i18n";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlus,
  Landmark,
  Plus,
  ReceiptText,
  Sprout,
  Wallet,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import flowRibbon from "../assets/flow-ribbon.svg";
import emptyState from "../assets/flow-empty-state.svg";
import { AccountActivity } from "../components/accounts/AccountActivity";
import { MonthPicker } from "../components/common/MonthPicker";
import { OverviewArtwork } from "../components/common/OverviewArtwork";
import { CategoryIcon } from "../components/expenses/CategoryIcon";
import { ExpenseForm } from "../components/expenses/ExpenseForm";
import { PaymentDialog } from "../components/expenses/PaymentDialog";
import { TransferForm } from "../components/transfers/TransferForm";
import { useFinance } from "../hooks/useFinance";
import { type Row, type Transfer } from "../types/finance";
import { getMonthlyBudget } from "../utils/budget";
import {
  categoryColors,
  compactMoney,
  dateLabel,
  monthLabel,
  shiftMonth,
  today,
} from "../utils/finance";
import { studioMoney as money } from "../utils/studio";

export function StudioOverview() {
  useLanguage();
  const { uiTheme } = useTheme();
  const concept = uiTheme === "paper-ledger" || uiTheme === "signal-studio";
  const { data } = useFinance();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Transfer | "new" | null>(null);
  const [transferMessage, setTransferMessage] = useState("");
  const [paying, setPaying] = useState<Row | null>(null);
  const budget = getMonthlyBudget(data, month);
  const rows = budget.expenses;
  const total = budget.planned;
  const paidRows = rows.filter((row) => row.paidDate);
  const paid = budget.paid;
  const unpaid = rows.filter((row) => !row.paidDate);
  const ledgerRows = uiTheme === "signal-studio" ? unpaid.slice(0, 5) : rows;
  const overdue = unpaid.filter((row) => row.status === "Overdue");
  const income = budget.income;
  const balance =
    data.accounts.reduce(
      (sum, account) => sum + Math.round(account.balance * 100),
      0,
    ) / 100;
  const savings = data.accounts
    .filter((account) => account.kind === "Savings")
    .reduce((sum, account) => sum + account.balance, 0);
  const paidPercent = total ? Math.round((paid / total) * 100) : 0;
  const categories = [...new Set(rows.map((row) => row.category))]
    .map((name) => ({
      name,
      color: categoryColors[name] ?? "#a3b1a8",
      value: rows
        .filter((row) => row.category === name)
        .reduce((sum, row) => sum + row.amount, 0),
    }))
    .sort((a, b) => b.value - a.value);
  const cashflow = Array.from({ length: 6 }, (_, index) => {
    const value = shiftMonth(month, index - 5);
    const monthlyBudget = getMonthlyBudget(data, value);
    return {
      month: dateLabel(value + "-01", { month: "short" }),
      period: monthLabel(value),
      income: monthlyBudget.income,
      expenses: monthlyBudget.planned,
    };
  });
  const hasCashflow = cashflow.some((entry) => entry.income || entry.expenses);
  const accountName = (id: string) =>
    data.accounts.find((account) => account.id === id)?.name ??
    translate("Account");
  const activity = [
    ...data.income
      .filter((entry) => entry.date.startsWith(month))
      .map((entry) => ({
        id: "income-" + entry.id,
        name: entry.name,
        date: entry.date,
        detail: accountName(entry.accountId),
        amount: entry.amount,
        kind: "income",
        to: "/income?month=" + shiftMonth(month, 1),
      })),
    ...Object.entries(data.payments)
      .filter(([, date]) => date.startsWith(month))
      .flatMap(([key, date]) => {
        const expense = data.expenses.find(
          (entry) => entry.id === key.slice(0, key.lastIndexOf(":")),
        );
        return expense
          ? [
              {
                id: key,
                name: expense.name,
                date,
                detail: accountName(expense.accountId),
                amount: expense.amount,
                kind: "expense",
                to:
                  "/expenses?month=" +
                  key.slice(key.lastIndexOf(":") + 1, key.lastIndexOf(":") + 8),
              },
            ]
          : [];
      }),
    ...(data.transfers ?? [])
      .filter((entry) => entry.date.startsWith(month))
      .map((entry) => ({
        id: "transfer-" + entry.id,
        name: translate("Account transfer"),
        date: entry.date,
        detail:
          accountName(entry.fromAccountId) +
          " → " +
          accountName(entry.toAccountId),
        amount: entry.amount,
        kind: "transfer",
        to: "/transfers?month=" + month,
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, 5);

  return (
    <section className="overview-page studio-overview min-w-0">
      <div className="page-heading overview-heading">
        <div>
          <span className="welcome-label">
            {dateLabel(today(), {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <h1>
            {uiTheme === "paper-ledger" ? (
              <>
                {translate("Make sense of")}
                <br />
                <em>{dateLabel(month + "-01", { month: "long" })}.</em>
              </>
            ) : uiTheme === "signal-studio" ? (
              <>
                {translate("Stay ahead")} <em>{translate("of it.")}</em>
              </>
            ) : (
              <>
                {translate("Your {{month}},", {
                  month: dateLabel(month + "-01", { month: "long" }),
                })}
                <br />
                {translate("in focus.")}
              </>
            )}
          </h1>
          <p>
            {translate(
              "Know what’s planned, what’s paid, and what’s yours to work with.",
            )}
          </p>
        </div>
        <div className="overview-period">
          <MonthPicker month={month} setMonth={setMonth} />
        </div>
        <img
          className="flow-ribbon"
          src={flowRibbon}
          alt=""
          aria-hidden="true"
        />
      </div>
      {transferMessage && (
        <p className="status-message" role="status">
          {translate(transferMessage)}
        </p>
      )}
      {concept && (
        <div className="concept-overview">
          <section className="concept-statement">
            <span className="eyebrow">{translate("Left after expenses")}</span>
            <strong className="concept-amount"><NumberPop value={money(budget.leftAfterExpenses)} /></strong>
            <p>{translate("Last month's income minus this month's plan")}</p>
            <p>{translate("Planning estimate, not bank balance")}</p>
            {uiTheme === "signal-studio" && (
              <OverviewArtwork
                variant="signal-studio"
                className="concept-art"
              />
            )}
            <dl className="concept-funding">
              <div>
                <dt>{translate("Income available")}</dt>
                <dd>{money(income)}</dd>
              </div>
              <div>
                <dt>{translate("Planned expenses")}</dt>
                <dd>{money(total)}</dd>
              </div>
              <div>
                <dt>{translate("Recorded balances")}</dt>
                <dd>{money(balance)}</dd>
              </div>
            </dl>
          </section>
          <section className="concept-ledger">
            <div className="concept-commitments">
              <div className="section-heading">
                <h2>
                  {translate(
                    uiTheme === "signal-studio"
                      ? "Next commitments"
                      : "Due & done.",
                  )}
                </h2>
                <span>{monthLabel(month)}</span>
              </div>
              {ledgerRows.length ? (
                <div className="concept-ledger-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{translate("Due date")}</th>
                        <th>{translate("Expense")}</th>
                        <th>{translate("Amount")}</th>
                        <th>{translate("Status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((row) => (
                        <tr key={row.key}>
                          <td>
                            {dateLabel(row.date, {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <th scope="row">{row.name}</th>
                          <td>{money(row.amount)}</td>
                          <td>
                            {row.paidDate ? (
                              <span className="green-text">
                                <Check size={13} />
                                {translate("Paid")}
                              </span>
                            ) : (
                              <button
                                className="text-button"
                                onClick={() => setPaying(row)}
                              >
                                {translate("Record payment")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>
                    {translate(
                      rows.length
                        ? "All taken care of for this month."
                        : "No expenses this month",
                    )}
                  </p>
                  {!rows.length && (
                    <button
                      className="button primary"
                      onClick={() => setAdding(true)}
                    >
                      {translate("Add expense")}
                    </button>
                  )}
                </div>
              )}
              {uiTheme === "signal-studio" && (
                <Link
                  className="panel-bottom-link"
                  to={"/expenses?month=" + month}
                >
                  {translate("View all expenses")}
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>
            <div className="concept-completion">
              <div>
                <span className="eyebrow">{translate("Paid so far")}</span>
                <strong>
                  <NumberPop value={money(paid)} /> <small>/ {money(total)}</small>
                </strong>
                <p>
                  {translate("{{amount}} still to pay", {
                    amount: money(total - paid),
                  })}
                </p>
              </div>
              {uiTheme === "signal-studio" ? (
                <div
                  className="signal-progress"
                  role="progressbar"
                  aria-label={translate("Payment progress")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={paidPercent}
                >
                  <ResponsiveContainer width="100%" aspect={1}>
                    <PieChart accessibilityLayer={false}>
                      <Pie
                        data={[
                          { value: paid },
                          { value: total ? total - paid : 1 },
                        ]}
                        dataKey="value"
                        innerRadius="74%"
                        outerRadius="96%"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        <Cell fill="var(--color-accent)" />
                        <Cell fill="var(--color-border)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <strong>{paidPercent}%</strong>
                </div>
              ) : (
                <progress
                  max={100}
                  value={paidPercent}
                  aria-label={translate("Payment progress")}
                />
              )}
            </div>
          </section>
        </div>
      )}
      {!concept && (
        <div className="dashboard-stats">
          <article className="summary-card balance-summary">
            <div className="summary-label">
              {translate("Recorded balances") + " "}
              <span className="summary-icon">
                <Wallet size={18} />
              </span>
            </div>
            <strong className="summary-value"><NumberPop value={money(balance)} /></strong>
            <div className="summary-foot">
              <span>
                {translate(
                  data.accounts.length === 1
                    ? "{{count}} tracked account"
                    : "{{count}} tracked accounts",
                  { count: data.accounts.length },
                )}
              </span>
              <Link
                to="/accounts"
                aria-label={translate("Manage account balances")}
              >
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </article>
          <article className="summary-card">
            <div className="summary-label">
              {translate("Income available") + " "}
              <span className="summary-icon">
                <ArrowDownLeft size={18} />
              </span>
            </div>
            <strong className="summary-value"><NumberPop value={money(income)} /></strong>
            <div className="summary-foot">
              <span>
                {translate("Received in {{month}}", {
                  month: monthLabel(budget.incomeMonth),
                })}
              </span>
              <Link
                to={"/income?month=" + month}
                aria-label={translate("Manage income")}
              >
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </article>
          <article className="summary-card">
            <div className="summary-label">
              {translate("Planned expenses") + " "}
              <span className="summary-icon">
                <ReceiptText size={18} />
              </span>
            </div>
            <strong className="summary-value"><NumberPop value={money(total)} /></strong>
            <div className="summary-foot">
              <span>
                {translate("{{amount}} still to pay", {
                  amount: money(total - paid),
                })}
              </span>
              <Link
                to={"/expenses?month=" + month}
                aria-label={translate("Manage planned expenses")}
              >
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </article>
          <article className="summary-card remaining-summary">
            <OverviewArtwork className="flow-orbit" variant="flow" />
            <div className="summary-label">
              {translate("Left after expenses") + " "}
              <span className="summary-icon">
                <Sprout size={18} />
              </span>
            </div>
            <strong className="summary-value"><NumberPop value={money(budget.leftAfterExpenses)} /></strong>
            <div className="summary-foot">
              <span>{translate("Planning estimate, not bank balance")}</span>
            </div>
          </article>
        </div>
      )}
      <div className="quick-actions" aria-label={translate("Quick actions")}>
        <span>{translate("Make your next move")}</span>
        <button
          onClick={() => {
            setTransferMessage("");
            setMoving("new");
          }}
        >
          <span className="quick-icon blue">
            <ArrowLeftRight size={18} />
          </span>
          {translate("Move money")}
          <ArrowUpRight size={15} />
        </button>
        <button onClick={() => setAdding(true)}>
          <span className="quick-icon">
            <Plus size={19} />
          </span>
          {translate("Add expense")}
          <ArrowUpRight size={15} />
        </button>
        <Link to={"/income?add=1&month=" + month}>
          <span className="quick-icon">
            <ArrowDownLeft size={18} />
          </span>
          {translate("Record income")}
          <ArrowUpRight size={15} />
        </Link>
        <Link to="/accounts">
          <span className="quick-icon">
            <Landmark size={18} />
          </span>
          {translate("Manage accounts")}
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {!data.accounts.length && (
        <Link className="getting-started" to="/accounts">
          <span className="quick-icon blue">
            <CirclePlus size={23} />
          </span>
          <span>
            <strong>{translate("Start with your first account")}</strong>
            <small>
              {translate(
                "Add a balance, then record income and plan your expenses.",
              )}
            </small>
          </span>
          <ArrowRight size={20} />
        </Link>
      )}
      <div className="dashboard-columns">
        <section className="panel cashflow-panel">
          <div className="panel-heading">
            <div>
              <h2>{translate("Your six-month picture")}</h2>
              <p>
                {translate(
                  "Each month's plan uses income received in the previous month.",
                )}
              </p>
            </div>
            <Link className="text-button" to="/insights">
              {translate("Insights") + " "}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="cashflow-key">
            <span>
              <i />
              {translate("Income available")}
            </span>
            <span>
              <i />
              {translate("Planned expenses")}
            </span>
          </div>
          {hasCashflow ? (
            <div
              className="cashflow-chart"
              role="img"
              aria-label={translate(
                "Six month income and planned expenses bar chart. Exact values are available in View chart data below.",
              )}
            >
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={cashflow}
                  barGap={6}
                  margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--color-border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    width={54}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                    tickFormatter={(value) => compactMoney(Number(value))}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-surface-alt)" }}
                    formatter={(value, name) => [
                      money(Number(value)),
                      translate(
                        name === "income"
                          ? "Income available"
                          : "Planned expenses",
                      ),
                    ]}
                    labelFormatter={(_, entries) =>
                      entries[0]?.payload.period ?? ""
                    }
                    contentStyle={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--color-text)",
                    }}
                  />
                  <Bar
                    dataKey="income"
                    fill="var(--dashboard-chart-income)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={34}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="var(--dashboard-chart-expenses)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={34}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state cashflow-empty">
              <ChartEmpty />
              <h3>{translate("Your bigger picture starts here")}</h3>
              <p>
                {translate(
                  "Record income and expenses to see your monthly patterns.",
                )}
              </p>
              <button className="text-button" onClick={() => setAdding(true)}>
                {translate("Add your first expense") + " "}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          <details className="chart-data">
            <summary>
              {translate("View chart data") + " "}
              <ChevronDown size={12} />
            </summary>
            <table>
              <caption>
                {translate(
                  "Income and planned expenses for the six months ending",
                ) + " "}
                {monthLabel(month)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{translate("Month")}</th>
                  <th scope="col">{translate("Income available")}</th>
                  <th scope="col">{translate("Planned expenses")}</th>
                </tr>
              </thead>
              <tbody>
                {cashflow.map((entry) => (
                  <tr key={entry.period}>
                    <th scope="row">{entry.period}</th>
                    <td>{money(entry.income)}</td>
                    <td>{money(entry.expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="panel bills-panel">
          <div className="panel-heading">
            <div>
              <h2>{translate("Next to pay")}</h2>
              <p>
                {overdue.length
                  ? translate(
                      overdue.length === 1
                        ? "{{count}} overdue payment to review"
                        : "{{count}} overdue payments to review",
                      { count: overdue.length },
                    )
                  : translate("Your next payments, in one place")}
              </p>
            </div>
            <span className="count-badge">{unpaid.length}</span>
          </div>
          <div className="radar-list">
            {unpaid.slice(0, 4).map((row) => (
              <button
                className="radar-row"
                key={row.key}
                onClick={() => setPaying(row)}
                aria-label={translate("Record payment for") + " " + row.name}
              >
                <CategoryIcon category={row.category} name={row.name} />
                <span>
                  <strong>{row.name}</strong>
                  <small
                    className={row.status === "Overdue" ? "overdue-text" : ""}
                  >
                    {row.status === "Overdue"
                      ? translate("Overdue ·") + " "
                      : translate("Due") + " "}
                    {dateLabel(row.date)}
                  </small>
                </span>
                <b>{money(row.amount)}</b>
                <ArrowRight size={13} />
              </button>
            ))}
            {!unpaid.length && (
              <div className="radar-clear">
                <Check size={20} />
                <strong>
                  {rows.length
                    ? translate("You’re all caught up")
                    : translate("Nothing due just yet")}
                </strong>
                <small>
                  {rows.length
                    ? translate("Every expense for this month is paid.")
                    : translate("Add an expense to start planning ahead.")}
                </small>
              </div>
            )}
          </div>
          <Link to={"/expenses?month=" + month} className="panel-bottom-link">
            {translate("View all expenses") + " "}
            <ArrowRight size={15} />
          </Link>
        </section>
        <section className="panel flow-payment-progress">
          <div className="panel-heading">
            <div>
              <h2>{translate("Payment progress")}</h2>
              <p>
                {translate("{{paid}} of {{total}} expenses this month", {
                  paid: paidRows.length,
                  total: rows.length,
                })}
              </p>
            </div>
          </div>
          <div className="flow-progress-body">
            <strong><NumberPop value={money(paid)} /></strong>
            <span>{translate("Paid")}</span>
            <div className="progress-caption">
              <b>{paidPercent}%</b>
              <span>
                {translate("{{amount}} still to pay", {
                  amount: money(total - paid),
                })}
              </span>
            </div>
            <progress
              max={100}
              value={paidPercent}
              aria-label={translate("Payment progress")}
            />
            <Link className="text-button" to={"/expenses?month=" + month}>
              {translate("Record payment")}
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
        <section className="panel spending-panel">
          <div className="panel-heading">
            <div>
              <h2>{translate("Spending by category")}</h2>
              <p>{translate("The whole plan, including paid bills")}</p>
            </div>
          </div>
          <div className="flow-category-body">
            {categories.length ? (
              <>
                <div
                  className="flow-donut"
                  role="img"
                  aria-label={
                    translate("Planned expenses") + ": " + money(total)
                  }
                >
                  <ResponsiveContainer width="100%" aspect={1}>
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="67%"
                        outerRadius="96%"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {categories.map((category) => (
                          <Cell key={category.name} fill={category.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flow-donut-total">
                    <strong><NumberPop value={money(total)} /></strong>
                    <small>{translate("Planned")}</small>
                  </div>
                </div>
                <dl className="flow-category-legend">
                  {categories.map((category) => (
                    <div key={category.name}>
                      <dt>
                        <i style={{ background: category.color }} />
                        {categoryLabel(category.name)}
                      </dt>
                      <dd>{money(category.value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="quiet-empty">
                {translate(
                  "Your expense categories will appear here as you build your plan.",
                )}
              </p>
            )}
          </div>
        </section>
        {data.accounts.length > 0 && (
          <section className="panel dashboard-accounts">
            <div className="section-heading">
              <h2>{translate("Your accounts")}</h2>
              <Link to="/accounts">
                {translate("Manage accounts") + " "}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="dashboard-account-grid">
              {data.accounts.slice(0, 3).map((account) => (
                <Link
                  to={account.kind === "Savings" ? "/savings" : "/accounts"}
                  className="mini-account"
                  key={account.id}
                >
                  <div>
                    <span
                      className="account-dot"
                      style={{ background: account.color }}
                    />
                    <strong>{account.name}</strong>
                    <ArrowUpRight size={14} />
                  </div>
                  <strong className="mini-account-value">
                    {money(account.balance)}
                  </strong>
                  <small>
                    {account.kind === "Subscriptions"
                      ? translate("Bills & subscriptions")
                      : account.kind === "Savings"
                        ? translate("Savings & investments")
                        : translate("Everyday spending")}
                  </small>
                </Link>
              ))}
            </div>
          </section>
        )}{" "}
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>{translate("Recent activity")}</h2>
              <p>
                {translate("Income, payments, and transfers in") + " "}
                {monthLabel(month)}
              </p>
            </div>
            <span className="activity-period">
              <span className="live-dot" />
              {translate("This period")}
            </span>
          </div>
          {activity.length ? (
            <div className="recent-activity">
              {activity.map((entry) => (
                <Link to={entry.to} className="activity-row" key={entry.id}>
                  <span className={"activity-icon " + entry.kind}>
                    {entry.kind === "income" ? (
                      <ArrowDownLeft size={19} />
                    ) : entry.kind === "transfer" ? (
                      <ArrowLeftRight size={18} />
                    ) : (
                      <ReceiptText size={18} />
                    )}
                  </span>
                  <span className="activity-description">
                    <strong>{entry.name}</strong>
                    <small>{entry.detail}</small>
                  </span>
                  <time dateTime={entry.date}>{dateLabel(entry.date)}</time>
                  <span className={"activity-amount " + entry.kind}>
                    {entry.kind === "income"
                      ? "+"
                      : entry.kind === "expense"
                        ? "−"
                        : ""}
                    {money(entry.amount)}
                    <small>
                      {entry.kind === "income"
                        ? translate("Received")
                        : entry.kind === "expense"
                          ? translate("Paid")
                          : translate("Transferred")}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state activity-empty">
              <ReceiptText size={24} />
              <h3>{translate("A fresh start")}</h3>
              <p>
                {translate(
                  "Your recorded income, payments, and transfers will appear here.",
                )}
              </p>
            </div>
          )}
        </section>
        <section className="panel flow-scenario">
          <div className="panel-heading">
            <div>
              <h2>{translate("What if this month changes?")}</h2>
              <p>
                {translate(
                  "A temporary scenario — saved records stay the same",
                )}
              </p>
            </div>
          </div>
          <div className="flow-scenario-body">
            <strong><NumberPop value={money(budget.leftAfterExpenses)} /></strong>
            <p>{translate("Left after planned spending")}</p>
          </div>
          <div className="flow-simulator">
            <Link className="button primary" to={"/simulator?month=" + month}>
              <ArrowRight size={16} />
              {translate("Open monthly simulator")}
            </Link>
          </div>
        </section>
        <Link to="/savings" className="savings-spotlight">
          <span className="savings-spotlight-icon">
            <Sprout size={24} />
          </span>
          <span>
            <small>{translate("A LITTLE TODAY. MORE TOMORROW.")}</small>
            <strong><NumberPop value={money(savings)} /></strong>
            <span>{translate("Set aside in savings")}</span>
          </span>
          <ArrowUpRight size={19} />
        </Link>
      </div>
      {data.accounts.length > 0 && (
        <details className="account-detail-disclosure">
          <summary>
            {translate("Explore account activity") + " "}
            <ChevronDown size={15} />
          </summary>
          <AccountActivity month={month} />
        </details>
      )}
      <p className="dashboard-note">
        <Landmark size={13} />
        {translate(
          "Manually tracked. Balances reflect your latest recorded snapshots.",
        )}
      </p>
      {moving && (
        <TransferForm
          transfer={moving === "new" ? undefined : moving}
          onClose={() => setMoving(null)}
          onSaved={(value) => {
            setMonth(value);
            setMoving(null);
            setTransferMessage("Transfer history and recorded balances saved.");
          }}
        />
      )}
      {adding && <ExpenseForm month={month} onClose={() => setAdding(false)} />}
      {paying && <PaymentDialog row={paying} onClose={() => setPaying(null)} />}
    </section>
  );
}

function ChartEmpty() {
  useLanguage();
  return (
    <img
      className="flow-empty-art"
      src={emptyState}
      alt=""
      aria-hidden="true"
    />
  );
}
