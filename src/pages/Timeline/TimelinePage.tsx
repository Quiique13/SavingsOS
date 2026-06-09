import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db/dexie";

function getMonthKey(date: string) {
  return new Date(date).toISOString().slice(0, 7);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function TimelinePage() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);

  const safeTransactions = transactions ?? [];
  const safeAccounts = accounts ?? [];

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(
        safeTransactions.map((transaction) => getMonthKey(transaction.date)),
      ),
    )
      .sort()
      .reverse();
  }, [safeTransactions]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const activeMonth = selectedMonth || availableMonths[0] || "";

  const filteredTransactions = safeTransactions
    .filter((transaction) =>
      activeMonth ? getMonthKey(transaction.date) === activeMonth : true,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold">Timeline</h1>
          <p className="text-zinc-400">
            A chronological feed of your income and expenses.
          </p>
        </div>

        <select
          className="rounded-xl bg-zinc-900 px-4 py-2 outline-none"
          value={activeMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          {availableMonths.length === 0 ? (
            <option value="">No months yet</option>
          ) : (
            availableMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-zinc-400">
            No transactions for this month.
          </div>
        )}

        {filteredTransactions.map((transaction) => {
          const account = safeAccounts.find(
            (account) => account.id === transaction.accountId,
          );

          const isIncome = transaction.type === "income";

          return (
            <div
              key={transaction.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500">
                    {formatDate(transaction.date)}
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    {transaction.description || transaction.category}
                  </h2>

                  <p className="text-sm text-zinc-400">
                    {account?.name ?? "Unknown account"} ·{" "}
                    {transaction.category}
                  </p>
                </div>

                <p
                  className={
                    isIncome
                      ? "text-xl font-bold text-emerald-400"
                      : "text-xl font-bold text-red-400"
                  }
                >
                  {isIncome ? "+" : "-"}€{transaction.amount.toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
