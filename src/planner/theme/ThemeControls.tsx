import { Check, Moon, Paintbrush, Sun } from "lucide-react";
import { useTheme, type Theme } from "./context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  return <button type="button" className="icon-button theme-toggle" aria-label={"Switch to " + next + " mode"} title={"Switch to " + next + " mode"} onClick={() => setTheme(next)}>
    {theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}
  </button>;
}
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return <section className="panel settings-section appearance-settings"><span className="settings-icon"><Paintbrush size={22}/></span><div>
    <h2>Appearance</h2><p>Choose the look that feels right. Your preference applies throughout this browser.</p>
    <div className="theme-options" role="group" aria-label="Color theme">
      {(["light", "dark"] as Theme[]).map(option => <button key={option} type="button" className={"theme-option " + (theme === option ? "is-selected" : "")} aria-pressed={theme === option} onClick={() => setTheme(option)}>
        <span className={"theme-preview preview-" + option} aria-hidden="true"><i className="preview-sidebar"/><span className="preview-content"><i/><span><i/><i/><i/></span><i/></span></span>
        <span className="theme-option-label">{option === "light" ? <Sun size={15}/> : <Moon size={15}/>}<strong>{option === "light" ? "Light mode" : "Dark mode"}</strong>{theme === option && <Check size={15}/>}</span>
      </button>)}
    </div>
  </div></section>;
}
