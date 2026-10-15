import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./context";

const KEY = "savings-os-theme";
function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* The theme still works when browser storage is unavailable. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111813" : "#f8faf6");
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const setTheme = (next: Theme) => {
    applyTheme(next);
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* Keep the current session usable. */ }
  };
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) setThemeState(initialTheme());
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
