import { Capacitor } from "@capacitor/core";

// Android uses its file sharing sheet. Browser downloads retain their existing behavior.
export async function exportFile(filename: string, contents: string, mime = "application/json"): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"), import("@capacitor/share"),
    ]);
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = "exports/" + crypto.randomUUID() + "/" + safeName;
    const result = await Filesystem.writeFile({ path, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
    try {
      await Share.share({ title: "savingsOS export", files: [result.uri], dialogTitle: "Save or share your savingsOS export" });
      return true;
    } catch (error) {
      if (/cancel/i.test(error instanceof Error ? error.message : String(error))) return false;
      throw error;
    }
  }
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
