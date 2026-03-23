-- 007_login_rate_limiting.sql — Tabla y función para limitar intentos fallidos de login

CREATE TABLE IF NOT EXISTS login_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   text        NOT NULL,   -- email del intento
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para que el conteo sea rápido por identifier y tiempo
CREATE INDEX login_attempts_identifier_time_idx ON login_attempts (identifier, attempted_at DESC);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Solo se puede insertar (para registrar el intento); nadie puede leer ni borrar directamente
CREATE POLICY "allow_insert_login_attempts" ON login_attempts
  FOR INSERT WITH CHECK (true);

-- Función con SECURITY DEFINER para contar intentos recientes sin exponer la tabla
-- Puede ser llamada por el rol anon (necesario porque el login ocurre sin sesión)
CREATE OR REPLACE FUNCTION count_recent_login_attempts(p_identifier text, p_minutes int)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM login_attempts
  WHERE identifier = p_identifier
    AND attempted_at > now() - (p_minutes || ' minutes')::interval;
$$;

-- Función de limpieza: elimina intentos con más de 1 hora de antigüedad
-- Reducir acumulación de registros sin necesidad de un cron externo
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 hour';
$$;
