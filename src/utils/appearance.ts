export const colorSchemes = [
  { id: "ocean", name: "Ocean", description: "Cool blue & charcoal", lightCanvas: "#f3f4f6", darkCanvas: "#191b20" },
  { id: "sage", name: "Sage", description: "Soft green & forest", lightCanvas: "#f1f5f1", darkCanvas: "#19211d" },
  { id: "lavender", name: "Lavender", description: "Lilac & deep plum", lightCanvas: "#f5f2f8", darkCanvas: "#201c28" },
  { id: "rose", name: "Rose", description: "Blush pink & berry", lightCanvas: "#f8f2f3", darkCanvas: "#271d22" },
  { id: "amber", name: "Amber", description: "Warm sand & terracotta", lightCanvas: "#f8f4ed", darkCanvas: "#27221b" },
  { id: "graphite", name: "Graphite", description: "A quiet monochrome", lightCanvas: "#f3f3f3", darkCanvas: "#1c1c1e" },
] as const;

export type ColorScheme = typeof colorSchemes[number]["id"];

export function isColorScheme(value: unknown): value is ColorScheme {
  return colorSchemes.some(scheme => scheme.id === value);
}
