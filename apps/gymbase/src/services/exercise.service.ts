// exercise.service.ts — Queries de base de datos para la biblioteca de ejercicios

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise } from "@/types/gym-routines";

// Columnas que se seleccionan en todas las queries de ejercicios
// parent_exercise_id permite identificar variantes (agrupadas bajo el ejercicio base)
// is_private_to_user identifica ejercicios creados privadamente por un miembro
const EXERCISE_COLUMNS =
  "id, org_id, name, description, video_url, thumbnail_url, muscle_group, equipment, difficulty, is_timed, duration_seconds, is_global, parent_exercise_id, is_private_to_user, created_at";

interface ExerciseFilters {
  muscle_group?: string;
  difficulty?: string;
}

// Obtiene la lista de ejercicios de la organización con filtros opcionales
export async function fetchExercises(
  supabase: SupabaseClient,
  orgId: string,
  filters?: ExerciseFilters
): Promise<Exercise[]> {
  let query = supabase
    .from("gym_exercises")
    .select(EXERCISE_COLUMNS)
    .or(`org_id.eq.${orgId},is_global.eq.true`)
    .order("name", { ascending: true });

  if (filters?.muscle_group) {
    query = query.eq("muscle_group", filters.muscle_group);
  }

  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Exercise[];
}

// Crea un nuevo ejercicio en la organización
export async function insertExercise(
  supabase: SupabaseClient,
  orgId: string,
  data: {
    name: string;
    description?: string;
    video_url?: string;
    muscle_group?: string;
    equipment?: string;
    difficulty: string;
    is_timed?: boolean;
    duration_seconds?: number | null;
    parent_exercise_id?: string | null;
  }
): Promise<Exercise> {
  const { data: exercise, error } = await supabase
    .from("gym_exercises")
    .insert({
      org_id: orgId,
      name: data.name,
      description: data.description ?? null,
      video_url: data.video_url || null,
      muscle_group: data.muscle_group ?? null,
      equipment: data.equipment ?? null,
      difficulty: data.difficulty,
      is_timed: data.is_timed ?? false,
      duration_seconds: data.is_timed ? (data.duration_seconds ?? null) : null,
      parent_exercise_id: data.parent_exercise_id ?? null,
    })
    .select(EXERCISE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return exercise as Exercise;
}

// Actualiza los datos de un ejercicio existente
export async function updateExercise(
  supabase: SupabaseClient,
  exerciseId: string,
  data: Partial<{
    name: string;
    description: string;
    video_url: string;
    muscle_group: string;
    equipment: string;
    difficulty: string;
    is_timed: boolean;
    duration_seconds: number | null;
  }>
): Promise<Exercise> {
  // Si se cambia a reps (no timed), limpiar duration_seconds
  const payload = { ...data };
  if (payload.is_timed === false) {
    payload.duration_seconds = null;
  }

  const { data: exercise, error } = await supabase
    .from("gym_exercises")
    .update(payload)
    .eq("id", exerciseId)
    .select(EXERCISE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return exercise as Exercise;
}

// Elimina un ejercicio por ID
export async function deleteExercise(
  supabase: SupabaseClient,
  exerciseId: string
): Promise<void> {
  const { error } = await supabase
    .from("gym_exercises")
    .delete()
    .eq("id", exerciseId);

  if (error) throw new Error(error.message);
}

// Obtiene ejercicios visibles para un miembro: del gym + globales + los privados propios
// La RLS restringe adicionalmente, pero el OR explícito garantiza el conjunto correcto
export async function fetchExercisesForMember(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  search?: string
): Promise<import("@/types/gym-routines").Exercise[]> {
  let query = supabase
    .from("gym_exercises")
    .select(EXERCISE_COLUMNS)
    .or(`org_id.eq.${orgId},is_global.eq.true,is_private_to_user.eq.${userId}`)
    .order("is_private_to_user", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as import("@/types/gym-routines").Exercise[];
}

// Crea un ejercicio privado para un miembro específico
// Solo ese miembro puede verlo y usarlo en sus rutinas
export async function createPrivateExercise(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  data: {
    name: string;
    muscle_group?: string;
    equipment?: string;
    difficulty?: string;
    description?: string;
  }
): Promise<import("@/types/gym-routines").Exercise> {
  const { data: exercise, error } = await supabase
    .from("gym_exercises")
    .insert({
      org_id: orgId,
      name: data.name,
      muscle_group: data.muscle_group ?? null,
      equipment: data.equipment ?? null,
      difficulty: data.difficulty ?? "beginner",
      description: data.description ?? null,
      is_global: false,
      is_timed: false,
      is_private_to_user: userId,
    })
    .select(EXERCISE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return exercise as import("@/types/gym-routines").Exercise;
}
