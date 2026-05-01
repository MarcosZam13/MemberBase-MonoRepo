// content-portal.actions.ts — Server actions de contenido para el portal del miembro
// Solo contiene funciones definidas localmente — requerimiento de "use server" con Turbopack

"use server";

import { createClient, getCurrentUser } from "@core/lib/supabase/server";
import type { ActionResult } from "@/types/database";

// ─── Tracking de vistas ───────────────────────────────────────────────────────

// Registra una vista del miembro; ignora duplicados del mismo día
export async function trackContentView(contentId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();

  // Verificar si ya vio este contenido hoy para evitar inflar contadores
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("content_views")
    .select("id")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .gte("viewed_at", today.toISOString())
    .limit(1)
    .single();

  if (existing) return;

  await supabase
    .from("content_views")
    .insert({ content_id: contentId, user_id: user.id });
}

// ─── Favoritos del miembro ────────────────────────────────────────────────────

// Agrega o elimina un favorito según si ya existe
export async function toggleFavorite(contentId: string): Promise<ActionResult<{ isFavorite: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("content_favorites")
    .select("id")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("content_favorites")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("[toggleFavorite] Error al eliminar:", error);
      return { success: false, error: "Error al quitar de favoritos." };
    }
    return { success: true, data: { isFavorite: false } };
  }

  const { error } = await supabase
    .from("content_favorites")
    .insert({ content_id: contentId, user_id: user.id });

  if (error) {
    console.error("[toggleFavorite] Error al insertar:", error);
    return { success: false, error: "Error al agregar a favoritos." };
  }
  return { success: true, data: { isFavorite: true } };
}
