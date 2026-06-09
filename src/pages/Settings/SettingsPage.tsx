import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db/dexie";

const defaultCategories = [
  "Groceries",
  "Restaurants",
  "Fuel",
  "Rent",
  "Subscriptions",
  "Shopping",
  "Health",
  "Transport",
];

export function SettingsPage() {
  const categories = useLiveQuery(() => db.expenseCategories.toArray(), []);
  const [categoryName, setCategoryName] = useState("");

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();

    if (!categoryName.trim()) return;

    await db.expenseCategories.add({
      name: categoryName.trim(),
    });

    setCategoryName("");
  }

  async function addDefaults() {
    const existing = categories?.map((category) => category.name) ?? [];

    for (const category of defaultCategories) {
      if (!existing.includes(category)) {
        await db.expenseCategories.add({ name: category });
      }
    }
  }

  async function deleteCategory(id?: number) {
    if (!id) return;
    await db.expenseCategories.delete(id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-400">
          Manage your app preferences and expense labels.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Expense types</h2>
            <p className="text-sm text-zinc-400">
              These labels appear when you create an expense.
            </p>
          </div>

          <button
            onClick={addDefaults}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Add defaults
          </button>
        </div>

        <form onSubmit={addCategory} className="mb-5 flex gap-3">
          <input
            className="flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
            placeholder="New expense type, e.g. Car, Coffee, Rent"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
          />

          <button className="rounded-xl bg-white px-4 py-3 font-medium text-zinc-950 hover:bg-zinc-200">
            Add
          </button>
        </form>

        <div className="space-y-2">
          {categories?.length === 0 && (
            <p className="text-sm text-zinc-400">
              No expense types yet. Add your own or use defaults.
            </p>
          )}

          {categories?.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between rounded-xl text-white px-4 py-3"
            >
              <span>{category.name}</span>

              <button
                onClick={() => deleteCategory(category.id)}
                className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-300 hover:bg-red-500/30"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
