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
        <h2>{accountOnly ? "Admin account" : "Users & passwords"}</h2>
        <p>
          Each user has their own accounts, expenses, income, and payment
          history.
        </p>
        <div className="current-user-card">
          <span className="user-avatar">{initials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.hasPassword
                ? "Password protected · saved profile data is encrypted"
                : "No password · anyone with access to this app can open this profile"}
            </small>
          </div>
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Rename current user"
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
            {user.hasPassword ? "Change password" : "Set a password"}
          </button>
          {user.hasPassword && user.role !== "admin" && (
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => open("remove")}
            >
              Remove password
            </button>
          )}
          {!accountOnly && <button
            className="button secondary small"
            disabled={busy}
            onClick={() => {
              setError("");
              void signOut().catch((e) => setError(errorText(e)));
            }}
          >
            <LogOut size={15} />
            Switch user
          </button>}
        </div>

        <p className="password-note">
          Password protection encrypts the saved data for this profile. Exported
          finance backups and older app copies are separate. There is no
          password recovery. Export a backup regularly.
        </p>
        {message && (
          <p className="user-success" role="status">
            {message}
          </p>
        )}
        {error && !action && (
          <p className="user-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {action && (
        <Dialog
          title={
            action === "name"
              ? "Rename your user"
              : action === "remove"
                ? "Remove password?"
                : user.hasPassword
                  ? "Change your password"
                  : "Set a password"
          }
          onClose={() => setAction(null)}
          canClose={!busy}
        >
          <form className="planner-form" onSubmit={submit}>
            {action === "name" ? (
              <label>
                User name
                <input
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
                    label="Current password"
                    autoComplete="current-password"
                  />
                )}
                {action === "password" ? (
                  <>
                    <PasswordInput
                      name="password"
                      label="New password"
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <PasswordInput
                      name="confirm"
                      label="Confirm new password"
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <p className="password-note">
                      Use 8 to 128 characters. Keep it somewhere safe: forgotten
                      passwords cannot be recovered.
                    </p>
                  </>
                ) : (
                  <p className="form-intro">
                    Anyone using this browser will be able to open {user.name}'s
                    planner without a password.
                  </p>
                )}
              </>
            )}
            {error && (
              <p className="user-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : action === "remove"
                    ? "Remove password"
                    : "Save changes"}
                <ShieldCheck size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
