// settings.actions.ts — Server actions para configuración del gym y gestión de administradores

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, getOrgId, createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_ORG_CONFIG } from "@core/types/org-config";
import type { OrgConfig } from "@core/types/org-config";
import type { ActionResult } from "@/types/database";

// Schema de validación para actualizar la configuración del gym
const orgSettingsSchema = z.object({
  gym_name: z.string().min(1, "El nombre es requerido").max(100).optional().nullable(),
  slogan: z.string().max(200).optional().nullable(),
  sinpe_number: z.string().max(20).optional().nullable(),
  sinpe_name: z.string().max(100).optional().nullable(),
  max_capacity: z.number().int().min(1).max(10000).optional().nullable(),
  cancel_minutes: z.number().int().min(0).max(1440).optional().nullable(),
});

export type OrgSettings = {
  id: string;
  gym_name: string | null;
  slogan: string | null;
  sinpe_number: string | null;
  sinpe_name: string | null;
  max_capacity: number | null;
  cancel_minutes: number | null;
};

export type AdminProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
};

// Obtiene la configuración actual del gym — solo el owner puede verla y editarla
export async function getOrgSettings(): Promise<OrgSettings | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return null;

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, gym_name, slogan, sinpe_number, sinpe_name, max_capacity, cancel_minutes")
      .eq("id", orgId)
      .single();
    if (error) throw error;
    return data as OrgSettings;
  } catch (error) {
    console.error("[getOrgSettings] Error:", error);
    return null;
  }
}

// Retorna datos públicos del gym para mostrar en el portal — accesible por cualquier usuario autenticado
export async function getPublicOrgInfo(): Promise<{
  gym_name: string | null;
  sinpe_number: string | null;
  sinpe_name: string | null;
} | null> {
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from("organizations")
      .select("gym_name, sinpe_number, sinpe_name")
      .eq("id", orgId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[getPublicOrgInfo] Error:", error);
    return null;
  }
}

// Actualiza la configuración del gym — solo el owner puede modificarla
export async function updateOrgSettings(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = orgSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { error } = await supabase
      .from("organizations")
      .update(parsed.data)
      .eq("id", orgId);
    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[updateOrgSettings] Error:", error);
    return { success: false, error: "Error al guardar la configuración" };
  }
}

// Lista todos los usuarios con rol admin u owner — accesible por admins y owners
export async function getAdmins(): Promise<AdminProfile[]> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .in("role", ["admin", "owner"])
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as AdminProfile[];
  } catch (error) {
    console.error("[getAdmins] Error:", error);
    return [];
  }
}

// Promueve a admin un usuario existente o envía invitación si no existe
// Pueden llamar tanto admins como owners
export async function promoteToAdmin(email: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return { success: false, error: "Sin permisos" };
  }

  const emailParsed = z.string().email("Email inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Email inválido" };

  const supabase = await createClient();
  try {
    // Verificar si el usuario ya existe en profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", emailParsed.data)
      .maybeSingle();

    if (profile) {
      if (profile.role === "admin") {
        return { success: false, error: "Este usuario ya es administrador" };
      }
      if (profile.role === "owner") {
        return { success: false, error: "Este usuario ya es owner" };
      }
      // Usuario existe: promover a admin
      const { error } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", profile.id);
      if (error) throw error;
    } else {
      // Usuario no existe: enviar invitación — requiere service_role_key
      const adminSupabase = createAdminClient();
      const { error } = await adminSupabase.auth.admin.inviteUserByEmail(emailParsed.data, {
        data: { role: "admin" },
      });
      if (error) throw error;
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[promoteToAdmin] Error:", error);
    return { success: false, error: "Error al agregar administrador. Verifica la configuración del servidor." };
  }
}

// Promueve a owner un usuario existente — solo el owner puede crear más owners
export async function promoteToOwner(email: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return { success: false, error: "Sin permisos" };

  const emailParsed = z.string().email("Email inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Email inválido" };

  const supabase = await createClient();
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", emailParsed.data)
      .maybeSingle();

    if (profile) {
      if (profile.role === "owner") {
        return { success: false, error: "Este usuario ya es owner" };
      }
      const { error } = await supabase
        .from("profiles")
        .update({ role: "owner" })
        .eq("id", profile.id);
      if (error) throw error;
    } else {
      // Usuario no existe: invitar directamente como owner
      const adminSupabase = createAdminClient();
      const { error } = await adminSupabase.auth.admin.inviteUserByEmail(emailParsed.data, {
        data: { role: "owner" },
      });
      if (error) throw error;
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[promoteToOwner] Error:", error);
    return { success: false, error: "Error al agregar owner. Verifica la configuración del servidor." };
  }
}

