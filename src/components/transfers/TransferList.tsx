import { translate, useLanguage } from "../../i18n";
import { ArrowLeftRight, ArrowRight, Pencil } from "lucide-react";
import { useFinance } from "../../hooks/useFinance";
import { type Transfer } from "../../types/finance";
import { dateLabel, money } from "../../utils/finance";
import { useTheme } from "../../hooks/useTheme";
import { isDesignTheme } from "../../utils/appearance";
import { studioMoney } from "../../utils/studio";

export function TransferList({
  transfers,
  onEdit,
}: {
  transfers: Transfer[];
  onEdit: (transfer: Transfer) => void;
}) {
  useLanguage();
  const { uiTheme } = useTheme();
  const { data } = useFinance();
  if (!transfers.length)
    return (
      <div className="empty-state">
        <ArrowLeftRight size={28} />
        <h3>{translate("Keep track of money you move")}</h3>
        <p>{translate("No transfers recorded for this month.")}</p>
      </div>
    );
  const accountName = (id: string) =>
    data.accounts.find((account) => account.id === id)?.name ??
    translate("Account");
  if (isDesignTheme(uiTheme))
    return (
      <div className="studio-table-wrap">
        <table className="studio-table studio-transfer-table">
          <thead>
            <tr>
              <th>{translate("Date")}</th>
              <th>{translate("From")}</th>
              <th>{translate("To")}</th>
              <th>{translate("Amount")}</th>
              <th>{translate("Notes")}</th>
              <th aria-label={translate("Actions")} />
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr className="transfer-row" key={transfer.id}>
                <td>
                  {dateLabel(transfer.date, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>{accountName(transfer.fromAccountId)}</td>
                <td>{accountName(transfer.toAccountId)}</td>
                <td className="studio-table-amount">
                  {studioMoney(transfer.amount)}
                </td>
                <td>{transfer.notes || "—"}</td>
                <td>
                  <button
                    className="icon-button text-button"
                    aria-label={
                      translate("Edit transfer from") +
                      " " +
                      accountName(transfer.fromAccountId) +
                      " " +
                      translate("to") +
                      " " +
                      accountName(transfer.toAccountId)
                    }
                    onClick={() => onEdit(transfer)}
                  >
                    {translate("Edit")}
                    <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="transfer-list">
      {transfers.map((transfer) => (
        <div className="transfer-row" key={transfer.id}>
          <span className="transfer-row-icon">
            <ArrowLeftRight size={19} />
          </span>
          <div className="transfer-row-description">
            <strong>
              {accountName(transfer.fromAccountId)} <ArrowRight size={14} />{" "}
              {accountName(transfer.toAccountId)}
            </strong>
            <small>
              {dateLabel(transfer.date)}
              {transfer.notes ? " · " + transfer.notes : ""}
            </small>
          </div>
          <b>{money(transfer.amount)}</b>
          <button
            className="icon-button"
            aria-label={
              translate("Edit transfer from") +
              " " +
              accountName(transfer.fromAccountId) +
              " " +
              translate("to") +
              " " +
              accountName(transfer.toAccountId)
            }
            onClick={() => onEdit(transfer)}
          >
            <Pencil size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
