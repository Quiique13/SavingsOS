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

export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  notes: string;
};

export type AccountActivity = { accountId: string; income: number; expenses: number; transfersIn: number; transfersOut: number; net: number };

export type AdminSettings = {
  workspaceName: string;
  supportEmail: string;
  monthlyBudget: number;
  reminderDays: number;
  experimentalFeatures: boolean;
  announcement: string;
};

export type Data = {
  transfers?: Transfer[];
  adminSettings?: AdminSettings;
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
