-- demo-seed.sql — Seed de datos demo para Iron Fit Gym (org_id 00000000-0000-0000-0000-000000000001)
-- Idempotente: usa ON CONFLICT DO NOTHING y upserts. Seguro de correr múltiples veces.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- PREREQUISITOS (antes de ejecutar este script):
--
-- 1. Crea las 3 cuentas demo en Supabase Dashboard → Authentication → Users:
--      demo-miembro@gymbase.app  / Demo1234!
--      demo-admin@gymbase.app    / Demo1234!
--      demo-owner@gymbase.app    / Demo1234!
--
-- 2. Reemplaza los 3 placeholders con los UUIDs reales usando sed o Find & Replace:
--      sed -i 's/MEMBER_UUID_HERE/<uuid>/g; s/ADMIN_UUID_HERE/<uuid>/g; s/OWNER_UUID_HERE/<uuid>/g' demo-seed.sql
--
-- 3. Ejecuta como superusuario (postgres) — necesario para insertar en auth.users
--      psql $DATABASE_URL -f apps/gymbase/supabase/seeds/demo-seed.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── CONSTANTES ────────────────────────────────────────────────────────────────
DO $check$ BEGIN
  IF 'MEMBER_UUID_HERE' = 'MEMBER_UUID_HERE' THEN
    RAISE EXCEPTION 'Reemplaza MEMBER_UUID_HERE, ADMIN_UUID_HERE y OWNER_UUID_HERE antes de ejecutar.';
  END IF;
END $check$;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 1 — Organización: Iron Fit Gym
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE organizations SET
  gym_name     = 'Iron Fit Gym',
  slogan       = 'Forja tu mejor versión',
  sinpe_number = '88001234',
  sinpe_name   = 'Iron Fit Gym S.A.',
  max_capacity = 60,
  slug         = 'ironfit',
  domain       = 'ironfit.gymbase.app',
  config       = '{
    "colors":  {"primary":"#FF5E14","background":"#0A0A0A","surface":"#111111","border":"#1E1E1E","text":"#F5F5F5","textMuted":"#737373"},
    "design":  {"preset":"bold","cardRadius":"14px","font":"dm-sans","headingFont":"barlow-condensed","shadow":"none"},
    "media":   {"logoUrl":null,"portalBgImage":null,"faviconUrl":null},
    "features":{"community":true,"content":true,"gym_qr_checkin":true,"gym_health_metrics":true,"gym_routines":true,"gym_progress":true,"gym_calendar":true,"gym_challenges":true,"gym_marketplace":true},
    "gym":     {"name":"Iron Fit Gym","timezone":"America/Costa_Rica","currency":"CRC","maxCapacity":60}
  }'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Actualizar perfiles de las 3 cuentas demo (ya creadas manualmente)
UPDATE profiles SET role = 'member', full_name = 'Demo Miembro',
  org_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'MEMBER_UUID_HERE'::uuid;

UPDATE profiles SET role = 'admin', full_name = 'Demo Admin',
  org_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'ADMIN_UUID_HERE'::uuid;

UPDATE profiles SET role = 'owner', full_name = 'Demo Owner',
  org_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'OWNER_UUID_HERE'::uuid;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 2 — Planes de membresía
-- UUIDs: b0000000-0000-0000-0000-000000000001..3
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO membership_plans (id, org_id, name, description, price, currency, duration_days, features, is_active, sort_order) VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Básico', 'Acceso ilimitado al gimnasio en horario regular', 25000, 'CRC', 30,
   '["Acceso al gimnasio","Zona de pesas libre","Vestidores y duchas"]'::jsonb, true, 1),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Premium', 'Todo lo del plan Básico más clases grupales y acceso al App', 45000, 'CRC', 30,
   '["Acceso al gimnasio","Clases grupales ilimitadas","App con rutinas personalizadas","Seguimiento de progreso","Descuentos en tienda"]'::jsonb, true, 2),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Élite Anual', 'Membresía anual con todos los beneficios Premium + nutrición', 400000, 'CRC', 365,
   '["Todo lo del plan Premium","Consulta nutricional mensual","Entrenador personal 2x/mes","Acceso prioritario a clases","Locker permanente"]'::jsonb, true, 3)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 3 — 30 miembros costarricenses (UUIDs fijos a000...0001 a a000...0030)
-- Se insertan directamente en auth.users (requiere superusuario).
-- El trigger handle_new_user crea el profile automáticamente.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
SELECT
  member_id::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated', email,
  crypt('Demo1234!', gen_salt('bf')),
  NOW() - (idx * interval '5 days'),
  NOW() - (idx * interval '5 days'),
  NOW() - (idx * interval '5 days'),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name, 'org_id', '00000000-0000-0000-0000-000000000001')
FROM (VALUES
  (1,  'a0000000-0000-0000-0000-000000000001', 'ana.rodriguez@demo.ironfit',      'Ana Rodríguez'),
  (2,  'a0000000-0000-0000-0000-000000000002', 'sofia.vargas@demo.ironfit',       'Sofía Vargas'),
  (3,  'a0000000-0000-0000-0000-000000000003', 'valeria.jimenez@demo.ironfit',    'Valeria Jiménez'),
  (4,  'a0000000-0000-0000-0000-000000000004', 'maria.gonzalez@demo.ironfit',     'María González'),
  (5,  'a0000000-0000-0000-0000-000000000005', 'daniela.mora@demo.ironfit',       'Daniela Mora'),
  (6,  'a0000000-0000-0000-0000-000000000006', 'karla.hernandez@demo.ironfit',    'Karla Hernández'),
  (7,  'a0000000-0000-0000-0000-000000000007', 'laura.quesada@demo.ironfit',      'Laura Quesada'),
  (8,  'a0000000-0000-0000-0000-000000000008', 'diana.fallas@demo.ironfit',       'Diana Fallas'),
  (9,  'a0000000-0000-0000-0000-000000000009', 'gabriela.castro@demo.ironfit',    'Gabriela Castro'),
  (10, 'a0000000-0000-0000-0000-000000000010', 'andrea.calvo@demo.ironfit',       'Andrea Calvo'),
  (11, 'a0000000-0000-0000-0000-000000000011', 'carlos.mendez@demo.ironfit',      'Carlos Méndez'),
  (12, 'a0000000-0000-0000-0000-000000000012', 'andres.solis@demo.ironfit',       'Andrés Solís'),
  (13, 'a0000000-0000-0000-0000-000000000013', 'diego.rojas@demo.ironfit',        'Diego Rojas'),
  (14, 'a0000000-0000-0000-0000-000000000014', 'kevin.ramirez@demo.ironfit',      'Kevin Ramírez'),
  (15, 'a0000000-0000-0000-0000-000000000015', 'luis.arce@demo.ironfit',          'Luis Arce'),
  (16, 'a0000000-0000-0000-0000-000000000016', 'marco.salas@demo.ironfit',        'Marco Salas'),
  (17, 'a0000000-0000-0000-0000-000000000017', 'roberto.alfaro@demo.ironfit',     'Roberto Alfaro'),
  (18, 'a0000000-0000-0000-0000-000000000018', 'esteban.montero@demo.ironfit',    'Esteban Montero'),
  (19, 'a0000000-0000-0000-0000-000000000019', 'fabian.cruz@demo.ironfit',        'Fabián Cruz'),
  (20, 'a0000000-0000-0000-0000-000000000020', 'gustavo.torres@demo.ironfit',     'Gustavo Torres'),
  (21, 'a0000000-0000-0000-0000-000000000021', 'mauricio.chaves@demo.ironfit',    'Mauricio Chaves'),
  (22, 'a0000000-0000-0000-0000-000000000022', 'jorge.brenes@demo.ironfit',       'Jorge Brenes'),
  (23, 'a0000000-0000-0000-0000-000000000023', 'ernesto.badilla@demo.ironfit',    'Ernesto Badilla'),
  (24, 'a0000000-0000-0000-0000-000000000024', 'felipe.bogantes@demo.ironfit',    'Felipe Bogantes'),
  (25, 'a0000000-0000-0000-0000-000000000025', 'rafael.quiros@demo.ironfit',      'Rafael Quirós'),
  (26, 'a0000000-0000-0000-0000-000000000026', 'oscar.chinchilla@demo.ironfit',   'Oscar Chinchilla'),
  (27, 'a0000000-0000-0000-0000-000000000027', 'rodrigo.camacho@demo.ironfit',    'Rodrigo Camacho'),
  (28, 'a0000000-0000-0000-0000-000000000028', 'hernan.arias@demo.ironfit',       'Hernán Arias'),
  (29, 'a0000000-0000-0000-0000-000000000029', 'alexis.nunez@demo.ironfit',       'Alexis Núñez'),
  (30, 'a0000000-0000-0000-0000-000000000030', 'victor.porras@demo.ironfit',      'Víctor Porras')
) AS t(idx, member_id, email, full_name)
ON CONFLICT (id) DO NOTHING;

