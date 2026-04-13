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

// Configuración de una serie individual para pirámides y variaciones de peso
const defaultSetConfigSchema = z.object({
  set_number: z.number().int().min(1),
  weight_kg: z.number().min(0).max(1000).nullable().optional(),
  reps: z.string().max(20).nullable().optional(),
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
  // default_sets: configuración de pesos/reps por serie para pirámides
  default_sets: z.array(defaultSetConfigSchema).nullable().optional(),
});

// Schema para actualizar solo los default_sets de un ejercicio ya en la rutina
export const updateExerciseDefaultSetsSchema = z.object({
  routine_exercise_id: z.string().uuid("ID de ejercicio de rutina inválido"),
  default_sets: z.array(defaultSetConfigSchema).nullable(),
});

export const assignRoutineSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  routine_id: z.string().uuid("ID de rutina inválido"),
});

// Asignación de rutina con etiqueta opcional (nuevo modelo multi-rutina)
export const assignRoutineToMemberSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  routine_id: z.string().uuid("ID de rutina inválido"),
  label: z.string().max(50, "La etiqueta no puede exceder 50 caracteres").optional(),
});

export const setFeaturedRoutineSchema = z.object({
  member_routine_id: z.string().uuid("ID de asignación inválido"),
});

export const removeRoutineFromMemberSchema = z.object({
  member_routine_id: z.string().uuid("ID de asignación inválido"),
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

// Schema de un set individual al completar una sesión
const workoutSetSchema = z.object({
  set_number: z.number().int(),
  weight_kg: z.number().nullable(),
  reps: z.number().int().min(0),
  completed: z.boolean(),
  is_pr: z.boolean(),
});

// Schema de un ejercicio con sus sets al completar una sesión
const workoutExerciseDoneSchema = z.object({
  routine_exercise_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  exercise_name: z.string(),
  sets: z.array(workoutSetSchema),
});

// Schema principal para completeWorkoutSession
export const completeWorkoutSessionSchema = z.object({
  routine_day_id: z.string().uuid("ID de día inválido"),
  exercises: z.array(workoutExerciseDoneSchema).min(1, "Debe incluir al menos un ejercicio"),
  duration_minutes: z.number().int().min(1).optional(),
});

export type CompleteWorkoutSessionInput = z.infer<typeof completeWorkoutSessionSchema>;

// ── Schemas para rutinas propias del miembro ─────────────────────────────────

// Paso 1: información básica de la nueva rutina del miembro
export const createMemberRoutineSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  is_public: z.boolean().optional().default(false),
});

// Actualizar datos básicos de una rutina del miembro
export const updateMemberRoutineSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

// Agregar día a una rutina del miembro
export const addDayToMyRoutineSchema = z.object({
  routine_id: z.string().uuid("ID de rutina inválido"),
  name: z
    .string()
    .min(1, "El nombre del día es requerido")
    .max(60, "Máximo 60 caracteres"),
});

// Agregar ejercicio a un día de una rutina del miembro
export const addExerciseToMyDaySchema = z.object({
  day_id: z.string().uuid("ID de día inválido"),
  exercise_id: z.string().uuid("ID de ejercicio inválido"),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.string().max(20).optional(),
  rest_seconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(200).optional(),
});

// Crear un ejercicio privado del miembro (nombre + grupo muscular como mínimo)
export const createPrivateExerciseSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  muscle_group: z.string().optional(),
  equipment: z.string().optional(),
  description: z.string().max(300).optional(),
});

export type CreateMemberRoutineInput = z.infer<typeof createMemberRoutineSchema>;
export type UpdateMemberRoutineInput = z.infer<typeof updateMemberRoutineSchema>;
export type AddDayToMyRoutineInput = z.infer<typeof addDayToMyRoutineSchema>;
export type AddExerciseToMyDayInput = z.infer<typeof addExerciseToMyDaySchema>;
export type CreatePrivateExerciseInput = z.infer<typeof createPrivateExerciseSchema>;

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type AddRoutineExerciseInput = z.infer<typeof addRoutineExerciseSchema>;
export type UpdateExerciseDefaultSetsInput = z.infer<typeof updateExerciseDefaultSetsSchema>;
export type AssignRoutineInput = z.infer<typeof assignRoutineSchema>;
export type AssignRoutineToMemberInput = z.infer<typeof assignRoutineToMemberSchema>;
export type SetFeaturedRoutineInput = z.infer<typeof setFeaturedRoutineSchema>;
export type RemoveRoutineFromMemberInput = z.infer<typeof removeRoutineFromMemberSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
