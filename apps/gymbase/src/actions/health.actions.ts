// health.actions.ts — Server actions para métricas de salud, snapshots y fotos de progreso

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { logUnauthorizedAccess } from "@/lib/security/audit";
import { GYM_STORAGE_BUCKETS } from "@/lib/constants";
import {
  fetchHealthProfile,
  upsertHealthProfile,
  fetchHealthSnapshots,
  insertHealthSnapshot,
  fetchProgressPhotos,
} from "@/services/health.service";
import { healthProfileSchema, healthSnapshotSchema } from "@/lib/validations/health";
import type { ActionResult } from "@/types/database";
import type { HealthProfile, HealthSnapshot, ProgressPhoto } from "@/types/gym-health";

// Obtiene el perfil de salud: si se pasa userId requiere rol admin/trainer, si no obtiene el propio
export async function getHealthProfile(
  userId?: string
): Promise<HealthProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Si se solicita el perfil de otro usuario, verificar permisos
  if (userId && userId !== user.id) {
    if (!["admin", "trainer", "owner"].includes(user.role)) return null;
  }

  const targetId = userId ?? user.id;
  const supabase = await createClient();

  try {
    return await fetchHealthProfile(supabase, targetId);
  } catch (error) {
    console.error("[getHealthProfile] Error:", error);
    return null;
  }
}

// Crea o actualiza el perfil de salud de un miembro (solo admin/trainer)
export async function updateHealthProfile(
  input: unknown
): Promise<ActionResult<HealthProfile>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer", "owner"].includes(user.role)) {
    return { success: false, error: "Sin permisos" };
  }

  const parsed = healthProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { user_id, ...profileData } = parsed.data;
  const supabase = await createClient();

  try {
    const orgId = await getOrgId();
    const profile = await upsertHealthProfile(supabase, user_id, orgId, profileData);
    revalidatePath(`/admin/members/${user_id}`);
    revalidatePath("/portal/dashboard");
    return { success: true, data: profile };
  } catch (error) {
    console.error("[updateHealthProfile] Error:", error);
    return { success: false, error: "Error al actualizar el perfil de salud" };
  }
}

// Agrega un snapshot de métricas: admin/trainer puede para cualquier usuario, miembro solo el suyo
export async function addHealthSnapshot(
  input: unknown
): Promise<ActionResult<HealthSnapshot>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  const parsed = healthSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { user_id, ...snapshotData } = parsed.data;

  // Un miembro solo puede agregar snapshots para sí mismo
  if (user_id !== user.id && !["admin", "trainer", "owner"].includes(user.role)) {
    logUnauthorizedAccess({ userId: user.id, action: "add_health_snapshot", resource: `/admin/members/${user_id}`, details: { target_user_id: user_id } });
    return { success: false, error: "Sin permisos para registrar métricas de otro usuario" };
  }

  const supabase = await createClient();

  try {
    const orgId = await getOrgId();
    const snapshot = await insertHealthSnapshot(supabase, user_id, orgId, user.id, snapshotData);
    revalidatePath(`/admin/members/${user_id}`);
    revalidatePath("/portal/dashboard");
    return { success: true, data: snapshot };
  } catch (error) {
    console.error("[addHealthSnapshot] Error:", error);
    return { success: false, error: "Error al registrar el snapshot de salud" };
  }
}

// Obtiene el historial de snapshots: admin/trainer puede ver de cualquier usuario
export async function getHealthHistory(
  userId?: string,
  limit?: number
): Promise<HealthSnapshot[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  // Si se solicita el historial de otro usuario, verificar permisos
  if (userId && userId !== user.id) {
    if (!["admin", "trainer", "owner"].includes(user.role)) return [];
  }

  const targetId = userId ?? user.id;
  const supabase = await createClient();

  try {
    return await fetchHealthSnapshots(supabase, targetId, limit);
  } catch (error) {
    console.error("[getHealthHistory] Error:", error);
    return [];
  }
}

