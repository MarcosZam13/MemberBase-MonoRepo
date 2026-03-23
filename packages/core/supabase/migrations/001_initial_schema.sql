-- 001_initial_schema.sql — Esquema inicial de la base de datos MemberBase
-- Ejecutar en orden: 001 → 002 → 003

-- ─── Tabla: profiles ──────────────────────────────────────────────────────────
-- Extiende auth.users de Supabase con campos adicionales del negocio.
-- Se crea automáticamente al registrar un usuario via trigger.

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member')),
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: membership_plans ──────────────────────────────────────────────────
-- Define los planes de membresía disponibles para los clientes.
-- Los beneficios se almacenan como array JSON para flexibilidad.

CREATE TABLE IF NOT EXISTS membership_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'CRC',
  duration_days INTEGER NOT NULL DEFAULT 30,
  features      JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: subscriptions ─────────────────────────────────────────────────────
-- Registra las suscripciones de cada usuario a un plan.
-- El constraint garantiza que solo haya una suscripción activa por usuario.

CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES membership_plans(id),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'rejected')),
  starts_at   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Previene que un usuario tenga más de una suscripción activa simultánea
CREATE UNIQUE INDEX IF NOT EXISTS one_active_subscription_per_user
  ON subscriptions (user_id)
  WHERE status = 'active';

-- ─── Tabla: payment_proofs ────────────────────────────────────────────────────
-- Almacena los comprobantes de pago subidos por los clientes.
-- El admin los revisa y aprueba o rechaza, actualizando la suscripción.

CREATE TABLE IF NOT EXISTS payment_proofs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id),
  file_url          TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  amount            DECIMAL(10,2),
  payment_method    TEXT DEFAULT 'sinpe',
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: content ───────────────────────────────────────────────────────────
-- Contenido creado por el admin, accesible solo para miembros con plan activo.

CREATE TABLE IF NOT EXISTS content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL
                CHECK (type IN ('article', 'video', 'image', 'file', 'link')),
  body          TEXT,
  media_url     TEXT,
  thumbnail_url TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: content_plans (many-to-many) ──────────────────────────────────────
-- Relaciona contenido con los planes que tienen acceso a él.
-- Un contenido puede estar en múltiples planes y viceversa.

CREATE TABLE IF NOT EXISTS content_plans (
  content_id  UUID REFERENCES content(id) ON DELETE CASCADE,
  plan_id     UUID REFERENCES membership_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, plan_id)
);

-- ─── Índices de performance ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_subscription_id ON payment_proofs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_content_is_published ON content(is_published);
CREATE INDEX IF NOT EXISTS idx_content_plans_plan_id ON content_plans(plan_id);
