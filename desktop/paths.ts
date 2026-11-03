import { dirname, resolve } from "node:path";

export function portableDataDirectory(options: {
  executable: string;
  portableDirectory?: string;
  developmentDirectory?: string;
}) {
  return resolve(options.portableDirectory || options.developmentDirectory || dirname(options.executable), "savingsOS-data");
}
