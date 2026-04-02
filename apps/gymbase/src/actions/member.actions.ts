// member.actions.ts — Server actions para edición de datos de perfil de miembros (admin)

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

const createMemberSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  email: z.string().email("Email inválido"),
  phone: z.string().max(20).optional().nullable(),
  plan_id: z.string().uuid("Plan inválido").optional().nullable(),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Crea un nuevo miembro en Supabase Auth, actualiza su perfil y le asigna una membresía (solo admin)
export async function createMember(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { full_name, email, phone, plan_id, starts_at, expires_at } = parsed.data;
  const supabase = await createClient();

  // Verificar que el email no esté ya registrado
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return { success: false, error: "Este email ya está registrado como miembro" };

  // Usar el cliente con service_role_key — auth.admin.* requiere permisos de servicio, no anon key
  const adminSupabase = createAdminClient();

  // Enviar invitación por email — Supabase crea el usuario en auth y envía el link para que establezca contraseña
  const { data: authData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role: "member" },
  });
  if (inviteError) {
    console.error("[createMember] Error al invitar usuario:", inviteError.message);
    return { success: false, error: "Error al crear la cuenta. Verifica la configuración del servidor." };
  }

  const newUserId = authData.user.id;

  // Actualizar el perfil con nombre y teléfono (el trigger de auth ya crea el registro base)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: newUserId, email, full_name, phone: phone ?? null, role: "member" }, { onConflict: "id" });
  if (profileError) {
    console.error("[createMember] Error al actualizar perfil:", profileError.message);
  }

  // Crear la membresía si se seleccionó un plan
  if (plan_id) {
    const startsAt = starts_at ? new Date(starts_at).toISOString() : new Date().toISOString();
    let expiresAt: string | null = expires_at ? new Date(expires_at).toISOString() : null;

    // Si no hay fecha de vencimiento manual, calcularla según la duración del plan
    if (!expiresAt) {
      const { data: plan } = await supabase
        .from("membership_plans")
        .select("duration_days")
        .eq("id", plan_id)
        .single();
      if (plan) {
        const expDate = new Date(startsAt);
        expDate.setDate(expDate.getDate() + plan.duration_days);
        expiresAt = expDate.toISOString();
      }
    }

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: newUserId,
      plan_id,
      status: "active",
      starts_at: startsAt,
      expires_at: expiresAt,
    });
    if (subError) {
      console.error("[createMember] Error al crear suscripción:", subError.message);
    }
  }

  revalidatePath("/admin/members");
  return { success: true, data: { id: newUserId } };
}

const updateMemberProfileSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
});

// Actualiza el nombre y teléfono de un miembro desde el panel de admin
export async function updateMemberProfile(
  memberId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = updateMemberProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", memberId);
    if (error) throw error;
    revalidatePath(`/admin/members/${memberId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateMemberProfile] Error:", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}
