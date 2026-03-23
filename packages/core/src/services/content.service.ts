// content.service.ts — Lógica de negocio para gestión de contenido

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Content } from "@/types/database";

// Obtiene el contenido accesible para un usuario (RLS filtra según su suscripción)
export async function fetchContentForUser(
  supabase: SupabaseClient
): Promise<Content[]> {
  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, type, body, media_url, thumbnail_url, is_published, sort_order, created_by, created_at, updated_at")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Content[];
}

// Obtiene todo el contenido para el panel admin (incluyendo borradores)
export async function fetchAllContent(
  supabase: SupabaseClient
): Promise<Content[]> {
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at,
      plans:content_plans(plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at))
    `)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Content[];
}

// Obtiene un contenido por ID (RLS valida que el usuario tenga acceso)
export async function fetchContentById(
  supabase: SupabaseClient,
  contentId: string
): Promise<Content | null> {
  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, type, body, media_url, thumbnail_url, is_published, sort_order, created_by, created_at, updated_at")
    .eq("id", contentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Content | null;
}

// Crea un nuevo contenido y asigna los planes con acceso
export async function createContentWithPlans(
  supabase: SupabaseClient,
  payload: Omit<Content, "id" | "created_at" | "updated_at" | "plans">,
  planIds: string[]
): Promise<string> {
  const { data, error } = await supabase
    .from("content")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Vincular el contenido con los planes seleccionados
  const contentPlans = planIds.map((planId) => ({
    content_id: data.id,
    plan_id: planId,
  }));

  const { error: plansError } = await supabase
    .from("content_plans")
    .insert(contentPlans);

  if (plansError) throw new Error(plansError.message);
  return data.id;
}

// Alterna el estado publicado/borrador de un contenido
export async function toggleContentPublished(
  supabase: SupabaseClient,
  contentId: string,
  isPublished: boolean
): Promise<void> {
  const { error } = await supabase
    .from("content")
    .update({ is_published: isPublished })
    .eq("id", contentId);

  if (error) throw new Error(error.message);
}
