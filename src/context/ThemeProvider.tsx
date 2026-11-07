import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./ThemeContext";
import {
  colorSchemes,
  isColorScheme,
  type ColorScheme,
} from "../utils/appearance";

const KEY = "savings-os-theme";
const SCHEME_KEY = "savings-os-color-scheme";
function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* The theme still works when browser storage is unavailable. */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function initialColorScheme(): ColorScheme {
  try {
    const saved = window.localStorage.getItem(SCHEME_KEY);
    if (isColorScheme(saved)) return saved;
  } catch {
    /* Use the default palette when browser storage is unavailable. */
  }
  return "ocean";
}
function applyTheme(theme: Theme, colorScheme: ColorScheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.colorScheme = colorScheme;
  document.documentElement.style.colorScheme = theme;
  const palette = colorSchemes.find((scheme) => scheme.id === colorScheme)!;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      theme === "dark" ? palette.darkCanvas : palette.lightCanvas,
    );
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [colorScheme, setColorSchemeState] =
    useState<ColorScheme>(initialColorScheme);
  const setTheme = (next: Theme) => {
    applyTheme(next, colorScheme);
    setThemeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Keep the current session usable. */
    }
  };
  const setColorScheme = (next: ColorScheme) => {
    applyTheme(theme, next);
    setColorSchemeState(next);
    try {
      localStorage.setItem(SCHEME_KEY, next);
    } catch {
      /* Keep the current session usable. */
    }
  };
  useEffect(() => {
    applyTheme(theme, colorScheme);
  }, [theme, colorScheme]);
  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null)
        setThemeState(initialTheme());
      if (event.key === SCHEME_KEY || event.key === null)
        setColorSchemeState(initialColorScheme());
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, colorScheme, setColorScheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
