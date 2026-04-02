-- 20260101000011_exercise_variants.sql
-- Agrega soporte para variantes de ejercicios mediante auto-referencia (parent_exercise_id)

ALTER TABLE gym_exercises
  ADD COLUMN IF NOT EXISTS parent_exercise_id UUID REFERENCES gym_exercises(id) ON DELETE SET NULL;

-- Índice para consultas eficientes de variantes por ejercicio padre
CREATE INDEX IF NOT EXISTS idx_gym_exercises_parent_id
  ON gym_exercises (parent_exercise_id)
  WHERE parent_exercise_id IS NOT NULL;

-- Las políticas RLS existentes ya cubren esta columna porque aplican a nivel de tabla
-- No se necesitan políticas adicionales
