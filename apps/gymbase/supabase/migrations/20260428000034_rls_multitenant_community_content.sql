-- rls_multitenant_community_content — Migración RLS multi-tenant: tablas community_* y content_*

-- ========== community_comments ==========
DROP POLICY IF EXISTS "comments_delete_admin" ON community_comments;
DROP POLICY IF EXISTS "comments_insert_authenticated" ON community_comments;
DROP POLICY IF EXISTS "comments_select_members" ON community_comments;
DROP POLICY IF EXISTS "comments_update_own_or_admin" ON community_comments;

CREATE POLICY "comments_select_members" ON community_comments
  FOR SELECT USING (org_id = get_user_org_id() AND (is_visible = true OR get_user_role() = 'admin'));

CREATE POLICY "comments_insert_authenticated" ON community_comments
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "comments_update_own_or_admin" ON community_comments
  FOR UPDATE USING (org_id = get_user_org_id() AND (user_id = auth.uid() OR get_user_role() = 'admin'));

CREATE POLICY "comments_delete_admin" ON community_comments
  FOR DELETE USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== community_post_plans (sin org_id directo — join via community_posts) ==========
DROP POLICY IF EXISTS "post_plans_delete_admin_only" ON community_post_plans;
DROP POLICY IF EXISTS "post_plans_insert_admin_only" ON community_post_plans;
DROP POLICY IF EXISTS "post_plans_select_authenticated" ON community_post_plans;

CREATE POLICY "post_plans_select_authenticated" ON community_post_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM community_posts cp WHERE cp.id = post_id AND cp.org_id = get_user_org_id())
  );

CREATE POLICY "post_plans_insert_admin_only" ON community_post_plans
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM community_posts cp WHERE cp.id = post_id AND cp.org_id = get_user_org_id())
  );

CREATE POLICY "post_plans_delete_admin_only" ON community_post_plans
  FOR DELETE USING (
    get_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM community_posts cp WHERE cp.id = post_id AND cp.org_id = get_user_org_id())
  );

-- ========== community_posts ==========
DROP POLICY IF EXISTS "posts_delete_own_or_admin" ON community_posts;
DROP POLICY IF EXISTS "posts_insert_admin_only" ON community_posts;
DROP POLICY IF EXISTS "posts_select_members" ON community_posts;
DROP POLICY IF EXISTS "posts_update_own_or_admin" ON community_posts;

CREATE POLICY "posts_select_members" ON community_posts
  FOR SELECT USING (org_id = get_user_org_id() AND (is_visible = true OR get_user_role() = 'admin'));

CREATE POLICY "posts_insert_admin_only" ON community_posts
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "posts_update_own_or_admin" ON community_posts
  FOR UPDATE USING (org_id = get_user_org_id() AND (user_id = auth.uid() OR get_user_role() = 'admin'));

CREATE POLICY "posts_delete_own_or_admin" ON community_posts
  FOR DELETE USING (org_id = get_user_org_id() AND (user_id = auth.uid() OR get_user_role() = 'admin'));

-- ========== community_reactions (tenía duplicados — consolidar) ==========
DROP POLICY IF EXISTS "members_manage_own_reactions" ON community_reactions;
DROP POLICY IF EXISTS "members_see_reactions" ON community_reactions;
DROP POLICY IF EXISTS "reactions_delete_own" ON community_reactions;
DROP POLICY IF EXISTS "reactions_insert_own" ON community_reactions;
DROP POLICY IF EXISTS "reactions_select_org" ON community_reactions;
DROP POLICY IF EXISTS "reactions_update_own" ON community_reactions;

CREATE POLICY "reactions_select_org" ON community_reactions
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "reactions_insert_own" ON community_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "reactions_update_own" ON community_reactions
  FOR UPDATE USING (user_id = auth.uid() AND org_id = get_user_org_id())
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "reactions_delete_own" ON community_reactions
  FOR DELETE USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== content ==========
DROP POLICY IF EXISTS "content_select_published_with_active_subscription" ON content;
DROP POLICY IF EXISTS "content_write_admin_only" ON content;

CREATE POLICY "content_select_published_with_active_subscription" ON content
  FOR SELECT USING (
    org_id = get_user_org_id() AND (
      get_user_role() = 'admin'
      OR (
        is_published = true
        AND EXISTS (
          SELECT 1 FROM subscriptions s
          JOIN content_plans cp ON cp.plan_id = s.plan_id
          WHERE s.user_id = auth.uid()
            AND s.status = 'active'
            AND cp.content_id = content.id
            AND (s.expires_at IS NULL OR s.expires_at > now())
        )
      )
    )
  );

CREATE POLICY "content_write_admin_only" ON content
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== content_categories ==========
DROP POLICY IF EXISTS "categories_select_authenticated" ON content_categories;
DROP POLICY IF EXISTS "categories_write_admin_only" ON content_categories;

CREATE POLICY "categories_select_authenticated" ON content_categories
  FOR SELECT USING (org_id = get_user_org_id() AND (is_active = true OR get_user_role() = 'admin'));

CREATE POLICY "categories_write_admin_only" ON content_categories
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== content_favorites (tenía duplicados — consolidar) ==========
DROP POLICY IF EXISTS "content_favorites_delete_own" ON content_favorites;
DROP POLICY IF EXISTS "content_favorites_insert_own" ON content_favorites;
DROP POLICY IF EXISTS "content_favorites_select_admin" ON content_favorites;
DROP POLICY IF EXISTS "content_favorites_select_own" ON content_favorites;
DROP POLICY IF EXISTS "members_own_favorites" ON content_favorites;

CREATE POLICY "content_favorites_select_own" ON content_favorites
  FOR SELECT USING (org_id = get_user_org_id() AND (user_id = auth.uid() OR get_user_role() = 'admin'));

CREATE POLICY "content_favorites_insert_own" ON content_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "content_favorites_delete_own" ON content_favorites
  FOR DELETE USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- ========== content_plans ==========
DROP POLICY IF EXISTS "content_plans_select_all_authenticated" ON content_plans;
DROP POLICY IF EXISTS "content_plans_write_admin_only" ON content_plans;

CREATE POLICY "content_plans_select_all_authenticated" ON content_plans
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "content_plans_write_admin_only" ON content_plans
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin')
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ========== content_views (sin org_id directo — join via content) ==========
DROP POLICY IF EXISTS "content_views_insert_own" ON content_views;
DROP POLICY IF EXISTS "content_views_select_admin" ON content_views;
DROP POLICY IF EXISTS "content_views_select_own" ON content_views;

CREATE POLICY "content_views_select_own" ON content_views
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "content_views_select_admin" ON content_views
  FOR SELECT USING (
    get_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM content c WHERE c.id = content_id AND c.org_id = get_user_org_id())
  );

CREATE POLICY "content_views_insert_own" ON content_views
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM content c WHERE c.id = content_id AND c.org_id = get_user_org_id())
  );
