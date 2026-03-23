// membership.ts — Schemas de Zod para planes de membresía y suscripciones

import { z } from "zod";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  ALLOWED_PROOF_MIME_TYPES,
  SUPPORTED_CURRENCIES,
  MIN_PLAN_DURATION_DAYS,
  MAX_PLAN_DURATION_DAYS,
} from "@/lib/constants";

export const createPlanSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
  price: z
    .number({ message: "El precio debe ser un número" })
    .positive("El precio debe ser mayor a 0")
    .max(9999999, "El precio es demasiado alto"),
  currency: z.enum(SUPPORTED_CURRENCIES, {
    error: () => "Selecciona una moneda válida",
  }),
  duration_days: z
    .number({ message: "La duración debe ser un número" })
    .int("La duración debe ser un número entero")
    .min(MIN_PLAN_DURATION_DAYS, `Mínimo ${MIN_PLAN_DURATION_DAYS} día`)
    .max(MAX_PLAN_DURATION_DAYS, `Máximo ${MAX_PLAN_DURATION_DAYS} días`),
  features: z
    .array(z.string().min(1).max(100))
    .max(10, "Máximo 10 beneficios por plan")
    .default([]),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  id: z.string().uuid(),
});

// Schema para subir comprobante de pago
export const uploadProofSchema = z.object({
  subscription_id: z.string().uuid("ID de suscripción inválido"),
  amount: z
    .number()
    .positive("El monto debe ser mayor a 0")
    .optional(),
  notes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Validación del archivo de comprobante (se usa en el servidor junto con uploadProofSchema)
export function validateProofFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE_LABEL}` };
  }
  if (!ALLOWED_PROOF_MIME_TYPES.includes(file.type as (typeof ALLOWED_PROOF_MIME_TYPES)[number])) {
    return { valid: false, error: "Formato no permitido. Usa JPG, PNG, WebP o PDF" };
  }
  return { valid: true };
}

// Schema para aprobar un pago
export const approvePaymentSchema = z.object({
  payment_id: z.string().uuid(),
  subscription_id: z.string().uuid(),
});

// Schema para rechazar un pago (requiere motivo obligatorio)
export const rejectPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  rejection_reason: z
    .string()
    .min(5, "El motivo de rechazo debe tener al menos 5 caracteres")
    .max(500, "El motivo no puede exceder 500 caracteres"),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type UploadProofInput = z.infer<typeof uploadProofSchema>;
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
