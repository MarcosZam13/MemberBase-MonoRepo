// checkin.actions.ts — Server actions para check-in QR, check-out y ocupación

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchUserQR,
  generateQRCode,
  findQRByCode,
  insertCheckin,
  performCheckout,
  fetchOpenCheckin,
  fetchCurrentOccupancy,
  fetchAttendanceLogs,
} from "@/services/checkin.service";
import { scanQRSchema, manualCheckinSchema, checkoutSchema } from "@/lib/validations/checkin";
import { DEFAULT_GYM_CAPACITY } from "@/lib/constants";
import type { ActionResult } from "@/types/database";
import type { QRCode, AttendanceLog, AttendanceLogWithProfile, OccupancyData, OccupancyLevel } from "@/types/gym-checkin";

// Calcula el nivel de ocupación basado en el porcentaje de capacidad
function getOccupancyLevel(percentage: number): OccupancyLevel {
  if (percentage < 30) return "free";
  if (percentage < 60) return "moderate";
  if (percentage < 85) return "busy";
  return "full";
}

// Obtiene o genera el QR del miembro autenticado
export async function getMyQR(): Promise<QRCode | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  try {
    const existing = await fetchUserQR(supabase, user.id);
    if (existing) return existing;

    // Si no tiene QR activo, generar uno nuevo
    const orgId = await getOrgId();
    return await generateQRCode(supabase, user.id, orgId);
  } catch (error) {
    console.error("[getMyQR] Error:", error);
    return null;
  }
}

// Genera un nuevo QR para un miembro específico (solo admin)
export async function generateMemberQR(userId: string): Promise<ActionResult<QRCode>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) {
    return { success: false, error: "Sin permisos" };
  }

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const qr = await generateQRCode(supabase, userId, orgId);
    return { success: true, data: qr };
  } catch (error) {
    console.error("[generateMemberQR] Error:", error);
    return { success: false, error: "Error al generar el código QR" };
  }
}

// Procesa un escaneo de QR y registra el check-in
export async function scanCheckin(input: unknown): Promise<ActionResult<AttendanceLog>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) {
    return { success: false, error: "Sin permisos para registrar asistencia" };
  }

  const parsed = scanQRSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  try {
    // Buscar el QR escaneado
    const qrRecord = await findQRByCode(supabase, parsed.data.qr_code);
    if (!qrRecord) {
      return { success: false, error: "Código QR no válido o desactivado" };
    }

    // Verificar si ya tiene un check-in abierto
    const openCheckin = await fetchOpenCheckin(supabase, qrRecord.user_id);
    if (openCheckin) {
      // Si ya está adentro, hacer check-out automático
      const checkout = await performCheckout(supabase, openCheckin.id);
      revalidatePath("/admin/occupancy");
      return { success: true, data: checkout };
    }

    // Registrar check-in
    const checkin = await insertCheckin(supabase, qrRecord.user_id, qrRecord.org_id, user.id);
    revalidatePath("/admin/occupancy");
    return { success: true, data: checkin };
  } catch (error) {
    console.error("[scanCheckin] Error:", error);
    const message = error instanceof Error ? error.message : "Error al procesar el check-in";
    return { success: false, error: message };
  }
}

// Check-in manual por ID de usuario (fallback sin QR)
export async function manualCheckin(input: unknown): Promise<ActionResult<AttendanceLog>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) {
    return { success: false, error: "Sin permisos" };
  }

  const parsed = manualCheckinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const checkin = await insertCheckin(supabase, parsed.data.user_id, orgId, user.id);
    revalidatePath("/admin/occupancy");
    return { success: true, data: checkin };
  } catch (error) {
    console.error("[manualCheckin] Error:", error);
    const message = error instanceof Error ? error.message : "Error al registrar la asistencia";
    return { success: false, error: message };
  }
}

// Registra el check-out de un miembro
export async function checkOut(input: unknown): Promise<ActionResult<AttendanceLog>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) {
    return { success: false, error: "Sin permisos" };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  try {
    const checkout = await performCheckout(supabase, parsed.data.attendance_id);
    revalidatePath("/admin/occupancy");
    return { success: true, data: checkout };
  } catch (error) {
    console.error("[checkOut] Error:", error);
    return { success: false, error: "Error al registrar la salida" };
  }
}

// Obtiene datos de ocupación actual del gym
export async function getOccupancy(): Promise<OccupancyData> {
  const supabase = await createClient();

  try {
    const orgId = await getOrgId();
    const current = await fetchCurrentOccupancy(supabase, orgId);
    const capacity = DEFAULT_GYM_CAPACITY;
    const percentage = Math.min(100, Math.round((current / capacity) * 100));
    const level = getOccupancyLevel(percentage);

    return { current, capacity, level, percentage };
  } catch (error) {
    console.error("[getOccupancy] Error:", error);
    return { current: 0, capacity: DEFAULT_GYM_CAPACITY, level: "free", percentage: 0 };
  }
}

// Obtiene el historial de asistencia (solo admin/trainer)
export async function getAttendanceLogs(
  options: { limit?: number; today?: boolean } = {}
): Promise<AttendanceLogWithProfile[]> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) return [];

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchAttendanceLogs(supabase, orgId, options);
  } catch (error) {
    console.error("[getAttendanceLogs] Error:", error);
    return [];
  }
}

// Obtiene el conteo de asistencias del mes actual por usuario — para la tabla de miembros admin
export async function getMonthlyAttendanceCounts(): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) return {};

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("gym_attendance_logs")
      .select("user_id")
      .eq("org_id", orgId)
      .gte("check_in_at", startOfMonth.toISOString());

    if (error) throw new Error(error.message);

    // Agrupar conteos por user_id en memoria (más portable que COUNT GROUP BY)
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error("[getMonthlyAttendanceCounts] Error:", error);
    return {};
  }
}

// Obtiene el check-in abierto del usuario actual (para el portal)
export async function getMyOpenCheckin(): Promise<AttendanceLog | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  try {
    return await fetchOpenCheckin(supabase, user.id);
  } catch (error) {
    console.error("[getMyOpenCheckin] Error:", error);
    return null;
  }
}
