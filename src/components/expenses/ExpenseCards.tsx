import { categoryLabel, translate, useLanguage } from "../../i18n";
import { Check, Circle, Pencil } from "lucide-react";
import { type Account, type Expense, type Row } from "../../types/finance";
import { dateLabel, money } from "../../utils/finance";
import { CategoryIcon } from "./CategoryIcon";
export function ExpenseCards({
  rows,
  accounts,
  onEdit,
  onTogglePayment,
}: {
  rows: Row[];
  accounts: Account[];
  onEdit: (expense: Expense) => void;
  onTogglePayment: (row: Row) => void;
}) {
  useLanguage();
  return (
    <div
      className="expense-mobile-list min-w-0 md:hidden"
      aria-label={translate("Expense cards")}
    >
      {rows.map((row) => {
        const account = accounts.find((a) => a.id === row.accountId);
        return (
          <article key={row.key} className="mobile-expense-card min-w-0">
            <div className="flex min-w-0 items-start gap-3">
              <CategoryIcon category={row.category} name={row.name} />
              <div className="min-w-0 flex-1">
                <h3 className="wrap-anywhere text-sm font-semibold text-finance-ink">
                  {row.name}
                </h3>
                <p className="mt-1 text-xs text-finance-muted">
                  {categoryLabel(row.category)} ·{" "}
                  {row.frequency === "once"
                    ? translate("One-time")
                    : row.frequency === "monthly"
                      ? translate("Monthly")
                      : translate("Yearly")}
                </p>
              </div>
              <strong className="mobile-expense-amount max-w-[45%] wrap-anywhere text-right text-sm font-semibold text-finance-ink tabular-nums">
                {money(row.amount)}
              </strong>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-finance-border pt-3 text-xs">
              <div className="min-w-0">
                <dt className="text-finance-muted">{translate("Pay from")}</dt>
                <dd className="mt-1 flex items-center gap-1.5 wrap-anywhere font-medium text-finance-ink">
                  <i
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: account?.color }}
                  />
                  {account?.name || translate("Archived account")}
                </dd>
              </div>
              <div className="min-w-0 text-right">
                <dt className="text-finance-muted">{translate("Due date")}</dt>
                <dd className="mt-1 font-medium text-finance-ink">
                  {dateLabel(row.date)}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={"status-badge " + row.status.toLowerCase()}>
                {row.paidDate ? (
                  <Check size={12} />
                ) : (
                  <span className="status-dot" />
                )}
                {translate(row.status)}
              </span>
              {row.paidDate && (
                <span className="text-xs text-finance-muted">{translate("Paid on") + " "}{dateLabel(row.paidDate)}
                </span>
              )}
            </div>
            <div className="mobile-expense-actions mt-4 grid grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] gap-2">
              <button
                type="button"
                className="button secondary min-h-11"
                onClick={() => onEdit(row)}
                aria-label={translate("Edit") + " " + row.name}
              >
                <Pencil size={15} />{translate("Edit")}</button>
              <button
                type="button"
                className={
                  "button min-h-11 " + (row.paidDate ? "secondary" : "primary")
                }
                onClick={() => onTogglePayment(row)}
                aria-label={
                  (row.paidDate ? translate("Mark unpaid:") + " " : translate("Mark paid:") + " ") + row.name
                }
              >
                {row.paidDate ? <Circle size={15} /> : <Check size={15} />}{" "}
                {row.paidDate ? translate("Mark unpaid") : translate("Mark as paid")}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
