import { useState, type FormEvent } from "react";
import { Download, Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useUsers } from "./users/context";
import type { ListedUser } from "./users/vault";
import { CreateUserDialog } from "./users/Users";
import { Dialog } from "./Dialog";
const errorText = (error: unknown) => error instanceof Error ? error.message : "This profile could not be updated. Try again.";

export function AdminProfiles() {
  const { users, currentUser, busy, renameUser, deleteUser, refreshUsers, exportProfiles } = useUsers();
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<{ user: ListedUser; action: "rename" | "delete" } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  if (currentUser?.role !== "admin") return null;
  const profiles = users.filter(user => user.role !== "admin");
  function open(user: ListedUser, action: "rename" | "delete") {
    setPending({ user, action }); setConfirmation(""); setError(""); setMessage("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) return;
    setError("");
    try {
      if (pending.action === "delete") {
        if (confirmation !== pending.user.name) { setError("Type the profile name exactly to confirm deletion."); return; }
        await deleteUser(pending.user.id, pending.user.revision);
        setMessage(pending.user.name + " and their finance records have been deleted.");
      } else {
        await renameUser(pending.user.id, pending.user.revision, String(new FormData(event.currentTarget).get("name") || ""));
        setMessage("Profile name updated.");
      }
      setPending(null);
    } catch (e) { setError(errorText(e)); }
  }
  async function refresh() {
    setError(""); setMessage("");
    try { await refreshUsers(); }
    catch (e) { setError(errorText(e)); }
  }
  async function backup() {
    setError(""); setMessage("");
    try { await exportProfiles(); setMessage("All profiles exported. Keep this file in a safe place."); }
    catch (e) { setError(errorText(e)); }
  }
  return <section className="panel admin-users admin-profile-manager" aria-label="Profile management">
    <div className="admin-profiles-heading"><div><Users size={20}/><h2>Local users</h2></div><div className="admin-profile-actions"><button type="button" className="button secondary small" disabled={busy} onClick={() => void backup()}><Download size={15}/>Export all profiles</button><button type="button" className="button secondary small" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15}/>Refresh</button><button type="button" className="button primary small" disabled={busy} onClick={() => { setError(""); setCreating(true); }}><Plus size={15}/>Create user</button></div></div>
    <p>Create, rename, or delete regular profiles. Each profile has its own planner.</p>
    {!profiles.length ? <p>No regular profiles yet. Create a user to get started.</p> : <ul>{profiles.map(user => <li key={user.id}><div className="admin-profile-details"><strong>{user.name}</strong><span>{user.hasPassword ? "Password protected" : "No password"}</span></div><div className="admin-profile-actions"><button type="button" className="button secondary small" disabled={busy} aria-label={"Rename profile " + user.name} onClick={() => open(user, "rename")}><Pencil size={14}/>Rename</button><button type="button" className="button secondary small admin-delete-button" disabled={busy} aria-label={"Delete profile " + user.name} onClick={() => open(user, "delete")}><Trash2 size={14}/>Delete</button></div></li>)}</ul>}
    {error && !pending && <p className="user-error" role="alert">{error}</p>}{message && <p className="user-success" role="status">{message}</p>}
    {creating && <CreateUserDialog onClose={() => setCreating(false)}/>}
    {pending && <Dialog title={pending.action === "delete" ? "Delete profile?" : "Rename profile"} onClose={() => setPending(null)} canClose={!busy}>
      <form className="planner-form" onSubmit={submit}>
        {pending.action === "delete" ? <><p>Delete <strong>{pending.user.name}</strong> and all their saved accounts, expenses, income, and payment history? This cannot be undone.</p><p className="form-intro">Keep an exported finance backup first if these records are needed.</p><label>Type {pending.user.name} to confirm<input autoFocus required autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy}/></label></> : <label>Profile name<input autoFocus name="name" required maxLength={50} defaultValue={pending.user.name} disabled={busy}/></label>}
        {error && <p className="user-error" role="alert">{error}</p>}
        <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="button secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</button><button className={"button primary " + (pending.action === "delete" ? "admin-delete-confirm" : "")} disabled={busy || (pending.action === "delete" && confirmation !== pending.user.name)}>{busy ? "Saving…" : pending.action === "delete" ? "Delete profile" : "Save name"}</button></div>
      </form>
    </Dialog>}
  </section>;
}
