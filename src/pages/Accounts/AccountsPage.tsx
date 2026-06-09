import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db/dexie";
import type { AccountType } from "../../types/finance";
import { Modal } from "../../components/ui/Modal";

export function AccountsPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType] = useState<AccountType>("bank");

  async function handleCreateAccount(event: React.FormEvent) {
    event.preventDefault();

    await db.accounts.add({
      name,
      platform,
      type,
      currency: "EUR",
    });

    setName("");
    setPlatform("");
    setType("bank");
    setIsCreateModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-zinc-400">
            Add the accounts and platforms involved in your monthly tracking.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-xl bg-white px-4 py-2 font-medium text-zinc-950 hover:bg-zinc-200"
        >
          Add account
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {accounts?.map((account) => (
          <div
            key={account.id}
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5"
          >
            <p className="text-sm uppercase text-zinc-500">{account.type}</p>
            <h2 className="mt-1 text-xl font-semibold">{account.name}</h2>
            <p className="text-zinc-400">{account.platform}</p>
          </div>
        ))}
      </div>

      <Modal
        title="Add account"
        description="Create a destination/source account for income and expenses."
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <input
            className="w-full rounded-xl text-white px-4 py-3 outline-none"
            placeholder="Account name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <input
            className="w-full rounded-xl text-white px-4 py-3 outline-none"
            placeholder="Platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            required
          />

          <select
            className="w-full rounded-xl text-white px-4 py-3 outline-none"
            value={type}
            onChange={(event) => setType(event.target.value as AccountType)}
          >
            <option value="bank">Bank</option>
            <option value="savings">Savings</option>
            <option value="investment">Investment</option>
            <option value="cash">Cash</option>
          </select>

          <button className="w-full rounded-xl bg-white px-4 py-3 font-medium text-zinc-950 hover:bg-zinc-200">
            Save account
          </button>
        </form>
      </Modal>
    </div>
  );
}
