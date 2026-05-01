-- 20260101000028_performance_v2.sql
-- Índices compuestos y funciones RPC que eliminan los full-table scans más críticos del dashboard admin

-- ─── Índices de suscripciones ────────────────────────────────────────────────

-- Consultas de vencimiento próximo (getExpiringMembershipsCount, panel admin)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires
  ON subscriptions(status, expires_at)
  WHERE status = 'active';

-- Filtrado por plan en reportes y asignación de rutinas masiva
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status
  ON subscriptions(plan_id, status);

-- ─── Índices de clases y reservas ────────────────────────────────────────────

-- Conteo de capacidad por clase con filtro de estado (bookClass, getSchedule)
-- El índice existente (class_id) no filtra por status — este evita el full scan
CREATE INDEX IF NOT EXISTS idx_gym_class_bookings_class_status
  ON gym_class_bookings(class_id, status);

-- Reservas activas por miembro (historial de clases en portal)
CREATE INDEX IF NOT EXISTS idx_gym_class_bookings_user_status
  ON gym_class_bookings(user_id, status);

-- ─── Índices de rutinas de miembros ─────────────────────────────────────────

-- Rutinas activas por miembro — getMemberRoutines, checkActiveRoutines
CREATE INDEX IF NOT EXISTS idx_gym_member_routines_user_active
  ON gym_member_routines(user_id, is_active);

-- Asignación masiva por rutina — assignRoutineByPlans itera sobre esta tabla
CREATE INDEX IF NOT EXISTS idx_gym_member_routines_routine_active
  ON gym_member_routines(routine_id, is_active, user_id);

-- ─── Índices de fotos de progreso ────────────────────────────────────────────

-- Fotos por miembro dentro de un org — getMembersHealthSummary
CREATE INDEX IF NOT EXISTS idx_gym_progress_photos_org_user
  ON gym_progress_photos(org_id, user_id);

-- ─── Índices de perfiles ─────────────────────────────────────────────────────

-- KPIs del dashboard: conteo de nuevos miembros por rol y fecha
CREATE INDEX IF NOT EXISTS idx_profiles_role_created
  ON profiles(role, created_at DESC);

-- ─── Índices de categorías de contenido ─────────────────────────────────────

-- Lookup por slug en getContentForUserPaginated — evita seq scan en cada filtro de categoría
CREATE INDEX IF NOT EXISTS idx_content_categories_slug
  ON content_categories(slug);

-- ─── RPC: conteo agregado de vistas de contenido ─────────────────────────────
-- Reemplaza el patrón "SELECT content_id FROM content_views" + agregación JS.
-- GROUP BY en PostgreSQL es 10-100x más eficiente que traer todas las filas al servidor Node.

CREATE OR REPLACE FUNCTION get_content_view_counts()
RETURNS TABLE(content_id UUID, view_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT content_id, COUNT(*)::BIGINT AS view_count
  FROM content_views
  GROUP BY content_id;
$$;

-- ─── RLS: permitir que el rol owner también acceda a las vistas de contenido ──
-- La política original solo cubría 'admin'; el owner también administra el gym.

DROP POLICY IF EXISTS "content_views_select_admin" ON content_views;

CREATE POLICY "content_views_select_admin"
  ON content_views FOR SELECT
  USING (get_user_role() IN ('admin', 'owner'));
