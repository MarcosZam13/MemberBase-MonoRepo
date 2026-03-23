// membership.service.ts — Lógica de negocio para planes y suscripciones
// Recibe el cliente de Supabase como parámetro para ser reutilizable desde actions y API routes

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipPlan, Subscription } from "@/types/database";

// Obtiene todos los planes, opcionalmente solo los activos
export async function fetchPlans(
  supabase: SupabaseClient,
  onlyActive = false
): Promise<MembershipPlan[]> {
  let query = supabase
    .from("membership_plans")
    .select("id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (onlyActive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MembershipPlan[];
}

// Obtiene la suscripción activa/pendiente/rechazada de un usuario
export async function fetchUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
      plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at),
      payment_proofs(id, status, created_at, file_url, file_path, rejection_reason, amount, notes, payment_method, subscription_id, user_id, reviewed_by, reviewed_at)
    `)
    .eq("user_id", userId)
    .in("status", ["active", "pending", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Subscription | null;
}

// Verifica si un usuario ya tiene una suscripción activa o pendiente (previene duplicados)
export async function hasActiveOrPendingSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["active", "pending"]);

  return (count ?? 0) > 0;
}

// Crea una suscripción pendiente para un usuario en un plan dado
export async function createPendingSubscription(
  supabase: SupabaseClient,
  userId: string,
  planId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: userId, plan_id: planId, status: "pending" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

// Activa una suscripción: actualiza estado, fechas de inicio y expiración
export async function activateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  durationDays: number
): Promise<void> {
  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(error.message);
}

// Marca una suscripción como rechazada
export async function rejectSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "rejected" })
    .eq("id", subscriptionId);

  if (error) throw new Error(error.message);
}
