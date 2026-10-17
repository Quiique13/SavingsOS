import { Navigate, useNavigate } from "react-router-dom";
import { Brand } from "../Brand";
import { ThemeToggle } from "../theme/ThemeControls";
import { useState, type FormEvent } from "react";
import {
  LockKeyhole,
  Users,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Pencil,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { Dialog } from "../Dialog";
import { useFinance } from "../context";
import { useUsers } from "./context";
import type { User } from "./vault";
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "This change could not be completed. Please try again.";
export const initials = (name: string) =>
  Array.from(name.trim())[0]?.toUpperCase() || "P";
export function PasswordInput({
  name,
  label,
  autoComplete,
  required = true,
  minLength,
}: {
  name: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          required={required}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={
            visible
              ? "Hide " + label.toLowerCase()
              : "Show " + label.toLowerCase()
          }
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
export function CreateUserDialog({ onClose, admin = false }: { onClose: () => void; admin?: boolean }) {
  const { createUser, createAdmin, busy, currentUser, users } = useUsers();
  const navigate = useNavigate();
  const [protectedUser, setProtectedUser] = useState(admin);
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
      if (admin) await createAdmin(String(form.get("name")), password);
      else await createUser(String(form.get("name")), password);
      onClose();
      if (admin) navigate("/admin");
    } catch (e) {
      setError(errorText(e));
    }
  }
  if (admin ? users.some(user => user.role === "admin") : currentUser !== null && currentUser.role !== "admin") return null;
  return (
    <Dialog title={admin ? "Set up admin account" : "Create a user"} onClose={onClose} canClose={!busy}>
      <form className="planner-form" onSubmit={submit}>
        <p className="form-intro">
          {admin ? "Create the admin for this app. Choose a password to manage app settings. Existing user planners stay separate." : "A separate space for their accounts, expenses, income, and payments. New users start with an empty planner."}
        </p>
        <label>
          User name
          <input
            autoFocus
            name="name"
            autoComplete="username"
            defaultValue={admin ? "Admin" : ""}
            placeholder="e.g. Ana"
            required
            maxLength={50}
          />
        </label>
        <label className="user-checkbox">
          <input
            type="checkbox"
            checked={protectedUser}
            disabled={admin}
            onChange={(e) => setProtectedUser(e.target.checked)}
          />
          <span>
            <strong>Protect with a password</strong>
            <small>Require a password to open this user's planner.</small>
          </span>
          <LockKeyhole size={18} />
        </label>
        {protectedUser && (
          <>
            <PasswordInput
              name="password"
              label="Password"
              autoComplete="new-password"
              minLength={8}
            />
            <PasswordInput
              name="confirm"
              label="Confirm password"
              autoComplete="new-password"
              minLength={8}
            />
            <p className="password-note">
              Use at least 8 characters. Passwords cannot be recovered, so keep
              a finance backup in a safe place.
            </p>
          </>
        )}
        {!protectedUser && (
          <p className="password-note">
            Without a password, anyone with access to this app can open this profile.
          </p>
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
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Creating user…" : admin ? "Create admin account" : "Create user"}
            <Plus size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function UserChooser() {
  const { users: allUsers, busy, signIn, notice, error: bootError } = useUsers();
  const users = allUsers.filter(user => user.role !== "admin");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [error, setError] = useState("");
  async function choose(user: User) {
    setError("");
    if (user.hasPassword) {
      setSelected(user);
      return;
    }
    try {
      await signIn(user.id);
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const password = String(
      new FormData(event.currentTarget).get("password") || "",
    );
    try {
      await signIn(selected!.id, password);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <div className="user-screen">
      <div className="user-screen-theme">
        <ThemeToggle />
      </div>
      <Brand className="standalone-brand" />
      <section className="user-welcome panel">
        <span className="user-welcome-icon">
          {selected?.hasPassword ? (
            <LockKeyhole size={25} />
          ) : (
            <Users size={25} />
          )}
        </span>
        <span className="eyebrow">YOUR PERSONAL FINANCE SPACE</span>
        <h1>
          {selected
            ? "Welcome, " + selected.name + "."
            : "Your money. Your space."}
        </h1>
        <p>
          {selected
            ? "Enter your password to unlock your planner."
            : users.length ? "Choose a user to open their planner." : "Add your first user to start your personal finance planner."}
        </p>
        {notice && <p className="user-error" role="alert">{notice}</p>}
        {bootError ? (
          <div className="user-error" role="alert">
            {bootError}
            <p>
              Reload the app after resolving the storage problem. Existing
              records have been kept.
            </p>
          </div>
        ) : selected ? (
          <form onSubmit={submit} className="planner-form sign-in-form">
            <PasswordInput
              key={selected.id}
              name="password"
              label="Password"
              autoComplete="current-password"
            />
            {error && (
              <p className="user-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Opening planner…" : "Open planner"}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setError("");
              }}
            >
              <ArrowLeft size={14} />
              Choose another user
            </button>
            {selected.hasPassword && (
              <p className="password-note">
                Passwords can't be recovered. If you forget yours, create a new
                user and restore a finance backup.
              </p>
            )}
          </form>
        ) : (
          <>
            {error && <p className="user-error" role="alert">{error}</p>}
            {users.length > 0 && <div className="user-list" aria-busy={busy}>
              {users.map((user) => (
                <button
                  key={user.id}
                  className="user-choice"
                  disabled={busy}
                  onClick={() => void choose(user)}
                >
                  <span className="user-avatar">{initials(user.name)}</span>
                  <span>
                    <strong>{user.name}</strong>
                    <small>
                      {user.hasPassword ? "Password protected" : "No password"}
                    </small>
                  </span>
                  {user.hasPassword ? (
                    <LockKeyhole size={17} />
                  ) : (
                    <ArrowRight size={17} />
                  )}
                </button>
              ))}
            </div>}
            <button disabled={busy} className={"button create-user-button " + (users.length ? "secondary" : "primary")} onClick={() => setCreating(true)}><Plus size={16}/>Add user</button>


          </>
        )}
      </section>
      <p className="user-device-note">
        <ShieldCheck size={14} />
        Profiles saved in this app.
      </p>
      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
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
          {!accountOnly &&           <button
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
export function UserGate({ children }: { children: React.ReactNode }) {
  const { currentUser, error } = useUsers();
  const { ready } = useFinance();
  if (!ready)
    return (
      <div className="loading-state">
        <img src="/SOSLogo.svg" alt="" width={42} height={42} />
        <p>Opening your personal finance space…</p>
      </div>
    );
  if (error || !currentUser) return <UserChooser />;
  if (currentUser.role === "admin") return <Navigate to="/admin" replace />;
  return <div key={currentUser.id}>{children}</div>;
}
