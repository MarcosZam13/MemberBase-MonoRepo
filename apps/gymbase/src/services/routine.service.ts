// routine.service.ts — Queries de base de datos para rutinas, días y asignación a miembros

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Routine,
  RoutineWithDays,
  RoutineDay,
  RoutineExercise,
  MemberRoutine,
} from "@/types/gym-routines";

// Obtiene todas las rutinas (templates) de la organización
export async function fetchRoutines(
  supabase: SupabaseClient,
  orgId: string
): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("gym_routines")
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, created_at, updated_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Routine[];
}

// Obtiene una rutina completa con sus días y ejercicios (joins anidados)
export async function fetchRoutineById(
  supabase: SupabaseClient,
  routineId: string
): Promise<RoutineWithDays | null> {
  const { data, error } = await supabase
    .from("gym_routines")
    .select(`
      id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, created_at, updated_at,
      days:gym_routine_days(
        id, routine_id, day_number, name,
        exercises:gym_routine_exercises(
          id, day_id, exercise_id, sort_order, sets, reps, rest_seconds, notes,
          exercise:gym_exercises(id, org_id, name, description, video_url, thumbnail_url, muscle_group, equipment, difficulty, is_global, parent_exercise_id, created_at)
        )
      )
    `)
    .eq("id", routineId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as RoutineWithDays | null;
}

// Crea una nueva rutina
export async function insertRoutine(
  supabase: SupabaseClient,
  orgId: string,
  createdBy: string,
  data: {
    name: string;
    description?: string;
    duration_weeks?: number;
    days_per_week?: number;
    is_template?: boolean;
  }
): Promise<Routine> {
  const { data: routine, error } = await supabase
    .from("gym_routines")
    .insert({
      org_id: orgId,
      created_by: createdBy,
      name: data.name,
      description: data.description ?? null,
      duration_weeks: data.duration_weeks ?? null,
      days_per_week: data.days_per_week ?? null,
      is_template: data.is_template ?? false,
    })
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return routine as Routine;
}

// Actualiza los datos de una rutina existente
export async function updateRoutine(
  supabase: SupabaseClient,
  routineId: string,
  data: Partial<{
    name: string;
    description: string;
    duration_weeks: number;
    days_per_week: number;
    is_template: boolean;
  }>
): Promise<Routine> {
  const { data: routine, error } = await supabase
    .from("gym_routines")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", routineId)
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return routine as Routine;
}

// Elimina una rutina y sus datos asociados (los días y ejercicios se eliminan por cascade)
export async function deleteRoutine(
  supabase: SupabaseClient,
  routineId: string
): Promise<void> {
  const { error } = await supabase
    .from("gym_routines")
    .delete()
    .eq("id", routineId);

  if (error) throw new Error(error.message);
}

// Agrega un día a una rutina
export async function addDayToRoutine(
  supabase: SupabaseClient,
  routineId: string,
  dayNumber: number,
  name?: string
): Promise<RoutineDay> {
  const { data, error } = await supabase
    .from("gym_routine_days")
    .insert({
      routine_id: routineId,
      day_number: dayNumber,
      name: name ?? null,
    })
    .select("id, routine_id, day_number, name")
    .single();

  if (error) throw new Error(error.message);
  return data as RoutineDay;
}

// Agrega un ejercicio a un día de la rutina
export async function addExerciseToDay(
  supabase: SupabaseClient,
  dayId: string,
  exerciseId: string,
  data: {
    sets?: number;
    reps?: string;
    rest_seconds?: number;
    notes?: string;
  }
): Promise<RoutineExercise> {
  // Obtener el sort_order máximo actual para este día
  const { data: existing } = await supabase
    .from("gym_routine_exercises")
    .select("sort_order")
    .eq("day_id", dayId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data: routineExercise, error } = await supabase
    .from("gym_routine_exercises")
    .insert({
      day_id: dayId,
      exercise_id: exerciseId,
      sort_order: nextOrder,
      sets: data.sets ?? null,
      reps: data.reps ?? null,
      rest_seconds: data.rest_seconds ?? null,
      notes: data.notes ?? null,
    })
    .select("id, day_id, exercise_id, sort_order, sets, reps, rest_seconds, notes")
    .single();

  if (error) throw new Error(error.message);
  return routineExercise as RoutineExercise;
}

// Actualiza los parámetros (series, reps, descanso) de un ejercicio en un día
export async function updateExerciseInDay(
  supabase: SupabaseClient,
  routineExerciseId: string,
  data: { sets?: number | null; reps?: string | null; rest_seconds?: number | null }
): Promise<void> {
  const { error } = await supabase
    .from("gym_routine_exercises")
    .update(data)
    .eq("id", routineExerciseId);
  if (error) throw new Error(error.message);
}

// Elimina un ejercicio de un día de la rutina
export async function removeExerciseFromDay(
  supabase: SupabaseClient,
  routineExerciseId: string
): Promise<void> {
  const { error } = await supabase
    .from("gym_routine_exercises")
    .delete()
    .eq("id", routineExerciseId);

  if (error) throw new Error(error.message);
}

// Obtiene la rutina activa asignada a un miembro
export async function fetchMemberRoutine(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberRoutine | null> {
  const { data, error } = await supabase
    .from("gym_member_routines")
    .select(`
      id, user_id, org_id, routine_id, assigned_by, starts_at, is_active, created_at,
      routine:gym_routines(id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, created_at, updated_at)
    `)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as MemberRoutine | null;
}

// Asigna una rutina a un miembro (desactiva asignaciones previas)
export async function assignRoutineToMember(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  routineId: string,
  assignedBy: string
): Promise<MemberRoutine> {
  // Desactivar rutinas previas del miembro
  await supabase
    .from("gym_member_routines")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("gym_member_routines")
    .insert({
      user_id: userId,
      org_id: orgId,
      routine_id: routineId,
      assigned_by: assignedBy,
      is_active: true,
    })
    .select("id, user_id, org_id, routine_id, assigned_by, starts_at, is_active, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as MemberRoutine;
}
