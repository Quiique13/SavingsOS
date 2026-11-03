import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.savingsos.app",
  appName: "savingsOS",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#111813" },
};
export default config;
