import { type Data } from "../types/finance";
import { isValidBackup, mergeLegacy } from "../utils/finance";
import { createInitialData } from "../utils/initialData";
import { db } from "./legacyDatabase";
export async function loadExistingPlanner(): Promise<Data> {
  let data: Data;
  const stored = localStorage.getItem("savings-os-planner-v1");
  if (stored) {
    try {
      data = JSON.parse(stored);
    }
    catch {
      throw new Error("Your existing planner could not be read. It has not been changed.");
    }
    if (!isValidBackup(data))
      throw new Error("Your existing planner data is invalid. It has not been changed.");
  }
  else
    data = createInitialData(true);
  if (!data.initialized) {
    const [accounts, transactions] = await Promise.all([db.accounts.toArray(), db.transactions.toArray()]);
    data = mergeLegacy(data, accounts, transactions);
  }
  return { ...data, initialized: true };
}
