import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("monthly budgets use the preceding month's receipts and simulations stay independent", async t => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { getMonthlyBudget, incomeBudgetMonth, simulateMonth } = await server.ssrLoadModule("/src/utils/budget.ts");
    const { getAccountActivity } = await server.ssrLoadModule("/src/utils/finance.ts");
    const data = {
      initialized: true,
      accounts: [{ id: "bank", name: "Bank", provider: "Bank", kind: "Spending", balance: 5000, color: "#123456" }],
      income: [
        { id: "salary", name: "Salary", amount: 1367.29, date: "2026-12-31", accountId: "bank" },
        { id: "bonus", name: "Bonus", amount: 100.01, date: "2026-12-01", accountId: "bank" },
        { id: "next", name: "Next salary", amount: 1900, date: "2027-01-30", accountId: "bank" },
        { id: "older", name: "Older salary", amount: 800, date: "2026-11-30", accountId: "bank" },
      ],
      expenses: [
        { id: "rent", name: "Rent", amount: 650, category: "Housing", accountId: "bank", due: "2026-12-31", frequency: "monthly", notes: "" },
        { id: "annual", name: "Insurance", amount: 120.02, category: "Other", accountId: "bank", due: "2027-01-15", frequency: "yearly", notes: "" },
        { id: "once", name: "Purchase", amount: 50.01, category: "Other", accountId: "bank", due: "2027-01-05", frequency: "once", notes: "" },
      ],
      payments: { "rent:2027-01-31": "2027-01-31" },
      transfers: [],
    };
    const original = structuredClone(data);
    await t.test("December receipts fund January, including multiple entries and exact cents", () => {
      const budget = getMonthlyBudget(data, "2027-01");
      assert.equal(incomeBudgetMonth("2026-12-31"), "2027-01");
      assert.equal(incomeBudgetMonth("2028-02-29"), "2028-03");
      assert.equal(budget.incomeMonth, "2026-12");
      assert.equal(budget.income, 1467.30);
      assert.equal(budget.planned, 820.03);
      assert.equal(budget.paid, 650);
      assert.equal(budget.unpaid, 170.03);
      assert.equal(budget.leftAfterExpenses, 647.27);
      assert.deepEqual(budget.incomeEntries.map(entry => entry.id), ["salary", "bonus"]);
      assert.equal(getMonthlyBudget(data, "2027-02").income, 1900);
      assert.equal(getMonthlyBudget(data, "2027-03").income, 0);
    });
    await t.test("receipt activity stays in its actual month and snapshots are never added to income", () => {
      assert.equal(getAccountActivity(data, "2026-12")[0].income, 1467.30);
      assert.equal(getAccountActivity(data, "2027-01")[0].income, 1900);
      assert.equal(getMonthlyBudget(data, "2026-12").income, 800);
      assert.deepEqual(data, original);
    });
    await t.test("editing or removing a receipt updates only its funded month", () => {
      const edited = { ...data, income: data.income.map(entry => entry.id === "salary" ? { ...entry, date: "2027-01-01", amount: 2000 } : entry) };
      assert.equal(getMonthlyBudget(edited, "2027-01").income, 100.01);
      assert.equal(getMonthlyBudget(edited, "2027-02").income, 3900);
      assert.equal(getMonthlyBudget({ ...data, income: data.income.filter(entry => entry.id !== "salary") }, "2027-01").income, 100.01);
    });
    await t.test("scenarios count all planned bills once and support carryover, deficits and zero income", () => {
      const budget = getMonthlyBudget(data, "2027-01");
      assert.deepEqual(simulateMonth(budget.planned, { income: 2000, extraIncome: 100, extraSpending: 200.25, carryover: 50 }), { available: 2150, spending: 1020.28, left: 1129.72 });
      assert.deepEqual(simulateMonth(budget.planned, { income: 0, extraIncome: 0, extraSpending: 0, carryover: -100 }), { available: -100, spending: 820.03, left: -920.03 });
      assert.deepEqual(simulateMonth(0.10, { income: 0.30, extraIncome: 0, extraSpending: 0.20, carryover: 0 }), { available: 0.30, spending: 0.30, left: 0 });
      assert.deepEqual(data, original);
    });
    await t.test("invalid and unsafe hypothetical amounts produce no estimate", () => {
      const base = { income: 1000, extraIncome: 0, extraSpending: 0, carryover: 0 };
      for (const amount of [-1, NaN, Infinity, 0.001, Number.MAX_VALUE]) assert.equal(simulateMonth(500, { ...base, income: amount }), null);
      assert.equal(simulateMonth(500, { ...base, extraIncome: -1 }), null);
      assert.equal(simulateMonth(500, { ...base, extraSpending: -1 }), null);
      assert.equal(simulateMonth(-1, base), null);
    });
  } finally { await server.close(); }
});
