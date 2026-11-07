import { translate, useLanguage } from "../../i18n";
import { Check } from "lucide-react";
import { type FormEvent } from "react";
import { useFinance } from "../../hooks/useFinance";
import { type Row } from "../../types/finance";
import { dateLabel, money, today } from "../../utils/finance";
import { Dialog } from "../common/Dialog";
import { CategoryIcon } from "./CategoryIcon";

export function PaymentDialog({
  row,
  onClose,
}: {
  row: Row;
  onClose: () => void;
}) {
  useLanguage();
  const { update } = useFinance();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const date = String(new FormData(e.currentTarget).get("paidDate"));
    update((d) => ({ ...d, payments: { ...d.payments, [row.key]: date } }));
    onClose();
  }
  return (
    <Dialog title={translate("Mark as paid")} onClose={onClose}>
      <form className="planner-form" onSubmit={submit}>
        <div className="payment-preview">
          <CategoryIcon category={row.category} name={row.name} />
          <div>
            <strong>{row.name}</strong>
            <p>{translate("Due") + " "}{dateLabel(row.date)}</p>
          </div>
          <strong>{money(row.amount)}</strong>
        </div>
        <label>{translate("Payment date")}<input
            autoFocus
            name="paidDate"
            type="date"
            defaultValue={today()}
            max={today()}
            required
          />
        </label>
        <p className="form-intro">{translate("This marks only the payment due on {{date}} as paid.", { date: dateLabel(row.date) })}</p>
        <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="button secondary" onClick={onClose}>{translate("Cancel")}</button>
          <button className="button primary">
            <Check size={16} />{translate("Confirm payment")}</button>
        </div>
      </form>
    </Dialog>
  );
}
