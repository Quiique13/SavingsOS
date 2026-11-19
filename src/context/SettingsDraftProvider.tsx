import { useState, type ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../i18n";
import { useCurrency } from "../utils/currency";
import { SettingsDraftContext, type Preferences } from "./SettingsDraftContext";

export function SettingsDraftProvider({ children }: { children: ReactNode }) {
  const appearance = useTheme();
  const language = useLanguage();
  const currency = useCurrency();
  const current: Preferences = {
    theme: appearance.theme, colorScheme: appearance.colorScheme, uiTheme: appearance.uiTheme,
    language: language.language, currency: currency.currency,
  };
  const [snapshot, setSnapshot] = useState({ base: current, draft: current });
  const keys = Object.keys(current) as (keyof Preferences)[];
  // Other tabs and the global theme toggle can change saved preferences. Keep
  // untouched controls in sync without overwriting this page's pending edits.
  if (keys.some(key => snapshot.base[key] !== current[key])) {
    const draft = Object.fromEntries(keys.map(key => [key,
      snapshot.draft[key] === snapshot.base[key] ? current[key] : snapshot.draft[key],
    ])) as Preferences;
    setSnapshot({ base: current, draft });
  }
  const { draft } = snapshot;
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(current) as (keyof Preferences)[]).some(key => draft[key] !== current[key]);
  function change<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setSnapshot(previous => ({ ...previous, draft: { ...previous.draft, [key]: value } }));
    setSaved(false);
  }
  function commit() {
    appearance.setTheme(draft.theme);
    appearance.setColorScheme(draft.colorScheme);
    appearance.setUITheme(draft.uiTheme);
    language.setLanguage(draft.language);
    currency.setCurrency(draft.currency);
    setSaved(true);
  }
  function discard() { setSnapshot({ base: current, draft: current }); setSaved(false); }
  // Drafts live only on this page. Leaving/reloading never writes them to storage.
  return <SettingsDraftContext.Provider value={{ draft, change, dirty, saved, commit, discard }}>{children}</SettingsDraftContext.Provider>;
}
