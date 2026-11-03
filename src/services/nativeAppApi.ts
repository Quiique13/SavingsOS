import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { NativeProfiles } from "./nativeProfiles";
import { createSnapshotDisk } from "./snapshotDisk";

const directory = Directory.Data;
const folder = "savingsos/profiles";
const missing = (error: unknown) => !!error && typeof error === "object" &&
  "code" in error && error.code === "OS-PLUG-FILE-0008";
const disk = createSnapshotDisk({
  async list() {
    try { return (await Filesystem.readdir({ path: folder, directory })).files.map(file => file.name); }
    catch (error) { if (missing(error)) return []; throw error; }
  },
  async read(name) {
    const { data } = await Filesystem.readFile({ path: folder + "/" + name, directory, encoding: Encoding.UTF8 });
    if (typeof data !== "string") throw new Error("The saved profiles could not be read.");
    return data;
  },
  async write(name, data) {
    await Filesystem.writeFile({ path: folder + "/" + name, data, directory, encoding: Encoding.UTF8, recursive: true });
  },
  async rename(from, to) {
    await Filesystem.rename({ from: folder + "/" + from, to: folder + "/" + to, directory, toDirectory: directory });
  },
  async remove(name) { await Filesystem.deleteFile({ path: folder + "/" + name, directory }); },
});
export const nativeProfiles = new NativeProfiles(disk);
