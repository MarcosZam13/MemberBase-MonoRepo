-- 20260101000018_challenges_extended_v2.sql
-- Extiende retos: nuevos tipos, campos de config por tipo y triggers automáticos de progreso

-- ── 1. Expandir constraint de tipo ────────────────────────────────────────────
ALTER TABLE gym_challenges DROP CONSTRAINT IF EXISTS gym_challenges_type_check;
ALTER TABLE gym_challenges ADD CONSTRAINT gym_challenges_type_check
  CHECK (type IN ('attendance', 'workout', 'weight', 'weight_loss', 'personal_record', 'custom'));

-- ── 2. Columnas de configuración por tipo ─────────────────────────────────────
ALTER TABLE gym_challenges
  ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES gym_exercises(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_routine_id UUID REFERENCES gym_routines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weight_loss_mode TEXT DEFAULT 'absolute'
    CHECK (weight_loss_mode IN ('absolute', 'percentage'));

-- ── 3. Peso base del participante para retos weight_loss ──────────────────────
ALTER TABLE gym_challenge_participants
  ADD COLUMN IF NOT EXISTS baseline_weight_kg DECIMAL(5,2);

-- ── 4. Índice de performance ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_challenge_progress_participant_perf
  ON gym_challenge_progress(participant_id);

-- ── Trigger A: attendance ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_challenge_progress_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO gym_challenge_progress (participant_id, value, notes)
  SELECT p.id, 1, 'Auto: check-in'
  FROM gym_challenge_participants p
  JOIN gym_challenges c ON c.id = p.challenge_id
  WHERE p.user_id = NEW.user_id
    AND p.status = 'active'
    AND c.type = 'attendance'
    AND NEW.check_in_at BETWEEN c.starts_at AND c.ends_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_attendance ON gym_attendance_logs;
CREATE TRIGGER trg_challenge_attendance
  AFTER INSERT ON gym_attendance_logs
  FOR EACH ROW EXECUTE FUNCTION fn_challenge_progress_attendance();

-- ── Trigger B: workout ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_challenge_progress_workout()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO gym_challenge_progress (participant_id, value, notes)
  SELECT p.id, 1, 'Auto: sesión de entrenamiento'
  FROM gym_challenge_participants p
  JOIN gym_challenges c ON c.id = p.challenge_id
  LEFT JOIN gym_member_routines mr ON mr.id = NEW.member_routine_id
  WHERE p.user_id = NEW.user_id
    AND p.status = 'active'
    AND c.type = 'workout'
    AND NEW.completed_at BETWEEN c.starts_at AND c.ends_at
    AND (c.target_routine_id IS NULL OR mr.routine_id = c.target_routine_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_workout ON gym_workout_logs;
CREATE TRIGGER trg_challenge_workout
  AFTER INSERT ON gym_workout_logs
  FOR EACH ROW EXECUTE FUNCTION fn_challenge_progress_workout();

-- ── Trigger C: personal_record ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_challenge_progress_pr()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  FOR v_participant_id IN
    SELECT p.id
    FROM gym_challenge_participants p
    JOIN gym_challenges c ON c.id = p.challenge_id
    WHERE p.user_id = NEW.user_id
      AND p.status = 'active'
      AND c.type = 'personal_record'
      AND c.exercise_id = NEW.exercise_id
      AND now() BETWEEN c.starts_at AND c.ends_at
  LOOP
    DELETE FROM gym_challenge_progress WHERE participant_id = v_participant_id;
    INSERT INTO gym_challenge_progress (participant_id, value, notes)
    VALUES (v_participant_id, NEW.max_weight, 'Auto: record personal');
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_pr ON gym_personal_records;
CREATE TRIGGER trg_challenge_pr
  AFTER INSERT OR UPDATE ON gym_personal_records
  FOR EACH ROW EXECUTE FUNCTION fn_challenge_progress_pr();

-- ── Trigger D: weight_loss ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_challenge_progress_weight_loss()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec   RECORD;
  v_delta DECIMAL;
BEGIN
  IF NEW.weight_kg IS NULL THEN RETURN NEW; END IF;

  FOR v_rec IN
    SELECT c.weight_loss_mode, p.id AS participant_id, p.baseline_weight_kg
    FROM gym_challenges c
    JOIN gym_challenge_participants p ON p.challenge_id = c.id
    WHERE p.user_id = NEW.user_id
      AND p.status = 'active'
      AND c.type IN ('weight_loss', 'weight')
      AND NEW.recorded_at BETWEEN (c.starts_at - INTERVAL '2 days') AND (c.ends_at + INTERVAL '2 days')
  LOOP
    IF v_rec.baseline_weight_kg IS NULL THEN
      UPDATE gym_challenge_participants SET baseline_weight_kg = NEW.weight_kg WHERE id = v_rec.participant_id;
      CONTINUE;
    END IF;

    IF v_rec.weight_loss_mode = 'percentage' THEN
      v_delta := ((v_rec.baseline_weight_kg - NEW.weight_kg) / v_rec.baseline_weight_kg) * 100;
    ELSE
      v_delta := v_rec.baseline_weight_kg - NEW.weight_kg;
    END IF;

    DELETE FROM gym_challenge_progress WHERE participant_id = v_rec.participant_id;
    INSERT INTO gym_challenge_progress (participant_id, value, notes)
    VALUES (v_rec.participant_id, v_delta, 'Auto: snapshot de peso');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_weight_loss ON gym_health_snapshots;
CREATE TRIGGER trg_challenge_weight_loss
  AFTER INSERT ON gym_health_snapshots
  FOR EACH ROW EXECUTE FUNCTION fn_challenge_progress_weight_loss();
