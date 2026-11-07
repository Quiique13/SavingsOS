import { translate, useLanguage } from "../i18n";
import {
  Pencil,
  Plus,
  TrendingUp
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Dialog } from "../components/common/Dialog";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { useFinance } from "../hooks/useFinance";
import { type Income } from "../types/finance";
import { dateLabel, money, monthLabel, today } from "../utils/finance";

export function IncomePage() {
  useLanguage();
  const { data, save: saveData } = useFinance();
  const [parameters] = useSearchParams();
  const requestedMonth = parameters.get("month");
  const [month, setMonth] = useState(requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today().slice(0, 7));
  const [editing, setEditing] = useState<Income | "new" | null>(parameters.get("add") === "1" ? "new" : null);
  const [savingIncome, setSavingIncome] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [message, setMessage] = useState("");
  const [draftId, setDraftId] = useState(() => parameters.get("add") === "1" ? crypto.randomUUID() : "");
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
      setMessage(translate("{{name}} saved for {{month}}.", { name: item.name, month: monthLabel(item.date.slice(0, 7)) }));
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
      setMessage(translate("{{name}} deleted.", { name: editing.name })); setEditing(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This income could not be deleted. Try again.");
    } finally { setSavingIncome(false); }
  }
  const item = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="income-page min-w-0">
      <PageHeading
        title={translate("Income")}
        description={translate("Track what you receive and where it goes.")}
      >
        <div className="expense-heading-actions">
          <MonthPicker month={month} setMonth={setMonth} />
          <button className="button primary" onClick={() => openIncome("new")}>
            <Plus size={16} />{translate("Add income")}</button>
        </div>
      </PageHeading>
      {message && <p className="status-message" role="status">{translate(message)}</p>}
      <div className="stat-card income-stat">
        <div className="stat-label">{translate("Total received")}<TrendingUp size={18} />
        </div>
        <div className="stat-value">
          {money(rows.reduce((s, i) => s + i.amount, 0))}
        </div>
        <p>
          {translate("{{count}} income entries in {{month}}", { count: rows.length, month: monthLabel(month) })}
        </p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{translate("Income history")}</h2>
            <p>{translate("A record of every income source")}</p>
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
            <h3>{translate("No income this month")}</h3>
            <p>{translate("Add income to complete your monthly picture.")}</p>
            {latestIncomeMonth && latestIncomeMonth !== month && <div className="mt-4"><p>{translate("Your latest saved income is in") + " "}{monthLabel(latestIncomeMonth)}.</p><button type="button" className="button secondary small" onClick={() => setMonth(latestIncomeMonth)}>{translate("View") + " "}{monthLabel(latestIncomeMonth)}</button></div>}
            <button
              className="button secondary small"
              onClick={() => openIncome("new")}
            >{translate("Add income")}</button>
          </div>
        )}
      </section>
      {editing && (
        <Dialog
          title={item ? translate("Edit income") : translate("Add income")}
          onClose={() => setEditing(null)}
          canClose={!savingIncome}
        >
          {!data.accounts.length ? (
            <div className="planner-form">
              <p>{translate("Create an account before recording income.")}</p>
              <Link className="button primary" to="/accounts" onClick={() => setEditing(null)}>{translate("Add account")}</Link>
            </div>
          ) : <form className="planner-form" onSubmit={save}>
            <fieldset className="contents" disabled={savingIncome}>
              <label>{translate("Source")}<input
                  autoFocus
                  name="name"
                  defaultValue={item?.name}
                  placeholder={translate("e.g. Monthly salary")}
                  required
                  maxLength={100}
                />
              </label>
              <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>{translate("Amount (€)")}<input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={item?.amount}
                    required
                  />
                </label>
                <label>{translate("Received on")}<input
                    name="date"
                    type="date"
                    defaultValue={item?.date || today()}
                    max={today()}
                    required
                  />
                </label>
              </div>
              <label>{translate("Received into")}<select name="account" defaultValue={item?.accountId}>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              {saveError && <p className="user-error" role="alert">{translate(saveError)}</p>}
              <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {item && (
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() => void removeIncome()}
                  >{translate("Delete entry")}</button>
                )}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setEditing(null)}
                >{translate("Cancel")}</button>
                <button className="button primary" disabled={savingIncome}>{savingIncome ? translate("Saving…") : translate("Save income")}</button>
              </div>
            </fieldset>
          </form>}
        </Dialog>
      )}
    </section>
  );
}
