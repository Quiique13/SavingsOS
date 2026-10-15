import { Brand } from "../Brand";
import { ThemeToggle } from "../theme/ThemeControls";
import { useState, type FormEvent } from "react";
import { LockKeyhole, UserRound, Users, Plus, ArrowRight, ArrowLeft, ShieldCheck, LogOut, Pencil, KeyRound, Eye, EyeOff } from "lucide-react";
import { Dialog } from "../Dialog";
import { useFinance } from "../context";
import { useUsers } from "./context";
import type { User } from "./vault";
const errorText = (error: unknown) => error instanceof Error ? error.message : "This change could not be completed. Please try again.";
export const initials = (name: string) => Array.from(name.trim())[0]?.toUpperCase() || "P";
function PasswordInput({ name, label, autoComplete, required = true, minLength }: {
    name: string;
    label: string;
    autoComplete: string;
    required?: boolean;
    minLength?: number;
}) {
    const [visible, setVisible] = useState(false);
    return <label>{label}<span className="password-field"><input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} maxLength={128} required={required}/><button type="button" className="icon-button" aria-label={visible ? "Hide " + label.toLowerCase() : "Show " + label.toLowerCase()} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>;
}
export function CreateUserDialog({ onClose }: {
    onClose: () => void;
}) {
    const { createUser, busy } = useUsers();
    const [protectedUser, setProtectedUser] = useState(false);
    const [error, setError] = useState("");
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        const form = new FormData(event.currentTarget);
        const password = protectedUser ? String(form.get("password")) : "";
        if (protectedUser && password !== String(form.get("confirm"))) {
            setError("The passwords don't match.");
            return;
        }
        try {
            await createUser(String(form.get("name")), password);
            onClose();
        }
        catch (e) {
            setError(errorText(e));
        }
    }
    return <Dialog title="Create a user" onClose={onClose} canClose={!busy}><form className="planner-form" onSubmit={submit}>
    <p className="form-intro">A separate space for their accounts, expenses, income, and payments. New users start with an empty planner.</p>
    <label>User name<input autoFocus name="name" autoComplete="username" placeholder="e.g. Ana" required maxLength={50}/></label>
    <label className="user-checkbox"><input type="checkbox" checked={protectedUser} onChange={e => setProtectedUser(e.target.checked)}/><span><strong>Protect with a password</strong><small>Require a password to open this user's planner.</small></span><LockKeyhole size={18}/></label>
    {protectedUser && <><PasswordInput name="password" label="Password" autoComplete="new-password" minLength={8}/><PasswordInput name="confirm" label="Confirm password" autoComplete="new-password" minLength={8}/><p className="password-note">Use at least 8 characters. Passwords cannot be recovered, so keep a finance backup in a safe place.</p></>}
    {!protectedUser && <p className="password-note">Without a password, anyone using this browser can open this profile.</p>}
    {error && <p className="user-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Creating user…" : "Create user"}<Plus size={16}/></button></div>
  </form></Dialog>;
}
export function UserChooser() {
    const { users, busy, signIn, error: bootError } = useUsers();
    const [selected, setSelected] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        const password = String(new FormData(event.currentTarget).get("password") || "");
        try {
            await signIn(selected!.id, password);
        }
        catch (e) {
            setError(errorText(e));
        }
    }
    return <div className="user-screen"><div className="user-screen-theme"><ThemeToggle/></div><Brand className="standalone-brand"/><section className="user-welcome panel">
    <span className="user-welcome-icon">{selected?.hasPassword ? <LockKeyhole size={25}/> : <Users size={25}/>}</span>
    <span className="eyebrow">YOUR PERSONAL FINANCE SPACE</span><h1>{selected ? "Welcome, " + selected.name + "." : "Your money. Your space."}</h1>
    <p>{selected ? selected.hasPassword ? "Enter your password to unlock your planner." : "Open your personal planner to pick up where you left off." : "Choose a user to open their planner."}</p>
    {bootError ? <div className="user-error" role="alert">{bootError}<p>Reload the app after resolving the storage problem. Existing records have been kept.</p></div> : selected ? <form onSubmit={submit} className="planner-form sign-in-form">
      {selected.hasPassword && <PasswordInput key={selected.id} name="password" label="Password" autoComplete="current-password"/>}
      {!selected.hasPassword && <div className="user-unprotected"><UserRound size={18}/>This user has no password.</div>}
      {error && <p className="user-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? "Opening planner…" : "Open planner"}<ArrowRight size={16}/></button>
      <button type="button" className="text-button" disabled={busy} onClick={() => { setSelected(null); setError(""); }}><ArrowLeft size={14}/>Choose another user</button>
      {selected.hasPassword && <p className="password-note">Passwords can't be recovered. If you forget yours, create a new user and restore a finance backup.</p>}
    </form> : <><div className="user-list">{users.map(user => <button key={user.id} className="user-choice" disabled={busy} onClick={() => { setSelected(user); setError(""); }}><span className="user-avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.hasPassword ? "Password protected" : "No password"}</small></span>{user.hasPassword ? <LockKeyhole size={17}/> : <ArrowRight size={17}/>}</button>)}</div><button className="button secondary create-user-button" onClick={() => setCreating(true)}><Plus size={16}/>Create another user</button></>}
  </section><p className="user-device-note"><ShieldCheck size={14}/>Local profiles on this browser and device.</p>{creating && <CreateUserDialog onClose={() => setCreating(false)}/>}</div>;
}
export function UserSettings() {
    const { users, currentUser, busy, configureUser, signOut } = useUsers();
    const [action, setAction] = useState<"name" | "password" | "remove" | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    if (!currentUser)
        return null;
    const user = currentUser;
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        const form = new FormData(event.currentTarget);
        const password = action === "password" ? String(form.get("password")) : action === "remove" ? "" : null;
        if (action === "password" && password !== String(form.get("confirm"))) {
            setError("The passwords don't match.");
            return;
        }
        try {
            await configureUser(action === "name" ? String(form.get("name")) : user.name, password, String(form.get("current") || ""));
            setMessage(action === "name" ? "Your user name has been updated." : action === "remove" ? "Password removed. This profile can now be opened without a password." : "Your password has been saved.");
            setAction(null);
        }
        catch (e) {
            setError(errorText(e));
        }
    }
    function open(next: typeof action) { setError(""); setMessage(""); setAction(next); }
    return <section className="panel settings-section users-settings"><span className="settings-icon"><Users size={22}/></span><div><h2>Users & passwords</h2><p>Each user has their own accounts, expenses, income, and payment history.</p><div className="current-user-card"><span className="user-avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.hasPassword ? "Password protected · saved profile data is encrypted" : "No password · anyone using this browser can open this profile"}</small></div><button className="icon-button" disabled={busy} aria-label="Rename current user" onClick={() => open("name")}><Pencil size={15}/></button></div><div className="settings-actions user-settings-actions"><button className="button secondary small" disabled={busy} onClick={() => open("password")}><KeyRound size={15}/>{user.hasPassword ? "Change password" : "Set a password"}</button>{user.hasPassword && <button className="button secondary small" disabled={busy} onClick={() => open("remove")}>Remove password</button>}<button className="button secondary small" disabled={busy} onClick={() => setCreating(true)}><Plus size={15}/>Create user</button><button className="button secondary small" disabled={busy} onClick={() => { setError(""); void signOut().catch(e => setError(errorText(e))); }}><LogOut size={15}/>Switch user</button></div><p className="user-count">{users.length} user{users.length === 1 ? "" : "s"} on this browser · {users.map(u => u.name).join(", ")}</p><p className="password-note">Password protection encrypts the saved data for this profile. Exported finance backups and older app copies are separate. There is no password recovery or device sync.</p>{message && <p className="user-success" role="status">{message}</p>}{error && !action && <p className="user-error" role="alert">{error}</p>}</div>
    {creating && <CreateUserDialog onClose={() => setCreating(false)}/>}
    {action && <Dialog title={action === "name" ? "Rename your user" : action === "remove" ? "Remove password?" : user.hasPassword ? "Change your password" : "Set a password"} onClose={() => setAction(null)} canClose={!busy}><form className="planner-form" onSubmit={submit}>
      {action === "name" ? <label>User name<input autoFocus name="name" defaultValue={user.name} required maxLength={50} autoComplete="username"/></label> : <>{user.hasPassword && <PasswordInput name="current" label="Current password" autoComplete="current-password"/>}{action === "password" ? <><PasswordInput name="password" label="New password" autoComplete="new-password" minLength={8}/><PasswordInput name="confirm" label="Confirm new password" autoComplete="new-password" minLength={8}/><p className="password-note">Use 8 to 128 characters. Keep it somewhere safe: forgotten passwords cannot be recovered.</p></> : <p className="form-intro">Anyone using this browser will be able to open {user.name}'s planner without a password.</p>}</>}
      {error && <p className="user-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setAction(null)}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving…" : action === "remove" ? "Remove password" : "Save changes"}<ShieldCheck size={16}/></button></div>
    </form></Dialog>}
  </section>;
}
export function UserGate({ children }: {
    children: React.ReactNode;
}) {
    const { currentUser, error } = useUsers();
    const { ready } = useFinance();
    if (!ready)
        return <div className="loading-state"><img src="/SOSLogo.svg" alt="" width={42} height={42}/><p>Opening your personal finance space…</p></div>;
    if (error || !currentUser)
        return <UserChooser />;
    return <div key={currentUser.id}>{children}</div>;
}
