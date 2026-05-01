-- rls_multitenant_gym_expenses_subscriptions — RLS multi-tenant: gym_expenses hasta subscriptions

-- ========== gym_expenses ==========
DROP POLICY IF EXISTS "admin_owner_delete_expenses" ON gym_expenses;
DROP POLICY IF EXISTS "admin_owner_insert_expenses" ON gym_expenses;
DROP POLICY IF EXISTS "admin_owner_select_expenses" ON gym_expenses;

CREATE POLICY "admin_owner_select_expenses" ON gym_expenses
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "admin_owner_insert_expenses" ON gym_expenses
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "admin_owner_delete_expenses" ON gym_expenses
  FOR DELETE USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== gym_health_profiles ==========
DROP POLICY IF EXISTS "admin_manage_health_profiles" ON gym_health_profiles;
DROP POLICY IF EXISTS "members_see_own_health" ON gym_health_profiles;
DROP POLICY IF EXISTS "staff_manage_health" ON gym_health_profiles;
DROP POLICY IF EXISTS "staff_see_org_health" ON gym_health_profiles;

CREATE POLICY "members_see_own_health" ON gym_health_profiles
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "staff_see_org_health" ON gym_health_profiles
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "staff_manage_health" ON gym_health_profiles
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

-- ========== gym_health_snapshots ==========
DROP POLICY IF EXISTS "admin_owner_manage_snapshots" ON gym_health_snapshots;
DROP POLICY IF EXISTS "members_insert_snapshots" ON gym_health_snapshots;
DROP POLICY IF EXISTS "members_see_own_snapshots" ON gym_health_snapshots;
DROP POLICY IF EXISTS "staff_insert_snapshots" ON gym_health_snapshots;
DROP POLICY IF EXISTS "staff_see_org_snapshots" ON gym_health_snapshots;

CREATE POLICY "members_see_own_snapshots" ON gym_health_snapshots
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_insert_snapshots" ON gym_health_snapshots
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "staff_see_org_snapshots" ON gym_health_snapshots
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "staff_insert_snapshots" ON gym_health_snapshots
  FOR INSERT WITH CHECK (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "admin_owner_manage_snapshots" ON gym_health_snapshots
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== gym_inventory_movements (is_admin_or_owner() no filtraba org — consolidar) ==========
DROP POLICY IF EXISTS "admins_and_owner_manage_movements" ON gym_inventory_movements;
DROP POLICY IF EXISTS "owners_manage_movements" ON gym_inventory_movements;

CREATE POLICY "admins_and_owner_manage_movements" ON gym_inventory_movements
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== gym_inventory_products ==========
DROP POLICY IF EXISTS "admins_and_owner_manage_products" ON gym_inventory_products;
DROP POLICY IF EXISTS "members_view_active_products" ON gym_inventory_products;
DROP POLICY IF EXISTS "owners_manage_products" ON gym_inventory_products;

CREATE POLICY "admins_and_owner_manage_products" ON gym_inventory_products
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_view_active_products" ON gym_inventory_products
  FOR SELECT USING (org_id = get_user_org_id() AND is_active = true);

-- ========== gym_member_routines ==========
DROP POLICY IF EXISTS "admin_manage_member_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "member_delete_own_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "member_insert_own_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "member_select_own_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "member_update_own_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "members_see_own_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "staff_manage_member_routines" ON gym_member_routines;

CREATE POLICY "staff_manage_member_routines" ON gym_member_routines
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "member_select_own_routines" ON gym_member_routines
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "member_insert_own_routines" ON gym_member_routines
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "member_update_own_routines" ON gym_member_routines
  FOR UPDATE USING (user_id = auth.uid() AND org_id = get_user_org_id())
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "member_delete_own_routines" ON gym_member_routines
  FOR DELETE USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== gym_one_rep_max_tests ==========
DROP POLICY IF EXISTS "admins_select_org_1rm" ON gym_one_rep_max_tests;
DROP POLICY IF EXISTS "members_delete_own_1rm" ON gym_one_rep_max_tests;
DROP POLICY IF EXISTS "members_insert_own_1rm" ON gym_one_rep_max_tests;
DROP POLICY IF EXISTS "members_select_own_1rm" ON gym_one_rep_max_tests;

CREATE POLICY "admins_select_org_1rm" ON gym_one_rep_max_tests
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_select_own_1rm" ON gym_one_rep_max_tests
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_insert_own_1rm" ON gym_one_rep_max_tests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_delete_own_1rm" ON gym_one_rep_max_tests
  FOR DELETE USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== gym_personal_records ==========
DROP POLICY IF EXISTS "members_insert_prs" ON gym_personal_records;
DROP POLICY IF EXISTS "members_see_own_prs" ON gym_personal_records;
DROP POLICY IF EXISTS "members_update_own_prs" ON gym_personal_records;
DROP POLICY IF EXISTS "staff_see_member_prs" ON gym_personal_records;

CREATE POLICY "members_see_own_prs" ON gym_personal_records
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_insert_prs" ON gym_personal_records
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_update_own_prs" ON gym_personal_records
  FOR UPDATE USING (user_id = auth.uid() AND org_id = get_user_org_id())
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "staff_see_member_prs" ON gym_personal_records
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- ========== gym_plan_routines ==========
DROP POLICY IF EXISTS "admin_manage_plan_routines" ON gym_plan_routines;
DROP POLICY IF EXISTS "members_see_plan_routines" ON gym_plan_routines;

CREATE POLICY "admin_manage_plan_routines" ON gym_plan_routines
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_plan_routines" ON gym_plan_routines
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_progress_photos ==========
DROP POLICY IF EXISTS "admin_manage_photos" ON gym_progress_photos;
DROP POLICY IF EXISTS "members_see_own_photos" ON gym_progress_photos;
DROP POLICY IF EXISTS "members_upload_photos" ON gym_progress_photos;
DROP POLICY IF EXISTS "staff_see_org_photos" ON gym_progress_photos;

CREATE POLICY "members_see_own_photos" ON gym_progress_photos
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_upload_photos" ON gym_progress_photos
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "staff_see_org_photos" ON gym_progress_photos
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "admin_manage_photos" ON gym_progress_photos
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== gym_qr_codes (tenía duplicados — consolidar) ==========
DROP POLICY IF EXISTS "admin_manage_qr" ON gym_qr_codes;
DROP POLICY IF EXISTS "admin_manage_qr_codes" ON gym_qr_codes;
DROP POLICY IF EXISTS "admin_see_org_qr" ON gym_qr_codes;
DROP POLICY IF EXISTS "members_insert_own_qr" ON gym_qr_codes;
DROP POLICY IF EXISTS "members_see_own_qr" ON gym_qr_codes;
DROP POLICY IF EXISTS "members_update_own_qr" ON gym_qr_codes;

CREATE POLICY "admin_manage_qr_codes" ON gym_qr_codes
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "admin_see_org_qr" ON gym_qr_codes
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "members_see_own_qr" ON gym_qr_codes
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_insert_own_qr" ON gym_qr_codes
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_update_own_qr" ON gym_qr_codes
  FOR UPDATE USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== gym_routine_days (sin org_id directo — join via gym_routines) ==========
DROP POLICY IF EXISTS "admin_manage_routine_days" ON gym_routine_days;
DROP POLICY IF EXISTS "manage_routine_days" ON gym_routine_days;
DROP POLICY IF EXISTS "member_delete_own_routine_days" ON gym_routine_days;
DROP POLICY IF EXISTS "member_insert_own_routine_days" ON gym_routine_days;
DROP POLICY IF EXISTS "member_update_own_routine_days" ON gym_routine_days;
DROP POLICY IF EXISTS "see_routine_days" ON gym_routine_days;

CREATE POLICY "see_routine_days" ON gym_routine_days
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM gym_routines gr WHERE gr.id = routine_id AND gr.org_id = get_user_org_id())
  );

CREATE POLICY "manage_routine_days" ON gym_routine_days
  FOR ALL USING (
    get_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM gym_routines gr WHERE gr.id = routine_id AND gr.org_id = get_user_org_id())
  );

CREATE POLICY "member_insert_own_routine_days" ON gym_routine_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gym_routines gr
      WHERE gr.id = routine_id
        AND gr.org_id = get_user_org_id()
        AND gr.is_member_created = true
        AND gr.created_by = auth.uid()
    )
  );

CREATE POLICY "member_update_own_routine_days" ON gym_routine_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gym_routines gr
      WHERE gr.id = routine_id
        AND gr.org_id = get_user_org_id()
        AND gr.is_member_created = true
        AND gr.created_by = auth.uid()
    )
  );

CREATE POLICY "member_delete_own_routine_days" ON gym_routine_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gym_routines gr
      WHERE gr.id = routine_id
        AND gr.org_id = get_user_org_id()
        AND gr.is_member_created = true
        AND gr.created_by = auth.uid()
    )
  );

-- ========== gym_routine_exercises (sin org_id directo — join via days → routines) ==========
DROP POLICY IF EXISTS "admin_manage_routine_exercises" ON gym_routine_exercises;
DROP POLICY IF EXISTS "manage_routine_exercises" ON gym_routine_exercises;
DROP POLICY IF EXISTS "member_delete_own_routine_exercises" ON gym_routine_exercises;
DROP POLICY IF EXISTS "member_insert_own_routine_exercises" ON gym_routine_exercises;
DROP POLICY IF EXISTS "member_update_own_routine_exercises" ON gym_routine_exercises;
DROP POLICY IF EXISTS "see_routine_exercises" ON gym_routine_exercises;

