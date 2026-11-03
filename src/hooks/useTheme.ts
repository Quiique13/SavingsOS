import { useContext } from "react";
import { ThemeContext, type ThemeState } from "../context/ThemeContext";

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme controls must be wrapped in ThemeProvider.");
  return context;
}
