// workout.service.ts — Queries de base de datos para registro y consulta de entrenamientos

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkoutLog,
  WorkoutLogWithDay,
  WorkoutExerciseDone,
  WorkoutExercisesDone,
  PersonalRecord,
  PRResult,
  OneRepMaxTest,
  ExerciseProgressPoint,
} from "@/types/gym-routines";

/* ── Helpers de tipo ─────────────────────────────────────────────────────────── */

interface LastSessionResult {
  id: string;
  exercises_done: WorkoutExercisesDone | null;
  completed_at: string;
}

interface LastWeightResult {
  weight_kg: number | null;
  reps: number;
  completed_at: string;
}

/* ── Queries de lectura ──────────────────────────────────────────────────────── */

// Registra un entrenamiento completado por un miembro (función original, se mantiene)
export async function insertWorkoutLog(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  data: {
    routine_day_id: string;
    duration_minutes?: number;
    exercises_done?: WorkoutExercisesDone;
  }
): Promise<WorkoutLog> {
  const { data: log, error } = await supabase
    .from("gym_workout_logs")
    .insert({
      user_id: userId,
      org_id: orgId,
      routine_day_id: data.routine_day_id,
      duration_minutes: data.duration_minutes ?? null,
      exercises_done: data.exercises_done ?? null,
    })
    .select("id, user_id, org_id, routine_day_id, completed_at, duration_minutes, exercises_done")
    .single();

  if (error) throw new Error(error.message);
  return log as WorkoutLog;
}

// Obtiene el historial de entrenamientos de un usuario (función original, se mantiene)
export async function fetchWorkoutLogs(
  supabase: SupabaseClient,
  userId: string,
  limit?: number
): Promise<WorkoutLog[]> {
  let query = supabase
    .from("gym_workout_logs")
    .select("id, user_id, org_id, routine_day_id, completed_at, duration_minutes, exercises_done")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutLog[];
}

// Busca la sesión más reciente del usuario para ese día específico de la rutina
// Usado para pre-cargar los pesos en el workout view antes de empezar
export async function getLastSessionForDay(
  supabase: SupabaseClient,
  userId: string,
  routineDayId: string
): Promise<LastSessionResult | null> {
  const { data, error } = await supabase
    .from("gym_workout_logs")
    .select("id, exercises_done, completed_at")
    .eq("user_id", userId)
    .eq("routine_day_id", routineDayId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as LastSessionResult | null;
}

// Busca el último peso registrado para un ejercicio específico del miembro
// Escanea los logs recientes (máx 20) hasta encontrar el ejercicio
export async function getLastWeightForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string
): Promise<LastWeightResult | null> {
  const { data, error } = await supabase
    .from("gym_workout_logs")
    .select("exercises_done, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  for (const log of (data ?? [])) {
    const done = log.exercises_done as WorkoutExercisesDone | null;
    const found = done?.exercises?.find((e) => e.exercise_id === exerciseId);
    if (!found) continue;

    // Tomar el último set completado con peso registrado
    const completedSets = found.sets.filter((s) => s.completed && s.weight_kg != null);
    if (completedSets.length === 0) continue;

    const lastSet = completedSets[completedSets.length - 1];
    return {
      weight_kg: lastSet.weight_kg,
      reps: lastSet.reps,
      completed_at: log.completed_at as string,
    };
  }

  return null;
}

// Retorna los últimos N workout_logs del usuario con join al día de la rutina
export async function getWorkoutHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<WorkoutLogWithDay[]> {
  const { data, error } = await supabase
    .from("gym_workout_logs")
    .select(`
      id, user_id, org_id, routine_day_id, completed_at, duration_minutes, exercises_done,
      day:gym_routine_days(id, day_number, name)
    `)
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkoutLogWithDay[];
}

// Retorna el PR actual del miembro para un ejercicio específico
export async function getExercisePR(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string
): Promise<PersonalRecord | null> {
  const { data, error } = await supabase
    .from("gym_personal_records")
    .select("id, user_id, org_id, exercise_id, max_weight, max_reps, achieved_at, workout_log_id")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PersonalRecord | null;
}

// Retorna todos los PRs del miembro con nombre y grupo muscular del ejercicio
export async function getMemberPRs(
  supabase: SupabaseClient,
  userId: string
): Promise<PersonalRecord[]> {
  const { data, error } = await supabase
    .from("gym_personal_records")
    .select(`
      id, user_id, org_id, exercise_id, max_weight, max_reps, achieved_at, workout_log_id,
      exercise:gym_exercises(name, muscle_group)
    `)
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PersonalRecord[];
}

/* ── Writes ──────────────────────────────────────────────────────────────────── */

