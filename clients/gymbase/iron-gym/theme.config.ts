// theme.config.ts — Configuración de marca para cliente Iron Gym CR
// Sobreescribe los valores del themeConfig base de @memberbase/core

export const themeConfig = {
  brand: {
    name: "Iron Gym CR",
    tagline: "El gym más fuerte de Costa Rica",
    logo: "/theme/logo.svg",
    favicon: "/theme/favicon.ico",
  },
  colors: {
    primary: "#1E3A5F",
    primaryHover: "#2563EB",
    primaryForeground: "#FFFFFF",
    accent: "#F97316",
    accentForeground: "#FFFFFF",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#111827",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    input: "#E5E7EB",
    ring: "#1E3A5F",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    dangerForeground: "#FFFFFF",
  },
  // TODO: Configurar número SINPE real del cliente — pendiente de datos del cliente
  payment: {
    sinpe_number: "0000-0000",
    sinpe_name: "Iron Gym CR S.A.",
    instructions: "Envía el comprobante de tu SINPE Móvil al número indicado.",
    currency: "CRC",
  },
  features: {
    community: true,
    content: true,
    // Módulos exclusivos de GymBase
    gym_qr_checkin: false,
    gym_health_metrics: false,
    gym_routines: false,
    gym_progress: false,
    gym_calendar: false,
    gym_challenges: false,
  },
};
