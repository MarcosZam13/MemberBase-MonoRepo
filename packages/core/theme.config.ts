// theme.config.ts — Único archivo a modificar para personalizar la marca del cliente white label

export const themeConfig = {
  brand: {
    name: "MemberBase",
    tagline: "Gestiona tus membresías con facilidad",
    logo: "/theme/logo.svg",
    favicon: "/theme/favicon.ico",
  },
  colors: {
    // Color principal usado en navbar, botones CTA, elementos activos
    primary: "#1E3A5F",
    primaryHover: "#2563EB",
    primaryForeground: "#FFFFFF",
    // Acento secundario para highlights y badges
    accent: "#F97316",
    accentForeground: "#FFFFFF",
    // Fondos
    background: "#FFFFFF",
    surface: "#F9FAFB",
    // Texto
    text: "#111827",
    textMuted: "#6B7280",
    // Bordes y separadores
    border: "#E5E7EB",
    input: "#E5E7EB",
    ring: "#1E3A5F",
    // Estados semánticos
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
  },
  fonts: {
    sans: "'Inter', sans-serif",
    heading: "'Inter', sans-serif",
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
    instructions: "Realiza una transferencia SINPE al número indicado con tu nombre completo en el concepto.",
  },
  features: {
    community: true,    // Activar módulo de comunidad (v2.0)
    routines: false,    // Activar módulo de rutinas (v2.1)
    nutrition: false,   // Activar módulo de nutrición (v2.2)
    certificates: false, // Activar certificados de completado (futuro)
  },
} as const;

export type ThemeConfig = typeof themeConfig;
