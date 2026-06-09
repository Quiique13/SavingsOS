import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db/dexie";
import { Modal } from "../../components/ui/Modal";
import type { Transaction } from "../../types/finance";

export function IncomePage() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);
  const incomeTransactions = useLiveQuery(
    () => db.transactions.where("type").equals("income").toArray(),
    [],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Transaction | null>(null);

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [source, setSource] = useState("");

  function openCreateModal() {
    setEditingIncome(null);
    setAmount("");
    setAccountId("");
    setSource("");
    setIsModalOpen(true);
  }

  function openEditModal(income: Transaction) {
    setEditingIncome(income);
    setAmount(String(income.amount));
    setAccountId(String(income.accountId));
    setSource(income.description ?? "");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (editingIncome?.id) {
      await db.transactions.update(editingIncome.id, {
        accountId: Number(accountId),
        amount: Number(amount),
        description: source,
      });
    } else {
      await db.transactions.add({
        accountId: Number(accountId),
        type: "income",
        amount: Number(amount),
        category: "Income",
        description: source,
        date: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
  }

  async function handleDeleteIncome(income: Transaction) {
    if (!income.id) return;
    await db.transactions.delete(income.id);
  }

  const totalIncome =
    incomeTransactions?.reduce((sum, income) => sum + income.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Income</h1>
          <p className="text-zinc-400">
            Track where your money comes from and where it goes.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-white px-4 py-2 font-medium text-zinc-950 hover:bg-zinc-200"
        >
          Add income
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
        <p className="text-sm text-zinc-400">Total income</p>
        <h2 className="mt-2 text-3xl font-bold text-emerald-400">
          €{totalIncome.toFixed(2)}
        </h2>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)]">
        {incomeTransactions?.map((income) => {
          const account = accounts?.find(
            (account) => account.id === income.accountId,
          );

          return (
            <div
              key={income.id}
              className="flex items-center justify-between border-b border-[var(--app-border)] p-4 last:border-b-0"
            >
              <div>
                <p className="font-medium">{income.description}</p>
                <p className="text-sm text-zinc-400">
                  Sent to {account?.name ?? "Unknown account"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-bold text-emerald-400">
                  +€{income.amount.toFixed(2)}
                </p>

                <button
                  onClick={() => openEditModal(income)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDeleteIncome(income)}
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
        title={editingIncome ? "Edit income" : "Add income"}
        description="Register money received and choose its destination account."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded-xl text-white px-4 py-3 outline-none"
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <select
            className="w-full rounded-xl text-white px-4 py-3 outline-none"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
          >
            <option value="">Destination account</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} — {account.platform}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-xl text-white px-4 py-3 outline-none"
            placeholder="Where did it come from?"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            required
          />

          <button className="w-full rounded-xl bg-white px-4 py-3 font-medium text-zinc-950 hover:bg-zinc-200">
            {editingIncome ? "Save changes" : "Save income"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
