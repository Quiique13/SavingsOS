import { useEffect } from "react";
import { LANGUAGE_KEY, savedLanguage, setLanguage, translate, useLanguage } from "../../i18n";

export function LanguageSync() {
  const { language } = useLanguage();
  useEffect(() => {
    setLanguage(savedLanguage(), false);
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY || event.key === null) setLanguage(savedLanguage(), false);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate("savingsOS — A calmer place for your money");
  }, [language]);
  return null;
}
