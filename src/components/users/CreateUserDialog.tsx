import {
  LockKeyhole,
  Plus
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "../../hooks/useUsers";
import { errorText } from "../../utils/profile";
import { Dialog } from "../common/Dialog";
import { PasswordInput } from "./PasswordInput";

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
