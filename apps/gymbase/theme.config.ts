// theme.config.ts — Configuración de marca y módulos de GymBase
// Extiende el patrón white label de MemberBase con feature flags gym-specific

export const themeConfig = {
  // Zona horaria del gimnasio — usada para conversión UTC ↔ local en calendario
  timezone: "America/Costa_Rica",
  brand: {
    name: "GymBase",
    tagline: "Plataforma integral para gimnasios",
    logo: "/theme/logo.svg",
    favicon: "/theme/favicon.ico",
  },
  colors: {
    primary: "#FF5E14",
    primaryHover: "#FF7A3D",
    primaryForeground: "#FFFFFF",
    accent: "#FF5E14",
    accentForeground: "#FFFFFF",
    background: "#0A0A0A",
    surface: "#111111",
    text: "#F5F5F5",
    textMuted: "#737373",
    border: "#1E1E1E",
    input: "#1A1A1A",
    ring: "#FF5E14",
    success: "#22C55E",
    warning: "#FACC15",
    danger: "#EF4444",
    dangerForeground: "#FFFFFF",
  },
  fonts: {
    sans: "'DM Sans', 'Inter', sans-serif",
    heading: "'Barlow Condensed', 'Inter', sans-serif",
  },
  radius: {
    button: "0.5rem",
    card: "0.75rem",
    input: "0.375rem",
  },
  contact: {
    whatsapp: "",
    email: "",
    instagram: "",
  },
  payment: {
    sinpe_number: "00000000",
    sinpe_name: "",
    instructions: "Realiza una transferencia SINPE al número indicado con tu nombre completo en el concepto.",
    currency: "CRC",
  },
  features: {
    // Módulos heredados de MemberBase
    community: true,
    content: true,
    // Módulos exclusivos de GymBase
    gym_qr_checkin: true,
    gym_health_metrics: true,
    gym_routines: true,
    gym_progress: true,
    gym_calendar: true,
    gym_challenges: true,
    // Permite a los miembros crear sus propias rutinas personalizadas
    gym_member_custom_routines: true,
  },
} as const;

export type ThemeConfig = typeof themeConfig;
