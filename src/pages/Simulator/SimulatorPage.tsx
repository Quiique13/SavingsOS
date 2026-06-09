import { useMemo, useState } from "react";

type Allocation = {
  label: string;
  percentage: number;
};

export function SimulatorPage() {
  const [salary, setSalary] = useState(1500);

  const [allocations, setAllocations] = useState<Allocation[]>([
    { label: "Fixed expenses", percentage: 33 },
    { label: "House / Car / Big goals", percentage: 24 },
    { label: "Day-to-day spending", percentage: 26 },
    { label: "ETFs / Investments", percentage: 17 },
  ]);

  const totalPercentage = allocations.reduce(
    (sum, allocation) => sum + allocation.percentage,
    0,
  );

  const remaining = 100 - totalPercentage;

  const simulated = useMemo(() => {
    return allocations.map((allocation) => ({
      ...allocation,
      amount: (salary * allocation.percentage) / 100,
    }));
  }, [salary, allocations]);

  function updatePercentage(index: number, value: number) {
    setAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? { ...allocation, percentage: value }
          : allocation,
      ),
    );
  }

  function updateLabel(index: number, value: string) {
    setAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? { ...allocation, label: value }
          : allocation,
      ),
    );
  }

  function addAllocation() {
    setAllocations((current) => [
      ...current,
      { label: "New allocation", percentage: 0 },
    ]);
  }

  function removeAllocation(index: number) {
    setAllocations((current) =>
      current.filter((_, allocationIndex) => allocationIndex !== index),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Salary Simulator</h1>
        <p className="text-[var(--app-muted)]">
          Test how you want to split your monthly income.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5">
        <label className="text-sm text-[var(--app-muted)]">
          Monthly income
        </label>

        <input
          className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-2xl font-bold text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
          type="number"
          value={salary}
          onChange={(event) => setSalary(Number(event.target.value))}
        />
      </div>

      <div
        className={
          remaining === 0
            ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
            : "rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5"
        }
      >
        <p className="text-sm text-[var(--app-muted)]">Allocation status</p>

        <h2 className="mt-1 text-2xl font-bold">
          {remaining === 0
            ? "Perfect — 100% allocated"
            : `${remaining > 0 ? remaining : Math.abs(remaining)}% ${
                remaining > 0 ? "still free" : "over allocated"
              }`}
        </h2>
      </div>

      <div className="space-y-4">
        {simulated.map((allocation, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5"
          >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <input
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-2 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
                value={allocation.label}
                onChange={(event) => updateLabel(index, event.target.value)}
              />

              <button
                onClick={() => removeAllocation(index)}
                className="rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-500 hover:bg-red-500/30"
              >
                Remove
              </button>
            </div>

            <div className="flex items-center gap-4">
              <input
                className="flex-1 accent-blue-600"
                type="range"
                min="0"
                max="100"
                value={allocation.percentage}
                onChange={(event) =>
                  updatePercentage(index, Number(event.target.value))
                }
              />

              <div className="w-28 text-right">
                <p className="font-bold">{allocation.percentage}%</p>

                <p className="text-sm text-[var(--app-muted)]">
                  €{allocation.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addAllocation}
        className="rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
      >
        Add allocation
      </button>
    </div>
  );
}
