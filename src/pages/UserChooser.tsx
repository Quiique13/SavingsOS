import { translate, useLanguage } from "../i18n";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Users
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Brand } from "../components/common/Brand";
import { ThemeToggle } from "../components/theme/ThemeControls";
import { CreateUserDialog } from "../components/users/CreateUserDialog";
import { PasswordInput } from "../components/users/PasswordInput";
import { ImportProfileDialog } from "../components/users/ImportProfileDialog";
import { InstallApp } from "../components/common/InstallApp";
import { useUsers } from "../hooks/useUsers";
import { type User } from "../services/profileVault";
import { browserStorage } from "../services/runtime";
import { errorText, initials } from "../utils/profile";

export function UserChooser() {
  useLanguage();
  const { users: allUsers, busy, signIn, notice, error: bootError } = useUsers();
  const users = allUsers.filter(user => user.role !== "admin");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
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
        <span className="eyebrow">{translate("YOUR PERSONAL FINANCE SPACE")}</span>
        <h1>
          {selected
            ? translate("Welcome,") + " " + selected.name + "."
            : translate("Your personal space")}
        </h1>
        <p>
          {selected
            ? translate("Enter your password to unlock your planner.")
            : users.length ? translate("Choose a user to open their planner.") : translate("Add your first user to start your personal finance planner.")}
        </p>
        {notice && <p className="user-error" role="alert">{translate(notice)}</p>}
        {bootError ? (
          <div className="user-error" role="alert">
            {translate(bootError)}
            <p>{translate("Reload the app after resolving the storage problem. Existing records have been kept.")}</p>
          </div>
        ) : selected ? (
          <form onSubmit={submit} className="planner-form sign-in-form">
            <PasswordInput
              key={selected.id}
              name="password"
              label={translate("Password")}
              autoComplete="current-password"
            />
            {error && (
              <p className="user-error" role="alert">
                {translate(error)}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? translate("Opening planner…") : translate("Open planner")}
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
              <ArrowLeft size={14} />{translate("Choose another user")}</button>
            {selected.hasPassword && (
              <p className="password-note">{translate("Passwords can't be recovered. If you forget yours, create a new user and restore a finance backup.")}</p>
            )}
          </form>
        ) : (
          <>
            {error && <p className="user-error" role="alert">{translate(error)}</p>}
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
                      {user.hasPassword ? translate("Password protected") : translate("No password")}
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
            <button disabled={busy} className={"button create-user-button " + (users.length ? "secondary" : "primary")} onClick={() => setCreating(true)}><Plus size={16} />{translate("Add user")}</button>
            <button disabled={busy} className="button secondary create-user-button" onClick={() => setImporting(true)}>{translate("Import profile")}</button>
          </>
        )}
      </section>
      <p className="user-device-note">
        <ShieldCheck size={14} />
        {browserStorage ? translate("Profiles saved only in this browser. Export a backup regularly.") : translate("Profiles saved in this app.")}
      </p>
      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
      {importing && <ImportProfileDialog onClose={() => setImporting(false)} />}
      <div className="install-app-welcome"><InstallApp /></div>
    </div>
  );
}
