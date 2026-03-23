-- 004_storage_policies.sql — Configuración de buckets y políticas de Supabase Storage
-- IMPORTANTE: Crear los buckets manualmente en el panel de Supabase antes de ejecutar estas políticas:
--   - payment-proofs (privado)
--   - content-media  (público)
--   - avatars        (público)

-- ─── Políticas: bucket payment-proofs ─────────────────────────────────────────
-- Los usuarios solo pueden subir archivos en su propia carpeta (user_id como prefijo).
-- Solo los admins y el propio usuario pueden ver sus comprobantes.

CREATE POLICY "payment_proofs_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "payment_proofs_select_own_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      get_user_role() = 'admin'
      OR auth.uid()::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "payment_proofs_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-proofs'
    AND get_user_role() = 'admin'
  );

-- ─── Políticas: bucket content-media ──────────────────────────────────────────
-- El contenido media es público para lectura pero solo admins pueden subir.

CREATE POLICY "content_media_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'content-media');

CREATE POLICY "content_media_upload_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'content-media'
    AND get_user_role() = 'admin'
  );

CREATE POLICY "content_media_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'content-media'
    AND get_user_role() = 'admin'
  );

-- ─── Políticas: bucket avatars ────────────────────────────────────────────────

CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );
