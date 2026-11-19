import { Languages } from "lucide-react";
import { languages, isLanguage, translate, useLanguage } from "../../i18n";
import { useSettingsDraft } from "../../context/SettingsDraftContext";

export function LanguageSettings() {
  const current = useLanguage();
  const settings = useSettingsDraft();
  const language = settings?.draft.language ?? current.language;
  const setLanguage = (value: typeof language) => settings ? settings.change("language", value) : current.setLanguage(value);
  return (
    <section className="panel settings-section language-settings">
      <span className="settings-icon">
        <Languages size={22} />
      </span>
      <div>
        <h2>{translate("Language")}</h2>
        <p>
          {translate(
            "Choose the language used throughout the app. English is the default.",
          )}
        </p>
        <label className="language-picker">
          <span>{translate("App language")}</span>
          <select
            value={language}
            onChange={(event) => {
              if (isLanguage(event.target.value))
                setLanguage(event.target.value);
            }}
          >
            {languages.map((option) => (
              <option key={option.code} value={option.code} lang={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <p className="language-note">
          {translate(
            settings ? "Save changes to apply your language. Your records keep their original names and notes." : "Your choice is saved in this browser. Your records keep their original names and notes.",
          )}
        </p>
      </div>
    </section>
  );
}
