import { exportFile } from "../services/exportFile";
import type { Account } from "../types/finance";
import { type Row } from "../types/finance";

export async function exportCSV(
  rows: Row[],
  accounts: Account[],
) {
  const csv = [
    [
      "Expense",
      "Amount EUR",
      "Category",
      "Account",
      "Due date",
      "Frequency",
      "Status",
      "Paid date",
    ],
    ...rows.map((r) => [
      r.name,
      r.amount,
      r.category,
      accounts.find((a) => a.id === r.accountId)?.name || "",
      r.date,
      r.frequency,
      r.status,
      r.paidDate || "",
    ]),
  ]
    .map((row) =>
      row
        .map((v) => {
          const s = String(v);
          return (
            '"' + (/^[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
          );
        })
        .join(","),
    )
    .join("\r\n");
  await exportFile("savingsos-expenses.csv", String.fromCharCode(0xfeff) + csv, "text/csv;charset=utf-8");
}
