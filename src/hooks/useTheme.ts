import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "savings-os-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);

  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      applyTheme(savedTheme);
      return savedTheme;
    }

    applyTheme("dark");
    return "dark";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(theme: Theme) {
    setThemeState(theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
