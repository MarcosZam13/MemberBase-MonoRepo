// category.service.ts — Lógica de negocio para categorías de contenido

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCategory } from "@/types/database";

export async function fetchCategories(
  supabase: SupabaseClient,
  onlyActive = false
): Promise<ContentCategory[]> {
  let query = supabase
    .from("content_categories")
    .select("id, name, slug, description, color, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (onlyActive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ContentCategory[];
}

export async function createCategory(
  supabase: SupabaseClient,
  payload: Pick<ContentCategory, "name" | "slug" | "description" | "color" | "sort_order">
): Promise<string> {
  const { data, error } = await supabase
    .from("content_categories")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<Pick<ContentCategory, "name" | "slug" | "description" | "color" | "sort_order" | "is_active">>
): Promise<void> {
  const { error } = await supabase
    .from("content_categories")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}
