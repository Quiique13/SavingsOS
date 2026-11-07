import { categoryLabel, translate, useLanguage } from "../../i18n";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "../../hooks/useFinance";
import { type Expense } from "../../types/finance";
import { categories, today } from "../../utils/finance";
import { Dialog } from "../common/Dialog";

export function ExpenseForm({
  expense,
  month,
  onClose,
}: {
  expense?: Expense;
  month: string;
  onClose: () => void;
}) {
  useLanguage();
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
  if (!data.accounts.length) {
    return (
      <Dialog title={translate("Add an account first")} onClose={onClose}>
        <div className="planner-form">
          <p>{translate("Create an account before recording expenses.")}</p>
          <Link className="button primary" to="/accounts" onClick={onClose}>{translate("Add account")}</Link>
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog
      title={expense ? translate("Edit expense") : translate("Add an expense")}
      onClose={onClose}
    >
      <form onSubmit={save} className="planner-form">
        <p className="form-intro">
          {expense
            ? translate("Changes apply to this expense and its recurring schedule.")
            : translate("Make room for everything, from your morning coffee to your annual bills.")}
        </p>
        <label>{translate("Expense name")}<input
            autoFocus
            name="name"
            placeholder={translate("e.g. Spotify Premium")}
            defaultValue={expense?.name}
            required
            maxLength={100}
          />
        </label>
        <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>{translate("Amount (€)")}<input
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
          <label>{translate("Category")}<select
              name="category"
              defaultValue={expense?.category || "Subscriptions"}
            >
              {Array.from(
                new Set([
                  ...categories,
                  ...(expense ? [expense.category] : []),
                ]),
              ).map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>{translate("Pay from")}<select
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
            {frequency === "once" ? translate("Due date") : translate("First due date")}
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
        <label>{translate("Repeat")}<div className="frequency-picker">
            {(["once", "monthly", "yearly"] as const).map((f) => (
              <button
                type="button"
                key={f}
                className={frequency === f ? "selected" : ""}
                onClick={() => setFrequency(f)}
              >
                {f === "once"
                  ? translate("One-time")
                  : f === "monthly"
                    ? translate("Every month")
                    : translate("Every year")}
              </button>
            ))}
          </div>
        </label>
        <label>{translate("Notes") + " "}<span className="muted">{translate("(optional)")}</span>
          <textarea
            name="notes"
            rows={2}
            placeholder={translate("Anything you'd like to remember…")}
            defaultValue={expense?.notes}
          />
        </label>
        {expense && (
          <div className="delete-area">
            {deleting ? (
              <>
                <span>{translate("Delete this expense and all its payment history?")}</span>
                <button type="button" className="danger-link" onClick={remove}>{translate("Yes, delete")}</button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setDeleting(false)}
                >{translate("Keep it")}</button>
              </>
            ) : (
              <button
                type="button"
                className="danger-link"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={14} />{" " + translate("Delete expense")}</button>
            )}
          </div>
        )}
        <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="button secondary" onClick={onClose}>{translate("Cancel")}</button>
          <button className="button primary">
            {expense ? translate("Save changes") : translate("Add expense")}
            <Plus size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
