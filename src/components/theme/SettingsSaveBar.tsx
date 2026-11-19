import { Save } from "lucide-react";
import { translate } from "../../i18n";
import { useSettingsDraft } from "../../context/SettingsDraftContext";

export function SettingsSaveBar() {
  const settings = useSettingsDraft();
  if (!settings) return null;
  return (
    <div className="settings-save-bar">
      <p role="status">{translate(settings.dirty ? "You have unsaved settings. Changes apply only when you save." : settings.saved ? "Settings saved." : "Choose your preferences, then save to apply them.")}</p>
      <div className="settings-save-actions">
        <button type="button" className="button secondary" disabled={!settings.dirty} onClick={settings.discard}>{translate("Discard changes")}</button>
        <button type="button" className="button primary" disabled={!settings.dirty} onClick={settings.commit}><Save size={16} />{translate("Save changes")}</button>
      </div>
    </div>
  );
}
