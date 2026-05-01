-- 010_community_v2.sql — Comunidad v2: imagen de portada, segmentación por plan, reacciones, posts solo para admins, preparación WhatsApp

-- ─── 1. Columnas de imagen de portada en posts ────────────────────────────────
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_path TEXT;

-- ─── 2. Tabla junction para segmentación de posts por plan ────────────────────
-- FUTURE: Esta tabla también se usará para segmentar notificaciones WhatsApp
-- Solo notificar a miembros del plan correcto cuando se publique un post restringido
CREATE TABLE IF NOT EXISTS community_post_plans (
  post_id  UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  plan_id  UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_plans_post
  ON community_post_plans(post_id);

CREATE INDEX IF NOT EXISTS idx_community_post_plans_plan
  ON community_post_plans(plan_id);

ALTER TABLE community_post_plans ENABLE ROW LEVEL SECURITY;

-- Autenticados pueden leer (para verificar acceso a posts)
CREATE POLICY "post_plans_select_authenticated"
  ON community_post_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins pueden escribir
CREATE POLICY "post_plans_insert_admin_only"
  ON community_post_plans FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "post_plans_delete_admin_only"
  ON community_post_plans FOR DELETE
  USING (get_user_role() = 'admin');

-- ─── 3. Restricción: solo admins pueden crear posts ───────────────────────────
DROP POLICY IF EXISTS "posts_insert_authenticated" ON community_posts;

CREATE POLICY "posts_insert_admin_only"
  ON community_posts FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- ─── 4. Tabla de reacciones (nueva) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('like', 'clap', 'fire', 'muscle', 'heart', 'laugh', 'sad')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Un usuario puede tener UNA reacción por post (puede cambiar el tipo)
CREATE UNIQUE INDEX IF NOT EXISTS reactions_unique_user_post
  ON community_reactions(post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_community_reactions_post
  ON community_reactions(post_id);

ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_authenticated"
  ON community_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "reactions_insert_own"
  ON community_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_update_own"
  ON community_reactions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own"
  ON community_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ─── 5. Tabla notifications (preparación para WhatsApp) ──────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  channel     TEXT DEFAULT 'in_app',   -- Futuros: 'whatsapp' | 'email' | 'push'
  external_id TEXT,                    -- ID del mensaje en WhatsApp Business API
  metadata    JSONB DEFAULT '{}',      -- WhatsApp: { phone_number, template_name, template_params }
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "notifications_insert_admin"
  ON notifications FOR INSERT
  WITH CHECK (get_user_role() = 'admin');
