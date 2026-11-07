import { createContext } from "react";
import { type ColorScheme } from "../utils/appearance";
export type Theme = "light" | "dark";
export type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};
export const ThemeContext = createContext<ThemeState | null>(null);
