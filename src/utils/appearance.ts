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
  { id: "aurora", name: "Aurora", description: "Dreamy gradients, glass & soft curves.", lightCanvas: "#edf0ff", darkCanvas: "#12152e" },
  { id: "paper", name: "Paper", description: "An editorial ledger with a warm paper feel.", lightCanvas: "#f4efe5", darkCanvas: "#24211c" },
  { id: "minimal", name: "Minimal", description: "Clean lines, open space & quiet details.", lightCanvas: "#f8fafb", darkCanvas: "#171c20" },
  { id: "neo", name: "Neo", description: "Bold outlines, punchy colour & playful shadows.", lightCanvas: "#f5f0ff", darkCanvas: "#211b30" },
  { id: "terminal", name: "Terminal", description: "Monospace type & a retro green glow.", lightCanvas: "#eef5ed", darkCanvas: "#0c1710" },
  { id: "high-contrast", name: "High Contrast", description: "Strong borders, clear focus & maximum clarity.", lightCanvas: "#ffffff", darkCanvas: "#000000" },
] as const;

export type UITheme = typeof uiThemes[number]["id"];

export function isUITheme(value: unknown): value is UITheme {
  return uiThemes.some(theme => theme.id === value);
}
