// Backups and CSV exports are downloaded directly by the browser.
export async function exportFile(filename: string, contents: string, mime = "application/json"): Promise<boolean> {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