CREATE POLICY "see_routine_exercises" ON gym_routine_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gym_routine_days grd
      JOIN gym_routines gr ON gr.id = grd.routine_id
      WHERE grd.id = day_id AND gr.org_id = get_user_org_id()
    )
  );

CREATE POLICY "manage_routine_exercises" ON gym_routine_exercises
  FOR ALL USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM gym_routine_days grd
      JOIN gym_routines gr ON gr.id = grd.routine_id
      WHERE grd.id = day_id AND gr.org_id = get_user_org_id()
    )
  );

CREATE POLICY "member_insert_own_routine_exercises" ON gym_routine_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gym_routine_days grd
      JOIN gym_routines gr ON gr.id = grd.routine_id
      WHERE grd.id = day_id
        AND gr.org_id = get_user_org_id()
        AND gr.is_member_created = true
        AND gr.created_by = auth.uid()
    )
  );

CREATE POLICY "member_update_own_routine_exercises" ON gym_routine_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gym_routine_days grd
      JOIN gym_routines gr ON gr.id = grd.routine_id
      WHERE grd.id = day_id
        AND gr.org_id = get_user_org_id()
        AND gr.is_member_created = true
        AND gr.created_by = auth.uid()
    )
  );

CREATE POLICY "member_delete_own_routine_exercises" ON gym_routine_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gym_routine_days grd
      JOIN gym_routines gr ON gr.id = grd.routine_id
      WHERE grd.id = day_id
        AND gr.org_id = get_user_org_id()
        AND gr.is_member_created = true
        AND gr.created_by = auth.uid()
    )
  );

-- ========== gym_routine_plan_assignments ==========
DROP POLICY IF EXISTS "admin_manage_routine_plans" ON gym_routine_plan_assignments;
DROP POLICY IF EXISTS "members_see_routine_plans" ON gym_routine_plan_assignments;

CREATE POLICY "admin_manage_routine_plans" ON gym_routine_plan_assignments
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_routine_plans" ON gym_routine_plan_assignments
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_routines ==========
DROP POLICY IF EXISTS "admin_manage_routines" ON gym_routines;
DROP POLICY IF EXISTS "member_delete_own_routines" ON gym_routines;
DROP POLICY IF EXISTS "member_manage_own_routines" ON gym_routines;
DROP POLICY IF EXISTS "member_update_own_routines" ON gym_routines;
DROP POLICY IF EXISTS "member_view_routines" ON gym_routines;
DROP POLICY IF EXISTS "members_see_assigned_routines" ON gym_routines;
DROP POLICY IF EXISTS "staff_manage_routines" ON gym_routines;

CREATE POLICY "staff_manage_routines" ON gym_routines
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "member_view_routines" ON gym_routines
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND (is_member_created = false OR created_by = auth.uid() OR is_public = true)
  );

CREATE POLICY "members_see_assigned_routines" ON gym_routines
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND id IN (SELECT routine_id FROM gym_member_routines WHERE user_id = auth.uid())
  );

CREATE POLICY "member_manage_own_routines" ON gym_routines
  FOR INSERT WITH CHECK (
    org_id = get_user_org_id() AND is_member_created = true AND created_by = auth.uid()
  );

CREATE POLICY "member_update_own_routines" ON gym_routines
  FOR UPDATE USING (org_id = get_user_org_id() AND is_member_created = true AND created_by = auth.uid())
  WITH CHECK (org_id = get_user_org_id() AND is_member_created = true AND created_by = auth.uid());

CREATE POLICY "member_delete_own_routines" ON gym_routines
  FOR DELETE USING (org_id = get_user_org_id() AND is_member_created = true AND created_by = auth.uid());

-- ========== gym_sale_items (sin org_id directo — join via gym_sales) ==========
DROP POLICY IF EXISTS "admins_and_owner_manage_sale_items" ON gym_sale_items;
DROP POLICY IF EXISTS "owners_manage_sale_items" ON gym_sale_items;

CREATE POLICY "admins_and_owner_manage_sale_items" ON gym_sale_items
  FOR ALL USING (
    get_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM gym_sales gs WHERE gs.id = sale_id AND gs.org_id = get_user_org_id())
  );

-- ========== gym_sales ==========
DROP POLICY IF EXISTS "admins_and_owner_manage_sales" ON gym_sales;
DROP POLICY IF EXISTS "owners_manage_sales" ON gym_sales;

CREATE POLICY "admins_and_owner_manage_sales" ON gym_sales
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== gym_scheduled_classes ==========
DROP POLICY IF EXISTS "admin_manage_scheduled_classes" ON gym_scheduled_classes;
DROP POLICY IF EXISTS "members_see_scheduled_classes" ON gym_scheduled_classes;

