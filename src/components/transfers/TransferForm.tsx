import { translate, useLanguage } from "../../i18n";
import { ArrowRight, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "../../hooks/useFinance";
import { type Transfer } from "../../types/finance";
import { deleteTransfer, money, saveTransfer, today } from "../../utils/finance";
import { Dialog } from "../common/Dialog";

const errorText = (error: unknown) => error instanceof Error ? error.message : "The transfer could not be saved. Try again.";

export function TransferForm({ transfer, fromAccountId, onClose, onSaved }: { transfer?: Transfer; fromAccountId?: string; onClose: () => void; onSaved: (month: string) => void }) {
  useLanguage();
  const { data, save } = useFinance();
  const [id] = useState(() => transfer?.id ?? crypto.randomUUID());
  const [from, setFrom] = useState(transfer?.fromAccountId ?? fromAccountId ?? data.accounts[0]?.id ?? "");
  const [to, setTo] = useState(transfer?.toAccountId ?? data.accounts.find(account => account.id !== from)?.id ?? "");
  const [amount, setAmount] = useState(transfer ? String(transfer.amount) : "");
  const [date, setDate] = useState(transfer?.date ?? today());
  const [notes, setNotes] = useState(transfer?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const draft: Transfer = { id, fromAccountId: from, toAccountId: to, amount: Number(amount), date, notes: notes.trim() };
  let preview = data;
  try { preview = saveTransfer(data, draft); } catch { /* Show the current balance until the form is valid. */ }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || deleting) return;
    setBusy(true); setError("");
    try { await save(previous => saveTransfer(previous, draft)); onSaved(date.slice(0, 7)); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!transfer || busy) return;
    setBusy(true); setError("");
    try { await save(previous => deleteTransfer(previous, transfer.id)); onSaved(transfer.date.slice(0, 7)); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <Dialog title={transfer ? translate("Edit transfer") : translate("Move money")} onClose={onClose} canClose={!busy}>
    {data.accounts.length < 2 ? <div className="planner-form"><p>{translate("Add another account to record a transfer between accounts.")}</p><Link className="button primary" to="/accounts" onClick={onClose}>{translate("Manage accounts")}</Link></div> : <form className="planner-form" onSubmit={submit}>
      <p className="form-intro">{translate("Record money moved between your own accounts. Both recorded balances update together, and your income and expense totals stay the same.")}</p>
      <fieldset className="contents" disabled={busy}>
        <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>{translate("From account")}<select name="fromAccount" required value={from} onChange={event => { const value = event.target.value; setFrom(value); if (to === value) setTo(data.accounts.find(account => account.id !== value)?.id ?? ""); }}>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label>{translate("To account")}<select name="toAccount" required value={to} onChange={event => setTo(event.target.value)}>{data.accounts.filter(account => account.id !== from).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label>{translate("Amount (€)")}<input autoFocus name="amount" type="number" required min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
          <label>{translate("Transfer date")}<input name="date" type="date" required max={today()} value={date} onChange={event => setDate(event.target.value)} /></label>
        </div>
        <label>{translate("Note (optional)")}<textarea name="notes" rows={2} maxLength={500} placeholder={translate("e.g. Monthly spending money")} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <div className="transfer-balance-preview" aria-label={translate("Recorded balance preview")}>{[from, to].map((accountId, index) => {
          const account = data.accounts.find(entry => entry.id === accountId);
          return <div key={index}><small>{index === 0 ? translate("From") : translate("To")} · {account?.name}</small><span>{money(account?.balance ?? 0)}<ArrowRight size={14} /><strong>{money(preview.accounts.find(entry => entry.id === accountId)?.balance ?? 0)}</strong></span></div>;
        })}</div>
        <p className="form-intro">{translate("The preview uses your current recorded balances. Update those on Accounts whenever you need a fresh bank balance snapshot.")}</p>
        {error && <p className="user-error" role="alert">{translate(error)}</p>}
        {deleting ? <div className="transfer-delete-confirm"><p>{translate("Delete {{amount}} transfer and reverse its balance changes?", { amount: money(transfer!.amount) })}</p><div className="flex flex-wrap gap-2"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>{translate("Keep transfer")}</button><button className="button primary transfer-danger" type="button" onClick={() => void remove()}>{translate("Delete and reverse transfer")}</button></div></div> : <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {transfer && <button type="button" className="danger-link" onClick={() => setDeleting(true)}><Trash2 size={15} />{translate("Delete transfer")}</button>}
          <button type="button" className="button secondary" onClick={onClose}>{translate("Cancel")}</button><button className="button primary" disabled={busy}>{busy ? translate("Saving transfer…") : transfer ? translate("Save transfer") : translate("Record transfer")}</button>
        </div>}
      </fieldset>
    </form>}
  </Dialog>;
}
