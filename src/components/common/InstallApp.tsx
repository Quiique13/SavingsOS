import { translate, useLanguage } from "../../i18n";
import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { browserStorage } from "../../services/runtime";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  useLanguage();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => {
      setPrompt(null);
      setMessage("savingsOS has been added to your device.");
    };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "savingsOS has been added to your device."
          : "Installation cancelled. You can try again from your browser menu.",
      );
      setPrompt(null);
    } catch {
      setMessage(
        "Use your browser menu to install savingsOS or add it to your home screen.",
      );
    } finally {
      setInstalling(false);
    }
  }
  return (
    <section className="panel settings-section">
      <span className="settings-icon">
        <Monitor size={22} />
      </span>
      <div>
        <h2>{translate("Install the web app")}</h2>
        <p>{translate("Open savingsOS in its own window using your browser’s Install app or Add to home screen option. You can keep using the website in a normal browser tab too.")}</p>
        <div className="settings-actions flex flex-wrap gap-2">
          <a
            className="button secondary small"
            href="https://github.com/Quiique13/SavingsOS"
            target="_blank"
            rel="noreferrer"
          >{translate("View on GitHub")}</a>
          {prompt && (
            <button
              className="button secondary small"
              onClick={() => void install()}
              disabled={installing}
            >{translate("Install browser app")}</button>
          )}
        </div>
        <p className="password-note">
          {browserStorage
            ? translate("Profiles stay in this browser. Export a profile backup before clearing site data or moving to another browser or device. Internet is needed to load the website.")
            : translate("Keep the local savingsOS web server running while using this copy. Export a profile backup to move your records to the hosted website.")}
        </p>
        {message && <p role="status">{translate(message)}</p>}
      </div>
    </section>
  );
}
