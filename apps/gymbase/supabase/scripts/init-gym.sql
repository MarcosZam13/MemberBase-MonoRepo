-- init-gym.sql — Script para registrar un gym nuevo en la plataforma GymBase.
-- Uso: psql $DATABASE_URL -f init-gym.sql -v GYM_NAME="Iron Fit" -v GYM_SUBDOMAIN="ironfit" ...
--
-- Variables a definir antes de correr (con -v en psql o editando manualmente):
--   GYM_NAME         → Nombre del gym,      ej: 'Iron Fit'
--   GYM_SUBDOMAIN    → Subdominio,          ej: 'ironfit'         → ironfit.gymbase.app
--   GYM_DOMAIN       → Dominio custom (opcional), ej: 'app.ironfit.com'  (dejar vacío si no aplica)
--   GYM_TIMEZONE     → Zona horaria,        ej: 'America/Costa_Rica'
--   GYM_CURRENCY     → Moneda,             ej: 'CRC'
--   GYM_CAPACITY     → Capacidad máxima,   ej: 50
--   PRIMARY_COLOR    → Color principal hex, ej: '#FF5E14'
--   DESIGN_PRESET    → 'bold' | 'modern' | 'minimal' | 'classic'
--
-- IMPORTANTE: El paso de crear el usuario owner NO se puede hacer en SQL puro
-- (requiere la Supabase Admin API). Ver comentario en el Paso 2 más abajo.

BEGIN;

-- ─── Paso 1: Crear la organización ───────────────────────────────────────────

INSERT INTO organizations (name, subdomain, domain, config)
VALUES (
  :'GYM_NAME',
  :'GYM_SUBDOMAIN',
  NULLIF(:'GYM_DOMAIN', ''),
  jsonb_build_object(
    'colors', jsonb_build_object(
      'primary',    :'PRIMARY_COLOR',
      'background', '#0A0A0A',
      'surface',    '#111111',
      'border',     '#1E1E1E',
      'text',       '#F5F5F5',
      'textMuted',  '#737373'
    ),
    'design', jsonb_build_object(
      'preset',      :'DESIGN_PRESET',
      'cardRadius',  '14px',
      'font',        'dm-sans',
      'headingFont', 'barlow-condensed',
      'shadow',      'none'
    ),
    'media', jsonb_build_object(
      'logoUrl',       null,
      'portalBgImage', null,
      'faviconUrl',    null
    ),
    'features', jsonb_build_object(
      'community',          true,
      'content',            true,
      'gym_qr_checkin',     true,
      'gym_health_metrics', true,
      'gym_routines',       true,
      'gym_progress',       true,
      'gym_calendar',       true,
      'gym_challenges',     true,
      'gym_marketplace',    false
    ),
    'gym', jsonb_build_object(
      'name',        :'GYM_NAME',
      'timezone',    :'GYM_TIMEZONE',
      'currency',    :'GYM_CURRENCY',
      'maxCapacity', :'GYM_CAPACITY'::INTEGER
    )
  )
)
RETURNING id AS org_id, name, subdomain;

-- ─── Paso 2: Crear usuario owner ─────────────────────────────────────────────
-- Este paso REQUIERE la Admin API de Supabase — no se puede hacer con SQL puro.
-- Opciones:
--   A) Supabase Dashboard → Authentication → Users → "Invite user"
--   B) cURL con service_role_key:
--
--   curl -X POST https://TU_PROJECT_REF.supabase.co/auth/v1/admin/users \
--     -H "apikey: TU_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer TU_SERVICE_ROLE_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"email":"owner@gymname.com","password":"ChangeMe123!","user_metadata":{"full_name":"Nombre Owner"}}'
--
-- Luego copiar el UUID del usuario creado y correr el Paso 3.

-- ─── Paso 3: Promover al owner ────────────────────────────────────────────────
-- (Reemplazar 'OWNER_UUID' con el UUID real del usuario creado en el Paso 2)
-- (Reemplazar 'ORG_UUID' con el id retornado en el Paso 1)
--
-- UPDATE profiles
-- SET role = 'owner', org_id = 'ORG_UUID'
-- WHERE id = 'OWNER_UUID';

COMMIT;

-- ─── Post-setup ───────────────────────────────────────────────────────────────
-- 1. Configurar subdominio en Vercel:
--      vercel domains add SUBDOMAIN.gymbase.app DEPLOYMENT_ID
-- 2. O si es dominio custom:
--      vercel domains add app.gymname.com DEPLOYMENT_ID
--      Agregar registro CNAME en DNS del cliente apuntando a cname.vercel-dns.com
-- 3. Agregar el dominio/subdominio en Supabase → Authentication → URL Configuration
--    (redirect URLs para OAuth si aplica)
-- 4. Verificar el setup navegando al subdominio del gym
-- Ver runbook completo en: GymBaseObsidian/GymBase/Deploy/Runbook-Nuevo-Gym.md
