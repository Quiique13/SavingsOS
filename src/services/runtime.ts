// Only the GitHub Pages build uses browser storage. Desktop and local-server
// builds continue to use their private app files and existing API.
export const browserStorage = import.meta.env.VITE_BROWSER_STORAGE === "true";
