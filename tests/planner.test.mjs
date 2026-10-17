import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Load the pure TypeScript model using the project's existing compiler dependency.
const source = readFileSync(new URL("../src/planner/model.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
const { getRows, shiftMonth, mergeLegacy, withoutSamples, isValidBackup, saveTransfer, deleteTransfer, getAccountActivity } = await import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
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


const transferData = () => ({ ...data([]), accounts: [{ ...account, balance: 100 }, { ...account, id: "moey", name: "moey!", balance: 1000 }, { ...account, id: "trading", name: "Trading 212", balance: 500 }], income: [{ id: "salary", name: "Salary", date: "2026-09-30", amount: 1367.29, accountId: "moey" }] });
const transfer = (overrides = {}) => ({ id: "transfer-1", fromAccountId: "moey", toAccountId: "bleap", amount: 300, date: "2026-09-30", notes: "Spending money", ...overrides });

test("a 300 euro transfer moves both balances without creating income or expenses", () => {
  const original = transferData();
  const result = saveTransfer(original, transfer());
  assert.equal(result.accounts.find(account => account.id === "moey").balance, 700);
  assert.equal(result.accounts.find(account => account.id === "bleap").balance, 400);
  assert.equal(result.accounts.reduce((sum, account) => sum + account.balance, 0), 1600);
  assert.deepEqual(result.income, original.income);
  assert.deepEqual(result.expenses, original.expenses);
  assert.deepEqual(result.payments, original.payments);
  assert.equal(result.transfers.length, 1);
  assert.equal(original.accounts[0].balance, 100);
  assert.ok(isValidBackup(result));
});

test("editing, reversing direction and deleting transfers adjust balances exactly once", () => {
  const original = transferData();
  const first = saveTransfer(original, transfer());
  const second = saveTransfer(first, transfer({ amount: 250, toAccountId: "trading" }));
  assert.deepEqual(second.accounts.map(account => account.balance), [100, 750, 750]);
  assert.equal(second.transfers.length, 1);
  const retry = saveTransfer(second, transfer({ amount: 250, toAccountId: "trading" }));
  assert.deepEqual(retry.accounts, second.accounts);
  const reversed = saveTransfer(second, transfer({ fromAccountId: "bleap", toAccountId: "moey", amount: 10.01 }));
  assert.deepEqual(reversed.accounts.map(account => account.balance), [89.99, 1010.01, 500]);
  const removed = deleteTransfer(reversed, "transfer-1");
  assert.deepEqual(removed.accounts, original.accounts);
  assert.deepEqual(removed.transfers, []);
  assert.throws(() => deleteTransfer(removed, "transfer-1"), /no longer exists/);
});

test("account activity separates internal transfers from income and uses actual expense payment dates", () => {
  const original = transferData();
  original.expenses = [bill({ id: "subscription", accountId: "moey", amount: 12, due: "2026-08-31" })];
  original.payments = { "subscription:2026-08-31": "2026-09-02" };
  const saved = saveTransfer(original, transfer());
  const rows = getAccountActivity(saved, "2026-09");
  assert.deepEqual(rows.find(row => row.accountId === "moey"), { accountId: "moey", income: 1367.29, expenses: 12, transfersIn: 0, transfersOut: 300, net: 1055.29 });
  assert.deepEqual(rows.find(row => row.accountId === "bleap"), { accountId: "bleap", income: 0, expenses: 0, transfersIn: 300, transfersOut: 0, net: 300 });
  assert.equal(rows.reduce((total, row) => total + row.transfersIn - row.transfersOut, 0), 0);
  assert.equal(getAccountActivity(saved, "2026-10").reduce((sum, row) => sum + row.transfersIn + row.transfersOut, 0), 0);
  assert.equal(getAccountActivity(saved, "2026-08").find(row => row.accountId === "moey").expenses, 0);
});

test("invalid transfers and broken transfer backups are rejected while old backups remain valid", () => {
  const original = transferData();
  assert.ok(isValidBackup(original));
  for (const invalid of [{ amount: 0 }, { amount: -5 }, { amount: 1.001 }, { amount: Infinity }, { fromAccountId: "bleap", toAccountId: "bleap" }, { toAccountId: "unknown" }, { date: "2026-02-30" }, { notes: "x".repeat(501) }]) {
    assert.throws(() => saveTransfer(original, transfer(invalid)));
    assert.equal(isValidBackup({ ...original, transfers: [transfer(invalid)] }), false);
  }
  assert.equal(isValidBackup({ ...original, transfers: [transfer(), transfer()] }), false);
  assert.equal(isValidBackup({ ...original, transfers: {} }), false);
  const saved = saveTransfer(original, transfer({ amount: 0.01 }));
  assert.equal(saved.accounts[0].balance, 100.01);
  assert.equal(saved.accounts[1].balance, 999.99);
  assert.deepEqual(deleteTransfer(saved, "transfer-1").accounts, original.accounts);
});
