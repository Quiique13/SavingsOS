import { useEffect } from "react";
import { nativeApp } from "../../services/runtime";

export function NativeControls() {
  useEffect(() => {
    if (!nativeApp) return;
    let active = true;
    let remove: (() => Promise<void>) | undefined;
    void import("@capacitor/app").then(async ({ App }) => {
      if (!active) return;
      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]")).at(-1);
        if (dialog) {
          // Respect the shared dialog's busy-state cancellation guard.
          if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) dialog.close();
          return;
        }
        const closeNavigation = document.querySelector<HTMLButtonElement>(".sidebar.is-open .mobile-close");
        if (closeNavigation) { closeNavigation.click(); return; }
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
      });
      if (!active) await listener.remove();
      else remove = () => listener.remove();
    });
    return () => { active = false; void remove?.(); };
  }, []);
  return null;
}
