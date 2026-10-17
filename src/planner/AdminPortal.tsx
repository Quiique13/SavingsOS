import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { Brand } from "./Brand";
import { ThemeToggle } from "./theme/ThemeControls";
import { useUsers } from "./users/context";
import { useFinance } from "./context";
import { CreateUserDialog, PasswordInput, UserSettings } from "./users/Users";
import { Admin } from "./Admin";

export function AdminPortal() {
  const { ready, error: storageError } = useFinance();
  const { currentUser, users, busy, saving, signIn, signOut, error: bootError } = useUsers();
  const [settingUp, setSettingUp] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const admin = users.find(user => user.role === "admin");
  const notice = bootError || error || storageError;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin) return;
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    try { await signIn(admin.id, password); }
    catch (e) { setError(e instanceof Error ? e.message : "Admin sign-in could not be completed."); }
  }
  async function leave() {
    setError("");
    try { await signOut(); navigate("/", { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : "Your settings could not be saved. Try signing out again."); }
  }
  if (!ready) return <div className="loading-state"><p>Opening admin…</p></div>;
  if (currentUser?.role === "admin" && !bootError) return <div className="admin-portal">
    <header className="admin-portal-header"><Brand/><div><span className="admin-save-status">{saving ? "Saving…" : "Admin workspace"}</span><ThemeToggle/><button className="button secondary small" disabled={busy} onClick={() => void leave()}><LogOut size={16}/>Sign out</button></div></header>
    <main className="admin-portal-content">{notice && <p className="user-error" role="alert">{notice}</p>}<Admin key={currentUser.id}/><section className="admin-account-section"><UserSettings accountOnly/></section></main>
  </div>;
  return <div className="user-screen admin-signin-screen">
    <div className="user-screen-theme"><ThemeToggle/></div><Brand className="standalone-brand"/>
    <main className="user-welcome panel"><span className="user-welcome-icon"><ShieldCheck size={25}/></span><span className="eyebrow">ADMIN WORKSPACE</span><h1>{admin ? "Admin sign-in" : "Set up your admin"}</h1><p>{admin ? "Enter your admin password to manage app settings." : "Create a password-protected admin account for this app."}</p>
      {notice && <p className="user-error" role="alert">{notice}</p>}
      {!bootError && (admin ? <form className="planner-form sign-in-form" onSubmit={submit}>
        <label>Admin name<input name="username" autoComplete="username" value={admin.name} readOnly/></label>
        <PasswordInput name="password" label="Password" autoComplete="current-password"/>
        <button className="button primary" disabled={busy}><LockKeyhole size={16}/>{busy ? "Signing in…" : "Sign in as admin"}</button>
      </form> : <button className="button primary" disabled={busy} onClick={() => setSettingUp(true)}><ShieldCheck size={16}/>Set up admin account</button>)}
      <Link className="text-button admin-back-link" to="/"><ArrowLeft size={14}/>Back to app</Link>
    </main><p className="user-device-note"><LockKeyhole size={14}/>Admin access to this app.</p>
    {settingUp && !admin && <CreateUserDialog admin onClose={() => setSettingUp(false)}/>}
  </div>;
}
