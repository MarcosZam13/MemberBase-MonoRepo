-- 20260101000030_admin_insert_policies.sql
-- Faltan políticas INSERT para admins en subscriptions y payment_proofs.
-- Sin estas, registerManualPayment y createMember fallan con RLS violation
-- al intentar insertar registros para otros usuarios o con status='active'.

-- Admins pueden crear suscripciones activas para cualquier miembro (pago presencial, alta manual)
CREATE POLICY "subscriptions_insert_admin"
  ON subscriptions FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- Admins pueden registrar comprobantes para cualquier miembro (pagos presenciales aprobados)
CREATE POLICY "payment_proofs_insert_admin"
  ON payment_proofs FOR INSERT
  WITH CHECK (get_user_role() = 'admin');
