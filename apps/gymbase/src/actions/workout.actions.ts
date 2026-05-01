// workout.actions.ts — Server actions para registro y consulta de entrenamientos

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  insertWorkoutLog,
  fetchWorkoutLogs,
  getLastSessionForDay,
  getMemberPRs,
  saveWorkoutSession,
  getExerciseWeightHistory,
  insertOneRepMaxTest,
  fetchOneRepMaxHistory,
} from "@/services/workout.service";
import { logWorkoutSchema, completeWorkoutSessionSchema, logOneRepMaxSchema } from "@/lib/validations/routines";
import type { ActionResult } from "@/types/database";
import type { WorkoutLog, PersonalRecord, PRResult, OneRepMaxTest, ExerciseProgressPoint } from "@/types/gym-routines";

/* ── Actions originales (se mantienen para compatibilidad) ───────────────────── */

export async function logWorkout(input: unknown): Promise<ActionResult<WorkoutLog>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = logWorkoutSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const log = await insertWorkoutLog(supabase, user.id, orgId, parsed.data);
    revalidatePath("/portal/routines");
    revalidatePath("/portal/progress");
    return { success: true, data: log };
  } catch (error) {
    console.error("[logWorkout] Error:", error);
    return { success: false, error: "Error al registrar el entrenamiento" };
  }
}

export async function getMyWorkoutLogs(limit?: number): Promise<WorkoutLog[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchWorkoutLogs(supabase, user.id, limit);
  } catch (error) {
    console.error("[getMyWorkoutLogs] Error:", error);
    return [];
  }
}

/* ── Nuevos actions — Parte 2 Módulo 3 ──────────────────────────────────────── */

// Pre-carga los datos de la última sesión para un día de la rutina
// Usado al iniciar el workout view para mostrar pesos anteriores
export async function startWorkoutSession(routineDayId: string): Promise<ActionResult<{
  lastSession: { exercises_done: import("@/types/gym-routines").WorkoutExercisesDone | null; completed_at: string } | null;
  memberPRs: Record<string, number>;
}>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  try {
    // Cargar última sesión y PRs actuales en paralelo
    const [lastSession, prs] = await Promise.all([
      getLastSessionForDay(supabase, user.id, routineDayId),
      getMemberPRs(supabase, user.id),
    ]);

    // Convertir PRs a un mapa ejercicio_id → max_weight para búsqueda O(1) en el cliente
    const memberPRs: Record<string, number> = {};
    for (const pr of prs) {
      if (pr.max_weight != null) memberPRs[pr.exercise_id] = pr.max_weight;
    }

    return {
      success: true,
      data: {
        lastSession: lastSession
          ? { exercises_done: lastSession.exercises_done, completed_at: lastSession.completed_at }
          : null,
        memberPRs,
      },
    };
  } catch (error) {
    console.error("[startWorkoutSession] Error:", error);
    return { success: false, error: "Error al cargar la sesión anterior" };
  }
}

// Guarda la sesión completa con pesos y actualiza los PRs del miembro
// Retorna los PRs nuevos para mostrar la celebración en el cliente
export async function completeWorkoutSession(
  input: unknown
): Promise<ActionResult<{ newPRs: PRResult[] }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = completeWorkoutSessionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { newPRs } = await saveWorkoutSession(
      supabase,
      user.id,
      orgId,
      parsed.data.routine_day_id,
      parsed.data.exercises,
      parsed.data.duration_minutes
    );

    revalidatePath("/portal/routines");
    revalidatePath("/portal/progress");

    return { success: true, data: { newPRs } };
  } catch (error) {
    console.error("[completeWorkoutSession] Error:", error);
    return { success: false, error: "Error al guardar la sesión" };
  }
}

/* ── 1RM y progresión por ejercicio ─────────────────────────────────────────── */

// Retorna la progresión de pesos de un ejercicio para el miembro autenticado
// Extrae los datos de los workout_logs existentes — no requiere tabla nueva
export async function getMyExerciseProgress(exerciseId: string): Promise<ExerciseProgressPoint[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await getExerciseWeightHistory(supabase, user.id, exerciseId);
  } catch (error) {
    console.error("[getMyExerciseProgress] Error:", error);
    return [];
  }
}

// Registra un test de 1RM del miembro autenticado
export async function logMyOneRepMax(input: unknown): Promise<ActionResult<OneRepMaxTest>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = logOneRepMaxSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const test = await insertOneRepMaxTest(supabase, user.id, orgId, parsed.data);
    revalidatePath("/portal/routines/strength");
    return { success: true, data: test };
  } catch (error) {
    console.error("[logMyOneRepMax] Error:", error);
    return { success: false, error: "Error al guardar el test" };
  }
}

// Retorna el historial de tests de 1RM del miembro — opcionalmente filtrado por ejercicio
export async function getMyOneRepMaxHistory(exerciseId?: string): Promise<OneRepMaxTest[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchOneRepMaxHistory(supabase, user.id, exerciseId);
  } catch (error) {
    console.error("[getMyOneRepMaxHistory] Error:", error);
    return [];
  }
}

// Retorna los PRs del miembro autenticado — para la vista "Mi Rendimiento" en el portal
export async function getMyPRs(): Promise<PersonalRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await getMemberPRs(supabase, user.id);
  } catch (error) {
    console.error("[getMyPRs] Error:", error);
    return [];
  }
}

// Retorna los N PRs más altos del miembro autenticado, ordenados por peso máximo descendente
// Usado en /portal/progress para el widget "Mis mejores marcas"
export async function getMyTopPRs(limit = 6): Promise<PersonalRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const prs = await getMemberPRs(supabase, user.id);
    return [...prs]
      .filter((pr) => pr.max_weight != null)
      .sort((a, b) => (b.max_weight ?? 0) - (a.max_weight ?? 0))
      .slice(0, limit);
  } catch (error) {
    console.error("[getMyTopPRs] Error:", error);
    return [];
  }
}

// Retorna los PRs de un miembro específico — solo para admins
export async function getMemberPRsAdmin(userId: string): Promise<PersonalRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  try {
    return await getMemberPRs(supabase, userId);
  } catch (error) {
    console.error("[getMemberPRsAdmin] Error:", error);
    return [];
  }
}
