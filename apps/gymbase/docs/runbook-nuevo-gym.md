# Runbook — Setup de Gym Nuevo en GymBase

Guía paso a paso para poner en producción un nuevo gym.
Tiempo estimado: 30-45 minutos para el primer setup.

---

## 1. Variables de entorno

Crear `.env.local` con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
GYMBASE_ORG_ID=<uuid_del_gym>
NEXT_PUBLIC_SITE_URL=https://<dominio-del-gym>
```

---

## 2. Aplicar migraciones

```bash
# Desde apps/gymbase/
supabase db push
```

Las migraciones se aplican en orden numérico. Incluyen schema, RLS, funciones y triggers.

---

## 3. Insertar registro del gym

Ejecutar en el SQL editor de Supabase:

```sql
INSERT INTO organizations (id, name, gym_name, slug, domain, sinpe_number, sinpe_name, max_capacity)
VALUES (
  '<GYMBASE_ORG_ID>',
  'Nombre del Gym',
  'Nombre del Gym',
  'slug-del-gym',         -- ej: 'ironfit' → accesible en ironfit.gymbase.app
  'app.dominiodelgym.com', -- dominio custom (null si solo se usa el subdominio)
  '8888-XXXX',
  'Nombre Titular SINPE',
  50
);
```

El `slug` define el subdominio en `*.gymbase.app`. El `domain` es opcional y permite usar un dominio propio.

---

## 4. Registrar el Custom Access Token Hook (Auth Hook)

> Este paso inyecta `org_id` y `role` en el JWT de cada usuario, habilitando `get_user_org_id_from_jwt()`.

1. Ir a **Supabase Dashboard → Authentication → Hooks**
2. En la sección **Custom Access Token** hacer clic en **Add hook**
3. Seleccionar tipo: **PostgreSQL Function**
4. Seleccionar función: `public.custom_access_token_hook`
5. Guardar

**Verificación:** Iniciar sesión con cualquier usuario → copiar el JWT desde el localStorage (`sb-<project>-auth-token`) → pegarlo en [jwt.io](https://jwt.io) → verificar que `payload.app_metadata.org_id` existe.

---

## 5. Crear el primer usuario owner

```sql
-- Paso 1: crear el usuario en auth.users via Supabase Dashboard (Authentication > Users > Invite user)
-- Paso 2: promover a owner en profiles
UPDATE profiles SET role = 'owner' WHERE email = 'owner@gymejemplo.com';
```

---

## 6. Configuración de Google OAuth

> Este paso es opcional. Si el gym no quiere ofrecer login con Google, omitirlo.
> El botón de Google aparece en la página de login para todos los miembros.

### 5.1 Google Cloud Console

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear un proyecto o seleccionar uno existente
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. En **Authorized redirect URIs** agregar:
   - `https://<PROJECT_ID>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` *(solo para desarrollo)*
6. Copiar el **Client ID** y **Client Secret**

### 5.2 Supabase Dashboard — habilitar Google provider

1. **Authentication → Providers → Google**
2. Activar el toggle
3. Pegar **Client ID** y **Client Secret**
4. Guardar

### 5.3 Supabase Dashboard — configurar URLs de redirección

1. **Authentication → URL Configuration**
2. **Site URL**: `https://<dominio-del-gym>`
3. En **Redirect URLs** agregar:
   - `https://<dominio-del-gym>/auth/callback`
   - `http://localhost:3000/auth/callback` *(solo para desarrollo)*

### 5.4 Verificación

- **Prueba 1:** Entrar al portal con una cuenta Gmail nueva → debe crear un perfil con `role = 'member'` y redirigir a `/portal/membership` para elegir plan.
- **Prueba 2:** Miembro existente (creado por admin) entra con Google usando el mismo email → llega al portal sin duplicar cuenta. En `auth.identities` debe haber dos registros para ese usuario.
- **Prueba 3:** Admin intenta entrar con Google → recibe error `Los administradores deben iniciar sesión con email y contraseña.`

---

## 7. Configurar `theme.config.ts`

Ajustar los valores del gym en `apps/gymbase/src/lib/theme.ts` (o `theme.config.ts`):

- `brand.name` — nombre del gym
- `brand.tagline` — slogan
- `payment.sinpe_number` — número SINPE
- `payment.sinpe_name` — nombre del titular
- `features.*` — activar/desactivar módulos según el plan contratado

---

## 8. Deploy en Vercel

```bash
vercel --prod
```

Configurar en Vercel las mismas variables de entorno del paso 1.

---

## Checklist final antes de abrir al público

- [ ] Migraciones aplicadas sin errores
- [ ] Registro del gym insertado en `organizations` con `slug` y `domain` correctos
- [ ] Auth Hook `custom_access_token_hook` registrado en Supabase Dashboard
- [ ] JWT verificado en jwt.io — contiene `app_metadata.org_id`
- [ ] Usuario owner creado y con `role = 'owner'`
- [ ] Variables de entorno en producción
- [ ] Google OAuth configurado (si aplica)
- [ ] `theme.config.ts` con datos del gym
- [ ] Prueba de login email/password (miembro, admin, owner)
- [ ] Prueba de login con Google (si aplica)
- [ ] QR de check-in funcionando en producción
- [ ] Prueba de subida de comprobante de pago
