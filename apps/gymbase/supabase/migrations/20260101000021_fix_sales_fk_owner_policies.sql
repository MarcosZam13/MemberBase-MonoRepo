-- 20260101000021_fix_sales_fk_owner_policies.sql
-- Corrige los FK de gym_sales para que apunten a profiles (no a auth.users),
-- lo que permite los joins via PostgREST. También agrega políticas RLS para el rol owner.

-- ─── Arreglar FKs de gym_sales → profiles ────────────────────────────────────
-- Los FK originales apuntaban a auth.users(id), lo que impedía el join con profiles
-- en las queries de PostgREST. Como profiles.id = auth.users.id, el cambio es seguro.

ALTER TABLE gym_sales DROP CONSTRAINT IF EXISTS gym_sales_sold_by_fkey;
ALTER TABLE gym_sales DROP CONSTRAINT IF EXISTS gym_sales_member_id_fkey;

ALTER TABLE gym_sales
  ADD CONSTRAINT gym_sales_sold_by_fkey
    FOREIGN KEY (sold_by) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE gym_sales
  ADD CONSTRAINT gym_sales_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── RLS: owner puede acceder a gym_sales ────────────────────────────────────

CREATE POLICY "owners_manage_sales" ON gym_sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ─── RLS: owner puede acceder a gym_sale_items ───────────────────────────────

CREATE POLICY "owners_manage_sale_items" ON gym_sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ─── RLS: owner puede acceder a gym_inventory_movements ──────────────────────

CREATE POLICY "owners_manage_movements" ON gym_inventory_movements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ─── RLS: owner puede acceder a gym_inventory_products ───────────────────────

CREATE POLICY "owners_manage_products" ON gym_inventory_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );
