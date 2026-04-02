// routines.ts — Schemas de validación para ejercicios, rutinas y entrenamientos

import { z } from "zod";

export const createExerciseSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z.string().optional(),
  video_url: z
    .string()
    .url("La URL del video no es válida")
    .optional()
    .or(z.literal("")),
  muscle_group: z.string().optional(),
  equipment: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"], {
    error: "Nivel de dificultad inválido",
  }),
  is_timed: z.boolean().optional().default(false),
  // preprocess convierte NaN (viene de valueAsNumber con campo vacío) a null
  duration_seconds: z.preprocess(
    (v) => (typeof v === "number" && isNaN(v) ? null : v),
    z.number().int("Debe ser un número entero").min(1, "Mínimo 1 segundo").max(3600, "Máximo 3600 segundos").nullable().optional()
  ),
  // Referencia al ejercicio padre cuando se crea una variante
  parent_exercise_id: z.string().uuid().optional().nullable(),
});

export const createRoutineSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z.string().optional(),
  duration_weeks: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 semana")
    .max(52, "Máximo 52 semanas")
    .optional(),
  days_per_week: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 día")
    .max(7, "Máximo 7 días")
    .optional(),
  is_template: z.boolean().optional(),
});

export const addRoutineExerciseSchema = z.object({
  exercise_id: z.string().uuid("ID de ejercicio inválido"),
  sets: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 serie")
    .max(20, "Máximo 20 series")
    .optional(),
  reps: z.string().optional(),
  rest_seconds: z
    .number()
    .int("Debe ser un número entero")
    .min(0, "Mínimo 0 segundos")
    .max(600, "Máximo 600 segundos")
    .optional(),
  notes: z.string().optional(),
});

export const assignRoutineSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  routine_id: z.string().uuid("ID de rutina inválido"),
});

export const logWorkoutSchema = z.object({
  routine_day_id: z.string().uuid("ID de día inválido"),
  duration_minutes: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 minuto")
    .optional(),
  exercises_done: z.any().optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type AddRoutineExerciseInput = z.infer<typeof addRoutineExerciseSchema>;
export type AssignRoutineInput = z.infer<typeof assignRoutineSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
