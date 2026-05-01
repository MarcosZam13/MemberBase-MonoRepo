// calendar.ts — Schemas de validación para clases y reservas

import { z } from "zod";

export const classTypeSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const scheduleClassSchema = z.object({
  type_id: z.string().uuid("Tipo de clase inválido"),
  // Opcional — si se omite, el ClassBlock muestra el nombre del tipo de clase
  title: z.string().min(2, "El título debe tener al menos 2 caracteres").max(100).optional().nullable(),
  starts_at: z.string().min(1, "La fecha de inicio es requerida"),
  ends_at: z.string().min(1, "La fecha de fin es requerida"),
  max_capacity: z.number().int().min(1).max(200).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  // Si no se proporciona, el action usa el usuario autenticado como instructor
  instructor_id: z.string().uuid().optional().nullable(),
  // Campos de recurrencia
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.enum(["daily", "weekdays", "weekly", "custom"]).optional(),
  recurrence_custom_days: z.array(z.number().int().min(1).max(7)).optional(),
  // ISO day numbers: 1=Lunes ... 7=Domingo
  recurrence_weeks: z.number().int().min(1).max(52).optional(),
}).superRefine((data, ctx) => {
  // Validación cruzada: si is_recurring=true, rule y weeks son obligatorios
  if (data.is_recurring) {
    if (!data.recurrence_rule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrence_rule"],
        message: "El patrón de recurrencia es requerido",
      });
    }
    if (!data.recurrence_weeks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrence_weeks"],
        message: "Las semanas de recurrencia son requeridas",
      });
    }
    // Si el patrón es custom, se necesita al menos un día seleccionado
    if (data.recurrence_rule === "custom" && (!data.recurrence_custom_days || data.recurrence_custom_days.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrence_custom_days"],
        message: "Selecciona al menos un día para la recurrencia personalizada",
      });
    }
  }
});

export const bookClassSchema = z.object({
  class_id: z.string().uuid("ID de clase inválido"),
});

export type ClassTypeInput = z.infer<typeof classTypeSchema>;
export type ScheduleClassInput = z.infer<typeof scheduleClassSchema>;
export type BookClassInput = z.infer<typeof bookClassSchema>;
