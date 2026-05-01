-- 20260101000025_performance_indexes.sql
-- Índices de rendimiento para las queries más frecuentes del dashboard y portal

-- Pagos pendientes — query muy frecuente en el dashboard admin (banner + contador)
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status_created
  ON payment_proofs(status, created_at DESC)
  WHERE status = 'pending';

-- Suscripciones activas por usuario — se ejecuta en cada carga del portal
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status)
  WHERE status = 'active';

-- Check-ins abiertos por org — para getOccupancy(), se llama en cada pageload del dashboard
CREATE INDEX IF NOT EXISTS idx_attendance_open_checkins
  ON gym_attendance_logs(org_id, check_in_at)
  WHERE check_out_at IS NULL;

-- Posts de comunidad por org y fecha — feed del portal
CREATE INDEX IF NOT EXISTS idx_community_posts_org_created
  ON community_posts(org_id, created_at DESC)
  WHERE is_hidden = false;

-- Workout logs por usuario y fecha — para PRs, gráficas de progreso y historial
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_completed
  ON gym_workout_logs(user_id, completed_at DESC);

-- Health snapshots por usuario y fecha — para gráficas de métricas físicas
CREATE INDEX IF NOT EXISTS idx_health_snapshots_user_date
  ON gym_health_snapshots(user_id, recorded_at DESC);

-- Retos públicos activos por org — portal de retos
CREATE INDEX IF NOT EXISTS idx_challenges_org_dates
  ON gym_challenges(org_id, starts_at, ends_at)
  WHERE is_public = true;

-- Participantes de retos por usuario — para determinar retos inscritos del miembro
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user
  ON gym_challenge_participants(user_id, status);

-- Asistencias por usuario y fecha — para heatmaps y conteos de racha
CREATE INDEX IF NOT EXISTS idx_attendance_user_date
  ON gym_attendance_logs(user_id, check_in_at DESC);

-- Inventario por org y estado activo — tabla de productos admin
CREATE INDEX IF NOT EXISTS idx_inventory_products_org_active
  ON gym_inventory_products(org_id, is_active, created_at DESC)
  WHERE is_active = true;