// Actualiza los PRs del miembro comparando los sets completados contra los registros actuales
// Retorna la lista de ejercicios donde hubo PR nuevo para mostrar celebración
export async function updatePersonalRecords(
  supabase: SupabaseClient,
  userId: string,
  exercises: WorkoutExerciseDone[]
): Promise<PRResult[]> {
  const exerciseIds = exercises.map((e) => e.exercise_id);
  if (exerciseIds.length === 0) return [];

  // Obtener los PRs actuales en una sola query
  const { data: existingPRs } = await supabase
    .from("gym_personal_records")
    .select("exercise_id, max_weight")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds);

  const prMap = new Map<string, number>(
    (existingPRs ?? []).map((pr: { exercise_id: string; max_weight: number | null }) => [
      pr.exercise_id,
      pr.max_weight ?? 0,
    ])
  );

  const newPRs: PRResult[] = [];

  // Agrupar por exercise_id para manejar pirámides y ejercicios repetidos en la rutina:
  // si el mismo ejercicio aparece dos veces, tomamos el mejor desempeño de ambas apariciones
  type BestPerf = { maxWeight: number; maxReps: number; exerciseName: string };
  const bestPerf = new Map<string, BestPerf>();

  for (const exercise of exercises) {
    const completedSets = exercise.sets.filter((s) => s.completed && s.weight_kg != null);
    if (completedSets.length === 0) continue;

    const maxWeight = Math.max(...completedSets.map((s) => s.weight_kg!));
    const maxReps   = Math.max(...completedSets.map((s) => s.reps));
    const existing  = bestPerf.get(exercise.exercise_id);

    // Mantener solo la mejor performance entre todas las apariciones del ejercicio
    if (!existing || maxWeight > existing.maxWeight) {
      bestPerf.set(exercise.exercise_id, { maxWeight, maxReps, exerciseName: exercise.exercise_name });
    }
  }

  // Procesar cada ejercicio único una sola vez contra sus PRs actuales
  for (const [exerciseId, { maxWeight, maxReps, exerciseName }] of bestPerf) {
    const oldPR = prMap.has(exerciseId) ? prMap.get(exerciseId)! : null;

    // Solo hacer upsert si se superó (o no existía) el PR
    if (oldPR === null || maxWeight > oldPR) {
      await supabase
        .from("gym_personal_records")
        .upsert(
          {
            user_id: userId,
            exercise_id: exerciseId,
            max_weight: maxWeight,
            max_reps: maxReps,
            achieved_at: new Date().toISOString(),
          },
          { onConflict: "user_id,exercise_id" }
        );

      // Actualizar prMap para evitar sobreescribir con un valor menor en iteraciones futuras
      prMap.set(exerciseId, maxWeight);

      newPRs.push({
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        new_pr: maxWeight,
        old_pr: oldPR,
      });
    }
  }

  return newPRs;
}

/* ── 1RM Tests ───────────────────────────────────────────────────────────────── */

// Extrae la progresión de pesos de un ejercicio específico escaneando los workout_logs del usuario
// Retorna los puntos de la serie de tiempo ordenados cronológicamente para graficar
export async function getExerciseWeightHistory(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  limit = 30
): Promise<ExerciseProgressPoint[]> {
  // Traemos más de lo necesario porque no todos los logs contienen el ejercicio buscado
  const { data, error } = await supabase
    .from("gym_workout_logs")
    .select("exercises_done, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: true })
    .limit(limit * 4);

  if (error) throw new Error(error.message);

  const points: ExerciseProgressPoint[] = [];

  for (const log of (data ?? [])) {
    const done = log.exercises_done as WorkoutExercisesDone | null;
    const occurrences = done?.exercises?.filter((e) => e.exercise_id === exerciseId) ?? [];
    if (occurrences.length === 0) continue;

    // Si el ejercicio aparece varias veces en la misma sesión (pirámide), tomar el mejor peso
    let sessionMax = 0;
    let totalSets  = 0;
    for (const occ of occurrences) {
      const completed = occ.sets.filter((s) => s.completed && s.weight_kg != null);
      totalSets += completed.length;
      const occMax = completed.length > 0 ? Math.max(...completed.map((s) => s.weight_kg!)) : 0;
      if (occMax > sessionMax) sessionMax = occMax;
    }
    if (sessionMax === 0) continue;

    const dt = new Date(log.completed_at as string);
    const dd = dt.getDate().toString().padStart(2, "0");
    const mm = (dt.getMonth() + 1).toString().padStart(2, "0");

    points.push({
      date:       `${dd}/${mm}`,
      full_date:  log.completed_at as string,
      max_weight: sessionMax,
      sets_count: totalSets,
    });

    if (points.length >= limit) break;
  }

  return points;
}

// Inserta un test de 1RM registrado manualmente por el miembro
export async function insertOneRepMaxTest(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  data: { exercise_id: string; weight_kg: number; notes?: string }
): Promise<OneRepMaxTest> {
  const { data: test, error } = await supabase
    .from("gym_one_rep_max_tests")
    .insert({
      user_id:     userId,
      org_id:      orgId,
      exercise_id: data.exercise_id,
      weight_kg:   data.weight_kg,
      notes:       data.notes ?? null,
      tested_at:   new Date().toISOString(),
    })
    .select("id, user_id, org_id, exercise_id, weight_kg, notes, tested_at")
    .single();

  if (error) throw new Error(error.message);
  return test as OneRepMaxTest;
}

// Retorna el historial de tests de 1RM del miembro con join al nombre del ejercicio
// exerciseId opcional: si se provee, filtra por ejercicio específico
export async function fetchOneRepMaxHistory(
  supabase: SupabaseClient,
  userId: string,
  exerciseId?: string
): Promise<OneRepMaxTest[]> {
  let query = supabase
    .from("gym_one_rep_max_tests")
    .select(`
      id, user_id, org_id, exercise_id, weight_kg, notes, tested_at,
      exercise:gym_exercises(name, muscle_group)
    `)
    .eq("user_id", userId)
    .order("tested_at", { ascending: false });

  if (exerciseId) query = query.eq("exercise_id", exerciseId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OneRepMaxTest[];
}

// Inserta el log de sesión completo y actualiza los PRs en una sola operación
// Retorna el log insertado y los nuevos PRs para celebración en el cliente
export async function saveWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  routineDayId: string,
  exercises: WorkoutExerciseDone[],
  durationMinutes?: number
): Promise<{ log: WorkoutLog; newPRs: PRResult[] }> {
  const exercises_done: WorkoutExercisesDone = { exercises };

  const log = await insertWorkoutLog(supabase, userId, orgId, {
    routine_day_id: routineDayId,
    duration_minutes: durationMinutes,
    exercises_done,
  });

  // Actualizar PRs después de guardar el log
  const newPRs = await updatePersonalRecords(supabase, userId, exercises);

  return { log, newPRs };
}