CREATE POLICY "admin_manage_scheduled_classes" ON gym_scheduled_classes
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_scheduled_classes" ON gym_scheduled_classes
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_workout_logs ==========
DROP POLICY IF EXISTS "admin_see_all_logs" ON gym_workout_logs;
DROP POLICY IF EXISTS "members_insert_workout_logs" ON gym_workout_logs;
DROP POLICY IF EXISTS "members_own_workout_logs" ON gym_workout_logs;
DROP POLICY IF EXISTS "staff_see_workout_logs" ON gym_workout_logs;

CREATE POLICY "members_own_workout_logs" ON gym_workout_logs
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_insert_workout_logs" ON gym_workout_logs
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "admin_see_all_logs" ON gym_workout_logs
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "staff_see_workout_logs" ON gym_workout_logs
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

-- ========== login_attempts (mantener allow insert público) ==========
DROP POLICY IF EXISTS "allow_insert_login_attempts" ON login_attempts;

CREATE POLICY "allow_insert_login_attempts" ON login_attempts
  FOR INSERT WITH CHECK (true);

-- ========== membership_plans ==========
DROP POLICY IF EXISTS "plans_select_active_authenticated" ON membership_plans;
DROP POLICY IF EXISTS "plans_write_admin_only" ON membership_plans;

CREATE POLICY "plans_select_active_authenticated" ON membership_plans
  FOR SELECT USING (org_id = get_user_org_id() AND (is_active = true OR get_user_role() = 'admin'));

CREATE POLICY "plans_write_admin_only" ON membership_plans
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== notifications ==========
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "users_see_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;

CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== organization_feature_flags ==========
DROP POLICY IF EXISTS "feature_flags_admin_only" ON organization_feature_flags;
DROP POLICY IF EXISTS "feature_flags_select_own" ON organization_feature_flags;

CREATE POLICY "feature_flags_select_own" ON organization_feature_flags
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "feature_flags_admin_only" ON organization_feature_flags
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== organizations (cada tenant solo ve su propia org) ==========
DROP POLICY IF EXISTS "admin_owner_read_organization" ON organizations;
DROP POLICY IF EXISTS "admin_owner_update_organization" ON organizations;

CREATE POLICY "admin_owner_read_organization" ON organizations
  FOR SELECT USING (id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "admin_owner_update_organization" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== payment_proofs ==========
DROP POLICY IF EXISTS "payment_proofs_insert_admin" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_insert_own" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_select_own_or_admin_owner" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_update_admin_or_owner" ON payment_proofs;

CREATE POLICY "payment_proofs_select_own_or_admin_owner" ON payment_proofs
  FOR SELECT USING (
    org_id = get_user_org_id() AND (user_id = auth.uid() OR get_user_role() = 'admin')
  );

CREATE POLICY "payment_proofs_insert_own" ON payment_proofs
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "payment_proofs_insert_admin" ON payment_proofs
  FOR INSERT WITH CHECK (get_user_role() = 'admin' AND org_id = get_user_org_id());

CREATE POLICY "payment_proofs_update_admin_or_owner" ON payment_proofs
  FOR UPDATE USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== profiles ==========
DROP POLICY IF EXISTS "profiles_select_own_or_admin_owner" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_role_admin_owner" ON profiles;

CREATE POLICY "profiles_select_own_or_admin_owner" ON profiles
  FOR SELECT USING (
    (id = auth.uid()) OR (org_id = get_user_org_id() AND get_user_role() = 'admin')
  );

-- Previene que el miembro cambie su propio rol — with_check compara contra la DB
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() AND org_id = get_user_org_id())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "profiles_update_role_admin_owner" ON profiles
  FOR UPDATE USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== subscriptions ==========
DROP POLICY IF EXISTS "subscriptions_cancel_own" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_admin" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own_or_admin_owner" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_admin_or_owner" ON subscriptions;

CREATE POLICY "subscriptions_select_own_or_admin_owner" ON subscriptions
  FOR SELECT USING (
    org_id = get_user_org_id() AND (user_id = auth.uid() OR get_user_role() = 'admin')
  );

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND org_id = get_user_org_id() AND status = 'pending'
  );

CREATE POLICY "subscriptions_insert_admin" ON subscriptions
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "subscriptions_update_admin_or_owner" ON subscriptions
  FOR UPDATE USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "subscriptions_cancel_own" ON subscriptions
  FOR UPDATE USING (
    user_id = auth.uid()
    AND org_id = get_user_org_id()
    AND status = ANY (ARRAY['active', 'pending'])
  ) WITH CHECK (
    user_id = auth.uid()
    AND org_id = get_user_org_id()
    AND status = 'cancelled'
  );
