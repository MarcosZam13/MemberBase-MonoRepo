// theme-vars.ts — Genera los CSS custom properties del tema a partir del config del gym.
// Usada en layout.tsx (SSR inline style) y AppearanceClient.tsx (actualización live en cliente).

import type { OrgConfig } from "@core/types/org-config";

type ThemeInput = Pick<OrgConfig, "colors" | "design">;

export function buildThemeVars(
  config: ThemeInput
): Record<string, string> {
  const { colors, design } = config;
  const primaryDim = `${colors.primary}20`;
  const shadowValue =
    design.shadow === "sm"
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : design.shadow === "md"
      ? "0 4px 12px rgba(0,0,0,0.4)"
      : "none";

  return {
    "--primary":                    colors.primary,
    "--primary-foreground":         "#FFFFFF",
    "--accent":                     colors.primary,
    "--accent-foreground":          "#FFFFFF",
    "--background":                 colors.background,
    "--foreground":                 colors.text,
    "--card":                       colors.surface,
    "--card-foreground":            colors.text,
    "--popover":                    colors.surface,
    "--popover-foreground":         colors.text,
    "--muted":                      colors.surface,
    "--muted-foreground":           colors.textMuted,
    "--border":                     colors.border,
    "--input":                      colors.surface,
    "--ring":                       colors.primary,
    "--radius":                     design.cardRadius,
    "--gym-bg-base":                colors.background,
    "--gym-bg-surface":             colors.surface,
    "--gym-bg-card":                colors.surface,
    "--gym-bg-elevated":            colors.surface,
    "--gym-bg-hover":               colors.surface,
    "--gym-border":                 colors.border,
    "--gym-border-md":              colors.border,
    "--gym-accent":                 colors.primary,
    "--gym-accent-dim":             primaryDim,
    "--gym-text-primary":           colors.text,
    "--gym-text-secondary":         colors.textMuted,
    "--gym-text-muted":             colors.textMuted,
    "--gym-text-ghost":             "#404040",
    "--sidebar":                    colors.surface,
    "--sidebar-foreground":         colors.text,
    "--sidebar-primary":            colors.primary,
    "--sidebar-primary-foreground": "#FFFFFF",
    "--sidebar-accent":             colors.surface,
    "--sidebar-accent-foreground":  colors.text,
    "--sidebar-border":             colors.border,
    "--sidebar-ring":               colors.primary,
    "--chart-1":                    colors.primary,
    "--card-radius":                design.cardRadius,
    "--card-shadow":                shadowValue,
  };
}

// Aplica los CSS vars directamente al document.documentElement (uso cliente)
export function applyThemeToDOM(config: ThemeInput): void {
  const vars = buildThemeVars(config);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
