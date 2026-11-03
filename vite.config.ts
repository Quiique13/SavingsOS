import { localAppStorage } from "./server/appServer";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: { license: true },
  plugins: [localAppStorage(), react(), tailwindcss()],
});
