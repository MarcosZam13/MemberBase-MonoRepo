// constants.ts — Constantes globales del sistema

// Validación de archivos de comprobante de pago
export const ALLOWED_PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE_LABEL = "5MB";

// Nombres de buckets de Supabase Storage
export const STORAGE_BUCKETS = {
  PAYMENT_PROOFS: "payment-proofs",
  CONTENT_MEDIA: "content-media",
  AVATARS: "avatars",
} as const;

// Monedas soportadas
export const SUPPORTED_CURRENCIES = ["CRC", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Formatos de moneda para display
export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  CRC: "₡",
  USD: "$",
};

// Duración mínima y máxima de planes en días
export const MIN_PLAN_DURATION_DAYS = 1;
export const MAX_PLAN_DURATION_DAYS = 365;
