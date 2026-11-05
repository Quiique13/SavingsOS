import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, copyFileSync, mkdtempSync, realpathSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform !== "win32") throw new Error("The v2 icon renderer requires Windows.");
const home = process.env.USERPROFILE || os.homedir();
const appId = "com.savingsos.app.v2";
const appName = "savingsOS v2";
const output = path.join(root, "output/android");
const temporaryRoot = realpathSync(os.tmpdir());
const stage = mkdtempSync(path.join(temporaryRoot, "savingsos-android-v2-"));
const project = path.join(stage, "android");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: stage, stdio: "inherit", windowsHide: true, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status}). Build retained at ${stage}`);
  return result.stdout;
}
function replace(relative, transform) {
  const file = path.join(project, relative);
  writeFileSync(file, transform(readFileSync(file, "utf8")));
}
const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(root, ".android-tools/sdk"), path.join(home, "AppData/Local/Android/Sdk")]
  .find(candidate => candidate && existsSync(path.join(candidate, "platforms/android-36/android.jar")));
const javaHome = [process.env.JAVA_HOME, path.join(root, ".android-tools/jdk"), process.env.ANDROID_STUDIO_JDK, "C:/Program Files/Android/Android Studio/jbr"]
  .filter(Boolean).find(candidate => {
    const java = path.join(candidate, "bin/java.exe");
    if (!existsSync(java)) return false;
    const result = spawnSync(java, ["-version"], { encoding: "utf8", windowsHide: true });
    const version = /version "(\d+)/.exec(result.stderr || result.stdout || "");
    return result.status === 0 && version && Number(version[1]) >= 21 && Number(version[1]) <= 24;
  });
if (!sdk || !javaHome) throw new Error("JDK 21 and Android SDK platform 36 are required. Run npm run android:doctor.");
if (!existsSync(path.join(root, "dist/index.html"))) throw new Error("Build the frontend first with npm run build.");

console.log(`Building ${appName} (${appId}) in ${stage}`);
// Restore the committed native skeleton only into the disposable build folder.
// Incomplete branch checkouts and local Android edits are never overwritten.
const archive = path.join(stage, "native.zip");
run("git", ["archive", "--format=zip", "--output=" + archive, "HEAD", "android"], { cwd: root });
run("tar.exe", ["-xf", archive, "-C", stage]);
const skipGenerated = { recursive: true, filter: source => !["build", ".gradle", ".idea"].includes(path.basename(source)) };
const dependencies = {};
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
for (const name of ["android", "core", "filesystem", "share"]) {
  const relative = path.join("node_modules/@capacitor", name);
  cpSync(path.join(root, relative), path.join(stage, relative), skipGenerated);
  dependencies["@capacitor/" + name] = packageJson.dependencies["@capacitor/" + name];
}
writeFileSync(path.join(stage, "package.json"), JSON.stringify({ name: "savingsos-v2-native-build", version: "2.0.0", dependencies }));
cpSync(path.join(root, "dist"), path.join(stage, "dist"), { recursive: true });
writeFileSync(path.join(stage, "capacitor.config.json"), JSON.stringify({
  appId, appName, webDir: "dist", server: { androidScheme: "https" }, android: { backgroundColor: "#17262b" },
}, null, 2));
run(process.execPath, [path.join(root, "node_modules/@capacitor/cli/bin/capacitor"), "sync", "android"]);
replace("app/build.gradle", text => text.replace('applicationId "com.savingsos.app"', `applicationId "${appId}"`).replace("versionCode 1", "versionCode 2").replace('versionName "1.0"', 'versionName "2.0.0"'));
replace("app/src/main/AndroidManifest.xml", text => text.replace('android:name=".MainActivity"', 'android:name="com.savingsos.app.MainActivity"'));
replace("app/src/main/res/values/strings.xml", text => text.replace(/>savingsOS</g, `>${appName}<`).replace(/com\.savingsos\.app/g, appId));
replace("app/src/main/res/values/colors.xml", text => text.replace(/#365842/gi, "#284c50").replace(/#111813/gi, "#18272f").replace(/#a7c58e/gi, "#76e4d0"));
replace("app/src/main/res/values/styles.xml", text => text.replace(/#111813/gi, "#18272f"));
replace("app/src/main/res/values/ic_launcher_background.xml", text => text.replace(/#f8faf6/gi, "#18272f"));
mkdirSync(output, { recursive: true });
run("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "scripts/prepare-android-v2-icons.ps1"), "-Project", project, "-Logo", path.join(root, "src/assets/savingsOS-v2.svg"), "-Preview", path.join(output, "savingsOS-v2-icon.png")]);

const env = {
  ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
  GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || path.join(home, ".gradle"),
  JAVA_TOOL_OPTIONS: [process.env.JAVA_TOOL_OPTIONS, "-Djdk.net.unixdomain.tmpdir=" + path.join(process.env.SystemRoot || "C:/Windows", "Temp")].filter(Boolean).join(" "),
};
run("cmd.exe", ["/d", "/c", "gradlew.bat", "--no-daemon", "assembleDebug"], { cwd: project, env });
const apk = path.join(project, "app/build/outputs/apk/debug/app-debug.apk");
if (!existsSync(apk)) throw new Error("Gradle did not produce the expected APK.");
const toolsVersion = readdirSync(path.join(sdk, "build-tools")).filter(version => existsSync(path.join(sdk, "build-tools", version, "aapt.exe"))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
const buildTools = path.join(sdk, "build-tools", toolsVersion);
run("cmd.exe", ["/d", "/c", "apksigner.bat", "verify", "--verbose", apk], { cwd: buildTools, env });
const badging = run(path.join(buildTools, "aapt.exe"), ["dump", "badging", apk], { stdio: "pipe", encoding: "utf8", env });
if (!badging.includes(`package: name='${appId}'`) || !badging.includes(`application-label:'${appName}'`)) throw new Error("APK identity verification failed.");
console.log(badging.split(/\r?\n/).filter(line => /^(package:|application-label:|sdkVersion:|targetSdkVersion:)/.test(line)).join("\n"));
const target = path.join(output, "savingsOS-v2-debug.apk");
copyFileSync(apk, target);
const sha256 = createHash("sha256").update(readFileSync(target)).digest("hex");
writeFileSync(target + ".sha256", sha256 + "  " + path.basename(target) + "\n");
writeFileSync(path.join(output, "savingsOS-v2-build.json"), JSON.stringify({ appId, appName, version: "2.0.0", builtAt: new Date().toISOString(), sha256 }, null, 2));
console.log("Verified APK ready: " + target);
const resolvedStage = realpathSync(stage);
if (path.dirname(resolvedStage) !== temporaryRoot || !path.basename(resolvedStage).startsWith("savingsos-android-v2-")) throw new Error("Unexpected temporary build path; cleanup cancelled.");
try { rmSync(resolvedStage, { recursive: true, force: true }); }
catch { console.log("Temporary build files remain at " + stage); }
