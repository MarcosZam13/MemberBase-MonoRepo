// DynamicThemeProvider.tsx — Inyecta variables CSS del tema desde la configuración dinámica del gym (DB)

'use client'

import type { OrgConfig } from '@core/types/org-config'

interface DynamicThemeProviderProps {
  config: {
    colors: OrgConfig['colors']
    design: OrgConfig['design']
  }
  children: React.ReactNode
}

// Reemplaza el ThemeProvider estático del core — recibe config desde DB vía layout.tsx
export function DynamicThemeProvider({ config, children }: DynamicThemeProviderProps) {
  const { colors, design } = config

  const shadowValue =
    design.shadow === 'none'
      ? 'none'
      : design.shadow === 'sm'
        ? '0 1px 3px rgba(0,0,0,0.3)'
        : '0 4px 12px rgba(0,0,0,0.4)'

  // Primary con 12.5% opacidad para fondos dim (sidebar activo, accent-dim)
  const primaryDim = `${colors.primary}20`

  const cssVars = {
    // shadcn/ui tokens
    '--primary': colors.primary,
    '--primary-foreground': '#FFFFFF',
    '--accent': colors.primary,
    '--accent-foreground': '#FFFFFF',
    '--background': colors.background,
    '--foreground': colors.text,
    '--card': colors.surface,
    '--card-foreground': colors.text,
    '--popover': colors.surface,
    '--popover-foreground': colors.text,
    '--muted': colors.surface,
    '--muted-foreground': colors.textMuted,
    '--border': colors.border,
    '--input': colors.surface,
    '--ring': colors.primary,
    '--radius': design.cardRadius,
    // GymBase gym-* tokens
    '--gym-bg-base': colors.background,
    '--gym-bg-surface': colors.surface,
    '--gym-bg-card': colors.surface,
    '--gym-bg-elevated': colors.surface,
    '--gym-border': colors.border,
    '--gym-border-md': colors.border,
    '--gym-accent': colors.primary,
    '--gym-accent-dim': primaryDim,
    '--gym-text-primary': colors.text,
    '--gym-text-muted': colors.textMuted,
    // Sidebar tokens
    '--sidebar': colors.surface,
    '--sidebar-primary': colors.primary,
    '--sidebar-primary-foreground': '#FFFFFF',
    '--sidebar-ring': colors.primary,
    '--sidebar-border': colors.border,
    // Chart — primer color siempre es el acento del gym
    '--chart-1': colors.primary,
    // Card radius y shadow como variables independientes
    '--card-radius': design.cardRadius,
    '--card-shadow': shadowValue,
  } as React.CSSProperties

  return (
    <div style={cssVars} className="contents">
      {children}
    </div>
  )
}
