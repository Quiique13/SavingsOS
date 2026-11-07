import { Cloud, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuthentication } from "../../context/AuthenticationContext";
import { useUsers } from "../../hooks/useUsers";
import { translate, useLanguage } from "../../i18n";
import { Dialog } from "../common/Dialog";
import { PasswordInput } from "./PasswordInput";

export function OnlineAccountSettings() {
  useLanguage();
  const auth = useAuthentication();
  const { currentUser, busy, saving, configureUser, signOut, deleteOnlineAccount } = useUsers();
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  if (!auth?.user || !currentUser) return null;
  const account = auth;
  const disabled = busy || saving || account.busy;
  const passwordAccount = account.user!.providerData.some(provider => provider.providerId === "password");
  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try { await configureUser(String(new FormData(event.currentTarget).get("name") || ""), null); setRenaming(false); setMessage("Your user name has been updated."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The account request could not be completed. Try again."); }
  }
  async function send(kind: "reset" | "verify") {
    setError(""); setMessage("");
    try {
      if (kind === "reset") await account.resetPassword(account.user!.email!);
      else await account.verifyEmail();
      setMessage(kind === "reset" ? "If an account exists for this email, a password reset link has been sent." : "Verification email sent. Check your inbox.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The account request could not be completed. Try again."); }
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    try { await deleteOnlineAccount?.(String(new FormData(event.currentTarget).get("password") || "")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The account request could not be completed. Try again."); }
  }
  return <section className="panel settings-section online-account-settings">
    <span className="settings-icon"><Cloud size={22} /></span><div>
      <h2>{translate("Online account")}</h2>
      <div className="current-user-card"><div><strong>{currentUser.name}</strong><small>{account.user!.email}</small><small>{passwordAccount ? translate("Email and password") : translate("Google account")}</small></div></div>
      <p>{translate("Your planner syncs through Firebase while you are online. Changes from other devices appear automatically when there are no unsaved edits.")}</p>
      <div className="settings-actions flex flex-wrap gap-2">
        <button className="button secondary small" disabled={disabled} onClick={() => { setError(""); setRenaming(true); }}>{translate("Rename your user")}</button>
        {passwordAccount && <button className="button secondary small" disabled={disabled} onClick={() => void send("reset")}>{translate("Reset password")}</button>}
        {passwordAccount && !account.user!.emailVerified && <button className="button secondary small" disabled={disabled} onClick={() => void send("verify")}>{translate("Verify email address")}</button>}
        <button className="button secondary small" disabled={disabled} onClick={() => { void signOut().catch(cause => setError(cause.message)); }}><LogOut size={15} />{translate("Sign out")}</button>
        {deleteOnlineAccount && <button className="button secondary small admin-delete-button" disabled={disabled} onClick={() => { setError(""); setDeleting(true); }}>{translate("Delete online account")}</button>}
      </div>
      {message && <p className="status-message" role="status">{translate(message)}</p>}
      {error && !renaming && !deleting && <p className="user-error" role="alert">{translate(error)}</p>}
    </div>
    {renaming && <Dialog title={translate("Rename your user")} onClose={() => setRenaming(false)} canClose={!disabled}><form className="planner-form" onSubmit={rename}>
      <label>{translate("User name")}<input name="name" defaultValue={currentUser.name} autoComplete="name" autoFocus required maxLength={50} /></label>
      {error && <p className="user-error" role="alert">{translate(error)}</p>}
      <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button className="button secondary" type="button" disabled={disabled} onClick={() => setRenaming(false)}>{translate("Cancel")}</button><button className="button primary" disabled={disabled}>{translate("Save changes")}</button></div>
    </form></Dialog>}
    {deleting && <Dialog title={translate("Delete online account?")} onClose={() => setDeleting(false)} canClose={!disabled}><form className="planner-form" onSubmit={remove}>
      <p>{translate("This permanently deletes your online account and cloud planner. Local profiles and downloaded backups are kept. Export a backup first if you want a copy.")}</p>
      {passwordAccount ? <PasswordInput name="password" label={translate("Current password")} autoComplete="current-password" disabled={disabled} /> : <p className="form-intro">{translate("Google will ask you to confirm your identity before deletion.")}</p>}
      <label className="user-checkbox"><input type="checkbox" required disabled={disabled} /><span>{translate("I understand that this deletion cannot be undone.")}</span></label>
      {error && <p className="user-error" role="alert">{translate(error)}</p>}
      <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="button secondary" disabled={disabled} onClick={() => setDeleting(false)}>{translate("Cancel")}</button><button className="button transfer-danger" disabled={disabled}>{translate("Delete online account")}</button></div>
    </form></Dialog>}
  </section>;
}