-- Actualizar perfiles: rol, teléfono, org_id
-- (el trigger ya creó los profiles; aquí se completan los datos)
UPDATE profiles SET
  role   = 'member',
  phone  = '+506' || (88000000 + p.idx)::text,
  org_id = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  (1,'a0000000-0000-0000-0000-000000000001'),(2,'a0000000-0000-0000-0000-000000000002'),
  (3,'a0000000-0000-0000-0000-000000000003'),(4,'a0000000-0000-0000-0000-000000000004'),
  (5,'a0000000-0000-0000-0000-000000000005'),(6,'a0000000-0000-0000-0000-000000000006'),
  (7,'a0000000-0000-0000-0000-000000000007'),(8,'a0000000-0000-0000-0000-000000000008'),
  (9,'a0000000-0000-0000-0000-000000000009'),(10,'a0000000-0000-0000-0000-000000000010'),
  (11,'a0000000-0000-0000-0000-000000000011'),(12,'a0000000-0000-0000-0000-000000000012'),
  (13,'a0000000-0000-0000-0000-000000000013'),(14,'a0000000-0000-0000-0000-000000000014'),
  (15,'a0000000-0000-0000-0000-000000000015'),(16,'a0000000-0000-0000-0000-000000000016'),
  (17,'a0000000-0000-0000-0000-000000000017'),(18,'a0000000-0000-0000-0000-000000000018'),
  (19,'a0000000-0000-0000-0000-000000000019'),(20,'a0000000-0000-0000-0000-000000000020'),
  (21,'a0000000-0000-0000-0000-000000000021'),(22,'a0000000-0000-0000-0000-000000000022'),
  (23,'a0000000-0000-0000-0000-000000000023'),(24,'a0000000-0000-0000-0000-000000000024'),
  (25,'a0000000-0000-0000-0000-000000000025'),(26,'a0000000-0000-0000-0000-000000000026'),
  (27,'a0000000-0000-0000-0000-000000000027'),(28,'a0000000-0000-0000-0000-000000000028'),
  (29,'a0000000-0000-0000-0000-000000000029'),(30,'a0000000-0000-0000-0000-000000000030')
) AS p(idx, uid)
WHERE profiles.id = p.uid::uuid;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 4 — Suscripciones y comprobantes de pago
-- 22 activas (meses escalonados), 5 expiradas, 3 pendientes
-- El trigger on_subscription_activated se desactiva para evitar auto-asignación
-- de rutinas (se asignan explícitamente en el bloque 7).
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE subscriptions DISABLE TRIGGER on_subscription_activated;

-- Demo miembro: suscripción activa Premium
INSERT INTO subscriptions (id, user_id, plan_id, org_id, status, starts_at, expires_at) VALUES
  ('s0000000-0000-0000-0000-000000000000', 'MEMBER_UUID_HERE'::uuid,
   'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'active', NOW() - interval '15 days', NOW() + interval '15 days')
ON CONFLICT DO NOTHING;

-- 22 activos (miembros 1-22), planes distribuidos: 1-8 Básico, 9-16 Premium, 17-22 Élite
INSERT INTO subscriptions (user_id, plan_id, org_id, status, starts_at, expires_at)
SELECT
  t.uid::uuid,
  CASE WHEN t.idx <= 8 THEN 'b0000000-0000-0000-0000-000000000001'
       WHEN t.idx <= 16 THEN 'b0000000-0000-0000-0000-000000000002'
       ELSE 'b0000000-0000-0000-0000-000000000003' END::uuid,
  '00000000-0000-0000-0000-000000000001',
  'active',
  NOW() - (t.idx * interval '3 days'),
  NOW() - (t.idx * interval '3 days') +
    CASE WHEN t.idx <= 16 THEN interval '30 days' ELSE interval '365 days' END
FROM (VALUES
  (1,'a0000000-0000-0000-0000-000000000001'),(2,'a0000000-0000-0000-0000-000000000002'),
  (3,'a0000000-0000-0000-0000-000000000003'),(4,'a0000000-0000-0000-0000-000000000004'),
  (5,'a0000000-0000-0000-0000-000000000005'),(6,'a0000000-0000-0000-0000-000000000006'),
  (7,'a0000000-0000-0000-0000-000000000007'),(8,'a0000000-0000-0000-0000-000000000008'),
  (9,'a0000000-0000-0000-0000-000000000009'),(10,'a0000000-0000-0000-0000-000000000010'),
  (11,'a0000000-0000-0000-0000-000000000011'),(12,'a0000000-0000-0000-0000-000000000012'),
  (13,'a0000000-0000-0000-0000-000000000013'),(14,'a0000000-0000-0000-0000-000000000014'),
  (15,'a0000000-0000-0000-0000-000000000015'),(16,'a0000000-0000-0000-0000-000000000016'),
  (17,'a0000000-0000-0000-0000-000000000017'),(18,'a0000000-0000-0000-0000-000000000018'),
  (19,'a0000000-0000-0000-0000-000000000019'),(20,'a0000000-0000-0000-0000-000000000020'),
  (21,'a0000000-0000-0000-0000-000000000021'),(22,'a0000000-0000-0000-0000-000000000022')
) AS t(idx, uid)
ON CONFLICT DO NOTHING;

-- 5 expiradas (miembros 23-27)
INSERT INTO subscriptions (user_id, plan_id, org_id, status, starts_at, expires_at)
SELECT
  t.uid::uuid,
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'expired',
  NOW() - interval '75 days',
  NOW() - interval '45 days'
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000023'),('a0000000-0000-0000-0000-000000000024'),
  ('a0000000-0000-0000-0000-000000000025'),('a0000000-0000-0000-0000-000000000026'),
  ('a0000000-0000-0000-0000-000000000027')
) AS t(uid)
ON CONFLICT DO NOTHING;

