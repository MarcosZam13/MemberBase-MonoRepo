// ThemeProvider.tsx — Inyecta las variables CSS del tema white label en toda la aplicación

import { themeConfig } from "@/lib/theme";

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Convierte las variables del themeConfig en CSS custom properties
// que sobrescriben las variables de shadcn/ui para el tema completo
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <div
      style={
        {
          "--primary": themeConfig.colors.primary,
          "--primary-foreground": themeConfig.colors.primaryForeground,
          "--accent": themeConfig.colors.accent,
          "--accent-foreground": themeConfig.colors.accentForeground,
          "--background": themeConfig.colors.background,
          "--card": themeConfig.colors.surface,
          "--card-foreground": themeConfig.colors.text,
          "--border": themeConfig.colors.border,
          "--input": themeConfig.colors.input,
          "--ring": themeConfig.colors.ring,
          "--muted": themeConfig.colors.surface,
          "--muted-foreground": themeConfig.colors.textMuted,
          "--foreground": themeConfig.colors.text,
          "--color-success": themeConfig.colors.success,
          "--color-warning": themeConfig.colors.warning,
          "--color-danger": themeConfig.colors.danger,
          "--font-sans": themeConfig.fonts.sans,
          "--font-heading": themeConfig.fonts.heading,
          "--radius-button": themeConfig.radius.button,
          "--radius-card": themeConfig.radius.card,
          "--radius-input": themeConfig.radius.input,
          // Mapeamos el radius principal de shadcn al del tema
          "--radius": themeConfig.radius.card,
        } as React.CSSProperties
      }
      className="contents"
    >
      {children}
    </div>
  );
}
