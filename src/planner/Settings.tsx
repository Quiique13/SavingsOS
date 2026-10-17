import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpRight,
  Upload,
  ReceiptText,
  ArrowRight,
} from "lucide-react";
import { AppearanceSettings } from "./theme/ThemeControls";
import { UserSettings } from "./users/Users";
import { useUsers } from "./users/context";
import { useFinance } from "./context";
import { isValidBackup, today } from "./model";
import { PageHeading } from "./PageHeading";
import { Dialog } from "./Dialog";

export function Settings() {
  const { currentUser } = useUsers();
  const { data, update, clearDemo } = useFinance();
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<import("./model").Data | null>(null);
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "savingsos-" +
      (currentUser?.name || "user").replace(/[^a-zA-Z0-9-]/g, "-") +
      "-backup-" +
      today() +
      ".json";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup exported. Keep it somewhere safe.");
  }
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 10000000) throw Error();
      const parsed = JSON.parse(await f.text());
      if (!isValidBackup(parsed)) throw Error();
      setPending(parsed);
    } catch {
      setMessage(
        "This file is not a valid savingsOS backup. No data was changed.",
      );
    }
    if (file.current) file.current.value = "";
  }
  return (
    <section className="settings-page min-w-0">
      <PageHeading
        kicker="MAKE YOURSELF AT HOME"
        title="Settings"
        description="Your preferences, your records, your peace of mind."
      />
      <div className="settings-stack flex w-full min-w-0 flex-col gap-4">
        <AppearanceSettings />
        <UserSettings />
        <section className="panel settings-section">
          <span className="settings-icon">
            <Wallet size={22} />
          </span>
          <div>
            <h2>A little about your setup</h2>
            <p>Currency: Euro (EUR) · Payment timezone: Europe/Lisbon</p>
            <p>
              Bleap for everyday spending, moey! for subscriptions, and Trading
              212 for savings. You can edit these on the Accounts page.
            </p>
          </div>
          <Link to="/accounts" className="button secondary small">
            Your accounts
            <ArrowUpRight size={14} />
          </Link>
        </section>
        <section className="panel settings-section">
          <span className="settings-icon">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2>Your data stays with you</h2>
            <p>
              Your profiles and finance records are saved in this app's private
              data folder. Clearing browser data does not remove them.
            </p>
            <p>
              Export a backup regularly. The app data folder is excluded from
              Git, so your records stay out of the repository.
            </p>
          </div>
        </section>
        <section className="panel settings-section">
          <span className="settings-icon">
            <ArrowDownToLine size={22} />
          </span>
          <div>
            <h2>A copy for safekeeping</h2>
            <p>
              Download accounts, expenses, payment dates, income, and transfers for the
              current user. This exported JSON file is not password protected;
              keep it somewhere safe.
            </p>
            <div className="settings-actions flex flex-wrap gap-2">
              <button className="button primary small" onClick={backup}>
                <ArrowDownToLine size={15} />
                Export backup
              </button>
              <button
                className="button secondary small"
                onClick={() => file.current?.click()}
              >
                <Upload size={15} />
                Restore backup
              </button>
              <input
                hidden
                ref={file}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </div>
          </div>
        </section>
        {data.expenses.some((e) => e.demo) && (
          <section className="panel settings-section">
            <span className="settings-icon">
              <ReceiptText size={22} />
            </span>
            <div>
              <h2>Ready to make it yours?</h2>
              <p>
                You're seeing a few sample expenses to help you explore. Remove
                them and start with your own numbers. Your own entries and
                accounts will be kept.
              </p>
              <button
                className="button secondary small"
                onClick={() => {
                  clearDemo();
                  setMessage(
                    "Sample expenses removed. Your own records are all here.",
                  );
                }}
              >
                Remove sample expenses
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )}
        {message && (
          <p className="settings-message" role="status">
            {message}
          </p>
        )}
      </div>
      {pending && (
        <Dialog title="Restore your backup?" onClose={() => setPending(null)}>
          <div className="planner-form">
            <p>
              This backup contains {pending.accounts.length} accounts,{" "}
              {pending.expenses.length} expenses, and {pending.income.length}{" "}
              income entries, and {(pending.transfers ?? []).length} transfers. Restoring it replaces only the current user
              profile. Other users are kept.
            </p>
            <p className="form-intro">
              Export your current records first if you want to keep a copy.
            </p>
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="button secondary"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={() => {
                  update(() => ({ ...pending, initialized: true }));
                  setPending(null);
                  setMessage("Your backup has been restored.");
                }}
              >
                Restore backup
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
