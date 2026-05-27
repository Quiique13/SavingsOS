import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db/dexie";
import type { Transaction } from "../../types/finance";
import { Modal } from "../../components/ui/Modal";

export function ExpensesPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);
  const categories = useLiveQuery(() => db.expenseCategories.toArray(), []);
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);

  const expenseTransactions =
    transactions?.filter((transaction) => transaction.type === "expense") ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(
    null,
  );

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  function openCreateModal() {
    setEditingExpense(null);
    setAccountId("");
    setAmount("");
    setCategory("");
    setDescription("");
    setIsModalOpen(true);
  }

  function openEditModal(expense: Transaction) {
    setEditingExpense(expense);
    setAccountId(String(expense.accountId));
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setDescription(expense.description ?? "");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (editingExpense?.id) {
      await db.transactions.update(editingExpense.id, {
        accountId: Number(accountId),
        amount: Number(amount),
        category,
        description,
      });
    } else {
      await db.transactions.add({
        accountId: Number(accountId),
        type: "expense",
        amount: Number(amount),
        category,
        description,
        date: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
  }

  async function handleDeleteExpense(expense: Transaction) {
    if (!expense.id) return;
    await db.transactions.delete(expense.id);
  }

  const totalExpenses = expenseTransactions.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-zinc-400">Track and manage your spending.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-white px-4 py-2 font-medium text-zinc-950 hover:bg-zinc-200"
        >
          Add expense
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-zinc-400">Total expenses</p>
        <h2 className="mt-2 text-3xl font-bold text-red-400">
          €{totalExpenses.toFixed(2)}
        </h2>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5">
        {expenseTransactions.map((expense) => {
          const account = accounts?.find(
            (account) => account.id === expense.accountId,
          );

          return (
            <div
              key={expense.id}
              className="flex items-center justify-between border-b border-white/10 p-4 last:border-b-0"
            >
              <div>
                <p className="font-medium">
                  {expense.description || expense.category}
                </p>
                <p className="text-sm text-zinc-400">
                  {account?.name} · {expense.category}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-bold text-red-400">
                  -€{expense.amount.toFixed(2)}
                </p>

                <button
                  onClick={() => openEditModal(expense)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDeleteExpense(expense)}
                  className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-300 hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        title={editingExpense ? "Edit expense" : "Add expense"}
        description="Add or update an expense."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
          >
            <option value="">Select account</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} — {account.platform}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <select
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          >
            <option value="">Expense type</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <button className="w-full rounded-xl bg-white px-4 py-3 font-medium text-zinc-950 hover:bg-zinc-200">
            {editingExpense ? "Save changes" : "Save expense"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
