-- 006_community.sql — Módulo de comunidad: posts y comentarios entre miembros
-- Solo se activa cuando features.community = true en theme.config.ts

-- ─── Tabla: community_posts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_pinned   BOOLEAN DEFAULT FALSE,    -- Los admins pueden fijar posts importantes
  is_visible  BOOLEAN DEFAULT TRUE,     -- Los admins pueden ocultar posts inapropiados
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: community_comments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_visible  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id  ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created  ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post  ON community_comments(post_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE community_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments  ENABLE ROW LEVEL SECURITY;

-- Posts: los miembros activos ven posts visibles; admins ven todo
CREATE POLICY "posts_select_members"
  ON community_posts FOR SELECT
  USING (
    is_visible = TRUE
    OR get_user_role() = 'admin'
  );

-- Cualquier miembro autenticado puede crear posts
CREATE POLICY "posts_insert_authenticated"
  ON community_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- El autor puede editar su propio post; los admins pueden editar cualquiera
CREATE POLICY "posts_update_own_or_admin"
  ON community_posts FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- Solo admins pueden eliminar posts
CREATE POLICY "posts_delete_admin"
  ON community_posts FOR DELETE
  USING (get_user_role() = 'admin');

-- Comentarios: mismas reglas que posts
CREATE POLICY "comments_select_members"
  ON community_comments FOR SELECT
  USING (is_visible = TRUE OR get_user_role() = 'admin');

CREATE POLICY "comments_insert_authenticated"
  ON community_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_update_own_or_admin"
  ON community_comments FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "comments_delete_admin"
  ON community_comments FOR DELETE
  USING (get_user_role() = 'admin');

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_community_posts_updated_at ON community_posts;
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_comments_updated_at ON community_comments;
CREATE TRIGGER update_community_comments_updated_at
  BEFORE UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
