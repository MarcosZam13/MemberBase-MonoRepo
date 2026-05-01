// challenges.ts — Schemas de validación para retos y gamificación

import { z } from "zod";

export const createChallengeSchema = z
  .object({
    title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(100),
    description: z.string().max(500).optional().nullable(),
    type: z.enum(
      ["attendance", "workout", "weight", "weight_loss", "personal_record", "custom"],
      { error: "Tipo de reto inválido" }
    ),
    goal_value: z
      .number({ error: "La meta es requerida" })
      .positive("La meta debe ser positiva"),
    goal_unit: z.string().min(1, "La unidad es requerida").max(30),
    starts_at: z.string().min(1, "La fecha de inicio es requerida"),
    ends_at: z.string().min(1, "La fecha de fin es requerida"),
    max_participants: z.number().int().min(2).max(1000).optional().nullable(),
    is_public: z.boolean().optional(),
    prize_description: z.string().max(200).optional().nullable(),
    banner_url: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
    // Campos opcionales por tipo
    exercise_id: z.string().uuid("ID de ejercicio inválido").optional().nullable(),
    target_routine_id: z.string().uuid("ID de rutina inválido").optional().nullable(),
    weight_loss_mode: z.enum(["absolute", "percentage"]).optional().nullable(),
  })
  .refine(
    (data) => {
      // personal_record requiere ejercicio seleccionado
      if (data.type === "personal_record") return !!data.exercise_id;
      return true;
    },
    {
      message: "Debes seleccionar un ejercicio para un reto de récord personal",
      path: ["exercise_id"],
    }
  );

export const logChallengeProgressSchema = z.object({
  challenge_id: z.string().uuid("ID de reto inválido"),
  value: z
    .number({ error: "El valor es requerido" })
    .positive("El valor debe ser positivo"),
  notes: z.string().max(200).optional().nullable(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type LogChallengeProgressInput = z.infer<typeof logChallengeProgressSchema>;
