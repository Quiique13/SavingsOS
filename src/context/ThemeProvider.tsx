import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./ThemeContext";
import {
  colorSchemes,
  isColorScheme,
  isUITheme,
  uiThemes,
  type ColorScheme,
  type UITheme,
} from "../utils/appearance";

const KEY = "savings-os-theme";
const SCHEME_KEY = "savings-os-color-scheme";
const UI_THEME_KEY = "savings-os-ui-theme";
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
function initialUITheme(): UITheme {
  try {
    const saved = window.localStorage.getItem(UI_THEME_KEY);
    if (isUITheme(saved)) return saved;
  } catch {
    /* Keep the familiar UI when storage is unavailable. */
  }
  return "default";
}
function applyTheme(theme: Theme, colorScheme: ColorScheme, uiTheme: UITheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.colorScheme = colorScheme;
  document.documentElement.dataset.uiTheme = uiTheme;
  document.documentElement.style.colorScheme = theme;
  const palette =
    uiTheme === "default"
      ? colorSchemes.find((scheme) => scheme.id === colorScheme)!
      : uiThemes.find((option) => option.id === uiTheme)!;
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
  const [uiTheme, setUIThemeState] = useState<UITheme>(initialUITheme);
  const setTheme = (next: Theme) => {
    applyTheme(next, colorScheme, uiTheme);
    setThemeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Keep the current session usable. */
    }
  };
  const setColorScheme = (next: ColorScheme) => {
    applyTheme(theme, next, uiTheme);
    setColorSchemeState(next);
    try {
      localStorage.setItem(SCHEME_KEY, next);
    } catch {
      /* Keep the current session usable. */
    }
  };
  const setUITheme = (next: UITheme) => {
    applyTheme(theme, colorScheme, next);
    setUIThemeState(next);
    try {
      localStorage.setItem(UI_THEME_KEY, next);
    } catch {
      /* Keep the current session usable. */
    }
  };
  useEffect(() => {
    applyTheme(theme, colorScheme, uiTheme);
  }, [theme, colorScheme, uiTheme]);
  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null)
        setThemeState(initialTheme());
      if (event.key === SCHEME_KEY || event.key === null)
        setColorSchemeState(initialColorScheme());
      if (event.key === UI_THEME_KEY || event.key === null)
        setUIThemeState(initialUITheme());
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        colorScheme,
        setColorScheme,
        uiTheme,
        setUITheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
