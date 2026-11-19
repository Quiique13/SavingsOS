import { NumberPop } from "../components/common/NumberPop";
import { currencyLabel } from "../utils/currency";
import { translate, useLanguage } from "../i18n";
import { Pencil, Plus, TrendingUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Dialog } from "../components/common/Dialog";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { MonthlySimulator } from "../components/income/MonthlySimulator";
import { useFinance } from "../hooks/useFinance";
import { type Income } from "../types/finance";
import { getMonthlyBudget, incomeBudgetMonth } from "../utils/budget";
import { dateLabel, money, monthLabel, today } from "../utils/finance";
import { useTheme } from "../hooks/useTheme";
import { isDesignTheme } from "../utils/appearance";
import { studioMoney } from "../utils/studio";
import { useSuccess } from "../context/SuccessContext";

export function IncomePage() {
  useLanguage();
  const success = useSuccess();
  const { uiTheme } = useTheme();
  const studio = isDesignTheme(uiTheme);
  const { data, save: saveData } = useFinance();
  const [parameters] = useSearchParams();
  const requestedMonth = parameters.get("month");
  const [month, setMonth] = useState(
    requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : today().slice(0, 7),
  );
  const [editing, setEditing] = useState<Income | "new" | null>(
    parameters.get("add") === "1" ? "new" : null,
  );
  const [savingIncome, setSavingIncome] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [message, setMessage] = useState("");
  const [draftId, setDraftId] = useState(() =>
    parameters.get("add") === "1" ? crypto.randomUUID() : "",
  );
  const budget = getMonthlyBudget(data, month);
  const latestIncomeMonth = data.income.reduce(
    (latest, entry) =>
      incomeBudgetMonth(entry.date) > latest
        ? incomeBudgetMonth(entry.date)
        : latest,
    "",
  );
  const lastReceiptDate =
    budget.incomeMonth +
    "-" +
    new Date(
      Number(budget.incomeMonth.slice(0, 4)),
      Number(budget.incomeMonth.slice(5, 7)),
      0,
    ).getDate();
  function openIncome(entry: Income | "new") {
    setDraftId(entry === "new" ? crypto.randomUUID() : entry.id);
    setSaveError("");
    setMessage("");
    setEditing(entry);
  }
  const rows = [...budget.incomeEntries].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
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
      setSaveError("Enter an income source and an amount greater than zero.");
      return;
    }
    setSavingIncome(true);
    try {
      await saveData((d) => ({
        ...d,
        income: d.income.some((entry) => entry.id === item.id)
          ? d.income.map((entry) => (entry.id === item.id ? item : entry))
          : [...d.income, item],
      }));
      setMonth(incomeBudgetMonth(item.date));
      setMessage(
        translate("{{name}} saved for {{month}}.", {
          name: item.name,
          month: monthLabel(incomeBudgetMonth(item.date)),
        }),
      );
      setEditing(null);
      success("Income saved.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "This income could not be saved. Your form is still here; try again.",
      );
    } finally {
      setSavingIncome(false);
    }
  }
  async function removeIncome() {
    if (!editing || editing === "new" || savingIncome) return;
    setSaveError("");
    setSavingIncome(true);
    try {
      await saveData((d) => ({
        ...d,
        income: d.income.filter((entry) => entry.id !== editing.id),
      }));
      setMessage(translate("{{name}} deleted.", { name: editing.name }));
      setEditing(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "This income could not be deleted. Try again.",
      );
    } finally {
      setSavingIncome(false);
    }
  }
  const item = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="income-page min-w-0">
      <PageHeading
        designTitle="Income that funds your month."
        eyebrow="FUNDING / YOUR MONTH"
        title={translate("Income")}
        description={translate(
          "Income received in {{receivedMonth}} funds {{budgetMonth}}.",
          {
            receivedMonth: monthLabel(budget.incomeMonth),
            budgetMonth: monthLabel(month),
          },
        )}
      >
        <div className="expense-heading-actions">
          <MonthPicker month={month} setMonth={setMonth} />
          <button className="button primary" onClick={() => openIncome("new")}>
            <Plus size={16} />
            {translate("Add income")}
          </button>
          {studio && <Link className="button secondary" to={"/simulator?month=" + month}>{translate("Try simulator")}</Link>}
        </div>
      </PageHeading>
      {message && (
        <p className="status-message" role="status">
          {translate(message)}
        </p>
      )}
      {studio && <div className="studio-income-summary">
        <article className="stat-card studio-highlight"><div className="stat-label">{translate("Income available")}</div><strong className="stat-value"><NumberPop value={studioMoney(budget.income)} /></strong><p>{translate("Received in {{month}}", { month: monthLabel(budget.incomeMonth) })}</p></article>
        <article className="stat-card"><div className="stat-label">{translate("Receipts")}</div><strong className="stat-value"><NumberPop value={rows.length} /></strong><p>{translate("Income funding this month")}</p></article>
        <article className="stat-card"><div className="stat-label">{translate("Latest funded month")}</div><button className="stat-value text-button" disabled={!latestIncomeMonth} onClick={() => latestIncomeMonth && setMonth(latestIncomeMonth)}>{latestIncomeMonth ? dateLabel(latestIncomeMonth + "-01", { month: "short", year: "numeric" }) : "—"}</button><p>{translate("Jump to latest")}</p></article>
        <article className="stat-card"><div className="stat-label">{translate("Planned expenses")}</div><strong className="stat-value"><NumberPop value={studioMoney(budget.planned)} /></strong><p>{translate("Left after expenses")}: {studioMoney(budget.leftAfterExpenses)}</p></article>
      </div>}
      {!studio && <div className="stat-card income-stat">
        <div className="stat-label">
          {translate("Income available")}
          <TrendingUp size={18} />
        </div>
        <div className="stat-value"><NumberPop value={money(budget.income)} /></div>
        <p>
          {translate("{{count}} entries received in {{month}}", {
            count: rows.length,
            month: monthLabel(budget.incomeMonth),
          })}
        </p>
      </div>}
      {!studio && <MonthlySimulator key={month} month={month} />}
      <section className="panel income-receipts-panel">
        <div className="panel-heading">
          <div>
            <h2>{translate("Income funding this month")}</h2>
            <p>
              {translate("Received in {{month}}", {
                month: monthLabel(budget.incomeMonth),
              })}
            </p>
          </div>
        </div>
        {studio && rows.length > 0 && <div className="studio-table-wrap"><table className="studio-table"><thead><tr><th>{translate("Source")}</th><th>{translate("Received on")}</th><th>{translate("Account")}</th><th>{translate("Amount")}</th><th aria-label={translate("Actions")} /></tr></thead><tbody>{rows.map(entry => <tr key={entry.id}><th scope="row">{entry.name}</th><td>{dateLabel(entry.date, { day: "numeric", month: "long", year: "numeric" })}</td><td>{data.accounts.find(account => account.id === entry.accountId)?.name}</td><td className="studio-table-amount">{studioMoney(entry.amount)}</td><td><button className="text-button" aria-label={translate("Edit") + " " + entry.name} onClick={() => openIncome(entry)}>{translate("Edit")} →</button></td></tr>)}</tbody></table></div>}
        {!studio && rows.map((i) => (
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
              aria-label={translate("Edit") + " " + i.name}
              onClick={() => openIncome(i)}
            >
              <Pencil size={16} />
            </button>
          </div>
        ))}
        {!rows.length && (
          <div className="empty-state">
            <TrendingUp size={28} />
            <h3>{translate("No income funding this month")}</h3>
            <p>
              {translate(
                "Record income received last month to fund this plan.",
              )}
            </p>
            {latestIncomeMonth && latestIncomeMonth !== month && (
              <div className="mt-4">
                <p>
                  {translate("Your latest funded month is") + " "}
                  {monthLabel(latestIncomeMonth)}.
                </p>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setMonth(latestIncomeMonth)}
                >
                  {translate("View") + " "}
                  {monthLabel(latestIncomeMonth)}
                </button>
              </div>
            )}
            <button
              className="button secondary small"
              onClick={() => openIncome("new")}
            >
              {translate("Add income")}
            </button>
          </div>
        )}
      </section>
      {studio && <div className="studio-income-footer">
        <section className="panel"><div className="panel-heading"><div><h2>{translate("Why last month’s income?")}</h2><p>{translate("A simple budgeting convention")}</p></div></div><p className="studio-inline-note">{translate("Income received in {{receivedMonth}} funds {{budgetMonth}}.", { receivedMonth: monthLabel(budget.incomeMonth), budgetMonth: monthLabel(month) })}</p></section>
        <section className="panel"><div className="panel-heading"><div><h2>{translate("Test a different scenario")}</h2><p>{translate("A temporary scenario — saved records stay the same")}</p></div></div><div className="studio-scenario-action"><strong>{studioMoney(budget.leftAfterExpenses)}</strong><Link className="button primary" to={"/simulator?month=" + month}>{translate("Open monthly simulator")}</Link></div></section>
      </div>}
      {editing && (
        <Dialog
          title={item ? translate("Edit income") : translate("Add income")}
          onClose={() => setEditing(null)}
          canClose={!savingIncome}
        >
          {!data.accounts.length ? (
            <div className="planner-form">
              <p>{translate("Create an account before recording income.")}</p>
              <Link
                className="button primary"
                to="/accounts"
                onClick={() => setEditing(null)}
              >
                {translate("Add account")}
              </Link>
            </div>
          ) : (
            <form className="planner-form" onSubmit={save}>
              <fieldset className="contents" disabled={savingIncome}>
                <p className="form-intro">
                  {translate(
                    "This income funds the month after its received date.",
                  )}
                </p>
                <label>
                  {translate("Source")}
                  <input
                    autoFocus
                    name="name"
                    defaultValue={item?.name}
                    placeholder={translate("e.g. Monthly salary")}
                    required
                    maxLength={100}
                  />
                </label>
                <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label>
                    {currencyLabel(translate("Amount (€)"))}
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
                    {translate("Received on")}
                    <input
                      name="date"
                      type="date"
                      defaultValue={
                        item?.date ||
                        (lastReceiptDate > today() ? today() : lastReceiptDate)
                      }
                      max={today()}
                      required
                    />
                  </label>
                </div>
                <label>
                  {translate("Received into")}
                  <select name="account" defaultValue={item?.accountId}>
                    {data.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                {saveError && (
                  <p className="user-error" role="alert">
                    {translate(saveError)}
                  </p>
                )}
                <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {item && (
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => void removeIncome()}
                    >
                      {translate("Delete entry")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setEditing(null)}
                  >
                    {translate("Cancel")}
                  </button>
                  <button className="button primary" disabled={savingIncome}>
                    {savingIncome
                      ? translate("Saving…")
                      : translate("Save income")}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </Dialog>
      )}
    </section>
  );
}
