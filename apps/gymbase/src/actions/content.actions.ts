// content.actions.ts — Server actions gymbase-specific de contenido (favoritos y vistas admin)
// Las acciones CRUD base viven en @core/actions/content.actions

"use server";

import { createClient, getCurrentUser } from "@core/lib/supabase/server";
import { buildPaginationRange, buildPaginatedResult } from "@core/types/pagination";
import type { Content, MembershipPlan } from "@/types/database";
import type { PaginatedResult } from "@core/types/pagination";

// ─── Contenido paginado para el portal ───────────────────────────────────────

// RLS filtra automáticamente según rol y membresía activa — igual que getContentForUser
export async function getContentForUserPaginated(params: {
  page: number;
  pageSize: number;
  search?: string;
  categorySlug?: string;
}): Promise<PaginatedResult<Content>> {
  const user = await getCurrentUser();
  const empty = buildPaginatedResult([], 0, params);
  if (!user) return empty;

  const supabase = await createClient();
  const { from, to } = buildPaginationRange(params);

  const CONTENT_SELECT = `
    id, title, description, type, body, media_url, thumbnail_url,
    is_published, sort_order, created_by, created_at, updated_at, category_id,
    category:content_categories(id, name, slug, color),
    plans:content_plans(plan_id)
  `;

  try {
    let countQ = supabase.from("content").select("*", { count: "exact", head: true });
    let dataQ = supabase.from("content").select(CONTENT_SELECT).order("sort_order", { ascending: true }).range(from, to);

    if (params.search?.trim()) {
      const f = `title.ilike.%${params.search.trim()}%,description.ilike.%${params.search.trim()}%`;
      countQ = countQ.or(f);
      dataQ = dataQ.or(f);
    }

    if (params.categorySlug) {
      // La RLS no permite filtrar directamente por slug de categoría — filtramos por join
      const { data: catRow } = await supabase
        .from("content_categories")
        .select("id")
        .eq("slug", params.categorySlug)
        .single();
      if (catRow) {
        countQ = countQ.eq("category_id", catRow.id);
        dataQ = dataQ.eq("category_id", catRow.id);
      } else {
        return empty;
      }
    }

    const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
    if (error) throw new Error(error.message);

    return buildPaginatedResult((data ?? []) as unknown as Content[], count ?? 0, params);
  } catch (error) {
    console.error("[getContentForUserPaginated] Error:", error);
    return empty;
  }
}

// Obtiene un contenido por ID con sus plan_ids para la vista de edición admin
export async function getContentByIdForAdmin(
  id: string
): Promise<(Content & { plan_ids: string[] }) | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at, category_id,
      post_plans:content_plans(plan_id)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const rawPlans = (data.post_plans as Array<{ plan_id: string }>) ?? [];
  return {
    ...(data as unknown as Content),
    plan_ids: rawPlans.map((p) => p.plan_id),
  };
}

// ─── Favoritos del miembro (server-side fetch) ────────────────────────────────

// Retorna los IDs de contenido que el usuario actual tiene marcado como favorito
export async function getMyFavoriteIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_favorites")
    .select("content_id")
    .eq("user_id", user.id);

  return (data ?? []).map((r) => r.content_id);
}

// ─── Conteos de vistas (admin) ────────────────────────────────────────────────

// Retorna un mapa contentId → total_views — solo admins/owners
// Usa RPC con GROUP BY en PostgreSQL — evita traer todas las filas al servidor Node
export async function getAllContentViewCounts(): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return {};

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_content_view_counts");

  if (!data) return {};

  return Object.fromEntries(
    (data as Array<{ content_id: string; view_count: number }>).map(
      (r) => [r.content_id, Number(r.view_count)]
    )
  );
}

// ─── Query admin extendida con conteos ────────────────────────────────────────

// Retorna todo el contenido para el admin con campo view_count y plan_ids inyectados
export async function getAllContentWithViews(): Promise<(Content & { view_count: number; plan_ids: string[] })[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

  const supabase = await createClient();

  const [{ data: contentData }, viewCounts] = await Promise.all([
    supabase
      .from("content")
      .select(`
        id, title, description, type, body, media_url, thumbnail_url,
        is_published, sort_order, created_by, created_at, updated_at,
        category_id,
        plans:membership_plans!content_plans(id, name),
        post_plans:content_plans(plan_id)
      `)
      .order("sort_order", { ascending: true }),
    getAllContentViewCounts(),
  ]);

  if (!contentData) return [];

  return contentData.map((item) => {
    const rawPlans = (item.post_plans as Array<{ plan_id: string }>) ?? [];
    return {
      ...(item as unknown as Content),
      plans: (item.plans as unknown as MembershipPlan[]) ?? [],
      view_count: viewCounts[item.id] ?? 0,
      plan_ids: rawPlans.map((p) => p.plan_id),
    };
  });
}
