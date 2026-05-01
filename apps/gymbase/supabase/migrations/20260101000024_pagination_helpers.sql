-- 20260101000024_pagination_helpers.sql
-- Funciones SQL para soporte de paginación server-side en tablas de alta carga

-- ─── Conteo de asistencias mensuales por usuario ─────────────────────────────
-- Reemplaza el loop JS en getMonthlyAttendanceCounts — GROUP BY en SQL es 10-100x más eficiente

CREATE OR REPLACE FUNCTION get_monthly_attendance_counts(
  p_org_id  UUID,
  p_user_ids UUID[]
)
RETURNS TABLE(user_id UUID, attendance_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    user_id,
    COUNT(*)::BIGINT AS attendance_count
  FROM gym_attendance_logs
  WHERE org_id    = p_org_id
    AND user_id   = ANY(p_user_ids)
    AND check_in_at >= date_trunc('month', NOW())
  GROUP BY user_id;
$$;
