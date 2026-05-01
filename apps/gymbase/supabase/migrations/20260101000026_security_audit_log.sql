-- 20260101000026_security_audit_log.sql
-- Tabla para auditoría de accesos denegados y operaciones sensibles

CREATE TABLE IF NOT EXISTS security_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo admins y owners pueden leer el log de auditoría
CREATE POLICY "admins_read_audit_log"
  ON security_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- No se permite INSERT directo para usuarios autenticados — solo via service_role en el server
-- (el helper logUnauthorizedAccess usa createAdminClient que tiene service_role)

-- Índice para búsquedas por fecha y usuario
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON security_audit_log(user_id) WHERE user_id IS NOT NULL;
