// content.ts — Schemas de Zod para gestión de contenido

import { z } from "zod";

const CONTENT_TYPES = ["article", "video", "image", "file", "link"] as const;

export const createContentSchema = z.object({
  title: z
    .string()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede exceder 200 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
  type: z.enum(CONTENT_TYPES, {
    error: () => "Selecciona un tipo de contenido válido",
  }),
  body: z.string().optional().or(z.literal("")),
  media_url: z
    .string()
    .url("Ingresa una URL válida")
    .optional()
    .or(z.literal("")),
  thumbnail_url: z
    .string()
    .url("Ingresa una URL válida")
    .optional()
    .or(z.literal("")),
  is_published: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  // IDs de los planes que tendrán acceso a este contenido
  plan_ids: z.array(z.string().uuid()).min(1, "Selecciona al menos un plan"),
  // Categoría opcional para organizar el contenido en carpetas
  category_id: z.string().uuid().optional().or(z.literal("")),
});

export const updateContentSchema = createContentSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
