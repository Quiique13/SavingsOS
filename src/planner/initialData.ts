import { today, type Data, type Account, type Expense } from "./model";
const accounts: Account[] = [
    { id: "bleap", name: "Bleap", provider: "Everyday spending", kind: "Spending", balance: 0, color: "#a4d17a" },
    { id: "moey", name: "moey!", provider: "Crédito Agrícola", kind: "Subscriptions", balance: 0, color: "#ae9cda" },
    { id: "trading", name: "Trading 212", provider: "Savings & investments", kind: "Savings", balance: 0, color: "#b2cbd5" },
];
export function createInitialData(withSamples = false): Data {
    if (!withSamples)
        return { accounts: accounts.map(a => ({ ...a })), expenses: [], payments: {}, income: [], transfers: [], initialized: true };
    const month = today().slice(0, 7);
    const samples = [
        ["Apartment rent", 650, "Housing", 1, "bleap", "monthly", true],
        ["Spotify Premium", 7.99, "Subscriptions", 3, "moey", "monthly", true],
        ["Continente", 64.32, "Groceries", 5, "bleap", "once", true],
        ["Vodafone", 35.90, "Utilities", 8, "moey", "monthly", true],
        ["Netflix", 11.99, "Subscriptions", 16, "moey", "monthly", false],
        ["EDP electricity", 48.50, "Utilities", 20, "bleap", "monthly", false],
        ["Gym membership", 29.90, "Health", 22, "bleap", "monthly", false],
        ["iCloud+", 2.99, "Subscriptions", 25, "moey", "monthly", false],
        ["Car insurance", 180, "Transport", 28, "bleap", "yearly", false],
    ] as const;
    const payments: Record<string, string> = {};
    const expenses: Expense[] = samples.map(([name, amount, category, day, accountId, frequency, paid], i) => {
        const due = month + "-" + String(day).padStart(2, "0");
        const id = "sample-" + i;
        if (paid && due <= today())
            payments[id + ":" + due] = due;
        return { id, name, amount, category, accountId, due, frequency, notes: "", demo: true };
    });
    return { accounts, expenses, payments, income: [], transfers: [] };
}
