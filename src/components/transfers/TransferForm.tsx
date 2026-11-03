import { ArrowRight, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "../../hooks/useFinance";
import { type Transfer } from "../../types/finance";
import { deleteTransfer, money, saveTransfer, today } from "../../utils/finance";
import { Dialog } from "../common/Dialog";

const errorText = (error: unknown) => error instanceof Error ? error.message : "The transfer could not be saved. Try again.";

export function TransferForm({ transfer, fromAccountId, onClose, onSaved }: { transfer?: Transfer; fromAccountId?: string; onClose: () => void; onSaved: (month: string) => void }) {
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
  return <Dialog title={transfer ? "Edit transfer" : "Move money"} onClose={onClose} canClose={!busy}>
    {data.accounts.length < 2 ? <div className="planner-form"><p>Add another account to record a transfer between accounts.</p><Link className="button primary" to="/accounts" onClick={onClose}>Manage accounts</Link></div> : <form className="planner-form" onSubmit={submit}>
      <p className="form-intro">Record money moved between your own accounts. Both recorded balances update together, and your income and expense totals stay the same.</p>
      <fieldset className="contents" disabled={busy}>
        <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>From account<select name="fromAccount" required value={from} onChange={event => { const value = event.target.value; setFrom(value); if (to === value) setTo(data.accounts.find(account => account.id !== value)?.id ?? ""); }}>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label>To account<select name="toAccount" required value={to} onChange={event => setTo(event.target.value)}>{data.accounts.filter(account => account.id !== from).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label>Amount (€)<input autoFocus name="amount" type="number" required min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
          <label>Transfer date<input name="date" type="date" required max={today()} value={date} onChange={event => setDate(event.target.value)} /></label>
        </div>
        <label>Note (optional)<textarea name="notes" rows={2} maxLength={500} placeholder="e.g. Monthly spending money" value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <div className="transfer-balance-preview" aria-label="Recorded balance preview">{[from, to].map((accountId, index) => {
          const account = data.accounts.find(entry => entry.id === accountId);
          return <div key={index}><small>{index === 0 ? "From" : "To"} · {account?.name}</small><span>{money(account?.balance ?? 0)}<ArrowRight size={14} /><strong>{money(preview.accounts.find(entry => entry.id === accountId)?.balance ?? 0)}</strong></span></div>;
        })}</div>
        <p className="form-intro">The preview uses your current recorded balances. Update those on Accounts whenever you need a fresh bank balance snapshot.</p>
        {error && <p className="user-error" role="alert">{error}</p>}
        {deleting ? <div className="transfer-delete-confirm"><p>Delete this {money(transfer!.amount)} transfer and reverse its balance changes?</p><div className="flex flex-wrap gap-2"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>Keep transfer</button><button className="button primary transfer-danger" type="button" onClick={() => void remove()}>Delete and reverse transfer</button></div></div> : <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {transfer && <button type="button" className="danger-link" onClick={() => setDeleting(true)}><Trash2 size={15} />Delete transfer</button>}
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving transfer…" : transfer ? "Save transfer" : "Record transfer"}</button>
        </div>}
      </fieldset>
    </form>}
  </Dialog>;
}
