-- 20260101000015_routine_exercise_default_sets.sql
-- Agrega soporte de pesos/reps preconfigurados por serie en un ejercicio de rutina.
-- Permite configurar pirámides (ej: 5kg→10kg→15kg) que se pre-cargan en el workout view.

ALTER TABLE gym_routine_exercises
  ADD COLUMN IF NOT EXISTS default_sets jsonb DEFAULT NULL;

COMMENT ON COLUMN gym_routine_exercises.default_sets IS
  'Configuración opcional de pesos y reps por serie. Formato: [{set_number, weight_kg, reps}].
   Si es null, el portal muestra los pesos de la última sesión o campos vacíos.
   Si está configurado, se usa como plantilla inicial (pirámide, descenso, etc.)
   La última sesión siempre tiene prioridad sobre este valor.';
