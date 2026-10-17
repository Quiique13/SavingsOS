import { ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useFinance } from "./context";
import { getAccountActivity, money, monthLabel } from "./model";
const signed = (amount: number) => (amount > 0 ? "+" : "") + money(amount);
export function AccountActivity({ month }: { month: string }) {
  const { data } = useFinance();
  const activity = getAccountActivity(data, month);
  return <section className="account-activity-section" aria-label="Account activity"><div className="section-heading"><div><h2>Money in and out by account</h2><p>Income, actual payments, and internal transfers in {monthLabel(month)}.</p></div><div className="account-activity-links flex flex-wrap gap-3"><Link to="/accounts">Manage accounts</Link><Link to={"/transfers?month=" + month}><ArrowLeftRight size={15}/>Transfer history</Link></div></div>
    <div className="account-activity-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{activity.map(row => {
      const account = data.accounts.find(entry => entry.id === row.accountId)!;
      return <article className="panel account-activity-card" key={row.accountId} aria-label={account.name + " account activity"}><div className="account-activity-heading"><span className="account-logo" style={{ background: account.color }}>{account.name === "Trading 212" ? "212" : account.name.slice(0, 1).toUpperCase()}</span><div><h3>{account.name}</h3><small>Current recorded balance</small><strong>{money(account.balance)}</strong></div></div><dl><div><dt>Income</dt><dd>{signed(row.income)}</dd></div><div><dt>Paid expenses</dt><dd>{row.expenses ? "−" + money(row.expenses) : money(0)}</dd></div><div><dt>Transfers in</dt><dd>{signed(row.transfersIn)}</dd></div><div><dt>Transfers out</dt><dd>{row.transfersOut ? "−" + money(row.transfersOut) : money(0)}</dd></div><div className="account-activity-net"><dt>Net movement</dt><dd>{signed(row.net)}</dd></div></dl></article>;
    })}</div></section>;
}
