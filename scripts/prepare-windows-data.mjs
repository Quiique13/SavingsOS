import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, ".savingsos-data");
const destination = path.join(root, "output/windows/savingsOS-data/.savingsos-data");
if (!fs.existsSync(path.join(root, "output/windows/savingsOS-Portable.exe"))) throw new Error("Build the portable executable first.");
if (fs.existsSync(path.join(destination, "profiles.json"))) console.log("The portable app already has profiles. Its records have been kept.");
else if (!fs.existsSync(path.join(sourceDirectory, "profiles.json"))) console.log("No existing computer profiles were found. Add a user when opening the portable app.");
else {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const stage = fs.mkdtempSync(path.join(temporaryRoot, "savingsos-profile-copy-"));
  const helper = path.join(stage, "storage.mjs");
  await build({ stdin: { contents: 'export { FileStore } from "./server/fileStore"; export { validateRegistry } from "./src/services/nativeProfiles"; export { USERS_KEY } from "./src/services/profileVault";', resolveDir: root }, bundle: true, platform: "node", format: "esm", outfile: helper, target: "node22" });
  try {
    const { FileStore, validateRegistry, USERS_KEY } = await import(pathToFileURL(helper).href);
    const source = new FileStore(sourceDirectory);
    const target = new FileStore(destination);
    let copied = false;
    await source.locked(async () => {
      await target.locked(async () => {
        if (target.getItem(USERS_KEY) !== null) return;
        const raw = source.getItem(USERS_KEY);
        if (!raw) return;
        validateRegistry(raw);
        target.setItem(USERS_KEY, raw);
        if (target.getItem(USERS_KEY) !== raw) throw new Error("The portable profile copy could not be verified.");
        copied = true;
      });
    });
    console.log(copied ? "Existing profiles copied and verified in the portable app's separate data folder. Passwords and encrypted records are preserved." : "Portable records kept.");
  } finally {
    const actual = fs.realpathSync(stage);
    if (path.dirname(actual) !== temporaryRoot || !path.basename(actual).startsWith("savingsos-profile-copy-")) throw new Error("Unexpected temporary profile-copy path.");
    fs.rmSync(actual, { recursive: true, force: true });
  }
}
