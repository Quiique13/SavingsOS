import { build } from "esbuild";
import { inject } from "postject";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

if (process.platform !== "win32" || process.arch !== "x64") throw Error("Build on Windows x64 with Node.js 24.12 or newer.");
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const output = resolve("output/windows");
const work = join(output, "build");
mkdirSync(work, { recursive: true });
const assets = {};
function collect(directory, prefix = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const key = prefix + "/" + entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path, key);
    else assets[key] = readFileSync(path).toString("base64");
  }
}
collect("dist");
if (!assets["/index.html"] || !Object.keys(assets).some(key => key.endsWith(".js"))) throw Error("Run npm run build first.");
const nodeLicense = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`);
if (!nodeLicense.ok) throw Error("Could not retrieve the bundled Node.js runtime's license notices.");
assets["/THIRD_PARTY_NOTICES.txt"] = Buffer.from(
  await nodeLicense.text() + "\n\n" + readFileSync("dist/.vite/license.md", "utf8"),
).toString("base64");
const assetFile = join(work, "web-assets.json");
writeFileSync(assetFile, JSON.stringify(assets));
const main = join(work, "main.cjs");
await build({ entryPoints: ["scripts/desktop-main.cjs"], outfile: main, bundle: true, platform: "node", target: "node24", format: "cjs", treeShaking: true });
const blob = join(work, "sea.blob");
const config = join(work, "sea-config.json");
writeFileSync(config, JSON.stringify({ main, output: blob, disableExperimentalSEAWarning: true, useCodeCache: false, useSnapshot: false, assets: { "web-assets": assetFile } }));
execFileSync(process.execPath, ["--experimental-sea-config", config], { stdio: "inherit" });
const executable = join(output, `savingsOS-${version}-windows-x64-portable.exe`);
copyFileSync(process.execPath, executable);
// Authenticode's Node.js signature no longer applies after embedding our app.
// Remove its PE certificate directory before postject injects the SEA blob.
const image = readFileSync(executable);
const pe = image.readUInt32LE(0x3c);
const optional = pe + 24;
if (image.readUInt16LE(optional) !== 0x20b) throw Error("Expected a Windows x64 PE executable.");
const certificateEntry = optional + 112 + 8 * 4;
const certificateOffset = image.readUInt32LE(certificateEntry);
const certificateSize = image.readUInt32LE(certificateEntry + 4);
image.fill(0, certificateEntry, certificateEntry + 8);
writeFileSync(executable, certificateOffset && certificateOffset + certificateSize === image.length ? image.subarray(0, certificateOffset) : image);
await inject(executable, "NODE_SEA_BLOB", readFileSync(blob), { sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" });
const nsis = process.env.MAKENSIS || "C:/Program Files (x86)/NSIS/makensis.exe";
if (process.argv.includes("--installer")) {
  execFileSync(nsis, [`/DVERSION=${version}`, `/DRELEASE_DIR=${output}`, resolve("scripts/windows-installer.nsi")], { stdio: "inherit" });
}
const names = [executable, ...(process.argv.includes("--installer") ? [join(output, `savingsOS-${version}-windows-x64-setup.exe`)] : [])];
writeFileSync(join(output, "SHA256SUMS.txt"), names.map(path => `${createHash("sha256").update(readFileSync(path)).digest("hex")}  ${path.slice(dirname(path).length + 1)}`).join("\n") + "\n");
console.log(`Windows downloads ready in ${output}`);
