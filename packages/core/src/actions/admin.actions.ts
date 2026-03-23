// admin.actions.ts — Server actions para el panel de administración
// Solo gestiona auth y delega la lógica al service correspondiente

"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { fetchAdminStats, fetchMembers, fetchMemberById } from "@/services/admin.service";
import type { AdminDashboardStats, MemberWithSubscription } from "@/types/database";

// Obtiene los KPIs del dashboard de administración
export async function getAdminStats(): Promise<AdminDashboardStats> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { activeMembers: 0, pendingPayments: 0, monthlyRevenue: 0, publishedContent: 0, newMembersLast30Days: 0 };
  }

  const supabase = await createClient();
  try {
    return await fetchAdminStats(supabase);
  } catch (error) {
    console.error("[getAdminStats] Error:", error);
    return { activeMembers: 0, pendingPayments: 0, monthlyRevenue: 0, publishedContent: 0, newMembersLast30Days: 0 };
  }
}

// Obtiene la lista de miembros con su suscripción activa (solo admin)
export async function getMembers(): Promise<MemberWithSubscription[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  const supabase = await createClient();
  try {
    return await fetchMembers(supabase);
  } catch (error) {
    console.error("[getMembers] Error:", error);
    return [];
  }
}

// Obtiene el perfil completo de un miembro específico (solo admin)
export async function getMemberById(memberId: string): Promise<MemberWithSubscription | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  const supabase = await createClient();
  try {
    return await fetchMemberById(supabase, memberId);
  } catch (error) {
    console.error("[getMemberById] Error:", error);
    return null;
  }
}
