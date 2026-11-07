import { translate, useLanguage } from "../../i18n";
import { ArrowLeftRight, ArrowRight, Pencil } from "lucide-react";
import { useFinance } from "../../hooks/useFinance";
import { type Transfer } from "../../types/finance";
import { dateLabel, money } from "../../utils/finance";

export function TransferList({ transfers, onEdit }: { transfers: Transfer[]; onEdit: (transfer: Transfer) => void }) {
  useLanguage();
  const { data } = useFinance();
  if (!transfers.length) return <div className="empty-state"><ArrowLeftRight size={28} /><h3>{translate("Keep track of money you move")}</h3><p>{translate("No transfers recorded for this month.")}</p></div>;
  const accountName = (id: string) => data.accounts.find(account => account.id === id)?.name ?? translate("Account");
  return <div className="transfer-list">{transfers.map(transfer => <div className="transfer-row" key={transfer.id}><span className="transfer-row-icon"><ArrowLeftRight size={19} /></span><div className="transfer-row-description"><strong>{accountName(transfer.fromAccountId)} <ArrowRight size={14} /> {accountName(transfer.toAccountId)}</strong><small>{dateLabel(transfer.date)}{transfer.notes ? " · " + transfer.notes : ""}</small></div><b>{money(transfer.amount)}</b><button className="icon-button" aria-label={translate("Edit transfer from") + " " + accountName(transfer.fromAccountId) + " " + translate("to") + " " + accountName(transfer.toAccountId)} onClick={() => onEdit(transfer)}><Pencil size={16} /></button></div>)}</div>;
}
