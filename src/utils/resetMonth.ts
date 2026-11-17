import type { Data } from "../types/finance";
import { deleteTransfer } from "./finance";

/** Reset payment marks and reverse transfers, preserving definitions and income. */
export function resetMonth(data: Data, month: string): Data {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid month.");
  let result = data;
  for (const transfer of data.transfers ?? []) {
    if (transfer.date.startsWith(month + "-")) result = deleteTransfer(result, transfer.id);
  }
  return { ...result, payments: Object.fromEntries(Object.entries(result.payments).filter(([key]) => !key.slice(key.lastIndexOf(":") + 1).startsWith(month + "-"))) };
}
