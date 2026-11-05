import { exportFile } from "../services/exportFile";
import { browserStorage } from "../services/runtime";
import type { Data } from '../types/finance';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ReceiptText,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "../components/common/Dialog";
import { PageHeading } from "../components/common/PageHeading";
import { AppearanceSettings } from "../components/theme/ThemeControls";
import { InstallApp } from "../components/common/InstallApp";
import { UserSettings } from "../components/users/UserSettings";
import { useFinance } from "../hooks/useFinance";
import { useUsers } from "../hooks/useUsers";
import { isValidBackup, today } from "../utils/finance";

export function Settings() {
  const { currentUser, exportProfile, busy, saving } = useUsers();
  const { data, save, clearDemo } = useFinance();
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Data | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const [restoring, setRestoring] = useState(false);
  async function backup() {
    try {
      const filename = "savingsos-" + (currentUser?.name || "user").replace(/[^a-zA-Z0-9-]/g, "-") + "-backup-" + today() + ".json";
      const exported = await exportFile(filename, JSON.stringify(data, null, 2));
      setMessage(exported ? "Backup exported. Keep it somewhere safe." : "Export cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The backup could not be exported. Try again.");
    }
  }
  async function restore() {
    if (!pending || restoring) return;
    setRestoreError(""); setRestoring(true);
    try {
      await save(() => ({ ...pending, initialized: true }));
      setPending(null); setMessage("Your backup has been restored.");
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "The backup could not be restored. Your saved data has been kept.");
    } finally { setRestoring(false); }
  }
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 10000000) throw Error();
      const parsed = JSON.parse(await f.text());
      if (!isValidBackup(parsed)) throw Error();
      setRestoreError(""); setPending(parsed);
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
        title="Settings"
        description="Manage your appearance, profile, and backups."
      />
      <div className="settings-stack flex w-full min-w-0 flex-col gap-4">
        <AppearanceSettings />
        <UserSettings />
        <InstallApp />
        {currentUser?.role !== "admin" && <section className="panel settings-section">
          <span className="settings-icon"><ArrowDownToLine size={22} /></span>
          <div>
            <h2>Portable profile</h2>
            <p>Move your profile, accounts, expenses, payment history, income, and transfers to another copy of savingsOS. Password-protected profiles keep their encryption and use the same password. Profiles without a password are exported unencrypted.</p>
            <p>In savingsOS on another browser or device, choose Import profile on the user screen and select this file. Existing profiles are kept. Each copy has independent records after import.</p>
            <button className="button primary small" disabled={busy || saving} onClick={() => {
              setMessage("");
              void exportProfile().then(exported => setMessage(exported ? "Portable profile exported. Import it from the other app’s user screen." : "Export cancelled.")).catch(error => setMessage(error instanceof Error ? error.message : "The profile could not be exported."));
            }}><ArrowDownToLine size={15} />{busy ? "Preparing profile…" : "Export portable profile"}</button>
          </div>
        </section>}
        <section className="panel settings-section">
          <span className="settings-icon">
            <Wallet size={22} />
          </span>
          <div>
            <h2>Planner setup</h2>
            <p>Currency: Euro (EUR) · Payment timezone: Europe/Lisbon</p>
            <p>
              Create and manage your spending, subscription, and savings accounts
              on the Accounts page.
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
              {browserStorage ? "Your profiles and finance records are saved only in this browser on this device. They are not uploaded to GitHub. Password-protected profiles keep their finance records encrypted." : "Your profiles and finance records are saved in this app's private data folder. Clearing browser data does not remove them."}
            </p>
            <p>
              {browserStorage ? "Clearing site data, using a different browser, or ending a private browsing session can remove this copy. Export a portable profile regularly to keep a backup or move to another browser or device." : "Export a backup regularly. The app data folder is excluded from Git, so your records stay out of the repository."}
            </p>
          </div>
        </section>
        <section className="panel settings-section">
          <span className="settings-icon">
            <ArrowDownToLine size={22} />
          </span>
          <div>
            <h2>Backup & restore</h2>
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
        <Dialog title="Restore your backup?" onClose={() => setPending(null)} canClose={!restoring}>
          <div className="planner-form">
            {restoreError && <p className="user-error" role="alert">{restoreError}</p>}
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
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={restoring}
                onClick={() => void restore()}
              >
                {restoring ? "Restoring..." : "Restore backup"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
