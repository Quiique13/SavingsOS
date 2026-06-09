import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { db } from "../../lib/db/dexie";

const COLORS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#14b8a6",
];

function getMonthKey(date: string) {
  return new Date(date).toISOString().slice(0, 7);
}

export function DashboardPage() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const safeTransactions = transactions ?? [];

  const availableMonths = useMemo(() => {
    const months = Array.from(
      new Set(
        safeTransactions.map((transaction) => getMonthKey(transaction.date)),
      ),
    );

    return months.sort().reverse();
  }, [safeTransactions]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const activeMonth = selectedMonth || availableMonths[0] || "";

  const monthlyTransactions = activeMonth
    ? safeTransactions.filter(
        (transaction) => getMonthKey(transaction.date) === activeMonth,
      )
    : [];

  const monthlyExpenses = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const monthlyIncome = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const monthlyDifference = monthlyIncome - monthlyExpenses;

  const expenseChartData = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<{ name: string; value: number }[]>((acc, transaction) => {
      const existing = acc.find((item) => item.name === transaction.category);

      if (existing) {
        existing.value += transaction.amount;
      } else {
        acc.push({
          name: transaction.category,
          value: transaction.amount,
        });
      }

      return acc;
    }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-[var(--app-muted)]">
            Monitor income and expenses month by month.
          </p>
        </div>

        <select
          className="rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-2 text-[var(--app-text)] outline-none"
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
          <p className="text-sm text-[var(--app-muted)]">Monthly income</p>
          <h2 className="mt-2 text-3xl font-bold text-emerald-400">
            €{monthlyIncome.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
          <p className="text-sm text-[var(--app-muted)]">Monthly expenses</p>
          <h2 className="mt-2 text-3xl font-bold text-red-400">
            €{monthlyExpenses.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
          <p className="text-sm text-[var(--app-muted)]">Monthly difference</p>
          <h2
            className={
              monthlyDifference >= 0
                ? "mt-2 text-3xl font-bold text-emerald-400"
                : "mt-2 text-3xl font-bold text-red-400"
            }
          >
            €{monthlyDifference.toFixed(2)}
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Expenses by type</h2>
          <p className="text-sm text-[var(--app-muted)]">
            Filtered by selected month.
          </p>
        </div>

        {expenseChartData.length === 0 ? (
          <p className="text-[var(--app-muted)]">No expenses for this month.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_240px]">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={4}
                  >
                    {expenseChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => `€${Number(value).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {expenseChartData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-[var(--app-text)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>

                  <span className="font-semibold">
                    €{item.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
