import { Link } from "react-router-dom";
import { Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--app-muted)] md:text-sm">
            Welcome back
          </p>

          <h2 className="text-xl font-semibold md:text-2xl">
            Your money overview
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            to="/settings"
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text)] md:hidden"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
