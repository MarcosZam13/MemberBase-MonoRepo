-- 20260101000012_fix_challenges_rls.sql
-- Reemplaza las políticas RLS de las tablas de retos para usar get_user_role()
-- en lugar de subqueries directas a profiles, evitando recursión infinita.
-- También reemplaza el subquery cruzado en gym_challenge_progress que causaba
-- recursión al evaluar RLS sobre gym_challenge_participants desde una política
-- de gym_challenge_progress.

-- ── Función auxiliar: verifica si el participante pertenece al usuario actual ──
-- SECURITY DEFINER para bypass de RLS en gym_challenge_participants, evitando
-- la recursión cruzada entre gym_challenge_progress y gym_challenge_participants.

CREATE OR REPLACE FUNCTION is_own_challenge_participant(p_participant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM gym_challenge_participants
    WHERE id = p_participant_id AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── gym_challenges ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_manage_challenges" ON gym_challenges;
DROP POLICY IF EXISTS "members_see_public_challenges" ON gym_challenges;

CREATE POLICY "admin_manage_challenges" ON gym_challenges
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Miembros autenticados ven retos públicos
CREATE POLICY "members_see_public_challenges" ON gym_challenges
  FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);

-- ── gym_challenge_participants ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_manage_participants" ON gym_challenge_participants;
DROP POLICY IF EXISTS "members_manage_own_participation" ON gym_challenge_participants;
DROP POLICY IF EXISTS "members_see_ranking" ON gym_challenge_participants;

CREATE POLICY "admin_manage_participants" ON gym_challenge_participants
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Miembros gestionan su propia participación
CREATE POLICY "members_manage_own_participation" ON gym_challenge_participants
  FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Todos los miembros autenticados pueden ver el ranking
CREATE POLICY "members_see_ranking" ON gym_challenge_participants
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── gym_challenge_progress ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "participants_manage_own_progress" ON gym_challenge_progress;
DROP POLICY IF EXISTS "admin_see_all_progress" ON gym_challenge_progress;

-- Usa la función SECURITY DEFINER para evitar recursión cruzada con
-- gym_challenge_participants al evaluar esta política.
CREATE POLICY "members_manage_own_progress" ON gym_challenge_progress
  FOR ALL
  USING      (is_own_challenge_participant(participant_id))
  WITH CHECK (is_own_challenge_participant(participant_id));

CREATE POLICY "admin_manage_progress" ON gym_challenge_progress
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── gym_challenge_badges ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_manage_badges" ON gym_challenge_badges;
DROP POLICY IF EXISTS "members_see_badges" ON gym_challenge_badges;

CREATE POLICY "admin_manage_badges" ON gym_challenge_badges
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Todos los miembros autenticados pueden ver los badges (leaderboard)
CREATE POLICY "members_see_badges" ON gym_challenge_badges
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
