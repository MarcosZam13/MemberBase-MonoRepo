-- 005_content_categories.sql — Categorías para organizar el contenido por carpetas

-- ─── Tabla: content_categories ────────────────────────────────────────────────
-- Permite agrupar el contenido en carpetas/categorías temáticas.
-- Ejemplos: "Rutinas de fuerza", "Nutrición", "Clases grupales"

CREATE TABLE IF NOT EXISTS content_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',  -- Color del badge/icono en la UI
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar la relación de categoría al contenido existente
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL;

-- Índices para filtrado eficiente por categoría
CREATE INDEX IF NOT EXISTS idx_content_category_id ON content(category_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_slug ON content_categories(slug);

-- RLS para categorías
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver categorías activas
CREATE POLICY "categories_select_authenticated"
  ON content_categories FOR SELECT
  USING (is_active = TRUE OR get_user_role() = 'admin');

-- Solo admins pueden crear, modificar y eliminar categorías
CREATE POLICY "categories_write_admin_only"
  ON content_categories FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_content_categories_updated_at ON content_categories;
CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON content_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
