// server.ts — Cliente de Supabase para Server Components y Server Actions
// Re-exporta de core + agrega helpers para org_id y cliente de admin con service role

export { createClient, getCurrentUser } from "@core/lib/supabase/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service_role_key para operaciones admin (auth.admin.*)
// Solo usar en Server Actions con verificación de rol previa — nunca exponer al cliente
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurado. Agrégalo al archivo .env.local");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import { headers } from "next/headers";

// Obtiene el org_id del gym que corresponde al request actual.
// En multi-tenant (Fase 2): lee el header x-org-id inyectado por el middleware.
// Fallback para entornos sin middleware configurado: variable de entorno GYMBASE_ORG_ID.
export async function getOrgId(): Promise<string> {
  const headersList = await headers();
  const orgId = headersList.get("x-org-id");

  if (orgId) return orgId;

  // Fallback: variable de entorno (dev local o entornos sin middleware)
  const envOrgId = process.env.GYMBASE_ORG_ID;
  if (envOrgId) return envOrgId;

  throw new Error(
    "No se pudo determinar el org_id. Verifica la configuración del middleware y GYMBASE_ORG_ID."
  );
}
