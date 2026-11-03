import {
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Landmark,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "../components/common/Dialog";
import { PageHeading } from "../components/common/PageHeading";
import { TransferForm } from "../components/transfers/TransferForm";
import { useFinance } from "../hooks/useFinance";
import { type Account } from "../types/finance";
import { money } from "../utils/finance";

export function Accounts({ savings = false }: { savings?: boolean }) {
  const { data, update } = useFinance();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [moving, setMoving] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [remove, setRemove] = useState(false);
  const list = data.accounts.filter((a) => !savings || a.kind === "Savings");
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a: Account = {
      id: editing !== "new" && editing ? editing.id : crypto.randomUUID(),
      name: String(f.get("name")).trim(),
      provider: String(f.get("provider")).trim(),
      balance: Number(f.get("balance")),
      kind: String(f.get("kind")) as Account["kind"],
      color: editing !== "new" && editing ? editing.color : "#a4c8b7",
    };
    if (!a.name || !Number.isFinite(a.balance)) return;
    update((d) => ({
      ...d,
      accounts:
        editing === "new"
          ? [...d.accounts, a]
          : d.accounts.map((item) => (item.id === a.id ? a : item)),
    }));
    setEditing(null);
  }
  const actual = editing && editing !== "new" ? editing : null;
  return (
    <section
      className={
        savings ? "accounts-page savings-page min-w-0" : "accounts-page min-w-0"
      }
    >
      <PageHeading
        kicker={
          savings
            ? "A LITTLE TODAY. MORE POSSIBILITIES TOMORROW."
            : "DIFFERENT ACCOUNTS. ONE CLEAR PICTURE."
        }
        title={savings ? "Savings & investments" : "Your accounts"}
        description={
          savings
            ? "Keep an eye on the money you're setting aside."
            : "Bleap for the everyday. moey! for the regulars. Trading 212 for the future."
        }
      >
        <div className="page-actions flex flex-col gap-2 sm:flex-row"><button className="button secondary" onClick={() => { setTransferMessage(""); setMoving(true); }}><ArrowLeftRight size={16} />Move money</button><button
          className="button primary"
          onClick={() => {
            setEditing("new");
            setRemove(false);
          }}
        >
          <Plus size={16} />
          Add {savings ? "savings account" : "account"}
        </button></div>
      </PageHeading>
      {transferMessage && <p className="transfer-message" role="status">{transferMessage}</p>}
      <div className="account-notice">
        <ShieldCheck size={17} />
        <span>
          Manually tracked · Transfers update both recorded balances. Set a fresh
          balance snapshot whenever you check your bank.
        </span>
      </div>
      <div className="account-cards full-accounts grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <section
            className={
              "panel account-card " +
              (a.kind === "Savings" ? "savings-card" : "")
            }
            key={a.id}
          >
            <div className="account-card-head">
              <div className="account-logo" style={{ background: a.color }}>
                {a.name === "Trading 212"
                  ? "212"
                  : a.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="account-type">{a.kind}</span>
              <button
                className="icon-button"
                aria-label={"Edit " + a.name}
                onClick={() => {
                  setEditing(a);
                  setRemove(false);
                }}
              >
                <Pencil size={16} />
              </button>
            </div>
            <h2>{a.name}</h2>
            <p>{a.provider}</p>
            <span className="eyebrow">RECORDED BALANCE</span>
            <div className="account-balance">{money(a.balance)}</div>
            <div className="account-card-footer">
              <span>EUR · Manual tracking</span>
              <button
                onClick={() => {
                  setEditing(a);
                  setRemove(false);
                }}
              >
                Update balance
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
        ))}
      </div>
      {!list.length && (
        <div className="panel empty-state">
          <Landmark size={30} />
          <h3>Make a little room for the future</h3>
          <p>Add a savings account to track your progress.</p>
        </div>
      )}
      <section className="panel account-explainer">
        <div className="tip-icon">
          <CircleHelp size={21} />
        </div>
        <div>
          <h3>Everything has its place</h3>
          <p>
            {savings
              ? "Update your reported balance whenever you check Trading 212. This keeps your savings overview current without assuming investment returns."
              : "Assign an account to each expense to see which balance needs to cover it. Payment tracking and reported balances are separate, so enter your latest bank balance whenever you need a fresh snapshot."}
          </p>
        </div>
        <Link
          to={savings ? "/accounts" : "/expenses"}
          className="button secondary small"
        >
          {savings ? "All accounts" : "See expenses"}
          <ArrowUpRight size={15} />
        </Link>
      </section>
      {moving && <TransferForm onClose={() => setMoving(false)} onSaved={() => { setMoving(false); setTransferMessage("Transfer history and recorded balances saved."); }} />}
      {editing && (
        <Dialog
          title={editing === "new" ? "Add an account" : "Update account"}
          onClose={() => setEditing(null)}
        >
          <form className="planner-form" onSubmit={save}>
            <label>
              Account name
              <input
                autoFocus
                name="name"
                defaultValue={actual?.name}
                placeholder="e.g. Trading 212"
                required
                maxLength={80}
              />
            </label>
            <label>
              Description
              <input
                name="provider"
                defaultValue={actual?.provider}
                placeholder="What do you use it for?"
                maxLength={120}
              />
            </label>
            <div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                Purpose
                <select
                  name="kind"
                  defaultValue={
                    actual?.kind || (savings ? "Savings" : "Spending")
                  }
                >
                  {["Spending", "Subscriptions", "Savings"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Reported balance (€)
                <input
                  type="number"
                  step="0.01"
                  name="balance"
                  defaultValue={actual?.balance ?? 0}
                  required
                />
              </label>
            </div>
            <p className="form-intro">
              Enter your current balance as a snapshot. Recording a bill payment
              doesn't change this number. Transfers adjust both recorded balances.
            </p>
            {actual &&
              (data.accounts.length === 1 ||
                data.expenses.some((e) => e.accountId === actual.id) ||
                data.income.some((i) => i.accountId === actual.id) ||
                (data.transfers ?? []).some(transfer => transfer.fromAccountId === actual.id || transfer.toAccountId === actual.id) ? (
                <p className="form-intro">
                  Keep at least one account, and reassign its expenses and
                  income before removing it. Accounts linked to transfer history
                  must be kept until those transfers are reassigned or reversed.
                </p>
              ) : (
                <div className="delete-area">
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() =>
                      remove
                        ? (update((d) => ({
                          ...d,
                          accounts: d.accounts.filter(
                            (a) => a.id !== actual.id,
                          ),
                        })),
                          setEditing(null))
                        : setRemove(true)
                    }
                  >
                    <Trash2 size={14} />
                    {remove ? "Confirm remove account" : "Remove account"}
                  </button>
                </div>
              ))}
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button primary">
                Save account
                <Check size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
