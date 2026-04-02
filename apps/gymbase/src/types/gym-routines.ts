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
  created_at: string;
  updated_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_number: number;
  name: string | null;
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
  created_at: string;
  routine?: Routine;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  org_id: string;
  routine_day_id: string;
  completed_at: string;
  duration_minutes: number | null;
  exercises_done: Record<string, unknown> | null;
}

export interface RoutineWithDays extends Routine {
  days: (RoutineDay & { exercises: RoutineExercise[] })[];
}