// Obtiene las fotos de progreso: admin/trainer puede ver de cualquier usuario
export async function getProgressPhotos(
  userId?: string
): Promise<ProgressPhoto[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  // Si se solicitan fotos de otro usuario, verificar permisos
  if (userId && userId !== user.id) {
    if (!["admin", "trainer", "owner"].includes(user.role)) return [];
  }

  const targetId = userId ?? user.id;
  const supabase = await createClient();

  try {
    return await fetchProgressPhotos(supabase, targetId);
  } catch (error) {
    console.error("[getProgressPhotos] Error:", error);
    return [];
  }
}

// ─── Acciones de admin: vista agregada de salud del gym ──────────────────────

export interface GymHealthStats {
  membersWithProfile: number;
  avgWeight: number | null;
  activeThisMonth: number;
  totalPhotos: number;
}

export interface MemberHealthSummary {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  lastWeight: number | null;
  lastBodyFat: number | null;
  lastMuscleMass: number | null;
  lastSnapshotAt: string | null;
  photoCount: number;
}

// KPIs de salud agregados para el panel admin — solo admin/owner puede acceder
export async function getGymHealthStats(): Promise<GymHealthStats | null> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner"].includes(user.role)) return null;

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    const [profilesRes, snapshotsRes, photosRes, recentRes] = await Promise.all([
      supabase.from("gym_health_profiles").select("user_id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("gym_health_snapshots").select("weight_kg").eq("org_id", orgId).not("weight_kg", "is", null),
      supabase.from("gym_progress_photos").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      // Miembros con snapshot en los últimos 30 días
      supabase
        .from("gym_health_snapshots")
        .select("user_id")
        .eq("org_id", orgId)
        .gte("recorded_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    const membersWithProfile = profilesRes.count ?? 0;
    const totalPhotos = photosRes.count ?? 0;

    // Promedio de peso del último snapshot de cada usuario (aproximación: todos los snapshots)
    const weights = (snapshotsRes.data ?? []).map((s: { weight_kg: number | null }) => s.weight_kg).filter(Boolean) as number[];
    const avgWeight = weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : null;

    // Miembros únicos con actividad reciente
    const uniqueRecent = new Set((recentRes.data ?? []).map((s: { user_id: string }) => s.user_id)).size;

    return { membersWithProfile, avgWeight, activeThisMonth: uniqueRecent, totalPhotos };
  } catch (error) {
    console.error("[getGymHealthStats] Error:", error);
    return null;
  }
}

// Lista de miembros con su último snapshot de salud — para la tabla del panel admin
export async function getMembersHealthSummary(): Promise<MemberHealthSummary[]> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner"].includes(user.role)) return [];

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    // Obtener user_ids con perfil de salud en este gym
    const { data: profiles } = await supabase
      .from("gym_health_profiles")
      .select("user_id")
      .eq("org_id", orgId);
    if (!profiles || profiles.length === 0) return [];

    const userIds = profiles.map((p: { user_id: string }) => p.user_id);

    // Obtener info básica de perfil (nombre, avatar)
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    // Obtener todos los snapshots ordenados por fecha descendente
    const { data: snapshots } = await supabase
      .from("gym_health_snapshots")
      .select("user_id, weight_kg, body_fat_pct, muscle_mass_kg, recorded_at")
      .eq("org_id", orgId)
      .in("user_id", userIds)
      .order("recorded_at", { ascending: false });

    // Obtener conteo de fotos por usuario
    const { data: photos } = await supabase
      .from("gym_progress_photos")
      .select("user_id")
      .eq("org_id", orgId)
      .in("user_id", userIds);

    // Consolidar: tomar el último snapshot de cada usuario
    const latestSnapshot: Record<string, { weight_kg: number | null; body_fat_pct: number | null; muscle_mass_kg: number | null; recorded_at: string }> = {};
    for (const snap of (snapshots ?? [])) {
      if (!latestSnapshot[snap.user_id]) {
        latestSnapshot[snap.user_id] = snap;
      }
    }

    // Conteo de fotos por usuario
    const photoCount: Record<string, number> = {};
    for (const photo of (photos ?? [])) {
      photoCount[photo.user_id] = (photoCount[photo.user_id] ?? 0) + 1;
    }

    // Construir resultado ordenado por fecha de último snapshot (más reciente primero)
    return userIds
      .map((uid: string) => {
        const profile = (memberProfiles ?? []).find((p: { id: string; full_name: string | null; avatar_url: string | null }) => p.id === uid);
        const snap = latestSnapshot[uid];
        return {
          userId: uid,
          fullName: profile?.full_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          lastWeight: snap?.weight_kg ?? null,
          lastBodyFat: snap?.body_fat_pct ?? null,
          lastMuscleMass: snap?.muscle_mass_kg ?? null,
          lastSnapshotAt: snap?.recorded_at ?? null,
          photoCount: photoCount[uid] ?? 0,
        };
      })
      .sort((a, b) => {
        if (!a.lastSnapshotAt && !b.lastSnapshotAt) return 0;
        if (!a.lastSnapshotAt) return 1;
        if (!b.lastSnapshotAt) return -1;
        return b.lastSnapshotAt.localeCompare(a.lastSnapshotAt);
      });
  } catch (error) {
    console.error("[getMembersHealthSummary] Error:", error);
    return [];
  }
}

