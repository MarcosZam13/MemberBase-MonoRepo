// admin.service.ts — Lógica de negocio para el panel de administración

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDashboardStats, MemberWithSubscription } from "@/types/database";
import { buildPaginationRange, buildPaginatedResult } from "@/types/pagination";
import type { PaginationParams, PaginatedResult } from "@/types/pagination";

// Obtiene los KPIs del dashboard ejecutando las queries en paralelo
export async function fetchAdminStats(
  supabase: SupabaseClient
): Promise<AdminDashboardStats> {
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  // Inicio y fin del mes calendario actual para el cálculo de ingresos
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const [
    { count: activeMembers },
    { count: pendingPayments },
    { data: revenueData },
    { count: publishedContent },
    { count: newMembers },
  ] = await Promise.all([
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payment_proofs").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payment_proofs").select("amount").eq("status", "approved").gte("created_at", startOfMonth).lt("created_at", startOfNextMonth),
    supabase.from("content").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member").gte("created_at", thirtyDaysAgo),
  ]);

  const monthlyRevenue = (revenueData ?? []).reduce(
    (sum, proof) => sum + (proof.amount ?? 0),
    0
  );

  return {
    activeMembers: activeMembers ?? 0,
    pendingPayments: pendingPayments ?? 0,
    monthlyRevenue,
    publishedContent: publishedContent ?? 0,
    newMembersLast30Days: newMembers ?? 0,
  };
}

// Obtiene todos los miembros (role = member) con su suscripción activa
export async function fetchMembers(
  supabase: SupabaseClient
): Promise<MemberWithSubscription[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, email, full_name, avatar_url, role, phone, created_at, updated_at,
      active_subscription:subscriptions(
        id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
        plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
      )
    `)
    .eq("role", "member")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MemberWithSubscription[];
}

// ─── Tipos para el filtro de estado en la tabla de miembros ──────────────────
export type MemberStatusFilter = "all" | "active" | "expiring" | "expired";

export interface MembersQueryParams extends PaginationParams {
  search?: string;
  status?: MemberStatusFilter;
  planId?: string;
}

// Obtiene IDs de miembros cuya suscripción más reciente coincide con el filtro de estado
async function getMemberIdsByStatus(
  supabase: SupabaseClient,
  status: MemberStatusFilter,
  planId?: string
): Promise<string[]> {
  const now = new Date().toISOString();
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (status === "active") {
    let q = supabase.from("subscriptions").select("user_id").eq("status", "active").gt("expires_at", in7days);
    if (planId) q = q.eq("plan_id", planId);
    const { data } = await q;
    return [...new Set((data ?? []).map((s) => s.user_id as string))];
  }

  if (status === "expiring") {
    let q = supabase.from("subscriptions").select("user_id").eq("status", "active").gte("expires_at", now).lte("expires_at", in7days);
    if (planId) q = q.eq("plan_id", planId);
    const { data } = await q;
    return [...new Set((data ?? []).map((s) => s.user_id as string))];
  }

  if (status === "expired") {
    // "Vencido" = subscription.status es expired/cancelled O está active pero ya pasó expires_at
    let q1 = supabase.from("subscriptions").select("user_id").in("status", ["expired", "cancelled"]);
    let q2 = supabase.from("subscriptions").select("user_id").eq("status", "active").lt("expires_at", now);
    if (planId) { q1 = q1.eq("plan_id", planId); q2 = q2.eq("plan_id", planId); }
    const [{ data: d1 }, { data: d2 }] = await Promise.all([q1, q2]);
    return [...new Set([...(d1 ?? []), ...(d2 ?? [])].map((s) => s.user_id as string))];
  }

  // status === "all" with optional plan filter
  if (planId) {
    const { data } = await supabase.from("subscriptions").select("user_id").eq("plan_id", planId);
    return [...new Set((data ?? []).map((s) => s.user_id as string))];
  }

  return [];
}

// Obtiene miembros paginados con filtros de búsqueda, estado y plan (solo admin)
// CORE CHANGE: paginación server-side para la tabla de miembros
export async function fetchMembersPaginated(
  supabase: SupabaseClient,
  params: MembersQueryParams
): Promise<PaginatedResult<MemberWithSubscription>> {
  const { from, to } = buildPaginationRange(params);

  // Resolver filtros de estado/plan en user_ids antes de la query principal
  const hasSubFilter = (params.status && params.status !== "all") || Boolean(params.planId);
  let userIdFilter: string[] | null = null;

  if (hasSubFilter) {
    userIdFilter = await getMemberIdsByStatus(supabase, params.status ?? "all", params.planId);
    // Ningún miembro coincide — retornar vacío sin hacer la query de profiles
    if (userIdFilter.length === 0) return buildPaginatedResult([], 0, params);
  }

  const MEMBER_SELECT = `
    id, email, full_name, avatar_url, role, phone, created_at, updated_at,
    active_subscription:subscriptions(
      id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
      plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
    )
  `;

  // Construir query con count exacto para calcular totalPages
  let countQ = supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member");
  let dataQ = supabase.from("profiles").select(MEMBER_SELECT).eq("role", "member").order("created_at", { ascending: false }).range(from, to);

  if (params.search?.trim()) {
    const filter = `full_name.ilike.%${params.search.trim()}%,email.ilike.%${params.search.trim()}%`;
    countQ = countQ.or(filter);
    dataQ = dataQ.or(filter);
  }

  if (userIdFilter !== null) {
    countQ = countQ.in("id", userIdFilter);
    dataQ = dataQ.in("id", userIdFilter);
  }

  const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
  if (error) throw new Error(error.message);

  return buildPaginatedResult((data ?? []) as unknown as MemberWithSubscription[], count ?? 0, params);
}

// Obtiene el perfil completo de un miembro específico
export async function fetchMemberById(
  supabase: SupabaseClient,
  memberId: string
): Promise<MemberWithSubscription | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, email, full_name, avatar_url, role, phone, created_at, updated_at,
      active_subscription:subscriptions(
        id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
        plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
      )
    `)
    .eq("id", memberId)
    .eq("role", "member")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as MemberWithSubscription | null;
}
