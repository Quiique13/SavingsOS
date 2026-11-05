import { localAppStorage } from "./server/appServer";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  base: mode === "github" ? "/SavingsOS/" : "/",
  define: { "import.meta.env.VITE_BROWSER_STORAGE": JSON.stringify(mode === "github" ? "true" : "false") },
  build: { license: true },
  plugins: [...(mode === "github" ? [] : [localAppStorage()]), react(), tailwindcss()],
}));
