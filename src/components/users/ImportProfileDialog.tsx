import { translate, useLanguage } from "../../i18n";
import { useRef, useState, type FormEvent } from "react";
import { useUsers } from "../../hooks/useUsers";
import { parsePortableProfile, type PortableProfile } from "../../services/portableProfile";
import { errorText } from "../../utils/profile";
import { Dialog } from "../common/Dialog";
import { PasswordInput } from "./PasswordInput";

export function ImportProfileDialog({ onClose }: { onClose: () => void }) {
  useLanguage();
  const { importProfile, busy } = useUsers();
  const [profile, setProfile] = useState<PortableProfile | null>(null);
  const [name, setName] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const selection = useRef(0);
  async function read(file?: File) {
    const current = ++selection.current;
    setError(""); setProfile(null); setReading(true);
    try {
      if (!file) return;
      if (file.size > 10000000) throw new Error("Choose a profile file smaller than 10 MB.");
      const parsed = parsePortableProfile(JSON.parse(await file.text()));
      if (current === selection.current) { setProfile(parsed); setName(parsed.profile.user.name); }
    } catch (e) { if (current === selection.current) setError(errorText(e)); }
    finally { if (current === selection.current) setReading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || busy || reading) return;
    const password = String(new FormData(event.currentTarget).get("password") || "");
    setError("");
    try { await importProfile(profile, password, name); onClose(); }
    catch (e) { setError(errorText(e)); }
  }
  return <Dialog title={translate("Import portable profile")} onClose={onClose} canClose={!busy}>
    <form className="planner-form" onSubmit={submit}>
      <p>{translate("Choose the portable profile exported from Settings on your other copy of savingsOS. This adds your profile and keeps existing users.")}</p>
      <label>{translate("Profile file")}<input type="file" accept=".json,application/json" disabled={busy} onChange={e => void read(e.target.files?.[0])} /></label>
      {reading && <p role="status">{translate("Reading profile…")}</p>}
      {profile && <>
        <label>{translate("Profile name")}<input required maxLength={50} value={name} disabled={busy} onChange={e => setName(e.target.value)} autoComplete="username" /></label>
        <p>{profile.profile.user.hasPassword ? translate("Your password and encrypted finance records are preserved. Enter the original password to verify and unlock this copy.") : translate("This profile has no password. Its finance records are unencrypted.")}</p>
        {profile.profile.user.hasPassword && <PasswordInput name="password" label={translate("Profile password")} autoComplete="current-password" />}
        <p className="password-note">{translate("The two copies have separate records after importing. To update an existing copy later, restore a finance backup from Settings.")}</p>
      </>}
      {error && <p className="user-error" role="alert">{translate(error)}</p>}
      <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="button secondary" disabled={busy} onClick={onClose}>{translate("Cancel")}</button>
        <button className="button primary" disabled={!profile || reading || busy}>{busy ? translate("Importing…") : translate("Import and open profile")}</button>
      </div>
    </form>
  </Dialog>;
}
