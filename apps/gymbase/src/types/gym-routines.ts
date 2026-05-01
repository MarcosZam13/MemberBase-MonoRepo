// gym-routines.ts — Tipos para el módulo de rutinas, ejercicios y seguimiento de entrenamientos

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Exercise {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: DifficultyLevel;
  is_timed: boolean;
  duration_seconds: number | null;
  is_global: boolean;
  // parent_exercise_id permite modelar variantes del mismo ejercicio base
  parent_exercise_id: string | null;
  // is_private_to_user: cuando no es null, solo ese miembro puede ver y usar el ejercicio
  is_private_to_user: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_by: string;
  duration_weeks: number | null;
  days_per_week: number | null;
  is_template: boolean;
  // is_member_created: true cuando la rutina fue creada por un miembro, no por el admin
  is_member_created: boolean;
  // is_public: si true, otros miembros y el admin pueden ver la rutina del miembro
  is_public: boolean;
  // is_default: si true, se asigna automáticamente a nuevos miembros al activar su suscripción
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_number: number;
  name: string | null;
}

// Configuración de una serie individual dentro de default_sets
// Permite pre-cargar pesos y reps por serie (pirámides, descensos, etc.)
export interface DefaultSetConfig {
  set_number: number;
  weight_kg?: number | null;
  // reps por serie: sobreescribe el campo reps global del ejercicio si se especifica
  reps?: string | null;
}

export interface RoutineExercise {
  id: string;
  day_id: string;
  exercise_id: string;
  sort_order: number;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
  // default_sets: plantilla de pesos/reps por serie — null = sin configuración
  // El portal la usa cuando no hay sesión previa registrada
  default_sets?: DefaultSetConfig[] | null;
  exercise?: Exercise;
}

export interface MemberRoutine {
  id: string;
  user_id: string;
  org_id: string;
  routine_id: string;
  assigned_by: string | null;
  starts_at: string;
  is_active: boolean;
  // is_featured: la rutina que se muestra en el dashboard — solo una por miembro
  is_featured: boolean;
  // label: etiqueta opcional definida por el admin ("Fuerza", "Cardio", etc.)
  label: string | null;
  created_at: string;
  routine?: Routine;
}

// Estructura de un set individual dentro del jsonb exercises_done
export interface WorkoutSet {
  set_number: number;
  weight_kg: number | null;
  reps: number;
  completed: boolean;
  // is_pr: se marca true en el momento del guardado si supera el PR histórico
  is_pr: boolean;
}

// Estructura de un ejercicio dentro del jsonb exercises_done
export interface WorkoutExerciseDone {
  routine_exercise_id: string;
  exercise_id: string;
  // exercise_name guardado en el jsonb para evitar joins al mostrar historial
  exercise_name: string;
  sets: WorkoutSet[];
}

// Root del jsonb exercises_done en gym_workout_logs
export interface WorkoutExercisesDone {
  exercises: WorkoutExerciseDone[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  org_id: string;
  routine_day_id: string;
  completed_at: string;
  duration_minutes: number | null;
  exercises_done: WorkoutExercisesDone | null;
}

// WorkoutLog con el join al día de la rutina para mostrar historial
export interface WorkoutLogWithDay extends WorkoutLog {
  day: { id: string; day_number: number; name: string | null } | null;
}

// Record personal de peso en un ejercicio
export interface PersonalRecord {
  id: string;
  user_id: string;
  org_id: string | null;
  exercise_id: string;
  max_weight: number | null;
  max_reps: number | null;
  achieved_at: string;
  workout_log_id: string | null;
  exercise?: { name: string; muscle_group: string | null };
}

// Resultado de un nuevo PR al terminar una sesión
export interface PRResult {
  exercise_id: string;
  exercise_name: string;
  new_pr: number;
  old_pr: number | null;
}

export interface RoutineWithDays extends Routine {
  days: (RoutineDay & { exercises: RoutineExercise[] })[];
}

// Test de repetición máxima — registro manual, completamente independiente de rutinas y PRs de sesión
export interface OneRepMaxTest {
  id: string;
  user_id: string;
  org_id: string;
  exercise_id: string;
  weight_kg: number;
  notes: string | null;
  tested_at: string;
  exercise?: { name: string; muscle_group: string | null };
}

// Punto de progresión de peso para gráficas de ejercicios (extraído de workout_logs)
export interface ExerciseProgressPoint {
  date: string;       // "dd/mm" para el eje X
  full_date: string;  // ISO completo para ordenamiento
  max_weight: number; // peso máximo levantado en esa sesión
  sets_count: number; // cantidad de series completadas con peso registrado
}
