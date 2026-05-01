// membership.actions.ts — Server actions para gestión de planes de membresía

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createPlanSchema, updatePlanSchema } from "@/lib/validations/membership";
import type { ActionResult, MembershipPlan } from "@/types/database";

// Obtiene todos los planes (activos para clientes, todos para admin)
export async function getPlans(onlyActive = false): Promise<MembershipPlan[]> {
  const supabase = await createClient();

  let query = supabase
    .from("membership_plans")
    .select("id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getPlans] Error:", error.message);
    return [];
  }

  return (data ?? []).map((plan) => ({
    ...plan,
    // Supabase devuelve features como JSONB, asegurar que sea un array de strings
    features: Array.isArray(plan.features) ? plan.features : [],
  }));
}

// Crea un nuevo plan de membresía (solo admin)
export async function createPlan(formData: unknown): Promise<ActionResult<MembershipPlan>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = createPlanSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      currency: parsed.data.currency,
      duration_days: parsed.data.duration_days,
      features: parsed.data.features,
      is_active: parsed.data.is_active,
      sort_order: parsed.data.sort_order,
    })
    .select()
    .single();

  if (error) {
    console.error("[createPlan] Error:", error.message);
    return { success: false, error: "Error al crear el plan. Intenta de nuevo." };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/portal/plans");
  revalidateTag("membership-plans", {});
  return { success: true, data: { ...data, features: Array.isArray(data.features) ? data.features : [] } };
}

// Actualiza un plan existente (solo admin)
export async function updatePlan(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = updatePlanSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { id, ...updates } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("membership_plans")
    .update({
      ...updates,
      description: updates.description || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[updatePlan] Error:", error.message);
    return { success: false, error: "Error al actualizar el plan." };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/portal/plans");
  revalidateTag("membership-plans", {});
  return { success: true };
}

// Activa o desactiva un plan sin eliminarlo (solo admin)
export async function togglePlanStatus(planId: string, isActive: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("membership_plans")
    .update({ is_active: isActive })
    .eq("id", planId);

  if (error) {
    console.error("[togglePlanStatus] Error:", error.message);
    return { success: false, error: "Error al cambiar el estado del plan." };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/portal/plans");
  revalidateTag("membership-plans", {});
  return { success: true };
}
