export type AccountType = "bank" | "savings" | "investment" | "cash";

export type Account = {
  id?: number;
  name: string;
  platform: string;
  type: AccountType;
  currency: "EUR";
};

export type TransactionType = "income" | "expense" | "transfer";

export type Transaction = {
  id?: number;
  accountId: number;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
};

export type ExpenseCategory = {
  id?: number;
  name: string;
};
