import { createContext } from "react";
import { type ColorScheme, type UITheme } from "../utils/appearance";
export type Theme = "light" | "dark";
export type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  uiTheme: UITheme;
  setUITheme: (theme: UITheme) => void;
};
export const ThemeContext = createContext<ThemeState | null>(null);
