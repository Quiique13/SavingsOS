import { createContext, useContext } from "react";
import type { Theme } from "./ThemeContext";
import type { ColorScheme, UITheme } from "../utils/appearance";
import type { Language } from "../i18n";
import type { Currency } from "../utils/currency";

export type Preferences = { theme: Theme; colorScheme: ColorScheme; uiTheme: UITheme; language: Language; currency: Currency };
export const SettingsDraftContext = createContext<null | {
  draft: Preferences;
  change: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  dirty: boolean;
  saved: boolean;
  commit: () => void;
  discard: () => void;
}>(null);
export const useSettingsDraft = () => useContext(SettingsDraftContext);
