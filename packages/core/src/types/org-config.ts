// org-config.ts — Tipos y valores por defecto para la configuración visual dinámica de una organización

export type DesignPreset = 'bold' | 'modern' | 'minimal' | 'classic'

export interface OrgConfig {
  colors: {
    primary: string
    background: string
    surface: string
    border: string
    text: string
    textMuted: string
  }
  design: {
    preset: DesignPreset
    cardRadius: string
    font: string
    headingFont: string
    shadow: 'none' | 'sm' | 'md'
  }
  media: {
    logoUrl: string | null
    portalBgImage: string | null
    faviconUrl: string | null
  }
  features: {
    community: boolean
    content: boolean
    gym_qr_checkin: boolean
    gym_health_metrics: boolean
    gym_routines: boolean
    gym_progress: boolean
    gym_calendar: boolean
    gym_challenges: boolean
    gym_marketplace: boolean
  }
  gym: {
    name: string
    timezone: string
    currency: string
    maxCapacity: number
  }
}

export const DEFAULT_ORG_CONFIG: OrgConfig = {
  colors: {
    primary: '#FF5E14',
    background: '#0A0A0A',
    surface: '#111111',
    border: '#1E1E1E',
    text: '#F5F5F5',
    textMuted: '#737373',
  },
  design: {
    preset: 'bold',
    cardRadius: '14px',
    font: 'dm-sans',
    headingFont: 'barlow-condensed',
    shadow: 'none',
  },
  media: { logoUrl: null, portalBgImage: null, faviconUrl: null },
  features: {
    community: true,
    content: true,
    gym_qr_checkin: true,
    gym_health_metrics: true,
    gym_routines: true,
    gym_progress: true,
    gym_calendar: true,
    gym_challenges: true,
    gym_marketplace: false,
  },
  gym: {
    name: 'GymBase',
    timezone: 'America/Costa_Rica',
    currency: 'CRC',
    maxCapacity: 50,
  },
}
