-- 20260101000017_calendar_recurrence.sql
-- Agrega soporte de recurrencia a gym_scheduled_classes para generar series de clases

ALTER TABLE gym_scheduled_classes
  ADD COLUMN IF NOT EXISTS recurrence_group_id UUID REFERENCES gym_scheduled_classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  -- Valores posibles: 'weekly' | 'daily' | 'weekdays' | 'custom:1,3,5' (ISO day numbers)
  ADD COLUMN IF NOT EXISTS recurrence_weeks INTEGER;
  -- Semanas generadas al crear la serie (configurable por admin, 1-52)

-- Índice para cancelar o consultar la serie completa eficientemente
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_recurrence_group
  ON gym_scheduled_classes(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;
