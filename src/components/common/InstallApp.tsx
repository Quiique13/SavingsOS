import { Capacitor } from "@capacitor/core";
import { Download, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const releases = "https://github.com/Quiique13/SavingsOS/releases/latest";

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  const [installing, setInstalling] = useState(false);
  const native = Capacitor.isNativePlatform();
  const desktop = typeof window !== "undefined" && !!window.savingsOSDesktop;
  useEffect(() => {
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const installed = () => { setPrompt(null); setMessage("savingsOS has been added to your device."); };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", installed); };
  }, []);
  async function install() {
    if (!prompt || installing) return;
    setInstalling(true); setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "savingsOS has been added to your device." : "Installation cancelled. You can try again from your browser menu.");
      setPrompt(null);
    } catch { setMessage("Use your browser menu to install savingsOS or download the portable desktop app."); }
    finally { setInstalling(false); }
  }
  if (native || desktop) return null;
  return <section className="panel settings-section">
    <span className="settings-icon"><Monitor size={22} /></span>
    <div>
      <h2>Take savingsOS with you</h2>
      <p>Download the Windows x64 portable app to run savingsOS without Node.js or an internet connection. Keep savingsOS-data beside the executable when moving it to another computer.</p>
      <p>For a Start menu shortcut, choose the Windows installer. Export your portable profile from Settings, then import it on the desktop app’s user screen.</p>
      <div className="settings-actions flex flex-wrap gap-2">
        <a className="button primary small" href={releases + "/download/savingsOS-Portable.exe"}><Download size={15} />Download portable app</a>
        <a className="button secondary small" href={releases + "/download/savingsOS-Setup.exe"}>Download Windows installer</a>
        <a className="button secondary small" href={releases} target="_blank" rel="noreferrer">GitHub releases</a>
        {prompt && <button className="button secondary small" onClick={() => void install()} disabled={installing}>Install browser app</button>}
      </div>
      <p className="password-note">The browser app needs the local savingsOS server to stay running. Use the desktop app for a self-contained offline copy. Downloads require a published GitHub release.</p>
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
