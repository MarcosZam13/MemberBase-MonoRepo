-- 002_rls_policies.sql — Row Level Security para todas las tablas
-- Garantiza que cada usuario solo acceda a sus propios datos.
-- Los admins tienen acceso total a través de la función get_user_role().

-- ─── Habilitar RLS en todas las tablas ────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;

-- ─── Función auxiliar para verificar el rol del usuario actual ────────────────
-- SECURITY DEFINER para evitar recursión infinita al consultar profiles.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Políticas: profiles ──────────────────────────────────────────────────────

-- Los usuarios ven su propio perfil; los admins ven todos
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

-- Solo el propio usuario puede actualizar su perfil (excepto el rol)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- El cliente no puede cambiar su propio rol
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Solo los admins pueden cambiar roles
CREATE POLICY "profiles_update_role_admin"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- ─── Políticas: membership_plans ─────────────────────────────────────────────

-- Planes activos son visibles para todos los usuarios autenticados
CREATE POLICY "plans_select_active_authenticated"
  ON membership_plans FOR SELECT
  USING (
    is_active = TRUE OR get_user_role() = 'admin'
  );

-- Solo admins pueden crear, modificar o eliminar planes
CREATE POLICY "plans_write_admin_only"
  ON membership_plans FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ─── Políticas: subscriptions ─────────────────────────────────────────────────

-- Los usuarios ven sus propias suscripciones; los admins ven todas
CREATE POLICY "subscriptions_select_own_or_admin"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- Los usuarios pueden crear sus propias suscripciones (en estado pending)
CREATE POLICY "subscriptions_insert_own"
  ON subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Solo los admins pueden actualizar el estado de las suscripciones
CREATE POLICY "subscriptions_update_admin_only"
  ON subscriptions FOR UPDATE
  USING (get_user_role() = 'admin');

-- ─── Políticas: payment_proofs ────────────────────────────────────────────────

-- Los usuarios ven sus propios comprobantes; los admins ven todos
CREATE POLICY "payment_proofs_select_own_or_admin"
  ON payment_proofs FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- Los usuarios pueden subir sus propios comprobantes
CREATE POLICY "payment_proofs_insert_own"
  ON payment_proofs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Solo los admins pueden actualizar el estado (aprobar/rechazar)
CREATE POLICY "payment_proofs_update_admin_only"
  ON payment_proofs FOR UPDATE
  USING (get_user_role() = 'admin');

-- ─── Políticas: content ───────────────────────────────────────────────────────

-- Los admins ven todo el contenido (publicado y borrador)
-- Los clientes solo ven contenido publicado de sus planes activos
CREATE POLICY "content_select_published_with_active_subscription"
  ON content FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR (
      is_published = TRUE
      AND EXISTS (
        SELECT 1 FROM subscriptions s
        JOIN content_plans cp ON cp.plan_id = s.plan_id
        WHERE s.user_id = auth.uid()
          AND s.status = 'active'
          AND cp.content_id = content.id
          AND (s.expires_at IS NULL OR s.expires_at > NOW())
      )
    )
  );

-- Solo los admins pueden crear, editar y eliminar contenido
CREATE POLICY "content_write_admin_only"
  ON content FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ─── Políticas: content_plans ─────────────────────────────────────────────────

-- Las relaciones contenido-plan son visibles según las políticas de cada tabla
CREATE POLICY "content_plans_select_all_authenticated"
  ON content_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins pueden modificar qué planes tienen acceso a qué contenido
CREATE POLICY "content_plans_write_admin_only"
  ON content_plans FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
