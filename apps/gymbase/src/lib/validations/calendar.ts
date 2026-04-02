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
});

export const bookClassSchema = z.object({
  class_id: z.string().uuid("ID de clase inválido"),
});

export type ClassTypeInput = z.infer<typeof classTypeSchema>;
export type ScheduleClassInput = z.infer<typeof scheduleClassSchema>;
export type BookClassInput = z.infer<typeof bookClassSchema>;
