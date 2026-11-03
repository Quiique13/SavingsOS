import {
  Plus,
  Trash2
} from "lucide-react";
import { useState, type FormEvent } from "react";
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
