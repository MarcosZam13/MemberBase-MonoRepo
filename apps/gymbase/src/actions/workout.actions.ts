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
} from "@/services/workout.service";
import { logWorkoutSchema, completeWorkoutSessionSchema } from "@/lib/validations/routines";
import type { ActionResult } from "@/types/database";
import type { WorkoutLog, PersonalRecord, PRResult } from "@/types/gym-routines";

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
