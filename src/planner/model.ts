import type { Account as LegacyAccount, Transaction } from "../types/finance";
export type Account = {
    id: string;
    name: string;
    provider: string;
    kind: "Spending" | "Subscriptions" | "Savings";
    balance: number;
    color: string;
};
export type Expense = {
    id: string;
    name: string;
    amount: number;
    category: string;
    accountId: string;
    due: string;
    frequency: "once" | "monthly" | "yearly";
    notes: string;
    demo?: boolean;
};
export type Income = {
    id: string;
    name: string;
    amount: number;
    date: string;
    accountId: string;
};
export type Data = {
    accounts: Account[];
    expenses: Expense[];
    payments: Record<string, string>;
    income: Income[];
    initialized?: boolean;
};
export type Row = Expense & {
    date: string;
    key: string;
    paidDate?: string;
    status: "Paid" | "Upcoming" | "Overdue";
};
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const money = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
export const dateLabel = (d: string, options?: Intl.DateTimeFormatOptions) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", options ?? { day: "numeric", month: "short" });
export const monthLabel = (m: string) => dateLabel(m + "-01", { month: "long", year: "numeric" });
export const shiftMonth = (m: string, n: number) => { const d = new Date(m + "-01T12:00:00"); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
export const categories = ["Housing", "Groceries", "Subscriptions", "Utilities", "Transport", "Health", "Shopping", "Eating out", "Other"];
export const categoryColors: Record<string, string> = { Housing: "#47977b", Groceries: "#b9cba9", Subscriptions: "#b5a4d2", Utilities: "#e3bd83", Transport: "#91b9cc", Health: "#dda9a4", Shopping: "#a7b6dc", "Eating out": "#d8bb9a", Other: "#bfc4c1" };
export function getRows(data: Data, month: string): Row[] {
    return data.expenses.flatMap(e => {
        if (e.due.slice(0, 7) > month || (e.frequency === "once" && e.due.slice(0, 7) !== month) || (e.frequency === "yearly" && e.due.slice(5, 7) !== month.slice(5, 7)))
            return [];
        const day = Math.min(Number(e.due.slice(8, 10)), new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate());
        const date = month + "-" + String(day).padStart(2, "0");
        const key = e.id + ":" + date;
        const paidDate = data.payments[key];
        return [{ ...e, date, key, paidDate, status: paidDate ? "Paid" as const : date < today() ? "Overdue" as const : "Upcoming" as const }];
    }).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
export function withoutSamples(data: Data): Data {
    const sampleIds = new Set(data.expenses.filter(e => e.demo).map(e => e.id));
    return {
        ...data,
        expenses: data.expenses.filter(e => !e.demo),
        payments: Object.fromEntries(Object.entries(data.payments).filter(([key]) => !sampleIds.has(key.slice(0, key.lastIndexOf(":"))))),
    };
}
export function mergeLegacy(previous: Data, legacyAccounts: LegacyAccount[], transactions: Transaction[]): Data {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matches = (a: string, b: string) => normalize(a).includes(normalize(b));
    const importedAccounts: Account[] = legacyAccounts.map(a => {
        const known = previous.accounts.find(b => matches(a.name, b.name));
        return { id: "legacy-" + a.id, name: a.name, provider: a.platform, kind: known?.kind ?? (a.type === "savings" || a.type === "investment" ? "Savings" : "Spending"), balance: known?.balance ?? 0, color: known?.color ?? "#b2cbd5" };
    });
    const accounts = [...importedAccounts, ...previous.accounts.filter(a => !importedAccounts.some(b => matches(b.name, a.name)))];
    const mappedId = (id: string) => {
        if (accounts.some(a => a.id === id))
            return id;
        const original = previous.accounts.find(a => a.id === id);
        return importedAccounts.find(a => original && matches(a.name, original.name))?.id ?? id;
    };
    const importedExpenses: Expense[] = transactions.filter(t => t.type === "expense").map(t => ({
        id: "legacy-" + t.id,
        name: t.description || t.category,
        amount: t.amount,
        category: t.category,
        accountId: "legacy-" + t.accountId,
        due: t.date.slice(0, 10),
        frequency: "once",
        notes: "",
    }));
    // Retain records created while a previous import attempt was unavailable.
    const kept = importedExpenses.length ? withoutSamples(previous) : previous;
    const importedIds = new Set(importedExpenses.map(e => e.id));
    const expenses = [
        ...kept.expenses.filter(e => !importedIds.has(e.id)).map(e => ({ ...e, accountId: mappedId(e.accountId) })),
        ...importedExpenses,
    ];
    const payments = { ...kept.payments };
    for (const e of importedExpenses) payments[e.id + ":" + e.due] = e.due;
    const importedIncome = transactions.filter(t => t.type === "income").map(t => ({
        id: "legacy-" + t.id, name: t.description || "Income", amount: t.amount,
        date: t.date.slice(0, 10), accountId: "legacy-" + t.accountId,
    }));
    const importedIncomeIds = new Set(importedIncome.map(i => i.id));
    return {
        ...previous, accounts, expenses, payments,
        income: [
            ...previous.income.filter(i => !importedIncomeIds.has(i.id)).map(i => ({ ...i, accountId: mappedId(i.accountId) })),
            ...importedIncome,
        ],
        initialized: true,
    };

}
export function isValidBackup(d: unknown): d is Data {
    if (!d || typeof d !== "object")
        return false;
    const v = d as Data;
    const str = (x: unknown): x is string => typeof x === "string";
    const date = (x: unknown) => str(x) && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(new Date(x + "T12:00:00Z").getTime()) && new Date(x + "T12:00:00Z").toISOString().slice(0, 10) === x;
    const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
    if (!Array.isArray(v.accounts) || !v.accounts.length || !Array.isArray(v.expenses) || !Array.isArray(v.income) || !v.payments || typeof v.payments !== "object" || Array.isArray(v.payments))
        return false;
    if (!v.accounts.every(a => a && str(a.id) && a.id.length > 0 && str(a.name) && str(a.provider) && str(a.color) && num(a.balance) && ["Spending", "Subscriptions", "Savings"].includes(a.kind)))
        return false;
    const accountIds = new Set(v.accounts.map(a => a.id));
    if (accountIds.size !== v.accounts.length)
        return false;
    if (!v.expenses.every(e => e && str(e.id) && e.id.length > 0 && str(e.name) && num(e.amount) && e.amount > 0 && str(e.category) && accountIds.has(e.accountId) && date(e.due) && ["once", "monthly", "yearly"].includes(e.frequency) && str(e.notes)))
        return false;
    const expenseIds = new Set(v.expenses.map(e => e.id));
    if (expenseIds.size !== v.expenses.length)
        return false;
    if (!v.income.every(i => i && str(i.id) && str(i.name) && num(i.amount) && i.amount > 0 && date(i.date) && accountIds.has(i.accountId)))
        return false;
    if (new Set(v.income.map(i => i.id)).size !== v.income.length)
        return false;
    return Object.entries(v.payments).every(([key, value]) => {
        const separator = key.lastIndexOf(":");
        return separator > 0 && expenseIds.has(key.slice(0, separator)) && date(key.slice(separator + 1)) && date(value);
    });
}
