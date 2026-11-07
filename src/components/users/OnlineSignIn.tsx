import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuthentication } from "../../context/AuthenticationContext";
import { translate, useLanguage } from "../../i18n";
import { PasswordInput } from "./PasswordInput";

export function OnlineSignIn({ disabled = false }: { disabled?: boolean }) {
  useLanguage();
  const auth = useAuthentication();
  const [mode, setMode] = useState<"signin" | "register" | "reset">("signin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  if (!auth?.enabled) return null;
  const account = auth;
  const busy = disabled || account.busy;
  function change(next: typeof mode) { setMode(next); setError(""); setMessage(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (mode === "register" && password !== String(form.get("confirm") || "")) { setError("The passwords don't match."); return; }
    try {
      if (mode === "reset") {
        await account.resetPassword(email);
        setMessage("If an account exists for this email, a password reset link has been sent.");
      } else if (mode === "register") await account.register(String(form.get("name") || ""), email, password);
      else await account.email(email, password);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The account request could not be completed. Try again."); }
  }
  return <div className="online-signin">
    <p className="auth-description">{translate("Sign in to access the same planner on all your devices.")}</p>
    {account.error && <p className="user-error" role="alert">{translate(account.error)}</p>}
    {account.user ? <div className="auth-recovery"><p>{account.user.email}</p><button className="button secondary" disabled={busy} onClick={() => { void account.leave().catch(cause => setError(cause.message)); }}>{translate("Sign out of online account")}</button></div> : <>
      <button type="button" className="button secondary google-signin" disabled={busy} onClick={() => {
        setError(""); setMessage(""); void account.google().catch(cause => setError(cause.message));
      }}><LogIn size={18} />{translate("Continue with Google")}</button>
      <div className="auth-divider"><span>{translate("or use email")}</span></div>
      <form className="planner-form sign-in-form online-signin-form" onSubmit={submit}>
        {mode === "register" && <label>{translate("User name")}<input name="name" autoComplete="name" required maxLength={50} disabled={busy} /></label>}
        <label>{translate("Email address")}<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>
        {mode !== "reset" && <PasswordInput name="password" label={translate("Password")} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 8 : undefined} disabled={busy} />}
        {mode === "register" && <PasswordInput name="confirm" label={translate("Confirm password")} autoComplete="new-password" minLength={8} disabled={busy} />}
        {error && <p className="user-error" role="alert">{translate(error)}</p>}
        {message && <p className="status-message" role="status">{translate(message)}</p>}
        <button className="button primary" disabled={busy}>{busy ? translate("Please wait…") : mode === "register" ? translate("Create online account") : mode === "reset" ? translate("Send reset link") : translate("Sign in")}</button>
        <div className="auth-links">
          <button type="button" className="text-button" disabled={busy} onClick={() => change(mode === "signin" ? "register" : "signin")}>{mode === "signin" ? translate("Create an account") : translate("Back to sign in")}</button>
          {mode === "signin" && <button type="button" className="text-button" disabled={busy} onClick={() => change("reset")}>{translate("Forgot password?")}</button>}
        </div>
      </form>
    </>}
    {account.user && error && <p className="user-error" role="alert">{translate(error)}</p>}
    <p className="auth-privacy">{translate("Online accounts store finance records in Firebase. Local profiles stay on this device until you choose to import them.")}</p>
  </div>;
}
