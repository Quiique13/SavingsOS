import { createContext, useContext } from "react";

export type Theme = "light" | "dark";
export type ThemeState = { theme: Theme; setTheme: (theme: Theme) => void };
export const ThemeContext = createContext<ThemeState | null>(null);
export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme controls must be wrapped in ThemeProvider.");
  return context;
}
