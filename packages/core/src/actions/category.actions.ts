// category.actions.ts — Server actions para gestión de categorías de contenido

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { fetchCategories, createCategory, updateCategory } from "@/services/category.service";
import type { ActionResult, ContentCategory } from "@/types/database";

const categorySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  description: z.string().max(200).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido").default("#6366f1"),
  sort_order: z.number().int().min(0).default(0),
});

// Obtiene todas las categorías activas (accesible desde portal y admin)
export async function getCategories(onlyActive = false): Promise<ContentCategory[]> {
  const supabase = await createClient();
  try {
    return await fetchCategories(supabase, onlyActive);
  } catch (error) {
    console.error("[getCategories] Error:", error);
    return [];
  }
}

// Crea una nueva categoría (solo admin)
export async function createCategoryAction(formData: unknown): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createClient();
  try {
    const id = await createCategory(supabase, {
      ...parsed.data,
      description: parsed.data.description ?? null,
    });
    revalidatePath("/admin/content");
    revalidatePath("/portal/content");
    return { success: true, data: id };
  } catch (error) {
    console.error("[createCategoryAction] Error:", error);
    return { success: false, error: "Error al crear la categoría" };
  }
}

// Actualiza una categoría existente (solo admin)
export async function updateCategoryAction(id: string, formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = categorySchema.partial().safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createClient();
  try {
    await updateCategory(supabase, id, parsed.data);
    revalidatePath("/admin/content");
    revalidatePath("/portal/content");
    return { success: true };
  } catch (error) {
    console.error("[updateCategoryAction] Error:", error);
    return { success: false, error: "Error al actualizar la categoría" };
  }
}
