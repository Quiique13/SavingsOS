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

// UI themes are independent from display mode. Default retains the original palettes.
export const uiThemes = [
  { id: "default", name: "Default", description: "Your familiar space, in six colours.", lightCanvas: "#f3f4f6", darkCanvas: "#191b20" },
  { id: "flow", name: "Flow", description: "A personal money studio in forest, ivory & lime.", lightCanvas: "#f4f2eb", darkCanvas: "#101e1a" },
  { id: "paper-ledger", name: "Paper Ledger", description: "An editorial journal with warm paper & fine rules.", lightCanvas: "#f4f0e5", darkCanvas: "#24211c" },
  { id: "signal-studio", name: "Signal Studio", description: "A bold instrument panel with a bright lime signal.", lightCanvas: "#eef2e9", darkCanvas: "#0a1013" },
] as const;

export type UITheme = typeof uiThemes[number]["id"];

export function isDesignTheme(value: string): boolean {
  return value === "flow" || value === "paper-ledger" || value === "signal-studio";
}

export function isUITheme(value: unknown): value is UITheme {
  return uiThemes.some(theme => theme.id === value);
}
