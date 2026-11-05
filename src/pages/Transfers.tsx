import { ArrowLeftRight, Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { TransferForm } from "../components/transfers/TransferForm";
import { TransferList } from "../components/transfers/TransferList";
import { useFinance } from "../hooks/useFinance";
import { type Transfer } from "../types/finance";
import { money, monthLabel, today } from "../utils/finance";

export function Transfers() {
  const { data } = useFinance();
  const [parameters, setParameters] = useSearchParams();
  const requestedMonth = parameters.get("month");
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today().slice(0, 7);
  const setMonth = (value: string) => setParameters({ month: value }, { replace: true });
  const latestMonth = (data.transfers ?? []).reduce((latest, transfer) => transfer.date.slice(0, 7) > latest ? transfer.date.slice(0, 7) : latest, "");
  const [editing, setEditing] = useState<Transfer | "new" | null>(null);
  const [message, setMessage] = useState("");
  const transfers = (data.transfers ?? []).filter(transfer => transfer.date.startsWith(month)).slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
  const moved = transfers.reduce((total, transfer) => total + Math.round(transfer.amount * 100), 0) / 100;
  return (
    <section className="transfers-page min-w-0">
      <PageHeading
        title="Transfers"
        description="Track money moved between your accounts."
      >
        <div className="expense-heading-actions">
          <MonthPicker month={month} setMonth={setMonth} />
          <button className="button primary" onClick={() => { setMessage(""); setEditing("new"); }}>
            <Plus size={16} />Move money
          </button>
        </div>
      </PageHeading>
      {message && <p className="transfer-message" role="status">{message}</p>}
      <div className="transfer-summary grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <div className="stat-label">Moved this month<ArrowLeftRight size={18} /></div>
          <div className="stat-value">{money(moved)}</div>
          <p>{transfers.length} transfer{transfers.length === 1 ? "" : "s"} in {monthLabel(month)}</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">Combined recorded balance</div>
          <div className="stat-value">{money(data.accounts.reduce((sum, account) => sum + Math.round(account.balance * 100), 0) / 100)}</div>
          <p>Transfers keep your combined balance unchanged.</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Transfer history</h2><p>Select the edit icon to update or reverse a transfer.</p></div>
          <span className="count-badge">{transfers.length}</span>
        </div>
        <TransferList transfers={transfers} onEdit={setEditing} />
        {!transfers.length && latestMonth && latestMonth !== month && (
          <div className="transfer-month-shortcut">
            <button className="button secondary" onClick={() => setMonth(latestMonth)}>View {monthLabel(latestMonth)}</button>
          </div>
        )}
      </section>
      {editing && <TransferForm transfer={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={value => { setMonth(value); setEditing(null); setMessage("Transfer history and recorded balances saved."); }} />}
    </section>
  );
}
