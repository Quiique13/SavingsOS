import { Capacitor } from "@capacitor/core";

// The GitHub Pages web app uses browser storage. Local web-server builds use
// their private app files and existing API.
export const browserStorage = import.meta.env.VITE_BROWSER_STORAGE === "true";
export const nativeApp = Capacitor.isNativePlatform();
