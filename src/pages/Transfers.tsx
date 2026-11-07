import { translate, useLanguage } from "../i18n";
import { ArrowLeftRight, ArrowRight, ArrowUpRight, Check, Landmark, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { TransferForm } from "../components/transfers/TransferForm";
import { TransferList } from "../components/transfers/TransferList";
import { useFinance } from "../hooks/useFinance";
import { type Transfer } from "../types/finance";
import { money, monthLabel, today } from "../utils/finance";

export function Transfers() {
  useLanguage();
  const { data } = useFinance();
  const [parameters, setParameters] = useSearchParams();
  const requestedMonth = parameters.get("month");
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today().slice(0, 7);
  const setMonth = (value: string) => setParameters({ month: value }, { replace: true });
  const latestMonth = (data.transfers ?? []).reduce((latest, transfer) => transfer.date.slice(0, 7) > latest ? transfer.date.slice(0, 7) : latest, "");
  const [editing, setEditing] = useState<Transfer | "new" | null>(null);
  const [fromAccountId, setFromAccountId] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const transfers = (data.transfers ?? []).filter(transfer => transfer.date.startsWith(month)).slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
  const moved = transfers.reduce((total, transfer) => total + Math.round(transfer.amount * 100), 0) / 100;
  return (
    <section className="transfers-page min-w-0">
      <PageHeading
        title={translate("Transfers")}
        description={translate("A clear record of money moved between your own accounts.")}
      >
        <div className="expense-heading-actions">
          <MonthPicker month={month} setMonth={setMonth} />
          <button className="button primary" onClick={() => { setMessage(""); setFromAccountId(undefined); setEditing("new"); }}>
            <Plus size={16} />{translate("Move money")}</button>
        </div>
      </PageHeading>
      {message && <p className="transfer-message" role="status">{translate(message)}</p>}
      <div className="transfer-summary grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="stat-label">{translate("Moved this month")}<ArrowLeftRight size={18} /></div>
          <div className="stat-value">{money(moved)}</div>
          <p>{translate(transfers.length === 1 ? "{{count}} transfer in {{month}}" : "{{count}} transfers in {{month}}", { count: transfers.length, month: monthLabel(month) })}</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate("Transfers recorded")}<Check size={18} /></div>
          <div className="stat-value">{transfers.length.toString().padStart(2, "0")}</div>
          <p>{translate("Completed moves in") + " "}{monthLabel(month)}</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate("Combined recorded balance")}<Wallet size={18} /></div>
          <div className="stat-value">{money(data.accounts.reduce((sum, account) => sum + Math.round(account.balance * 100), 0) / 100)}</div>
          <p>{translate("Transfers keep your combined balance unchanged.")}</p>
        </div>
      </div>
      <div className="transfer-workspace">
      <section className="panel transfer-history-panel">
        <div className="panel-heading">
          <div><h2>{translate("Transfer history")}</h2><p>{translate("Your account-to-account moves in") + " "}{monthLabel(month)}</p></div>
          <span className="count-badge">{transfers.length}</span>
        </div>
        <TransferList transfers={transfers} onEdit={setEditing} />
        {!transfers.length && data.accounts.length >= 2 && <div className="transfer-month-shortcut"><button className="button secondary" onClick={() => { setMessage(""); setFromAccountId(undefined); setEditing("new"); }}><Plus size={15} />{translate("Record your first transfer")}</button></div>}
        {!transfers.length && latestMonth && latestMonth !== month && (
          <div className="transfer-month-shortcut">
            <button className="button secondary" onClick={() => setMonth(latestMonth)}>{translate("View") + " "}{monthLabel(latestMonth)}</button>
          </div>
        )}
      </section>
      <aside className="transfer-sidebar" aria-label={translate("Transfer accounts and guidance")}>
        <section className="panel transfer-accounts-panel">
          <div className="panel-heading"><div><h2>{translate("Your accounts")}</h2><p>{translate("Choose where to move money from")}</p></div><Link to="/accounts" className="text-button" aria-label={translate("Manage transfer accounts")}><ArrowUpRight size={17} /></Link></div>
          {data.accounts.length ? <div className="transfer-account-list">{data.accounts.map(account => <button className="transfer-account-option" key={account.id} onClick={() => { setMessage(""); setFromAccountId(account.id); setEditing("new"); }} aria-label={translate("Move money from") + " " + account.name}><span className="transfer-account-avatar" style={{ background: account.color }}>{account.name.slice(0, 1).toUpperCase()}</span><span><strong>{account.name}</strong><small>{money(account.balance)}</small></span><ArrowRight size={15} /></button>)}</div> : <div className="transfer-account-empty"><Landmark size={24} /><p>{translate("Add two accounts to start tracking your transfers.")}</p><Link to="/accounts" className="button secondary"><Plus size={15} />{translate("Add an account")}</Link></div>}
        </section>
        <section className="transfer-explainer">
          <span className="quick-icon blue"><ArrowLeftRight size={20} /></span><h2>{translate("One move. Both balances.")}</h2><p>{translate("Record a transfer and your account balances update together.")}</p>
          <ol><li><span>1</span>{translate("Choose the source and destination")}</li><li><span>2</span>{translate("Add the amount and date")}</li><li><span>3</span>{translate("Review the balances, then save")}</li></ol>
          <p className="transfer-explainer-note">{translate("This records a transfer you’ve already made. Your monthly income and expense totals stay the same.")}</p>
        </section>
      </aside>
      </div>
      {editing && <TransferForm transfer={editing === "new" ? undefined : editing} fromAccountId={fromAccountId} onClose={() => setEditing(null)} onSaved={value => { setMonth(value); setEditing(null); setMessage("Transfer history and recorded balances saved."); }} />}
    </section>
  );
}
