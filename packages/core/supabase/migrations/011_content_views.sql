-- 011_content_views.sql — Tracking de vistas de contenido por miembro

CREATE TABLE IF NOT EXISTS content_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON content_views(content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_user_id    ON content_views(user_id);

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

-- Miembros insertan sus propias vistas
CREATE POLICY "content_views_insert_own"
  ON content_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins ven todas las vistas para analytics
CREATE POLICY "content_views_select_admin"
  ON content_views FOR SELECT
  USING (get_user_role() = 'admin');

-- Miembros solo ven sus propias vistas
CREATE POLICY "content_views_select_own"
  ON content_views FOR SELECT
  USING (user_id = auth.uid());
