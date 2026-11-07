import { useSyncExternalStore } from "react";
import { messages } from "./messages";

export const languages = [
  { code: "en", name: "English", locale: "en-GB", currencyLocale: "en-IE" },
  { code: "pt", name: "Português", locale: "pt-PT", currencyLocale: "pt-PT" },
  { code: "fr", name: "Français", locale: "fr-FR", currencyLocale: "fr-FR" },
  { code: "es", name: "Español", locale: "es-ES", currencyLocale: "es-ES" },
] as const;
export type Language = (typeof languages)[number]["code"];
export const LANGUAGE_KEY = "savings-os-language";
const listeners = new Set<() => void>();
export const isLanguage = (value: unknown): value is Language =>
  languages.some((language) => language.code === value);
export function savedLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* English remains available without browser storage or during SSR. */
  }
  return "en";
}
let currentLanguage: Language = savedLanguage();
export const getLanguage = () => currentLanguage;
export const getLocale = () =>
  languages.find((language) => language.code === currentLanguage)!;
export function setLanguage(language: Language, persist = true) {
  if (!isLanguage(language)) return;
  currentLanguage = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
  if (persist) {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* Apply the selection for this session. */
    }
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useLanguage() {
  const language = useSyncExternalStore(
    subscribe,
    getLanguage,
    () => "en" as const,
  );
  return { language, setLanguage, translate };
}
export function translate(
  source: string,
  values: Record<string, string | number> = {},
): string {
  const migrationPrefix = "Browser migration needs attention:";
  if (currentLanguage !== "en" && source.startsWith(migrationPrefix + " ")) {
    return translate(migrationPrefix) + " " + translate(source.slice(migrationPrefix.length + 1), values);
  }
  const index = currentLanguage === "pt" ? 0 : currentLanguage === "fr" ? 1 : 2;
  const text = currentLanguage === "en" ? source : (messages[source]?.[index] ?? source);
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

const builtInCategories = new Set(["Housing", "Groceries", "Subscriptions", "Utilities", "Transport", "Health", "Shopping", "Eating out", "Other"]);
export const categoryLabel = (category: string) => builtInCategories.has(category) ? translate(category) : category;

export function weekdayLabels() {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(getLocale().locale, { weekday: "narrow" }).format(
      new Date(2026, 10, 2 + index, 12),
    ),
  );
}
