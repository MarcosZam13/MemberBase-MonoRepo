-- 012_content_favorites.sql — Favoritos de contenido por miembro

CREATE TABLE IF NOT EXISTS content_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (content_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_content_favorites_user_id ON content_favorites(user_id);

ALTER TABLE content_favorites ENABLE ROW LEVEL SECURITY;

-- Miembros gestionan sus propios favoritos
CREATE POLICY "content_favorites_select_own"
  ON content_favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "content_favorites_insert_own"
  ON content_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "content_favorites_delete_own"
  ON content_favorites FOR DELETE
  USING (user_id = auth.uid());

-- Admins pueden ver todos los favoritos para analytics
CREATE POLICY "content_favorites_select_admin"
  ON content_favorites FOR SELECT
  USING (get_user_role() = 'admin');
