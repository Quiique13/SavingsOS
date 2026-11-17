import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { translate, useLanguage } from "../../i18n";
import { useFinance } from "../../hooks/useFinance";
import { monthLabel, today } from "../../utils/finance";
import { resetMonth } from "../../utils/resetMonth";
import { Dialog } from "../common/Dialog";
import { MonthPicker } from "../common/MonthPicker";

export function ResetMonth() {
  useLanguage();
  const { data, save } = useFinance();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const marks = Object.keys(data.payments).filter(key => key.slice(key.lastIndexOf(":") + 1).startsWith(month + "-")).length;
  const transfers = (data.transfers ?? []).filter(entry => entry.date.startsWith(month + "-")).length;
  async function confirm() {
    setBusy(true); setError("");
    try {
      await save(current => resetMonth(current, month));
      setOpen(false); setMessage(translate("{{month}} has been reset. Income and expense definitions were kept.", {month:monthLabel(month)}));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The month could not be reset. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="panel account-month-reset">
    <div><h2>{translate("Start the month fresh")}</h2><p>{translate("Clear a month's payment marks and reverse its transfers. Keep all income, expense definitions, and other months.")}</p></div>
    <div className="account-reset-controls"><MonthPicker month={month} setMonth={setMonth} inline /><button className="button secondary" onClick={() => {setError("");setMessage("");setOpen(true);}}><RotateCcw size={16}/>{translate("Reset month")}</button></div>
    {message && <p role="status">{message}</p>}
    {open && <Dialog title={translate("Reset {{month}}?", {month:monthLabel(month)})} onClose={() => setOpen(false)} canClose={!busy}>
      <div className="planner-form">
        <p>{translate("This clears {{payments}} payment marks for expenses due in this month and removes {{transfers}} transfers dated in this month. Those transfers will be reversed in the recorded account balances.", {payments:marks,transfers})}</p>
        <p>{translate("All income, including last month's funding income, and all saved expense definitions will be kept. Other months are unchanged.")}</p>
        <p>{translate("This cannot be undone here. Export a backup first if you want to keep a copy.")}</p>
        {error && <p className="user-error" role="alert">{translate(error)}</p>}
        <div className="dialog-actions"><button className="button secondary" disabled={busy} onClick={() => setOpen(false)}>{translate("Cancel")}</button><button className="button primary" disabled={busy || (!marks && !transfers)} onClick={() => void confirm()}>{translate(busy ? "Resetting month..." : "Confirm reset")}</button></div>
      </div>
    </Dialog>}
  </section>;
}
