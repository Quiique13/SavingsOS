import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Load the pure TypeScript model using the project's existing compiler dependency.
const source = readFileSync(new URL("../src/planner/model.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
const { getRows, shiftMonth, mergeLegacy, withoutSamples, isValidBackup } = await import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
const account = { id: "bleap", name: "Bleap", provider: "Everyday spending", kind: "Spending", balance: 0, color: "#a4d17a" };
const bill = (overrides = {}) => ({ id: "rent", name: "Rent", amount: 650, category: "Housing", accountId: "bleap", due: "2026-01-31", frequency: "monthly", notes: "", ...overrides });
const data = (expenses = [bill()], payments = {}) => ({ accounts: [account], expenses, payments, income: [], initialized: true });

test("monthly expenses clamp to month-end and return to their original day", () => {
  const d = data();
  assert.equal(getRows(d, "2026-02")[0].date, "2026-02-28");
  assert.equal(getRows(d, "2026-03")[0].date, "2026-03-31");
  assert.equal(getRows(d, "2028-02")[0].date, "2028-02-29");
  assert.equal(getRows(d, "2025-12").length, 0);
});

test("payment status and actual payment date belong to only one occurrence", () => {
  const d = data(undefined, { "rent:2026-01-31": "2026-02-02" });
  assert.equal(getRows(d, "2026-01")[0].status, "Paid");
  assert.equal(getRows(d, "2026-01")[0].paidDate, "2026-02-02");
  assert.notEqual(getRows(d, "2026-02")[0].status, "Paid");
  assert.equal(getRows(d, "2026-02")[0].paidDate, undefined);
});

test("one-time purchases appear only in their own month", () => {
  const d = data([bill({ frequency: "once" })]);
  assert.equal(getRows(d, "2026-01").length, 1);
  assert.equal(getRows(d, "2026-02").length, 0);
  assert.equal(getRows(d, "2027-01").length, 0);
});

test("annual bills recur in the correct month, including leap-day handling", () => {
  const d = data([bill({ frequency: "yearly", due: "2024-02-29" })]);
  assert.equal(getRows(d, "2025-02")[0].date, "2025-02-28");
  assert.equal(getRows(d, "2028-02")[0].date, "2028-02-29");
  assert.equal(getRows(d, "2025-03").length, 0);
});

test("month navigation crosses year boundaries", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("removing samples preserves edited sample entries and their payments", () => {
  const d = data([
    bill({ id: "sample-1", demo: true }),
    bill({ id: "sample-2" }),
    bill({ id: "personal" }),
  ], { "sample-1:2026-01-31": "2026-01-31", "sample-2:2026-01-31": "2026-01-30", "personal:2026-01-31": "2026-01-31" });
  const cleaned = withoutSamples(d);
  assert.deepEqual(cleaned.expenses.map(e => e.id), ["sample-2", "personal"]);
  assert.equal(cleaned.payments["sample-1:2026-01-31"], undefined);
  assert.equal(cleaned.payments["sample-2:2026-01-31"], "2026-01-30");
  assert.equal(Object.keys(d.payments).length, 3);
});

test("legacy migration preserves amounts, dates, accounts, and paid status", () => {
  const previous = data([bill({ demo: true, id: "sample-0" })], { "sample-0:2026-01-31": "2026-01-31" });
  const legacyAccounts = [{ id: 7, name: "Bleap", platform: "Bleap", type: "bank", currency: "EUR" }];
  const transactions = [
    { id: 42, accountId: 7, type: "expense", amount: 19.99, category: "Subscriptions", description: "Music", date: "2026-03-02T12:00:00.000Z" },
    { id: 43, accountId: 7, type: "income", amount: 1500, category: "Income", description: "Salary", date: "2026-03-01T12:00:00.000Z" },
    { id: 44, accountId: 7, type: "transfer", amount: 100, category: "Transfer", date: "2026-03-01T12:00:00.000Z" },
  ];
  const merged = mergeLegacy(previous, legacyAccounts, transactions);
  assert.equal(merged.expenses.length, 1);
  assert.equal(merged.expenses[0].amount, 19.99);
  assert.equal(merged.expenses[0].accountId, "legacy-7");
  assert.equal(getRows(merged, "2026-03")[0].status, "Paid");
  assert.equal(merged.income[0].amount, 1500);
  assert.equal(Object.keys(merged.payments).length, 1);
  assert.equal(previous.expenses[0].id, "sample-0");
  assert.ok(isValidBackup(merged));
});

test("migration maps sample bills onto matching existing accounts", () => {
  const merged = mergeLegacy(data([bill({ demo: true })]), [{ id: 9, name: "Bleap Everyday", platform: "Bleap", type: "bank", currency: "EUR" }], []);
  assert.equal(merged.accounts.length, 1);
  assert.equal(merged.expenses[0].accountId, "legacy-9");
  assert.ok(isValidBackup(merged));
});

test("backups reject missing accounts, invalid dates, duplicate IDs and broken payments", () => {
  assert.ok(isValidBackup(data()));
  assert.equal(isValidBackup({ ...data(), accounts: [] }), false);
  assert.equal(isValidBackup(data([bill({ due: "2026-02-31" })])), false);
  assert.equal(isValidBackup(data([bill({ amount: -1 })])), false);
  assert.equal(isValidBackup(data([bill({ accountId: "missing" })])), false);
  assert.equal(isValidBackup(data([bill(), bill()])), false);
  assert.equal(isValidBackup(data(undefined, { "unknown:2026-01-31": "2026-01-31" })), false);
  assert.equal(isValidBackup(data(undefined, { "rent:2026-01-31": "2026-02-31" })), false);
  assert.ok(isValidBackup(data(undefined, { "rent:2026-01-31": "2026-02-02" })));
});

test("retrying a legacy import preserves personal entries and payment history", () => {
  const previous = data([bill({ id: "personal" }), bill({ id: "sample-2" }), bill({ id: "sample-3", demo: true })], { "personal:2026-01-31": "2026-01-30", "sample-2:2026-01-31": "2026-01-31", "sample-3:2026-01-31": "2026-01-31" });
  previous.income.push({ id: "new-income", name: "Side project", amount: 50, date: "2026-01-01", accountId: "bleap" });
  const oldAccounts = [{ id: 2, name: "Bleap", platform: "Bleap", type: "bank", currency: "EUR" }];
  const oldTransactions = [{ id: 15, accountId: 2, type: "expense", amount: 10, category: "Other", date: "2026-01-15" }];
  const merged = mergeLegacy(previous, oldAccounts, oldTransactions);
  assert.deepEqual(merged.expenses.map(e => e.id), ["personal", "sample-2", "legacy-15"]);
  assert.equal(merged.payments["sample-2:2026-01-31"], "2026-01-31");
  assert.equal(merged.payments["sample-3:2026-01-31"], undefined);
  assert.equal(merged.income[0].accountId, "legacy-2");
  assert.ok(isValidBackup(merged));
  const retry = mergeLegacy(merged, oldAccounts, oldTransactions);
  assert.equal(retry.expenses.length, merged.expenses.length);
  assert.equal(retry.income.length, 1);
});
