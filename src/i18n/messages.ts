import { core } from "./core";
import { help } from "./help";
import { errors } from "./errors";
import { dynamic } from "./dynamic";

// Keep English source keys separate from stored category IDs, names, and records.
export const messages = Object.fromEntries(
  [core, help, errors, dynamic].flatMap(catalog => catalog.trim().split("\n").map(line => {
    const [source, pt, fr, es] = line.split("|");
    if (!source || !pt || !fr || !es) throw new Error("Incomplete translation: " + source);
    return [source, [pt, fr, es] as const];
  })),
) as Record<string, readonly [string, string, string]>;
