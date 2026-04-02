// admin.service.ts — Lógica de negocio para el panel de administración

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDashboardStats, MemberWithSubscription } from "@/types/database";

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
