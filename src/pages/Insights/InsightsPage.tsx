import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db/dexie";
import type { Transaction } from "../../types/finance";

function getMonthKey(date: string) {
  return new Date(date).toISOString().slice(0, 7);
}

function getMonthTotals(transactions: Transaction[], month: string) {
  const monthTransactions = transactions.filter(
    (transaction) => getMonthKey(transaction.date) === month,
  );

  const income = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const biggestExpense = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];

  const categoryTotals = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) + transaction.amount;
      return acc;
    }, {});

  const topCategory = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return {
    income,
    expenses,
    difference: income - expenses,
    biggestExpense,
    topCategory,
  };
}

export function InsightsPage() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const safeTransactions = useMemo(() => transactions ?? [], [transactions]);

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
  const currentIndex = availableMonths.indexOf(activeMonth);
  const previousMonth = availableMonths[currentIndex + 1];

  const current = getMonthTotals(safeTransactions, activeMonth);
  const previous = previousMonth
    ? getMonthTotals(safeTransactions, previousMonth)
    : null;

  const incomeChange = previous ? current.income - previous.income : 0;
  const expensesChange = previous ? current.expenses - previous.expenses : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold">Insights</h1>
          <p className="text-zinc-400">
            Monthly review and what changed compared to last month.
          </p>
        </div>

        <select
          className="rounded-xl text-white px-4 py-2 outline-none"
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
          <p className="text-sm text-zinc-400">Income change</p>
          <h2
            className={
              incomeChange >= 0
                ? "mt-2 text-3xl font-bold text-emerald-400"
                : "mt-2 text-3xl font-bold text-red-400"
            }
          >
            {previous
              ? `${incomeChange >= 0 ? "+" : ""}€${incomeChange.toFixed(2)}`
              : "—"}
          </h2>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
          <p className="text-sm text-zinc-400">Expenses change</p>
          <h2
            className={
              expensesChange <= 0
                ? "mt-2 text-3xl font-bold text-emerald-400"
                : "mt-2 text-3xl font-bold text-red-400"
            }
          >
            {previous
              ? `${expensesChange >= 0 ? "+" : ""}€${expensesChange.toFixed(2)}`
              : "—"}
          </h2>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
          <p className="text-sm text-zinc-400">Monthly result</p>
          <h2
            className={
              current.difference >= 0
                ? "mt-2 text-3xl font-bold text-emerald-400"
                : "mt-2 text-3xl font-bold text-red-400"
            }
          >
            €{current.difference.toFixed(2)}
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
        <h2 className="text-xl font-semibold">Monthly review</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl text-white p-4">
            <p className="text-sm text-zinc-400">Total income</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              €{current.income.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl text-white p-4">
            <p className="text-sm text-zinc-400">Total expenses</p>
            <p className="mt-1 text-2xl font-bold text-red-400">
              €{current.expenses.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl text-white p-4">
            <p className="text-sm text-zinc-400">Biggest expense</p>
            <p className="mt-1 text-xl font-semibold">
              {current.biggestExpense
                ? `${current.biggestExpense.description || current.biggestExpense.category} — €${current.biggestExpense.amount.toFixed(2)}`
                : "No expenses"}
            </p>
          </div>

          <div className="rounded-xl text-white p-4">
            <p className="text-sm text-zinc-400">Top spending type</p>
            <p className="mt-1 text-xl font-semibold">
              {current.topCategory
                ? `${current.topCategory[0]} — €${current.topCategory[1].toFixed(2)}`
                : "No category"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