-- 3 pendientes (miembros 28-30): han subido comprobante esperando aprobación
INSERT INTO subscriptions (id, user_id, plan_id, org_id, status)
VALUES
  ('s0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'pending'),
  ('s0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pending'),
  ('s0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'pending')
ON CONFLICT (id) DO NOTHING;

-- Comprobantes de pago aprobados (miembros activos 1-22, historial de 3 meses)
-- Genera un comprobante aprobado por miembro activo
INSERT INTO payment_proofs (subscription_id, user_id, org_id, file_url, file_path, amount, payment_method, status, reviewed_at)
SELECT
  s.id, s.user_id, s.org_id,
  'https://placehold.co/receipt.pdf',
  'payment-proofs/demo/' || s.user_id || '.pdf',
  mp.price,
  'sinpe', 'approved', s.starts_at + interval '1 hour'
FROM subscriptions s
JOIN membership_plans mp ON mp.id = s.plan_id
WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
  AND s.status = 'active'
  AND s.user_id != 'MEMBER_UUID_HERE'::uuid
ON CONFLICT DO NOTHING;

-- Comprobante pendiente para los 3 en espera
INSERT INTO payment_proofs (subscription_id, user_id, org_id, file_url, file_path, amount, payment_method, status)
VALUES
  ('s0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'https://placehold.co/receipt.pdf', 'payment-proofs/demo/28.pdf', 45000, 'sinpe', 'pending'),
  ('s0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', 'https://placehold.co/receipt.pdf', 'payment-proofs/demo/29.pdf', 25000, 'sinpe', 'pending'),
  ('s0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'https://placehold.co/receipt.pdf', 'payment-proofs/demo/30.pdf', 45000, 'sinpe', 'pending')
ON CONFLICT DO NOTHING;

ALTER TABLE subscriptions ENABLE TRIGGER on_subscription_activated;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 5 — Check-ins (~600 asistencias en 3 meses para miembros activos 1-22)
-- Cada miembro visita el gym ~3 veces/semana usando generate_series.
-- Todos tienen check_out_at para no violar el UNIQUE parcial de open check-ins.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO gym_attendance_logs (user_id, org_id, check_in_at, check_out_at)
SELECT
  t.uid::uuid,
  '00000000-0000-0000-0000-000000000001',
  gs.check_in,
  gs.check_in + interval '75 minutes' + (t.idx * interval '3 minutes')
FROM (VALUES
  (1,'a0000000-0000-0000-0000-000000000001'),(2,'a0000000-0000-0000-0000-000000000002'),
  (3,'a0000000-0000-0000-0000-000000000003'),(4,'a0000000-0000-0000-0000-000000000004'),
  (5,'a0000000-0000-0000-0000-000000000005'),(6,'a0000000-0000-0000-0000-000000000006'),
  (7,'a0000000-0000-0000-0000-000000000007'),(8,'a0000000-0000-0000-0000-000000000008'),
  (9,'a0000000-0000-0000-0000-000000000009'),(10,'a0000000-0000-0000-0000-000000000010'),
  (11,'a0000000-0000-0000-0000-000000000011'),(12,'a0000000-0000-0000-0000-000000000012'),
  (13,'a0000000-0000-0000-0000-000000000013'),(14,'a0000000-0000-0000-0000-000000000014'),
  (15,'a0000000-0000-0000-0000-000000000015'),(16,'a0000000-0000-0000-0000-000000000016'),
  (17,'a0000000-0000-0000-0000-000000000017'),(18,'a0000000-0000-0000-0000-000000000018'),
  (19,'a0000000-0000-0000-0000-000000000019'),(20,'a0000000-0000-0000-0000-000000000020'),
  (21,'a0000000-0000-0000-0000-000000000021'),(22,'a0000000-0000-0000-0000-000000000022')
) AS t(idx, uid)
-- Serie cada 3 días (≈10 check-ins/mes × 3 meses = 30 por miembro × 22 = 660 total)
CROSS JOIN LATERAL (
  SELECT gs AS check_in
  FROM generate_series(
    NOW() - interval '90 days' + (t.idx * interval '4 hours'),
    NOW() - interval '1 day',
    interval '3 days'
  ) gs
) gs
ON CONFLICT DO NOTHING;

-- Check-ins del demo miembro (más densos para mostrar racha)
INSERT INTO gym_attendance_logs (user_id, org_id, check_in_at, check_out_at)
SELECT
  'MEMBER_UUID_HERE'::uuid,
  '00000000-0000-0000-0000-000000000001',
  gs,
  gs + interval '90 minutes'
FROM generate_series(NOW() - interval '60 days', NOW() - interval '1 day', interval '2 days') gs
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 6 — Tipos de clase + clases programadas (próximas 2 semanas)
-- UUIDs: kt000000-... para tipos, sc000000-... para clases programadas
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO gym_class_types (id, org_id, name, color, description) VALUES
  ('kt000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Yoga Flow',        '#8B5CF6', 'Clase de yoga para flexibilidad y relajación'),
  ('kt000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CrossFit WOD',     '#FF5E14', 'Entrenamiento funcional de alta intensidad'),
  ('kt000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Spinning',         '#06B6D4', 'Cardio en bicicleta estática con música'),
  ('kt000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Boxeo & Kickboxing','#EF4444', 'Técnica y acondicionamiento de artes marciales'),
  ('kt000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Pilates',          '#10B981', 'Fortalecimiento del core y postura corporal')
ON CONFLICT (id) DO NOTHING;

-- Clases para las próximas 2 semanas (lunes/miércoles/viernes a distintas horas)
INSERT INTO gym_scheduled_classes (id, org_id, type_id, instructor_id, title, starts_at, ends_at, max_capacity, location)
SELECT
  ('sc' || LPAD(ROW_NUMBER() OVER ()::text, 6, '0') || '-0000-0000-0000-000000000000')::uuid,
  '00000000-0000-0000-0000-000000000001',
  t.type_id::uuid,
  'ADMIN_UUID_HERE'::uuid,
  t.title,
  DATE_TRUNC('week', NOW()) + (d.day_offset * interval '1 day') + t.hour_offset,
  DATE_TRUNC('week', NOW()) + (d.day_offset * interval '1 day') + t.hour_offset + interval '1 hour',
  t.capacity,
  'Sala ' || t.sala
FROM (VALUES
  ('kt000000-0000-0000-0000-000000000002', 'CrossFit WOD Mañana',  interval '7 hours',  20, 'A'),
  ('kt000000-0000-0000-0000-000000000003', 'Spinning Mediodía',    interval '12 hours', 15, 'B'),
  ('kt000000-0000-0000-0000-000000000001', 'Yoga Flow Tarde',      interval '18 hours', 12, 'C'),
  ('kt000000-0000-0000-0000-000000000004', 'Kickboxing Noche',     interval '19 hours', 16, 'A'),
  ('kt000000-0000-0000-0000-000000000005', 'Pilates Mañana',       interval '8 hours',  10, 'C')
) AS t(type_id, title, hour_offset, capacity, sala)
CROSS JOIN (VALUES (1),(3),(5),(8),(10),(12)) AS d(day_offset)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 7 — Ejercicios, rutinas, días, ejercicios por día y asignaciones
-- UUIDs rutinas: rt000000-... UUIDs ejercicios: ex000000-...
-- ══════════════════════════════════════════════════════════════════════════════

-- 15 ejercicios globales
INSERT INTO gym_exercises (id, org_id, name, muscle_group, equipment, difficulty, is_global) VALUES
  ('ex000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Press de Banca',       'chest',     'barbell',   'intermediate', false),
  ('ex000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sentadilla con Barra', 'legs',      'barbell',   'intermediate', false),
  ('ex000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Peso Muerto',          'back',      'barbell',   'advanced',     false),
  ('ex000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Remo con Barra',       'back',      'barbell',   'intermediate', false),
  ('ex000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Press Militar',        'shoulders', 'barbell',   'intermediate', false),
  ('ex000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Curl de Bíceps',       'biceps',    'dumbbell',  'beginner',     false),
  ('ex000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Extensión de Tríceps', 'triceps',   'cable',     'beginner',     false),
  ('ex000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Zancadas',             'legs',      'dumbbell',  'beginner',     false),
  ('ex000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Plancha',              'core',      'bodyweight','beginner',     false),
  ('ex000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Abdominales Crunch',   'core',      'bodyweight','beginner',     false),
  ('ex000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Pull-up / Dominada',   'back',      'bodyweight','advanced',     false),
  ('ex000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Push-up',              'chest',     'bodyweight','beginner',     false),
  ('ex000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Elevación Lateral',    'shoulders', 'dumbbell',  'beginner',     false),
  ('ex000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Burpee',               'cardio',    'bodyweight','intermediate', false),
  ('ex000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Jump Rope',            'cardio',    'rope',      'beginner',     false)
ON CONFLICT (id) DO NOTHING;

-- 3 rutinas (2 con is_default=true para auto-asignación)
INSERT INTO gym_routines (id, org_id, name, description, created_by, duration_weeks, days_per_week, is_default, is_member_created) VALUES
  ('rt000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Fuerza Total', 'Rutina de fuerza compuesta 3 días por semana. Ideal para ganar masa muscular.',
   'ADMIN_UUID_HERE'::uuid, 8, 3, true, false),
  ('rt000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Principiante Activo', 'Programa de inicio para personas sin experiencia previa en el gym.',
   'ADMIN_UUID_HERE'::uuid, 6, 3, true, false),
  ('rt000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Cardio & Core', 'Circuito de cardio y fortalecimiento de core. Sin equipamiento necesario.',
   'ADMIN_UUID_HERE'::uuid, 4, 2, false, false)
ON CONFLICT (id) DO NOTHING;

-- Días de rutina 1 — Fuerza Total
INSERT INTO gym_routine_days (id, routine_id, day_number, name) VALUES
  ('rd100000-0000-0000-0000-000000000001', 'rt000000-0000-0000-0000-000000000001', 1, 'Día A — Pecho y Tríceps'),
  ('rd100000-0000-0000-0000-000000000002', 'rt000000-0000-0000-0000-000000000001', 2, 'Día B — Espalda y Bíceps'),
  ('rd100000-0000-0000-0000-000000000003', 'rt000000-0000-0000-0000-000000000001', 3, 'Día C — Piernas y Hombros')
ON CONFLICT (id) DO NOTHING;

-- Días de rutina 2 — Principiante Activo
INSERT INTO gym_routine_days (id, routine_id, day_number, name) VALUES
  ('rd200000-0000-0000-0000-000000000001', 'rt000000-0000-0000-0000-000000000002', 1, 'Día 1 — Cuerpo Completo A'),
  ('rd200000-0000-0000-0000-000000000002', 'rt000000-0000-0000-0000-000000000002', 2, 'Día 2 — Cuerpo Completo B'),
  ('rd200000-0000-0000-0000-000000000003', 'rt000000-0000-0000-0000-000000000002', 3, 'Día 3 — Cuerpo Completo C')
ON CONFLICT (id) DO NOTHING;

-- Días de rutina 3 — Cardio & Core
INSERT INTO gym_routine_days (id, routine_id, day_number, name) VALUES
  ('rd300000-0000-0000-0000-000000000001', 'rt000000-0000-0000-0000-000000000003', 1, 'Día 1 — Cardio HIIT'),
  ('rd300000-0000-0000-0000-000000000002', 'rt000000-0000-0000-0000-000000000003', 2, 'Día 2 — Core Intensivo')
ON CONFLICT (id) DO NOTHING;

-- Ejercicios en los días (rutina 1)
INSERT INTO gym_routine_exercises (day_id, exercise_id, sort_order, sets, reps, rest_seconds) VALUES
  ('rd100000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000001',1,4,'8-10',90),
  ('rd100000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000012',2,3,'12-15',60),
  ('rd100000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000007',3,3,'12',60),
  ('rd100000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000003',1,4,'5',120),
  ('rd100000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000004',2,3,'10',90),
  ('rd100000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000006',3,3,'12',60),
  ('rd100000-0000-0000-0000-000000000003','ex000000-0000-0000-0000-000000000002',1,4,'8',120),
  ('rd100000-0000-0000-0000-000000000003','ex000000-0000-0000-0000-000000000008',2,3,'12',60),
  ('rd100000-0000-0000-0000-000000000003','ex000000-0000-0000-0000-000000000005',3,4,'8-10',90)
ON CONFLICT DO NOTHING;

-- Ejercicios en los días (rutina 2 — principiante)
INSERT INTO gym_routine_exercises (day_id, exercise_id, sort_order, sets, reps, rest_seconds) VALUES
  ('rd200000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000012',1,3,'10',60),
  ('rd200000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000008',2,3,'10',60),
  ('rd200000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000009',3,3,'30 seg',45),
  ('rd200000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000013',1,3,'12',60),
  ('rd200000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000006',2,3,'10',60),
  ('rd200000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000010',3,3,'15',45),
  ('rd200000-0000-0000-0000-000000000003','ex000000-0000-0000-0000-000000000012',1,3,'12',60),
  ('rd200000-0000-0000-0000-000000000003','ex000000-0000-0000-0000-000000000008',2,3,'12',60),
  ('rd200000-0000-0000-0000-000000000003','ex000000-0000-0000-0000-000000000009',3,4,'45 seg',45)
ON CONFLICT DO NOTHING;

-- Ejercicios en los días (rutina 3 — cardio & core)
INSERT INTO gym_routine_exercises (day_id, exercise_id, sort_order, sets, reps, rest_seconds) VALUES
  ('rd300000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000014',1,4,'10',45),
  ('rd300000-0000-0000-0000-000000000001','ex000000-0000-0000-0000-000000000015',2,3,'60 seg',30),
  ('rd300000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000009',1,4,'60 seg',30),
  ('rd300000-0000-0000-0000-000000000002','ex000000-0000-0000-0000-000000000010',2,4,'20',30)
ON CONFLICT DO NOTHING;

-- Asignación de rutina al demo miembro (Fuerza Total, featured)
INSERT INTO gym_member_routines (user_id, org_id, routine_id, assigned_by, is_active, is_featured)
VALUES (
  'MEMBER_UUID_HERE'::uuid, '00000000-0000-0000-0000-000000000001',
  'rt000000-0000-0000-0000-000000000001',
  'ADMIN_UUID_HERE'::uuid, true, true
) ON CONFLICT DO NOTHING;

-- Segunda rutina asignada al demo miembro (Cardio & Core, no featured)
INSERT INTO gym_member_routines (user_id, org_id, routine_id, assigned_by, is_active, is_featured)
VALUES (
  'MEMBER_UUID_HERE'::uuid, '00000000-0000-0000-0000-000000000001',
  'rt000000-0000-0000-0000-000000000003',
  'ADMIN_UUID_HERE'::uuid, true, false
) ON CONFLICT DO NOTHING;

-- Asignar rutina "Fuerza Total" a todos los miembros activos 1-10 (demo del módulo)
INSERT INTO gym_member_routines (user_id, org_id, routine_id, assigned_by, is_active, is_featured)
SELECT
  t.uid::uuid, '00000000-0000-0000-0000-000000000001',
  'rt000000-0000-0000-0000-000000000001',
  'ADMIN_UUID_HERE'::uuid, true, true
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000001'),('a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003'),('a0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000005'),('a0000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000007'),('a0000000-0000-0000-0000-000000000008'),
  ('a0000000-0000-0000-0000-000000000009'),('a0000000-0000-0000-0000-000000000010')
) AS t(uid)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 8 — Retos (5 retos: 2 activos, 1 pasado, 1 próximo, 1 activo corto)
-- UUIDs: ch000000-...
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO gym_challenges (id, org_id, title, description, type, goal_value, goal_unit,
  starts_at, ends_at, max_participants, is_public, prize_description, created_by) VALUES
  ('ch000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Reto 30 días de asistencia',
   'Visita el gym al menos 20 veces en 30 días y gana un mes gratis.',
   'attendance', 20, 'visitas',
   NOW() - interval '21 days', NOW() + interval '9 days',
   50, true, 'Mes de membresía gratis + camisa Iron Fit', 'ADMIN_UUID_HERE'::uuid),
  ('ch000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Reto Quema 5 kg',
   'Pierde 5 kg de grasa corporal en 6 semanas con seguimiento semanal.',
   'weight', 5, 'kg',
   NOW() - interval '28 days', NOW() + interval '14 days',
   30, true, 'Sesión de nutrición gratis + suplemtos por ₡20,000', 'ADMIN_UUID_HERE'::uuid),
  ('ch000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'CrossFit Abril Challenge',
   'Completa los 12 WODs de abril y demuestra tu resistencia.',
   'workout', 12, 'WODs completados',
   NOW() - interval '60 days', NOW() - interval '30 days',
   25, true, 'Playera CrossFit exclusiva', 'ADMIN_UUID_HERE'::uuid),
  ('ch000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'Desafío Fuerza Máxima',
   'Mejora tu 1RM en press de banca, sentadilla y peso muerto en 8 semanas.',
   'workout', 3, 'récords personales',
   NOW() + interval '7 days', NOW() + interval '63 days',
   20, true, 'Consulta con entrenador + plan nutricional', 'ADMIN_UUID_HERE'::uuid),
  ('ch000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'Reto 100 Burpees',
   'Completa 100 burpees en el menor tiempo posible. El más rápido gana.',
   'custom', 100, 'burpees',
   NOW() - interval '10 days', NOW() + interval '4 days',
   NULL, true, 'Botella de proteína + membresía un mes', 'ADMIN_UUID_HERE'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Participantes en los retos activos (miembros 1-15 en reto 1, 1-10 en reto 2, todos en reto 5)
INSERT INTO gym_challenge_participants (challenge_id, user_id, org_id, status)
SELECT
  'ch000000-0000-0000-0000-000000000001',
  t.uid::uuid,
  '00000000-0000-0000-0000-000000000001',
  'active'
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000001'),('a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003'),('a0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000005'),('a0000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000007'),('a0000000-0000-0000-0000-000000000008'),
  ('a0000000-0000-0000-0000-000000000009'),('a0000000-0000-0000-0000-000000000010'),
  ('a0000000-0000-0000-0000-000000000011'),('a0000000-0000-0000-0000-000000000012'),
  ('a0000000-0000-0000-0000-000000000013'),('a0000000-0000-0000-0000-000000000014'),
  ('a0000000-0000-0000-0000-000000000015')
) AS t(uid)
ON CONFLICT DO NOTHING;

INSERT INTO gym_challenge_participants (challenge_id, user_id, org_id, status)
SELECT
  'ch000000-0000-0000-0000-000000000002',
  t.uid::uuid, '00000000-0000-0000-0000-000000000001', 'active'
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000001'),('a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003'),('a0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000005'),('a0000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000007'),('a0000000-0000-0000-0000-000000000008'),
  ('a0000000-0000-0000-0000-000000000009'),('a0000000-0000-0000-0000-000000000010')
) AS t(uid)
ON CONFLICT DO NOTHING;

-- Demo miembro participa en los 3 retos activos
INSERT INTO gym_challenge_participants (challenge_id, user_id, org_id, status) VALUES
  ('ch000000-0000-0000-0000-000000000001','MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001','active'),
  ('ch000000-0000-0000-0000-000000000002','MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001','active'),
  ('ch000000-0000-0000-0000-000000000005','MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001','active')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 9 — Posts de comunidad (20 posts) + reacciones
-- Solo admins pueden crear posts (migración 010_community_v2)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO community_posts (id, user_id, org_id, title, body, is_pinned, is_visible) VALUES
  ('cp000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   '¡Bienvenidos a la comunidad Iron Fit! 🏋️',
   'Esta es tu comunidad de gym. Aquí compartimos logros, consejos, motivación y más. ¡Presentate en los comentarios!', true, true),
  ('cp000000-0000-0000-0000-000000000002','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Nuevos horarios de clases — Mayo 2026',
   'A partir del lunes 4 de mayo tenemos nuevos horarios para las clases grupales. CrossFit WOD ahora también los sábados a las 8am. ¡Inscríbete en el App!', true, true),
  ('cp000000-0000-0000-0000-000000000003','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Consejo de la semana: hidratación',
   'Durante el entrenamiento deberías tomar al menos 500ml de agua por hora. Recuerda que el 2% de deshidratación puede reducir tu rendimiento hasta un 20%.', false, true),
  ('cp000000-0000-0000-0000-000000000004','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Reto 30 días — ¡Ya vamos por la mitad!',
   'Ya llevamos 15 días del Reto de Asistencia y tenemos 12 miembros con más de 10 visitas. ¡Sigan así! El top 3 ya está muy reñido.', false, true),
  ('cp000000-0000-0000-0000-000000000005','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Cierre de temporada: resultados CrossFit Abril',
   'Felicitamos a todos los que completaron el CrossFit Abril Challenge. El podio: 1° Diego Rojas, 2° Karla Hernández, 3° Luis Arce. ¡Increíble rendimiento!', false, true),
  ('cp000000-0000-0000-0000-000000000006','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Mantenimiento de equipos — este viernes',
   'El viernes de 7pm a 9pm el área de maquinaria estará cerrada por mantenimiento preventivo. Zona de pesas libres disponible normalmente.', false, true),
  ('cp000000-0000-0000-0000-000000000007','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Nutrición pre-entrenamiento: qué comer',
   'Lo mejor antes de entrenar: carbohidratos de digestión media 1-2h antes. Ejemplo: arroz con pollo, avena con frutas, o pan integral con huevo.', false, true),
  ('cp000000-0000-0000-0000-000000000008','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Record personal: Ana Rodríguez — sentadilla 80kg',
   'Felicitamos a Ana Rodríguez quien logró hoy su nuevo RP en sentadilla con 80kg. Hace 6 meses empezó con 40kg. ¡El trabajo constante da resultados!', false, true),
  ('cp000000-0000-0000-0000-000000000009','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Nueva máquina de cables — ya disponible',
   'Ya instalamos la nueva máquina de cables funcionales en el área B. Cuenta con 20 posiciones y agarre doble. Perfecta para core, hombros y espalda.', false, true),
  ('cp000000-0000-0000-0000-000000000010','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Tip: recuperación muscular post-entreno',
   'Las 2 horas después de entrenar son cruciales. Consume proteína + carbohidratos, estira 10 minutos y duerme al menos 7 horas. La recuperación es parte del entrenamiento.', false, true),
  ('cp000000-0000-0000-0000-000000000011','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Feriado: horario especial 11 de abril',
   'El viernes feriado abrimos de 7am a 1pm. Habrá una sola clase grupal a las 9am: CrossFit WOD. Cupos limitados, reserva en el App.', false, true),
  ('cp000000-0000-0000-0000-000000000012','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Spotlight: Carlos Méndez, 1 año en Iron Fit',
   'Carlos llegó hace exactamente un año sin poder hacer ni una dominada. Hoy hizo 3 series de 10. Gracias por confiar en nosotros, Carlos.', false, true),
  ('cp000000-0000-0000-0000-000000000013','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Rutinas actualizadas en el App',
   'Actualizamos todas las rutinas del App con videos de técnica. Revisa tu rutina asignada y asegúrate de ver los tutoriales antes de empezar.', false, true),
  ('cp000000-0000-0000-0000-000000000014','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   '¿Cuántas repeticiones son mejores para ganar músculo?',
   'La ciencia dice: 6-12 reps con carga moderada-alta es el rango óptimo para hipertrofia. Pero más importante que el rango es la progresión de carga semana a semana.', false, true),
  ('cp000000-0000-0000-0000-000000000015','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Tienda: nuevos suplementos disponibles',
   'Ya tenemos stock de proteína whey sabor vainilla y chocolate, creatina monohidratada y barras proteicas. Precio especial para miembros activos esta semana.', false, true),
  ('cp000000-0000-0000-0000-000000000016','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Encuesta: ¿qué clase nueva quieren?',
   'Estamos evaluando agregar una clase nueva en el horario de la tarde. ¿Cuál prefieren? Responde en los comentarios: A) Danza fitness B) Funcional al aire libre C) Meditación.', false, true),
  ('cp000000-0000-0000-0000-000000000017','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Semana de técnica: mejora tu sentadilla',
   'Esta semana todos los entrenamientos incluyen un bloque de 10 minutos dedicado a técnica de sentadilla. Aprenderás movilidad de cadera, posición de barra y profundidad óptima.', false, true),
  ('cp000000-0000-0000-0000-000000000018','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Resultados del mes: indicadores de abril',
   'Abril fue excelente: 312 check-ins en el mes, 87% de asistencia promedio entre activos, 3 nuevos RPs colectivos. ¡Gracias por su dedicación!', false, true),
  ('cp000000-0000-0000-0000-000000000019','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Reglas de cortesía en el gym',
   'Recordatorio: guardar los pesos en su lugar, traer toalla, limpiar la máquina después de usarla y no ocupar equipo solo para guardar lugar. El gym es de todos.', false, true),
  ('cp000000-0000-0000-0000-000000000020','ADMIN_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',
   'Mayo arranca fuerte — ¡nuevos retos disponibles!',
   'Ya están activos los retos de mayo en el App. Inscríbete en el Reto 30 días de asistencia o en el Reto Quema 5kg. Tienes hasta el viernes para entrar.', false, true)
ON CONFLICT (id) DO NOTHING;

-- Reacciones de los miembros activos (tipo variado para mostrar diversidad)
INSERT INTO community_reactions (post_id, user_id, org_id, type)
SELECT
  p.post_id::uuid,
  p.user_id::uuid,
  '00000000-0000-0000-0000-000000000001',
  p.rtype
FROM (VALUES
  ('cp000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','like'),
  ('cp000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','fire'),
  ('cp000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','heart'),
  ('cp000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','clap'),
  ('cp000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','like'),
  ('cp000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','clap'),
  ('cp000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000006','like'),
  ('cp000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000007','fire'),
  ('cp000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','muscle'),
  ('cp000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002','fire'),
  ('cp000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000008','muscle'),
  ('cp000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000009','fire'),
  ('cp000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000013','clap'),
  ('cp000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006','clap'),
  ('cp000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000015','heart'),
  ('cp000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000003','heart'),
  ('cp000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000011','clap'),
  ('cp000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000012','muscle'),
  ('cp000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000010','like'),
  ('cp000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000014','fire'),
  ('cp000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000011','heart'),
  ('cp000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000001','clap'),
  ('cp000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000016','like'),
  ('cp000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000017','fire'),
  ('cp000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000001','muscle'),
  ('cp000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000002','fire'),
  ('cp000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000003','clap')
) AS p(post_id, user_id, rtype)
ON CONFLICT DO NOTHING;

-- Reacciones del demo miembro
INSERT INTO community_reactions (post_id, user_id, org_id, type) VALUES
  ('cp000000-0000-0000-0000-000000000001','MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001','fire'),
  ('cp000000-0000-0000-0000-000000000004','MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001','muscle'),
  ('cp000000-0000-0000-0000-000000000020','MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001','clap')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 10 — Categorías de contenido + 15 piezas de contenido
-- UUIDs categorías: cc000000-... contenido: ct000000-...
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO content_categories (id, org_id, name, slug, color, sort_order, is_active) VALUES
  ('cc000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Nutrición',   'nutricion',  '#10B981', 1, true),
  ('cc000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Entrenamiento','entrenamiento','#FF5E14',2, true),
  ('cc000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Recuperación','recuperacion','#8B5CF6', 3, true),
  ('cc000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Tutoriales',  'tutoriales', '#06B6D4', 4, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content (id, org_id, title, description, type, body, is_published, sort_order, created_by, category_id) VALUES
  ('ct000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',
   'Guía de nutrición para ganar músculo', 'Todo lo que necesitas saber sobre macros para hipertrofia.',
   'article', 'Para ganar músculo necesitas un superávit calórico moderado (300-500 kcal) con al menos 1.6g de proteína por kg de peso corporal. Los carbohidratos son tu principal fuente de energía para el entrenamiento — no los elimines. Las grasas saludables son esenciales para la producción hormonal.',
   true, 1, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000001'),
  ('ct000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',
   'Técnica de sentadilla: tutorial completo', 'Video con análisis detallado de cada fase del movimiento.',
   'video', NULL, true, 2, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000004'),
  ('ct000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',
   'Plan de comidas semana 1', 'Menú semanal con recetas fáciles y alto contenido proteico.',
   'article', 'Lunes: Desayuno — Avena con frutas y proteína en polvo. Almuerzo — Arroz con pollo y ensalada. Cena — Salmón al horno con vegetales. Martes: Desayuno — Huevos revueltos con pan integral. Almuerzo — Pasta con carne molida. Cena — Pollo a la plancha con camote.',
   true, 3, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000001'),
  ('ct000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001',
   'Tutorial: Peso muerto sumo vs convencional', 'Diferencias biomecánicas y cuál elegir según tu morfología.',
   'video', NULL, true, 4, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000004'),
  ('ct000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001',
   'Protocolo de recuperación activa', 'Cómo maximizar la recuperación entre sesiones de entrenamiento.',
   'article', 'La recuperación activa incluye: 1) Foam rolling 10-15 min en grupos musculares trabajados. 2) Caminata de baja intensidad 20-30 min. 3) Estiramientos estáticos. 4) Baño de contraste (30 seg frío / 1 min caliente × 5). 5) Hidratación con electrolitos.',
   true, 5, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000003'),
  ('ct000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001',
   'Los 5 mejores ejercicios para espalda', 'Análisis de los movimientos más efectivos para desarrollar la espalda.',
   'article', 'Los ejercicios más efectivos para espalda son: 1) Peso muerto — activa toda la cadena posterior. 2) Dominadas — el mejor ejercicio de tracción. 3) Remo con barra — masa y grosor en la espalda media. 4) Pulldown — alternativa a dominadas para principiantes. 5) Remo con mancuerna — corrección de desequilibrios.',
   true, 6, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000002'),
  ('ct000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001',
   'Cómo dormir mejor para progresar más', 'La ciencia del sueño aplicada al rendimiento atlético.',
   'article', 'El sueño es el anabólico más poderoso y gratis. Durante las fases de sueño profundo se libera el 70% de la hormona de crecimiento diaria. Para optimizarlo: temperatura ambiente 18-20°C, oscuridad total, sin pantallas 1h antes, y horario consistente.',
   true, 7, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000003'),
  ('ct000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001',
   'Tutorial: Press de banca con barra', 'Posicionamiento, agarre y descenso controlado.',
   'video', NULL, true, 8, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000004'),
  ('ct000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001',
   'Calculadora de calorías — guía de uso', 'Cómo usar la calculadora y ajustar tus macros.',
   'article', 'Para calcular tus calorías de mantenimiento usa la fórmula de Mifflin-St Jeor. Para hombre: (10 × peso kg) + (6.25 × altura cm) − (5 × edad) + 5. Multiplica por tu factor de actividad: 1.2 sedentario, 1.375 ligero, 1.55 moderado, 1.725 activo.',
   true, 9, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000001'),
  ('ct000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001',
   'Programa de cardio HIIT — 4 semanas', 'Protocolo de intervalos de alta intensidad para quemar grasa.',
   'article', 'Semana 1-2: 20 seg trabajo / 40 seg descanso × 8 rondas. Semana 3-4: 30 seg trabajo / 30 seg descanso × 10 rondas. Ejercicios: burpees, sprints en bicicleta, saltos al cajón, mountain climbers. 3 sesiones por semana, en días no consecutivos.',
   true, 10, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000002'),
  ('ct000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001',
   'Suplementación básica: lo que funciona', 'Creatina, proteína y cafeína — evidencia científica.',
   'article', 'Los tres suplementos con más evidencia científica: 1) Creatina monohidratada (3-5g/día) — aumenta fuerza y masa muscular consistentemente. 2) Proteína whey — conveniente para cubrir requerimientos proteicos. 3) Cafeína (3-6mg/kg) — mejora rendimiento en resistencia y fuerza.',
   true, 11, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000001'),
  ('ct000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001',
   'Tutorial: Dominadas desde cero', 'Progresión para lograr tu primera dominada.',
   'video', NULL, true, 12, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000004'),
  ('ct000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001',
   'Fotos progreso: antes y después miembros', 'Transformaciones reales de miembros Iron Fit.',
   'image', NULL, true, 13, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000002'),
  ('ct000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001',
   'Mindset y motivación: cómo no abandonar', 'Estrategias psicológicas para mantener el hábito.',
   'article', 'El mayor obstáculo para el progreso físico no es la falta de conocimiento, sino la inconsistencia. Estrategias comprobadas: ancla el entrenamiento a un hábito existente (ducha, café), usa el sistema de racha visual, fija un horario inamovible 4-5 días por semana.',
   true, 14, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000002'),
  ('ct000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001',
   'Lesiones comunes en el gym — cómo prevenirlas', 'Guía de prevención para rodillas, hombros y espalda baja.',
   'article', 'Las lesiones más comunes se previenen con: calentamiento específico (no solo cardio), técnica correcta antes de aumentar peso, progresión gradual (máx 10% de carga por semana), y movilidad articular regular. Ante cualquier dolor agudo, para el ejercicio inmediatamente.',
   true, 15, 'ADMIN_UUID_HERE'::uuid, 'cc000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Asociar todo el contenido con los 3 planes (acceso universal para el demo)
INSERT INTO content_plans (content_id, plan_id, org_id)
SELECT c.id, p.id, '00000000-0000-0000-0000-000000000001'
FROM content c
CROSS JOIN membership_plans p
WHERE c.org_id = '00000000-0000-0000-0000-000000000001'
  AND p.org_id = '00000000-0000-0000-0000-000000000001'
  AND c.id LIKE 'ct000000-%'
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 11 — Inventario (12 productos) + historial de ventas
-- UUIDs productos: pp000000-... ventas: sv000000-...
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO gym_inventory_products (id, org_id, name, category, unit, cost_price, sale_price, current_stock, min_stock_alert, is_active) VALUES
  ('pp000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Proteína Whey Vainilla 2lb',   'supplement','unit',18000,28000,24,5,true),
  ('pp000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Proteína Whey Chocolate 2lb',  'supplement','unit',18000,28000,18,5,true),
  ('pp000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Creatina Monohidratada 300g',  'supplement','unit',8000, 14000,32,5,true),
  ('pp000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','BCAA Frutas Tropicales 400g',  'supplement','unit',10000,17000,15,5,true),
  ('pp000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Pre-Workout Explosivo 300g',   'supplement','unit',12000,20000,8, 5,true),
  ('pp000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Barra Proteica Chocolate',     'food_drink', 'unit',1200, 2500, 45,10,true),
  ('pp000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Agua Saborizada 600ml',        'food_drink', 'unit',400,  900,  30,10,true),
  ('pp000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Camiseta Iron Fit Negra',      'apparel',   'unit',4500, 9000, 20,3, true),
  ('pp000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Short Deportivo Hombre',       'apparel',   'unit',5000,10000,12,3, true),
  ('pp000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Top Deportivo Mujer',          'apparel',   'unit',5500,11000,10,3, true),
  ('pp000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Banda de Resistencia Kit x3', 'equipment', 'unit',3500, 7000, 7, 3, true),
  ('pp000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Rodillera de Neopreno Par',   'equipment', 'unit',4000, 8000, 4, 3, true)
ON CONFLICT (id) DO NOTHING;

-- Historial de ventas (3 meses, ~20 ventas para mostrar ingresos por ventas)
INSERT INTO gym_sales (id, org_id, sold_by, member_id, payment_method, total_amount, created_at) VALUES
  ('sv000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000001','sinpe', 56000, NOW()-interval '85 days'),
  ('sv000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000005','cash',  28000, NOW()-interval '80 days'),
  ('sv000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000011','sinpe', 14000, NOW()-interval '75 days'),
  ('sv000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000003','cash',   7000, NOW()-interval '72 days'),
  ('sv000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000007','sinpe', 20000, NOW()-interval '68 days'),
  ('sv000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000002','cash',  35500, NOW()-interval '60 days'),
  ('sv000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,NULL,                                  'cash',   2700, NOW()-interval '55 days'),
  ('sv000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000009','sinpe', 28000, NOW()-interval '50 days'),
  ('sv000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000014','cash',  14000, NOW()-interval '45 days'),
  ('sv000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000016','sinpe', 30500, NOW()-interval '40 days'),
  ('sv000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000018','cash',   9000, NOW()-interval '35 days'),
  ('sv000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000020','sinpe', 20000, NOW()-interval '30 days'),
  ('sv000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000004','cash',  16000, NOW()-interval '25 days'),
  ('sv000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000008','sinpe', 45000, NOW()-interval '22 days'),
  ('sv000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,NULL,                                  'cash',   5400, NOW()-interval '18 days'),
  ('sv000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000012','sinpe', 28000, NOW()-interval '14 days'),
  ('sv000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000006','cash',   7000, NOW()-interval '10 days'),
  ('sv000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000019','sinpe', 37000, NOW()-interval '7 days'),
  ('sv000000-0000-0000-0000-000000000019','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'a0000000-0000-0000-0000-000000000022','cash',  11000, NOW()-interval '4 days'),
  ('sv000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','ADMIN_UUID_HERE'::uuid,'MEMBER_UUID_HERE'::uuid,              'sinpe', 42000, NOW()-interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Ítems de las ventas (muestra variedad de productos)
INSERT INTO gym_sale_items (sale_id, product_id, quantity, unit_price) VALUES
  ('sv000000-0000-0000-0000-000000000001','pp000000-0000-0000-0000-000000000001',1,28000),
  ('sv000000-0000-0000-0000-000000000001','pp000000-0000-0000-0000-000000000006',2, 2500),
  ('sv000000-0000-0000-0000-000000000002','pp000000-0000-0000-0000-000000000002',1,28000),
  ('sv000000-0000-0000-0000-000000000003','pp000000-0000-0000-0000-000000000003',1,14000),
  ('sv000000-0000-0000-0000-000000000004','pp000000-0000-0000-0000-000000000007',2,  900),
  ('sv000000-0000-0000-0000-000000000004','pp000000-0000-0000-0000-000000000006',2, 2500),
  ('sv000000-0000-0000-0000-000000000005','pp000000-0000-0000-0000-000000000005',1,20000),
  ('sv000000-0000-0000-0000-000000000006','pp000000-0000-0000-0000-000000000001',1,28000),
  ('sv000000-0000-0000-0000-000000000006','pp000000-0000-0000-0000-000000000003',1, 7500),
  ('sv000000-0000-0000-0000-000000000007','pp000000-0000-0000-0000-000000000007',3,  900),
  ('sv000000-0000-0000-0000-000000000008','pp000000-0000-0000-0000-000000000002',1,28000),
  ('sv000000-0000-0000-0000-000000000009','pp000000-0000-0000-0000-000000000003',1,14000),
  ('sv000000-0000-0000-0000-000000000010','pp000000-0000-0000-0000-000000000008',1, 9000),
  ('sv000000-0000-0000-0000-000000000010','pp000000-0000-0000-0000-000000000009',1,10000),
  ('sv000000-0000-0000-0000-000000000010','pp000000-0000-0000-0000-000000000006',2, 2500),
  ('sv000000-0000-0000-0000-000000000010','pp000000-0000-0000-0000-000000000007',1,  900),
  ('sv000000-0000-0000-0000-000000000011','pp000000-0000-0000-0000-000000000008',1, 9000),
  ('sv000000-0000-0000-0000-000000000012','pp000000-0000-0000-0000-000000000005',1,20000),
  ('sv000000-0000-0000-0000-000000000013','pp000000-0000-0000-0000-000000000004',1,17000),
  ('sv000000-0000-0000-0000-000000000014','pp000000-0000-0000-0000-000000000001',1,28000),
  ('sv000000-0000-0000-0000-000000000014','pp000000-0000-0000-0000-000000000010',1,11000),
  ('sv000000-0000-0000-0000-000000000014','pp000000-0000-0000-0000-000000000006',2, 2500),
  ('sv000000-0000-0000-0000-000000000015','pp000000-0000-0000-0000-000000000007',3,  900),
  ('sv000000-0000-0000-0000-000000000015','pp000000-0000-0000-0000-000000000006',1, 2500),
  ('sv000000-0000-0000-0000-000000000016','pp000000-0000-0000-0000-000000000002',1,28000),
  ('sv000000-0000-0000-0000-000000000017','pp000000-0000-0000-0000-000000000007',4,  900),
  ('sv000000-0000-0000-0000-000000000018','pp000000-0000-0000-0000-000000000001',1,28000),
  ('sv000000-0000-0000-0000-000000000018','pp000000-0000-0000-0000-000000000011',1, 7000),
  ('sv000000-0000-0000-0000-000000000019','pp000000-0000-0000-0000-000000000006',2, 2500),
  ('sv000000-0000-0000-0000-000000000019','pp000000-0000-0000-0000-000000000007',2,  900),
  ('sv000000-0000-0000-0000-000000000020','pp000000-0000-0000-0000-000000000001',1,28000),
  ('sv000000-0000-0000-0000-000000000020','pp000000-0000-0000-0000-000000000003',1,14000)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 12 — Perfil de salud y snapshots del demo miembro
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO gym_health_profiles (user_id, org_id, height_cm, weight_kg, body_fat_pct,
  muscle_mass_kg, bmi, fitness_level, goals, measured_at)
VALUES (
  'MEMBER_UUID_HERE'::uuid,
  '00000000-0000-0000-0000-000000000001',
  175.0, 82.5, 18.2, 58.4, 26.9,
  'intermediate',
  ARRAY['Ganar músculo', 'Mejorar resistencia', 'Bajar grasa corporal'],
  NOW() - interval '7 days'
) ON CONFLICT (user_id) DO UPDATE SET
  weight_kg = 82.5, body_fat_pct = 18.2, updated_at = NOW();

-- 4 snapshots de progreso (cada mes, mostrando evolución positiva)
INSERT INTO gym_health_snapshots (user_id, org_id, weight_kg, body_fat_pct, muscle_mass_kg, notes, recorded_at)
VALUES
  ('MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',88.0,23.5,53.2,'Medición inicial al ingresar al gym',NOW()-interval '90 days'),
  ('MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',86.2,21.8,54.8,'Primer mes: -1.8kg de grasa, +1.6kg de músculo',NOW()-interval '60 days'),
  ('MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',84.1,20.1,56.5,'Segundo mes: buena evolución en composición corporal',NOW()-interval '30 days'),
  ('MEMBER_UUID_HERE'::uuid,'00000000-0000-0000-0000-000000000001',82.5,18.2,58.4,'Tercer mes: objetivo casi alcanzado. Progreso excelente.',NOW()-interval '7 days')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 13 — Gastos operativos (3 meses de historial financiero)
-- created_by referencia profiles.id → usamos ADMIN_UUID_HERE
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO gym_expenses (org_id, amount, category, description, expense_date, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001',350000,'renta',       'Alquiler local — febrero 2026',                    '2026-02-01','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001',480000,'salarios',    'Pago instructores y recepcionista — febrero 2026', '2026-02-28','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 28000,'servicios',   'Agua, luz e internet — febrero 2026',              '2026-02-28','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 15000,'marketing',   'Publicidad en redes sociales — febrero 2026',      '2026-02-15','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 42000,'equipamiento','Reparación cinta cardio y pesas',                  '2026-02-20','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001',350000,'renta',       'Alquiler local — marzo 2026',                      '2026-03-01','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001',480000,'salarios',    'Pago instructores y recepcionista — marzo 2026',   '2026-03-31','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 31000,'servicios',   'Agua, luz e internet — marzo 2026',                '2026-03-31','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 12000,'marketing',   'Impresión de flyers para reto de abril',           '2026-03-25','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001',350000,'renta',       'Alquiler local — abril 2026',                      '2026-04-01','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001',480000,'salarios',    'Pago instructores y recepcionista — abril 2026',   '2026-04-30','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 27500,'servicios',   'Agua, luz e internet — abril 2026',                '2026-04-30','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 89000,'equipamiento','Compra de barra olímpica y discos bumper',         '2026-04-10','ADMIN_UUID_HERE'::uuid),
  ('00000000-0000-0000-0000-000000000001', 18000,'otro',        'Material de limpieza y botiquín',                  '2026-04-15','ADMIN_UUID_HERE'::uuid)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 14 — Función de reset para volver a estado inicial del demo
-- Trunca todos los datos demo manteniendo intactos org y planes base.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION truncate_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Eliminar datos dependientes primero (FK order)
  DELETE FROM gym_sale_items       WHERE sale_id IN (SELECT id FROM gym_sales WHERE org_id='00000000-0000-0000-0000-000000000001');
  DELETE FROM gym_sales            WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_inventory_products WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'pp000000%';
  DELETE FROM gym_health_snapshots WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_health_profiles  WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_challenge_participants WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_challenges       WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'ch000000%';
  DELETE FROM gym_member_routines  WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_routine_exercises WHERE day_id IN (SELECT id FROM gym_routine_days WHERE routine_id LIKE 'rt000000%');
  DELETE FROM gym_routine_days     WHERE routine_id LIKE 'rt000000%';
  DELETE FROM gym_routines         WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'rt000000%';
  DELETE FROM gym_exercises        WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'ex000000%';
  DELETE FROM gym_class_bookings   WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_scheduled_classes WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM gym_class_types      WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'kt000000%';
  DELETE FROM gym_attendance_logs  WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM community_reactions  WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM community_posts      WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'cp000000%';
  DELETE FROM content_plans        WHERE content_id IN (SELECT id FROM content WHERE org_id='00000000-0000-0000-0000-000000000001' AND id LIKE 'ct000000%');
  DELETE FROM content              WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'ct000000%';
  DELETE FROM content_categories   WHERE org_id = '00000000-0000-0000-0000-000000000001' AND id LIKE 'cc000000%';
  DELETE FROM gym_expenses         WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM payment_proofs       WHERE org_id = '00000000-0000-0000-0000-000000000001';
  DELETE FROM subscriptions        WHERE org_id = '00000000-0000-0000-0000-000000000001';
  -- Eliminar los 30 miembros demo (no las 3 cuentas demo principales)
  DELETE FROM auth.users           WHERE id LIKE 'a0000000-0000-0000-0000-%';
  RAISE NOTICE 'Demo data truncated. Re-run demo-seed.sql to restore.';
END;
$$;

COMMIT;
