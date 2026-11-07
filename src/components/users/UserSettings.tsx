import { translate, useLanguage } from "../../i18n";
import {
  KeyRound,
  LogOut,
  Pencil,
  ShieldCheck,
  Users
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useUsers } from "../../hooks/useUsers";
import { errorText, initials } from "../../utils/profile";
import { Dialog } from "../common/Dialog";
import { PasswordInput } from "./PasswordInput";

export function UserSettings({ accountOnly = false }: { accountOnly?: boolean }) {
  useLanguage();
  const { currentUser, busy, configureUser, signOut } = useUsers();
  const [action, setAction] = useState<"name" | "password" | "remove" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  if (!currentUser) return null;
  const user = currentUser;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password =
      action === "password"
        ? String(form.get("password"))
        : action === "remove"
          ? ""
          : null;
    if (action === "password" && password !== String(form.get("confirm"))) {
      setError("The passwords don't match.");
      return;
    }
    try {
      await configureUser(
        action === "name" ? String(form.get("name")) : user.name,
        password,
        String(form.get("current") || ""),
      );
      setMessage(
        action === "name"
          ? "Your user name has been updated."
          : action === "remove"
            ? "Password removed. This profile can now be opened without a password."
            : "Your password has been saved.",
      );
      setAction(null);
    } catch (e) {
      setError(errorText(e));
    }
  }
  function open(next: typeof action) {
    setError("");
    setMessage("");
    setAction(next);
  }
  return (
    <section className="panel settings-section users-settings">
      <span className="settings-icon">
        <Users size={22} />
      </span>
      <div>
        <h2>{accountOnly ? translate("Admin account") : translate("Users & passwords")}</h2>
        <p>{translate("Each user has their own accounts, expenses, income, and payment history.")}</p>
        <div className="current-user-card">
          <span className="user-avatar">{initials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.hasPassword
                ? translate("Password protected · saved profile data is encrypted")
                : translate("No password · anyone with access to this app can open this profile")}
            </small>
          </div>
          <button
            className="icon-button"
            disabled={busy}
            aria-label={translate("Rename current user")}
            onClick={() => open("name")}
          >
            <Pencil size={15} />
          </button>
        </div>
        <div className="settings-actions user-settings-actions flex flex-wrap gap-2">
          <button
            className="button secondary small"
            disabled={busy}
            onClick={() => open("password")}
          >
            <KeyRound size={15} />
            {user.hasPassword ? translate("Change password") : translate("Set a password")}
          </button>
          {user.hasPassword && user.role !== "admin" && (
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => open("remove")}
            >{translate("Remove password")}</button>
          )}
          {!accountOnly && <button
            className="button secondary small"
            disabled={busy}
            onClick={() => {
              setError("");
              void signOut().catch((e) => setError(errorText(e)));
            }}
          >
            <LogOut size={15} />{translate("Switch user")}</button>}
        </div>

        <p className="password-note">{translate("Password protection encrypts the saved data for this profile. Exported finance backups and older app copies are separate. There is no password recovery. Export a backup regularly.")}</p>
        {message && (
          <p className="user-success" role="status">
            {translate(message)}
          </p>
        )}
        {error && !action && (
          <p className="user-error" role="alert">
            {translate(error)}
          </p>
        )}
      </div>
      {action && (
        <Dialog
          title={
            action === "name"
              ? translate("Rename your user")
              : action === "remove"
                ? translate("Remove password?")
                : user.hasPassword
                  ? translate("Change your password")
                  : translate("Set a password")
          }
          onClose={() => setAction(null)}
          canClose={!busy}
        >
          <form className="planner-form" onSubmit={submit}>
            {action === "name" ? (
              <label>{translate("User name")}<input
                  autoFocus
                  name="name"
                  defaultValue={user.name}
                  required
                  maxLength={50}
                  autoComplete="username"
                />
              </label>
            ) : (
              <>
                {user.hasPassword && (
                  <PasswordInput
                    name="current"
                    label={translate("Current password")}
                    autoComplete="current-password"
                  />
                )}
                {action === "password" ? (
                  <>
                    <PasswordInput
                      name="password"
                      label={translate("New password")}
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <PasswordInput
                      name="confirm"
                      label={translate("Confirm new password")}
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <p className="password-note">{translate("Use 8 to 128 characters. Keep it somewhere safe: forgotten passwords cannot be recovered.")}</p>
                  </>
                ) : (
                  <p className="form-intro">{translate("Anyone using this browser will be able to open {{name}}’s planner without a password.", { name: user.name })}</p>
                )}
              </>
            )}
            {error && (
              <p className="user-error" role="alert">
                {translate(error)}
              </p>
            )}
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >{translate("Cancel")}</button>
              <button className="button primary" disabled={busy}>
                {busy
                  ? translate("Saving…")
                  : action === "remove"
                    ? translate("Remove password")
                    : translate("Save changes")}
                <ShieldCheck size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
