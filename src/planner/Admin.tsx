import { AdminProfiles } from "./AdminProfiles";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Save, RotateCcw } from "lucide-react";
import { useUsers } from "./users/context";
import { useFinance } from "./context";
import { isValidAdminSettings, type AdminSettings } from "./model";

export const placeholderAdminSettings: AdminSettings = {
  workspaceName: "savingsOS",
  supportEmail: "admin@example.com",
  monthlyBudget: 1500,
  reminderDays: 3,
  experimentalFeatures: false,
  announcement: "Welcome to savingsOS. This is a sample announcement.",
};

export function Admin() {
  const { currentUser, busy, saveAdminSettings } = useUsers();
  const { data } = useFinance();
  const [draft, setDraft] = useState<AdminSettings>(() => isValidAdminSettings(data.adminSettings) ? { ...data.adminSettings } : { ...placeholderAdminSettings });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (currentUser?.role !== "admin") return <section className="panel admin-access"><ShieldCheck size={28}/><h1>Admin access required</h1><p>Sign in with the admin account to manage these settings.</p><Link className="button secondary" to="/settings">Go to settings</Link></section>;
  const change = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setMessage("");
    setError("");
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setError("");
    try {
      await saveAdminSettings(draft);
      setMessage("Admin settings saved in the app.");
    } catch (e) { setError(e instanceof Error ? e.message : "Admin settings could not be saved."); }
  }
  return <section className="admin-page min-w-0">
    <div className="page-heading flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="eyebrow">YOUR APP, YOUR PREFERENCES</span><h1>Admin settings<span>.</span></h1><p>Manage the starting values for your app.</p></div><span className="admin-badge"><ShieldCheck size={16}/>{currentUser.name} · Admin</span></div>
    <div className="admin-placeholder-notice"><strong>Placeholder settings</strong><p>These values are saved for future features. They do not send emails, schedule reminders, change budgets, or display announcements to other users yet.</p></div>
    <form className="admin-settings-form" onSubmit={submit}>
      <fieldset disabled={busy} className="panel planner-form"><legend>App details</legend><div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>App name<input required maxLength={80} value={draft.workspaceName} onChange={e => change("workspaceName", e.target.value)}/></label>
        <label>Support email<input type="email" required maxLength={254} value={draft.supportEmail} onChange={e => change("supportEmail", e.target.value)}/></label>
        <label className="admin-full-width">Announcement<textarea rows={3} maxLength={500} value={draft.announcement} onChange={e => change("announcement", e.target.value)}/></label>
      </div></fieldset>
      <fieldset disabled={busy} className="panel planner-form"><legend>Planning defaults</legend><div className="form-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>Monthly budget (EUR)<input type="number" required min={0} max={1000000000} step="0.01" value={Number.isFinite(draft.monthlyBudget) ? draft.monthlyBudget : ""} onChange={e => change("monthlyBudget", e.target.value === "" ? NaN : Number(e.target.value))}/></label>
        <label>Reminder lead time (days)<input type="number" required min={0} max={30} step={1} value={Number.isFinite(draft.reminderDays) ? draft.reminderDays : ""} onChange={e => change("reminderDays", e.target.value === "" ? NaN : Number(e.target.value))}/></label>
      </div><label className="user-checkbox"><input type="checkbox" checked={draft.experimentalFeatures} onChange={e => change("experimentalFeatures", e.target.checked)}/><span><strong>Experimental features</strong><small>Placeholder switch for upcoming features.</small></span></label></fieldset>

      {error && <p className="user-error" role="alert">{error}</p>}{message && <p className="user-success" role="status">{message}</p>}
      <div className="admin-form-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="button secondary" disabled={busy} onClick={() => { setDraft({ ...placeholderAdminSettings }); setMessage("Placeholder values restored in the form. Save to apply."); setError(""); }}><RotateCcw size={16}/>Reset placeholders</button><button className="button primary" disabled={busy}><Save size={16}/>{busy ? "Saving…" : "Save admin settings"}</button></div>
    </form>
    <AdminProfiles/>
  </section>;
}
