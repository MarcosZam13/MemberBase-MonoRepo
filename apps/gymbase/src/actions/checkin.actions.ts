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
  closeStaleCheckins,
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
    const orgId = await getOrgId();
    // Limpiar check-ins huérfanos antes de procesar — evita bloqueos al miembro
    await closeStaleCheckins(supabase, orgId);

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
    return { success: false, error: "Error al registrar la asistencia. Intenta de nuevo." };
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
    // Cerrar check-ins huérfanos antes de contar para que la cifra sea exacta
    await closeStaleCheckins(supabase, orgId);

    const [current, { data: org }] = await Promise.all([
      fetchCurrentOccupancy(supabase, orgId),
      // Leer el aforo configurado por el admin desde organizations
      supabase.from("organizations").select("max_capacity").eq("id", orgId).single(),
    ]);

    const capacity = org?.max_capacity ?? DEFAULT_GYM_CAPACITY;
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

// Obtiene conteos de asistencia del mes actual para un subconjunto de user_ids vía SQL GROUP BY
// Reemplaza el loop JS — solo consulta los usuarios de la página actual para no sobrecargar
export async function getMonthlyAttendanceCountsForUsers(
  userIds: string[]
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) return {};

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase.rpc("get_monthly_attendance_counts", {
      p_org_id: orgId,
      p_user_ids: userIds,
    });

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.user_id as string] = Number(row.attendance_count);
    }
    return counts;
  } catch (error) {
    console.error("[getMonthlyAttendanceCountsForUsers] Error:", error);
    return {};
  }
}

// Versión legacy — mantiene compatibilidad con otros llamadores existentes
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

// Obtiene una página de logs de asistencia para la tabla del tab Asistencias — paginación local
export async function getMemberAttendanceLogsPaginated(
  memberId: string,
  page: number,
  pageSize = 20
): Promise<{ data: AttendanceLog[]; total: number }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { data: [], total: 0 };

  const supabase = await createClient();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("gym_attendance_logs")
    .select("id, user_id, check_in_at, check_out_at, duration_minutes", { count: "exact" })
    .eq("user_id", memberId)
    .gte("check_in_at", oneYearAgo.toISOString())
    .order("check_in_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[getMemberAttendanceLogsPaginated] Error:", error);
    return { data: [], total: 0 };
  }
  return { data: (data ?? []) as AttendanceLog[], total: count ?? 0 };
}

// Obtiene todos los logs de asistencia de un miembro específico para visualizaciones
export async function getMemberAttendanceLogs(memberId: string): Promise<AttendanceLog[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

  const supabase = await createClient();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase
    .from("gym_attendance_logs")
    .select("id, user_id, check_in_at, check_out_at, duration_minutes")
    .eq("user_id", memberId)
    .gte("check_in_at", oneYearAgo.toISOString())
    .order("check_in_at", { ascending: false });

  if (error) {
    console.error("[getMemberAttendanceLogs] Error:", error);
    return [];
  }
  return (data ?? []) as AttendanceLog[];
}

// Obtiene el historial de asistencia del usuario autenticado (para el portal)
export async function getMyAttendanceLogs(limit = 30): Promise<AttendanceLog[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("gym_attendance_logs")
      .select("id, user_id, check_in_at, check_out_at, duration_minutes")
      .eq("user_id", user.id)
      .order("check_in_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as AttendanceLog[];
  } catch (error) {
    console.error("[getMyAttendanceLogs] Error:", error);
    return [];
  }
}

// Retorna los check-ins agrupados por día para los últimos 7 días — widget de tendencia en dashboard
export async function getWeeklyAttendanceTrend(): Promise<{ date: string; label: string; count: number }[]> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) return [];

  const supabase = await createClient();
  const orgId = await getOrgId();

  // Generar array de los últimos 7 días (hoy incluido) en fecha ISO "YYYY-MM-DD"
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const { data } = await supabase
    .from("gym_attendance_logs")
    .select("check_in_at")
    .eq("org_id", orgId)
    .gte("check_in_at", `${days[0]}T00:00:00.000Z`);

  // Agrupar en memoria (7 días = volumen pequeño para esta agregación)
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const dateKey = row.check_in_at.split("T")[0];
    counts[dateKey] = (counts[dateKey] ?? 0) + 1;
  }

  const DAY_LABELS: Record<number, string> = { 0: "Do", 1: "Lu", 2: "Ma", 3: "Mi", 4: "Ju", 5: "Vi", 6: "Sá" };

  return days.map((date) => ({
    date,
    label: DAY_LABELS[new Date(`${date}T12:00:00Z`).getUTCDay()],
    count: counts[date] ?? 0,
  }));
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
