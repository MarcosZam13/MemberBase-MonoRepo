-- rls_multitenant_gym_challenges_classes — RLS multi-tenant: gym_attendance, gym_challenge_*, gym_class_*, gym_exercise_*

-- ========== gym_attendance_logs ==========
DROP POLICY IF EXISTS "admin_owner_full_attendance" ON gym_attendance_logs;
DROP POLICY IF EXISTS "members_checkout_own" ON gym_attendance_logs;
DROP POLICY IF EXISTS "members_insert_own_checkin" ON gym_attendance_logs;
DROP POLICY IF EXISTS "members_see_own_attendance" ON gym_attendance_logs;
DROP POLICY IF EXISTS "trainer_manage_attendance" ON gym_attendance_logs;

CREATE POLICY "admin_owner_full_attendance" ON gym_attendance_logs
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_own_attendance" ON gym_attendance_logs
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_insert_own_checkin" ON gym_attendance_logs
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_checkout_own" ON gym_attendance_logs
  FOR UPDATE USING (user_id = auth.uid() AND org_id = get_user_org_id() AND check_out_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== gym_challenge_badges ==========
DROP POLICY IF EXISTS "admin_manage_badges" ON gym_challenge_badges;
DROP POLICY IF EXISTS "members_see_badges" ON gym_challenge_badges;

CREATE POLICY "admin_manage_badges" ON gym_challenge_badges
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_badges" ON gym_challenge_badges
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_challenge_participants ==========
DROP POLICY IF EXISTS "admin_owner_manage_participants" ON gym_challenge_participants;
DROP POLICY IF EXISTS "members_manage_own_participation" ON gym_challenge_participants;
DROP POLICY IF EXISTS "members_see_ranking" ON gym_challenge_participants;

CREATE POLICY "admin_owner_manage_participants" ON gym_challenge_participants
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_manage_own_participation" ON gym_challenge_participants
  FOR ALL USING (user_id = auth.uid() AND org_id = get_user_org_id())
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_see_ranking" ON gym_challenge_participants
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_challenge_plan_visibility ==========
DROP POLICY IF EXISTS "admin_manage_challenge_visibility" ON gym_challenge_plan_visibility;
DROP POLICY IF EXISTS "members_see_challenge_visibility" ON gym_challenge_plan_visibility;

CREATE POLICY "admin_manage_challenge_visibility" ON gym_challenge_plan_visibility
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_challenge_visibility" ON gym_challenge_plan_visibility
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_challenge_plans ==========
DROP POLICY IF EXISTS "admin_manage_challenge_plans" ON gym_challenge_plans;
DROP POLICY IF EXISTS "members_see_challenge_plans" ON gym_challenge_plans;

CREATE POLICY "admin_manage_challenge_plans" ON gym_challenge_plans
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_challenge_plans" ON gym_challenge_plans
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_challenge_progress (sin org_id directo — join via participants) ==========
DROP POLICY IF EXISTS "admin_manage_progress" ON gym_challenge_progress;
DROP POLICY IF EXISTS "members_manage_own_progress" ON gym_challenge_progress;

CREATE POLICY "admin_manage_progress" ON gym_challenge_progress
  FOR ALL USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM gym_challenge_participants gcp
      WHERE gcp.id = participant_id AND gcp.org_id = get_user_org_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM gym_challenge_participants gcp
      WHERE gcp.id = participant_id AND gcp.org_id = get_user_org_id()
    )
  );

-- Mantener función existente is_own_challenge_participant — no requiere cambio
CREATE POLICY "members_manage_own_progress" ON gym_challenge_progress
  FOR ALL USING (is_own_challenge_participant(participant_id))
  WITH CHECK (is_own_challenge_participant(participant_id));

-- ========== gym_challenges ==========
DROP POLICY IF EXISTS "admin_owner_manage_challenges" ON gym_challenges;
DROP POLICY IF EXISTS "members_see_public_challenges" ON gym_challenges;

CREATE POLICY "admin_owner_manage_challenges" ON gym_challenges
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_public_challenges" ON gym_challenges
  FOR SELECT USING (org_id = get_user_org_id() AND is_public = true);

-- ========== gym_class_attendance ==========
DROP POLICY IF EXISTS "members_see_own_class_attendance" ON gym_class_attendance;
DROP POLICY IF EXISTS "staff_manage_attendance" ON gym_class_attendance;

CREATE POLICY "members_see_own_class_attendance" ON gym_class_attendance
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "staff_manage_attendance" ON gym_class_attendance
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

-- ========== gym_class_bookings ==========
DROP POLICY IF EXISTS "admin_manage_bookings" ON gym_class_bookings;
DROP POLICY IF EXISTS "admin_see_all_bookings" ON gym_class_bookings;
DROP POLICY IF EXISTS "members_cancel_own_bookings" ON gym_class_bookings;
DROP POLICY IF EXISTS "members_create_bookings" ON gym_class_bookings;
DROP POLICY IF EXISTS "members_see_own_bookings" ON gym_class_bookings;

CREATE POLICY "admin_manage_bookings" ON gym_class_bookings
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "admin_see_all_bookings" ON gym_class_bookings
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'trainer'))
  );

CREATE POLICY "members_see_own_bookings" ON gym_class_bookings
  FOR SELECT USING (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_create_bookings" ON gym_class_bookings
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_cancel_own_bookings" ON gym_class_bookings
  FOR UPDATE USING (user_id = auth.uid() AND org_id = get_user_org_id())
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== gym_class_types ==========
DROP POLICY IF EXISTS "admin_manage_class_types" ON gym_class_types;
DROP POLICY IF EXISTS "members_see_class_types" ON gym_class_types;

CREATE POLICY "admin_manage_class_types" ON gym_class_types
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_class_types" ON gym_class_types
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_exercise_alternatives ==========
DROP POLICY IF EXISTS "admin_manage_alternatives" ON gym_exercise_alternatives;
DROP POLICY IF EXISTS "members_see_alternatives" ON gym_exercise_alternatives;

CREATE POLICY "admin_manage_alternatives" ON gym_exercise_alternatives
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_see_alternatives" ON gym_exercise_alternatives
  FOR SELECT USING (org_id = get_user_org_id());

-- ========== gym_exercises ==========
DROP POLICY IF EXISTS "admin_manage_exercises" ON gym_exercises;
DROP POLICY IF EXISTS "members_delete_own_private_exercises" ON gym_exercises;
DROP POLICY IF EXISTS "members_insert_private_exercises" ON gym_exercises;
DROP POLICY IF EXISTS "members_see_exercises" ON gym_exercises;

-- is_global = true permite ver ejercicios globales de la plataforma sin filtro de org
CREATE POLICY "members_see_exercises" ON gym_exercises
  FOR SELECT USING (
    is_global = true
    OR org_id = get_user_org_id()
    OR is_private_to_user = auth.uid()
  );

CREATE POLICY "admin_manage_exercises" ON gym_exercises
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "members_insert_private_exercises" ON gym_exercises
  FOR INSERT WITH CHECK (is_private_to_user = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "members_delete_own_private_exercises" ON gym_exercises
  FOR DELETE USING (is_private_to_user = auth.uid() AND org_id = get_user_org_id());
