// content.actions.ts — Server actions para gestión y acceso a contenido

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createContentSchema, updateContentSchema } from "@/lib/validations/content";
import type { ActionResult, Content } from "@/types/database";

// Obtiene el contenido accesible para el usuario actual
// Los admins ven todo; los clientes solo ven lo publicado de sus planes
export async function getContentForUser(): Promise<Content[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();

  // RLS en la DB filtra automáticamente según el rol y membresía activa
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at,
      category_id,
      category:content_categories(id, name, slug, color),
      plans:content_plans(plan_id)
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getContentForUser] Error:", error.message);
    return [];
  }

  return data as unknown as Content[];
}

// Obtiene todo el contenido para el panel admin (publicado y borrador)
export async function getAllContent(): Promise<Content[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at,
      plans:membership_plans!content_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getAllContent] Error:", error.message);
    return [];
  }

  return data as unknown as Content[];
}

// Obtiene un contenido por ID con validación de acceso vía RLS
export async function getContentById(id: string): Promise<Content | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at,
      plans:membership_plans!content_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as Content;
}

// Crea un nuevo contenido y lo asocia a los planes seleccionados (solo admin)
export async function createContent(formData: unknown): Promise<ActionResult<Content>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = createContentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { plan_ids, ...contentData } = parsed.data;
  const supabase = await createClient();

  // Crear el contenido primero
  const { data: content, error: contentError } = await supabase
    .from("content")
    .insert({
      title: contentData.title,
      description: contentData.description || null,
      type: contentData.type,
      body: contentData.body || null,
      media_url: contentData.media_url || null,
      thumbnail_url: contentData.thumbnail_url || null,
      is_published: contentData.is_published,
      sort_order: contentData.sort_order,
      category_id: contentData.category_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (contentError) {
    console.error("[createContent] Error al crear:", contentError.message);
    return { success: false, error: "Error al crear el contenido." };
  }

  // Asociar el contenido con los planes seleccionados
  const contentPlanRows = plan_ids.map((plan_id) => ({
    content_id: content.id,
    plan_id,
  }));

  const { error: plansError } = await supabase
    .from("content_plans")
    .insert(contentPlanRows);

  if (plansError) {
    console.error("[createContent] Error al asociar planes:", plansError.message);
    return { success: false, error: "Contenido creado pero error al asociar planes." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true, data: content as Content };
}

// Actualiza un contenido existente (solo admin)
export async function updateContent(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = updateContentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { id, plan_ids, ...updates } = parsed.data;
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("content")
    .update({
      ...updates,
      description: updates.description || null,
      body: updates.body || null,
      media_url: updates.media_url || null,
      thumbnail_url: updates.thumbnail_url || null,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[updateContent] Error:", updateError.message);
    return { success: false, error: "Error al actualizar el contenido." };
  }

  // Si se proporcionaron planes, actualizar las relaciones
  if (plan_ids && plan_ids.length > 0) {
    await supabase.from("content_plans").delete().eq("content_id", id);
    await supabase.from("content_plans").insert(
      plan_ids.map((plan_id) => ({ content_id: id, plan_id }))
    );
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true };
}

// Elimina un contenido y sus relaciones con planes (solo admin)
export async function deleteContent(contentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();

  // Eliminar relaciones con planes primero (FK constraint)
  await supabase.from("content_plans").delete().eq("content_id", contentId);

  const { error } = await supabase.from("content").delete().eq("id", contentId);
  if (error) {
    console.error("[deleteContent] Error:", error.message);
    return { success: false, error: "Error al eliminar el contenido." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true };
}

// Cambia el estado publicado/borrador de un contenido (solo admin)
export async function togglePublished(contentId: string, isPublished: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("content")
    .update({ is_published: isPublished })
    .eq("id", contentId);

  if (error) {
    console.error("[togglePublished] Error:", error.message);
    return { success: false, error: "Error al cambiar el estado del contenido." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true };
}
