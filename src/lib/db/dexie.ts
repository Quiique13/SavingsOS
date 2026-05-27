import Dexie, { type Table } from "dexie";
import type {
  Account,
  Transaction,
  ExpenseCategory,
} from "../../types/finance";

class FinanceDatabase extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;
  expenseCategories!: Table<ExpenseCategory, number>;

  constructor() {
    super("savings-os-db");

    this.version(2).stores({
      accounts: "++id, name, platform, type",
      transactions: "++id, accountId, type, category, date",
      expenseCategories: "++id, name",
    });
  }
}

export const db = new FinanceDatabase();
