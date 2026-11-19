import { translate, useLanguage } from "../../i18n";
import { Check, Moon, Paintbrush, Sun } from "lucide-react";
import { type Theme } from "../../context/ThemeContext";
import { useTheme } from "../../hooks/useTheme";
import { colorSchemes, uiThemes } from "../../utils/appearance";
import { useSettingsDraft } from "../../context/SettingsDraftContext";

export function ThemeToggle() {
  useLanguage();
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={translate(
        next === "dark" ? "Switch to dark mode" : "Switch to light mode",
      )}
      title={translate(
        next === "dark" ? "Switch to dark mode" : "Switch to light mode",
      )}
      onClick={() => setTheme(next)}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
export function AppearanceSettings() {
  useLanguage();
  const current = useTheme();
  const settings = useSettingsDraft();
  const { theme, colorScheme, uiTheme } = settings?.draft ?? current;
  const setTheme = (value: Theme) => settings ? settings.change("theme", value) : current.setTheme(value);
  const setColorScheme = (value: typeof colorScheme) => settings ? settings.change("colorScheme", value) : current.setColorScheme(value);
  const setUITheme = (value: typeof uiTheme) => settings ? settings.change("uiTheme", value) : current.setUITheme(value);
  return (
    <section className="panel settings-section appearance-settings">
      <span className="settings-icon">
        <Paintbrush size={22} />
      </span>
      <div>
        <h2>{translate("Appearance")}</h2>
        <p>
          {translate(
            settings ? "Make this space feel like yours. Save changes to apply your choices." : "Make this space feel like yours. Your choices are saved in this browser.",
          )}
        </p>
        <div className="ui-theme-heading">
          <h3 className="appearance-label">{translate("App theme")}</h3>
          <span>
            {translate("{{count}} distinct looks. One familiar planner.", {
              count: uiThemes.length,
            })}
          </span>
        </div>
        <div
          className="ui-theme-options"
          role="group"
          aria-label={translate("App theme")}
        >
          {uiThemes.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                "ui-theme-option" +
                (uiTheme === option.id ? " is-selected" : "")
              }
              data-ui-option={option.id}
              data-scheme={option.id === "default" ? colorScheme : undefined}
              aria-pressed={uiTheme === option.id}
              onClick={() => setUITheme(option.id)}
            >
              <span
                className="ui-theme-preview"
                data-mode={theme}
                aria-hidden="true"
              >
                <span className="ui-preview-nav">
                  <b />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="ui-preview-main">
                  <span className="ui-preview-title">
                    Aa <i />
                  </span>
                  <span className="ui-preview-cards">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="ui-preview-chart">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </span>
              <span className="ui-theme-name">
                <strong>{translate(option.name)}</strong>
                <span className="ui-theme-check">
                  {uiTheme === option.id && <Check size={13} />}
                </span>
              </span>
              <span className="ui-theme-description">
                {translate(option.description)}
              </span>
            </button>
          ))}
        </div>
        <h3 className="appearance-label">{translate("Display mode")}</h3>
        <div
          className="theme-options"
          role="group"
          aria-label={translate("Display mode")}
        >
          {(["light", "dark"] as Theme[]).map((option) => (
            <button
              key={option}
              type="button"
              className={
                "theme-option " + (theme === option ? "is-selected" : "")
              }
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
            >
              <span
                className={"theme-preview preview-" + option}
                aria-hidden="true"
              >
                <i className="preview-sidebar" />
                <span className="preview-content">
                  <i />
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                  <i />
                </span>
              </span>
              <span className="theme-option-label">
                {option === "light" ? <Sun size={15} /> : <Moon size={15} />}
                <strong>
                  {option === "light"
                    ? translate("Light mode")
                    : translate("Dark mode")}
                </strong>
                {theme === option && <Check size={15} />}
              </span>
            </button>
          ))}
        </div>
        {uiTheme === "default" && (
          <>
            <div className="scheme-heading">
              <h3 className="appearance-label">{translate("Colour scheme")}</h3>
              <span>{translate("Works in light and dark mode")}</span>
            </div>
            <div
              className="scheme-options"
              role="group"
              aria-label={translate("Colour scheme")}
            >
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  data-scheme={scheme.id}
                  className={
                    "scheme-option" +
                    (colorScheme === scheme.id ? " is-selected" : "")
                  }
                  aria-pressed={colorScheme === scheme.id}
                  onClick={() => setColorScheme(scheme.id)}
                >
                  <span
                    className="scheme-preview"
                    data-mode={theme}
                    aria-hidden="true"
                  >
                    <span className="scheme-preview-nav">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="scheme-preview-main">
                      <i />
                      <span>
                        <i />
                        <i />
                        <i />
                      </span>
                      <i />
                    </span>
                  </span>
                  <span className="scheme-option-name">
                    <strong>{translate(scheme.name)}</strong>
                    <span className="scheme-selection-mark">
                      {colorScheme === scheme.id && <Check size={13} />}
                    </span>
                  </span>
                  <span className="scheme-description">
                    {translate(scheme.description)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
