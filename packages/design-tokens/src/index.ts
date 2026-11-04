export const designTokens = {
  colors: {
    ink: "#f4f0df",
    night: "#17251d",
    panel: "#22342a",
    leaf: "#a8ce79",
    sun: "#f3c875",
    soil: "#a87650",
    water: "#83c4c3",
  },
  typography: {
    display: 'Georgia, "Times New Roman", serif',
    body: '"Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Code", Consolas, monospace',
  },
} as const;

export type DesignTokens = typeof designTokens;
