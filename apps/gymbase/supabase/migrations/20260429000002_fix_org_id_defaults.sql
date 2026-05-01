-- 20260429000002_fix_org_id_defaults.sql
-- Corrige datos históricos con org_id = NULL en tablas core que usan RLS por org_id.
-- El problema: createPlan() y createContent() del core no incluían org_id en el INSERT,
-- dejando las filas con NULL. La RLS filtra por `org_id = get_user_org_id()`,
-- así que NULL = uuid es siempre falso y los rows eran invisibles para admins y owners.

-- ─── Parche de datos históricos ───────────────────────────────────────────────

-- Solo afecta el gym dev '00000000-0000-0000-0000-000000000001'.
-- En producción multi-tenant, reemplazar el UUID o usar una subquery.
UPDATE membership_plans
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

UPDATE content
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

UPDATE subscriptions
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

UPDATE payment_proofs
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- ─── DEFAULT automático para futuros INSERTs ──────────────────────────────────
-- Las actions del core no pasan org_id al INSERT — con este DEFAULT, Postgres
-- llama a get_user_org_id() que lee el org_id del profile del usuario autenticado.
-- Esto evita que nuevos planes o contenido queden con org_id = NULL.

ALTER TABLE membership_plans ALTER COLUMN org_id SET DEFAULT get_user_org_id();
ALTER TABLE content          ALTER COLUMN org_id SET DEFAULT get_user_org_id();
ALTER TABLE subscriptions    ALTER COLUMN org_id SET DEFAULT get_user_org_id();
ALTER TABLE payment_proofs   ALTER COLUMN org_id SET DEFAULT get_user_org_id();
