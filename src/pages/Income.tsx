import {
  Pencil,
  Plus,
  TrendingUp
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "../components/common/Dialog";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { useFinance } from "../hooks/useFinance";
import { type Income } from "../types/finance";
import { dateLabel, money, monthLabel, today } from "../utils/finance";

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
        title="Income"
        description="Track what you receive and where it goes."
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
            <h2>Income history</h2>
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
            <h3>No income this month</h3>
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
          {!data.accounts.length ? (
            <div className="planner-form">
              <p>Create an account before recording income.</p>
              <Link className="button primary" to="/accounts" onClick={() => setEditing(null)}>Add account</Link>
            </div>
          ) : <form className="planner-form" onSubmit={save}>
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
          </form>}
        </Dialog>
      )}
    </section>
  );
}
