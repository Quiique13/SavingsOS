import { existsSync, mkdirSync, copyFileSync, cpSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const win = process.platform === "win32";
const user = process.env.USERPROFILE || process.env.HOME || "";
const sdkCandidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(root, ".android-tools/sdk"), path.join(user, "AppData/Local/Android/Sdk")];
const sdk = sdkCandidates.find(value => value && existsSync(path.join(value, "platforms/android-36/android.jar")));
const javaCandidates = [process.env.JAVA_HOME, process.env.ANDROID_STUDIO_JDK, path.join(root, ".android-tools/jdk"), "C:/Program Files/Android/Android Studio/jbr", path.join(user, "AppData/Local/Programs/Android Studio/jbr")].filter(Boolean);
let javaHome;
for (const candidate of javaCandidates) {
  const java = path.join(candidate, "bin", win ? "java.exe" : "java");
  if (!existsSync(java)) continue;
  const result = spawnSync(java, ["-version"], { encoding: "utf8", windowsHide: true });
  const version = /version "(\d+)/.exec(result.stderr || result.stdout || "");
  if (result.status === 0 && version && Number(version[1]) >= 21 && Number(version[1]) <= 24) { javaHome = candidate; break; }
}
const missing = [];
if (!javaHome) missing.push("JDK 21: install Android Studio, or set JAVA_HOME to a JDK 21 installation.");
if (!sdk) missing.push("Android SDK platform 36: install it using Android Studio > SDK Manager, and set ANDROID_HOME if the SDK is in a custom folder.");
console.log("savingsOS Android build");
console.log("Java: " + (javaHome || "not installed"));
console.log("Android SDK: " + (sdk || "not installed"));
if (missing.length) {
  for (const message of missing) console.error(message);
  console.error("Install the tools and accept the Android SDK licences, then run npm run android:apk.");
  process.exitCode = 1;
} else if (!process.argv.includes("--check")) {
  // Java/Gradle cannot write reliably in some protected OneDrive folders.
  // Stage only the native project and native plugin sources, never user data.
  const temporaryRoot = realpathSync(os.tmpdir());
  const stage = mkdtempSync(path.join(temporaryRoot, "savingsos-android-"));
  const copyOptions = {
    recursive: true,
    filter: source => !["build", ".gradle", ".idea", "local.properties"].includes(path.basename(source)),
  };
  cpSync(path.join(root, "android"), path.join(stage, "android"), copyOptions);
  for (const [plugin, directory] of [["android", "capacitor"], ["filesystem", "android"], ["share", "android"]]) {
    const relative = path.join("node_modules", "@capacitor", plugin, directory);
    cpSync(path.join(root, relative), path.join(stage, relative), copyOptions);
  }
  console.log("Temporary Android build: " + stage);
  // Windows packaged shells can produce socket paths longer than Java permits.
  // Limit this compatibility setting to the build and its child JVMs.
  const socketOption = win ? "-Djdk.net.unixdomain.tmpdir=" + path.join(process.env.SystemRoot || "C:/Windows", "Temp") : "";
  const jvmOptions = [process.env.JAVA_TOOL_OPTIONS, socketOption].filter(Boolean).join(" ");
  const env = { ...process.env, JAVA_TOOL_OPTIONS: jvmOptions, JAVA_HOME: javaHome, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk, GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || path.join(user, ".gradle") };
  const result = spawnSync(win ? "cmd.exe" : "./gradlew", win ? ["/d", "/c", "gradlew.bat", "--no-daemon", "assembleDebug"] : ["--no-daemon", "assembleDebug"], { cwd: path.join(stage, "android"), stdio: "inherit", env, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    console.error("The failed build was retained at " + stage);
  } else {
    const apk = path.join(stage, "android/app/build/outputs/apk/debug/app-debug.apk");
    if (!existsSync(apk)) throw new Error("Gradle completed without the expected APK.");
    const output = path.join(root, "output/android");
    mkdirSync(output, { recursive: true });
    copyFileSync(apk, path.join(output, "savingsOS-debug.apk"));
    console.log("APK ready: " + path.join(output, "savingsOS-debug.apk"));
    const resolvedStage = realpathSync(stage);
    if (path.dirname(resolvedStage) !== temporaryRoot || !path.basename(resolvedStage).startsWith("savingsos-android-"))
      throw new Error("Unexpected temporary build path. Cleanup cancelled.");
    try { rmSync(resolvedStage, { recursive: true, force: true }); }
    catch { console.log("Temporary build files remain at " + stage); }
  }
}
