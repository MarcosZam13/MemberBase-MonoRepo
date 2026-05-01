// audit.ts — Helper fire-and-forget para registrar accesos no autorizados y operaciones sensibles

import { createAdminClient } from "@/lib/supabase/server";

interface AuditParams {
  userId: string | null;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}

// Registra un intento de acceso no autorizado en la tabla security_audit_log.
// Usa createAdminClient (service_role) para saltarse la RLS — solo service_role puede insertar.
// Fire-and-forget: envuelto en void para no bloquear el response.
export function logUnauthorizedAccess(params: AuditParams): void {
  void (async () => {
    try {
      const adminClient = createAdminClient();
      await adminClient.from("security_audit_log").insert({
        user_id: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        details: params.details ?? null,
      });
    } catch (err) {
      console.error("[audit] Error al registrar acceso no autorizado:", err);
    }
  })();
}
