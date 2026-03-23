-- 008_community_author_delete.sql
-- La policy original solo permitía a admins borrar posts.
-- Se actualiza para que el autor también pueda eliminar sus propios posts.

DROP POLICY IF EXISTS "posts_delete_admin" ON community_posts;

CREATE POLICY "posts_delete_own_or_admin"
  ON community_posts FOR DELETE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