// Busca miembros por nombre o email — usado en el combobox del panel de settings
// Solo retorna usuarios que aún no son owners (se pueden promover)
export async function searchMembers(
  query: string,
): Promise<Array<{ id: string; full_name: string | null; email: string; role: string }>> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return [];
  if (query.trim().length < 2) return [];

  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .neq("role", "owner")
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order("full_name")
      .limit(8);
    return data ?? [];
  } catch {
    return [];
  }
}

// Revoca el rol privilegiado de un usuario, lo degrada a miembro
// Regla: admins solo pueden revocar a otros admins, no a owners
export async function revokeAdmin(userId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return { success: false, error: "Sin permisos" };
  }

  if (user.id === userId) {
    return { success: false, error: "No puedes revocar tus propios permisos" };
  }

  const supabase = await createClient();
  try {
    // Obtener el rol actual del objetivo antes de modificar
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    // Un admin no puede degradar a un owner — solo el owner puede hacerlo
    if (user.role === "admin" && target?.role === "owner") {
      return { success: false, error: "No tienes permisos para revocar a un owner" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "member" })
      .eq("id", userId);
    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[revokeAdmin] Error:", error);
    return { success: false, error: "Error al revocar permisos" };
  }
}

// ─── Apariencia visual (config JSONB) ────────────────────────────────────────

const hexColor = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Color hex inválido");

const orgAppearanceSchema = z.object({
  colors: z.object({
    primary: hexColor,
    background: hexColor,
    surface: hexColor,
    border: hexColor,
    text: hexColor,
    textMuted: hexColor,
  }),
  design: z.object({
    preset: z.enum(["bold", "modern", "minimal", "classic"]),
    cardRadius: z.string().max(20),
    font: z.string().max(50),
    headingFont: z.string().max(50),
    shadow: z.enum(["none", "sm", "md"]),
  }),
  media: z.object({
    logoUrl: z.string().url("URL inválida").nullable().optional(),
    portalBgImage: z.string().url("URL inválida").nullable().optional(),
    faviconUrl: z.string().url("URL inválida").nullable().optional(),
  }),
});

// Retorna la sección de apariencia del config actual del gym (colors + design + media)
export async function getOrgAppearance(): Promise<Pick<OrgConfig, "colors" | "design" | "media"> | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return null;

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from("organizations")
      .select("config")
      .eq("id", orgId)
      .single();
    if (error) throw error;

    const config = data?.config as OrgConfig | null;
    return {
      colors: config?.colors ?? DEFAULT_ORG_CONFIG.colors,
      design: config?.design ?? DEFAULT_ORG_CONFIG.design,
      media: config?.media ?? DEFAULT_ORG_CONFIG.media,
    };
  } catch (error) {
    console.error("[getOrgAppearance] Error:", error);
    return null;
  }
}

// Guarda los cambios visuales (colors, design, media) sin tocar features ni gym settings
export async function saveOrgAppearance(
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = orgAppearanceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();

    // Leer config actual para hacer merge — no sobreescribir features ni gym settings
    const { data: current } = await supabase
      .from("organizations")
      .select("config")
      .eq("id", orgId)
      .single();

    const currentConfig = (current?.config ?? {}) as Partial<OrgConfig>;
    const newConfig: OrgConfig = {
      ...DEFAULT_ORG_CONFIG,
      ...currentConfig,
      colors: parsed.data.colors,
      design: parsed.data.design,
      media: {
        logoUrl: parsed.data.media?.logoUrl ?? null,
        portalBgImage: parsed.data.media?.portalBgImage ?? null,
        faviconUrl: parsed.data.media?.faviconUrl ?? null,
      },
    };

    const { error } = await supabase
      .from("organizations")
      .update({ config: newConfig })
      .eq("id", orgId);

    if (error) throw error;

    // Invalidar caché de Next.js para que el próximo request regenere el layout con el nuevo config.
    // El cache del middleware expira en 1 min — los cambios serán visibles dentro de ese margen.
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("[saveOrgAppearance] Error:", error);
    return { success: false, error: "No se pudo guardar la configuración visual" };
  }
}