// Sube una foto de progreso al storage y registra en DB
// Admin/trainer puede subir para cualquier memberId; miembros solo para sí mismos
export async function uploadProgressPhoto(
  formData: FormData
): Promise<ActionResult<ProgressPhoto>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("file") as File | null;
  const memberIdRaw = formData.get("memberId") as string | null;
  const photoType = formData.get("photoType") as "front" | "side" | "back" | null;
  const notes = formData.get("notes") as string | null;

  // Si se pasa un memberId ajeno, solo admin/trainer puede hacerlo
  const isAdminOrTrainer = ["admin", "trainer", "owner"].includes(user.role);
  if (memberIdRaw && memberIdRaw !== user.id && !isAdminOrTrainer) {
    logUnauthorizedAccess({ userId: user.id, action: "upload_progress_photo", resource: `/admin/members/${memberIdRaw}`, details: { target_user_id: memberIdRaw } });
    return { success: false, error: "Sin permisos" };
  }

  // Usar memberId de la request si es admin, o el propio user.id para miembros
  const targetId = memberIdRaw ?? user.id;

  if (!file || !photoType) {
    return { success: false, error: "Faltan datos requeridos" };
  }

  if (!["front", "side", "back"].includes(photoType)) {
    return { success: false, error: "Tipo de foto inválido" };
  }

  // Validar tamaño (máx 5MB) y tipo MIME antes de subir
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "La foto no puede superar 5MB" };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { success: false, error: "Solo se aceptan JPG, PNG o WebP" };
  }

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    // Construir la ruta: {orgId}/{targetId}/{tipo}-{timestamp}.ext
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${orgId}/${targetId}/${photoType}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(GYM_STORAGE_BUCKETS.PROGRESS_PHOTOS)
      .upload(path, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from(GYM_STORAGE_BUCKETS.PROGRESS_PHOTOS)
      .getPublicUrl(path);

    // Insertar registro en DB con URL pública y metadata
    const { data: photo, error: dbError } = await supabase
      .from("gym_progress_photos")
      .insert({
        user_id: targetId,
        org_id: orgId,
        photo_url: urlData.publicUrl,
        photo_type: photoType,
        notes: notes ?? null,
        taken_at: new Date().toISOString(),
      })
      .select("id, user_id, org_id, photo_url, photo_type, notes, taken_at, created_at")
      .single();

    if (dbError) throw new Error(dbError.message);

    // Revalidar la ruta del perfil del admin y del portal según el contexto
    revalidatePath(`/admin/members/${targetId}`);
    revalidatePath("/portal/profile");
    return { success: true, data: photo as ProgressPhoto };
  } catch (error) {
    console.error("[uploadProgressPhoto] Error:", error);
    return { success: false, error: "Error al subir la foto" };
  }
}
