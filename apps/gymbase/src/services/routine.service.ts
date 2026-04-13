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
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, is_member_created, is_public, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("is_member_created", false)
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
          id, day_id, exercise_id, sort_order, sets, reps, rest_seconds, notes, default_sets,
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
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, is_member_created, is_public, created_at, updated_at")
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
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, is_member_created, is_public, created_at, updated_at")
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
    // default_sets: configuración opcional de pesos/reps por serie para pirámides
    default_sets?: Array<{ set_number: number; weight_kg?: number | null; reps?: string | null }> | null;
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
      default_sets: data.default_sets ?? null,
    })
    .select("id, day_id, exercise_id, sort_order, sets, reps, rest_seconds, notes, default_sets")
    .single();

  if (error) throw new Error(error.message);
  return routineExercise as RoutineExercise;
}

// Actualiza únicamente los default_sets de un ejercicio existente en la rutina
// Permite configurar o limpiar la pirámide de pesos sin tocar otros parámetros
export async function updateExerciseDefaultSets(
  supabase: SupabaseClient,
  routineExerciseId: string,
  defaultSets: Array<{ set_number: number; weight_kg?: number | null; reps?: string | null }> | null
): Promise<void> {
  const { error } = await supabase
    .from("gym_routine_exercises")
    .update({ default_sets: defaultSets })
    .eq("id", routineExerciseId);
  if (error) throw new Error(error.message);
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

// Campos seleccionados comunes para gym_member_routines con join a gym_routines
const MEMBER_ROUTINE_SELECT = `
  id, user_id, org_id, routine_id, assigned_by, starts_at, is_active, is_featured, label, created_at,
  routine:gym_routines(id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, is_member_created, is_public, created_at, updated_at)
`;

// Obtiene la rutina destacada (is_featured=true) de un miembro — usada en dashboard y portal
export async function fetchFeaturedRoutine(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberRoutine | null> {
  const { data, error } = await supabase
    .from("gym_member_routines")
    .select(MEMBER_ROUTINE_SELECT)
    .eq("user_id", userId)
    .eq("is_featured", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as MemberRoutine | null;
}

// Alias de compatibilidad — los componentes que usaban fetchMemberRoutine ahora obtienen la featured
export const fetchMemberRoutine = fetchFeaturedRoutine;

// Obtiene todas las rutinas activas del miembro ordenadas: featured primero, luego por fecha desc
export async function getMemberRoutines(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberRoutine[]> {
  const { data, error } = await supabase
    .from("gym_member_routines")
    .select(MEMBER_ROUTINE_SELECT)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MemberRoutine[];
}

// Obtiene el historial de rutinas inactivas del miembro (is_active=false)
export async function getMemberRoutineHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberRoutine[]> {
  const { data, error } = await supabase
    .from("gym_member_routines")
    .select(MEMBER_ROUTINE_SELECT)
    .eq("user_id", userId)
    .eq("is_active", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MemberRoutine[];
}

// Asigna una rutina al stack activo del miembro (no reemplaza las existentes)
// Si es la primera rutina activa → se marca como featured automáticamente
export async function assignRoutineToMember(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  routineId: string,
  assignedBy: string,
  label?: string
): Promise<MemberRoutine> {
  // Verificar que no se asigne la misma rutina dos veces mientras está activa
  const { data: existing } = await supabase
    .from("gym_member_routines")
    .select("id")
    .eq("user_id", userId)
    .eq("routine_id", routineId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) throw new Error("Esta rutina ya está asignada al miembro");

  // Determinar si debe ser featured: solo si no hay ninguna otra activa
  const { count } = await supabase
    .from("gym_member_routines")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const isFeatured = (count ?? 0) === 0;

  const { data, error } = await supabase
    .from("gym_member_routines")
    .insert({
      user_id: userId,
      org_id: orgId,
      routine_id: routineId,
      assigned_by: assignedBy,
      is_active: true,
      is_featured: isFeatured,
      label: label ?? null,
    })
    .select(MEMBER_ROUTINE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as MemberRoutine;
}

// Cambia la rutina destacada del miembro en dos pasos
// Paso 1: quitar is_featured de todas — Paso 2: poner is_featured en la indicada
export async function setFeaturedRoutine(
  supabase: SupabaseClient,
  userId: string,
  memberRoutineId: string
): Promise<void> {
  // Quitar featured de todas las rutinas activas del miembro
  const { error: clearError } = await supabase
    .from("gym_member_routines")
    .update({ is_featured: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (clearError) throw new Error(clearError.message);

  // Marcar la rutina indicada como featured
  const { error: setError } = await supabase
    .from("gym_member_routines")
    .update({ is_featured: true })
    .eq("id", memberRoutineId)
    .eq("user_id", userId);

  if (setError) throw new Error(setError.message);
}

// ══════════════════════════════════════════════════════════════════════════════
// Funciones para rutinas creadas por el propio miembro
// ══════════════════════════════════════════════════════════════════════════════

// Crea una rutina de tipo "del miembro" y la retorna sin asignar
export async function createMemberRoutine(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  data: { name: string; description?: string; is_public?: boolean }
): Promise<Routine> {
  const { data: routine, error } = await supabase
    .from("gym_routines")
    .insert({
      org_id: orgId,
      created_by: userId,
      name: data.name,
      description: data.description ?? null,
      is_member_created: true,
      is_public: data.is_public ?? false,
      is_template: false,
    })
    .select("id, org_id, name, description, created_by, duration_weeks, days_per_week, is_template, is_member_created, is_public, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return routine as Routine;
}

// Agrega un día a una rutina del miembro — verifica ownership antes de insertar
export async function addDayToMemberRoutine(
  supabase: SupabaseClient,
  routineId: string,
  userId: string,
  name: string
): Promise<RoutineDay> {
  // Verificar que la rutina pertenece al usuario
  const { data: routine } = await supabase
    .from("gym_routines")
    .select("created_by")
    .eq("id", routineId)
    .maybeSingle();

  if (!routine || routine.created_by !== userId) {
    throw new Error("Sin permisos para modificar esta rutina");
  }

  // Calcular el número del próximo día
  const { count } = await supabase
    .from("gym_routine_days")
    .select("id", { count: "exact", head: true })
    .eq("routine_id", routineId);

  const dayNumber = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("gym_routine_days")
    .insert({ routine_id: routineId, day_number: dayNumber, name })
    .select("id, routine_id, day_number, name")
    .single();

  if (error) throw new Error(error.message);
  return data as RoutineDay;
}

// Agrega un ejercicio a un día de una rutina del miembro — verifica ownership
export async function addExerciseToMemberDay(
  supabase: SupabaseClient,
  dayId: string,
  userId: string,
  exerciseId: string,
  data: { sets?: number; reps?: string; rest_seconds?: number; notes?: string }
): Promise<RoutineExercise> {
  // Obtener el routine_id del día para luego verificar el created_by de la rutina
  const { data: day } = await supabase
    .from("gym_routine_days")
    .select("routine_id")
    .eq("id", dayId)
    .maybeSingle();

  if (!day) throw new Error("Día no encontrado");

  // Verificar que la rutina pertenece al usuario
  const { data: routine } = await supabase
    .from("gym_routines")
    .select("created_by")
    .eq("id", day.routine_id)
    .maybeSingle();

  if (!routine || routine.created_by !== userId) {
    throw new Error("Sin permisos para modificar este día");
  }

  return addExerciseToDay(supabase, dayId, exerciseId, data);
}

// Obtiene las rutinas creadas por el propio miembro con detalle de días y ejercicios
export async function getMemberOwnRoutines(
  supabase: SupabaseClient,
  userId: string
): Promise<RoutineWithDays[]> {
  const { data, error } = await supabase
    .from("gym_routines")
    .select(`
      id, org_id, name, description, created_by, duration_weeks, days_per_week,
      is_template, is_member_created, is_public, created_at, updated_at,
      days:gym_routine_days(
        id, routine_id, day_number, name,
        exercises:gym_routine_exercises(
          id, day_id, exercise_id, sort_order, sets, reps, rest_seconds, notes, default_sets
        )
      )
    `)
    .eq("created_by", userId)
    .eq("is_member_created", true)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RoutineWithDays[];
}

// Cambia la visibilidad pública de una rutina del miembro — verifica ownership
export async function toggleRoutineVisibility(
  supabase: SupabaseClient,
  routineId: string,
  userId: string,
  isPublic: boolean
): Promise<void> {
  const { error } = await supabase
    .from("gym_routines")
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", routineId)
    .eq("created_by", userId)
    .eq("is_member_created", true);

  if (error) throw new Error(error.message);
}

// Soft delete de una asignación de rutina — si era la featured, promueve la siguiente activa
export async function removeRoutineFromMember(
  supabase: SupabaseClient,
  userId: string,
  memberRoutineId: string
): Promise<void> {
  // Verificar si la que se quita era la featured
  const { data: target } = await supabase
    .from("gym_member_routines")
    .select("is_featured")
    .eq("id", memberRoutineId)
    .eq("user_id", userId)
    .maybeSingle();

  const wasFeatured = target?.is_featured ?? false;

  // Desactivar la asignación
  const { error } = await supabase
    .from("gym_member_routines")
    .update({ is_active: false, is_featured: false })
    .eq("id", memberRoutineId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // Si era la featured, promover la siguiente rutina activa más reciente
  if (wasFeatured) {
    const { data: next } = await supabase
      .from("gym_member_routines")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase
        .from("gym_member_routines")
        .update({ is_featured: true })
        .eq("id", next.id);
    }
  }
}
