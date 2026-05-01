-- 20260101000022_gym_expenses.sql — Tabla de gastos operativos del gym para el módulo de contabilidad

CREATE TABLE gym_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL CHECK (category IN ('equipamiento','renta','salarios','servicios','marketing','otro')),
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX gym_expenses_org_date_idx ON gym_expenses(org_id, expense_date DESC);

ALTER TABLE gym_expenses ENABLE ROW LEVEL SECURITY;

-- Solo admin y owner pueden ver y gestionar los gastos de su organización
CREATE POLICY "admin_owner_manage_expenses" ON gym_expenses
  FOR ALL USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
