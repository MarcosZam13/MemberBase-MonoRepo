// design-presets.ts — Presets visuales predefinidos para customización del gym sin tocar código

import type { DesignPreset, OrgConfig } from './org-config'

export const DESIGN_PRESETS: Record<
  DesignPreset,
  {
    label: string
    description: string
    preview: { bg: string; surface: string; border: string; radius: string }
    tokens: Partial<OrgConfig['design']> & Partial<OrgConfig['colors']>
  }
> = {
  bold: {
    label: 'Bold',
    description: 'Negro puro, bordes afilados. Gyms de alto rendimiento y crossfit.',
    preview: { bg: '#0A0A0A', surface: '#111111', border: '#1E1E1E', radius: '14px' },
    tokens: {
      cardRadius: '14px',
      font: 'dm-sans',
      headingFont: 'barlow-condensed',
      shadow: 'none',
      background: '#0A0A0A',
      surface: '#111111',
      border: '#1E1E1E',
    },
  },
  modern: {
    label: 'Slate',
    description: 'Azul-gris técnico, limpio. Ideal para studios y gyms premium.',
    preview: { bg: '#0D1117', surface: '#161B22', border: '#30363D', radius: '10px' },
    tokens: {
      cardRadius: '10px',
      font: 'inter',
      headingFont: 'inter',
      shadow: 'sm',
      background: '#0D1117',
      surface: '#161B22',
      border: '#30363D',
    },
  },
  minimal: {
    label: 'Zinc',
    description: 'Gris cálido y tarjetas cuadradas. Minimalismo sin frialdad.',
    preview: { bg: '#18181B', surface: '#27272A', border: '#3F3F46', radius: '6px' },
    tokens: {
      cardRadius: '6px',
      font: 'inter',
      headingFont: 'inter',
      shadow: 'none',
      background: '#18181B',
      surface: '#27272A',
      border: '#3F3F46',
    },
  },
  classic: {
    label: 'Navy',
    description: 'Azul marino profundo y bordes muy redondeados. Sensación premium y acogedora.',
    preview: { bg: '#0B0F1A', surface: '#151C2F', border: '#1E2A45', radius: '22px' },
    tokens: {
      cardRadius: '22px',
      font: 'dm-sans',
      headingFont: 'dm-sans',
      shadow: 'md',
      background: '#0B0F1A',
      surface: '#151C2F',
      border: '#1E2A45',
    },
  },
}
