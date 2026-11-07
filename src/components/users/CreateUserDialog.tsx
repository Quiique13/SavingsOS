import { translate, useLanguage } from "../../i18n";
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
  useLanguage();
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
    <Dialog title={admin ? translate("Set up admin account") : translate("Create a user")} onClose={onClose} canClose={!busy}>
      <form className="planner-form" onSubmit={submit}>
        <p className="form-intro">
          {admin ? translate("Create the admin for this app. Choose a password to manage app settings. Existing user planners stay separate.") : translate("A separate space for their accounts, expenses, income, and payments. New users start with an empty planner.")}
        </p>
        <label>{translate("User name")}<input
            autoFocus
            name="name"
            autoComplete="username"
            defaultValue={admin ? "Admin" : ""}
            placeholder={translate("e.g. Ana")}
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
            <strong>{translate("Protect with a password")}</strong>
            <small>{translate("Require a password to open this user's planner.")}</small>
          </span>
          <LockKeyhole size={18} />
        </label>
        {protectedUser && (
          <>
            <PasswordInput
              name="password"
              label={translate("Password")}
              autoComplete="new-password"
              minLength={8}
            />
            <PasswordInput
              name="confirm"
              label={translate("Confirm password")}
              autoComplete="new-password"
              minLength={8}
            />
            <p className="password-note">{translate("Use at least 8 characters. Passwords cannot be recovered, so keep a finance backup in a safe place.")}</p>
          </>
        )}
        {!protectedUser && (
          <p className="password-note">{translate("Without a password, anyone with access to this app can open this profile.")}</p>
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
            onClick={onClose}
          >{translate("Cancel")}</button>
          <button className="button primary" disabled={busy}>
            {busy ? translate("Creating user…") : admin ? translate("Create admin account") : translate("Create user")}
            <Plus size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
