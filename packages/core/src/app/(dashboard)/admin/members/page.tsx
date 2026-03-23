// page.tsx — Listado de miembros del sistema con su estado de membresía

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMembers } from "@/actions/admin.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/database";

// Configuración visual de los badges de estado de suscripción
const STATUS_CONFIG: Record<SubscriptionStatus | "none", { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activo",        variant: "default" },
  pending:   { label: "Pendiente",     variant: "secondary" },
  expired:   { label: "Expirado",      variant: "destructive" },
  cancelled: { label: "Cancelado",     variant: "outline" },
  rejected:  { label: "Rechazado",     variant: "destructive" },
  none:      { label: "Sin membresía", variant: "outline" },
};

export default async function MembersPage() {
  const members = await getMembers();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Miembros</h1>
        <p className="text-muted-foreground">
          {members.length} miembro{members.length !== 1 ? "s" : ""} registrado{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Plan actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Miembro desde</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay miembros registrados aún
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                // Obtener la suscripción más reciente (Supabase retorna el join como array)
                const subscriptions = member.active_subscription as unknown as Array<{
                  status: SubscriptionStatus;
                  expires_at: string | null;
                  plan?: { name: string; price: number; currency: string };
                }> | undefined;
                const sub = Array.isArray(subscriptions) ? subscriptions[0] : undefined;
                const status = (sub?.status ?? "none") as SubscriptionStatus | "none";
                const statusConfig = STATUS_CONFIG[status];

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {member.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      {sub?.plan ? (
                        <span>
                          {sub.plan.name}{" "}
                          <span className="text-muted-foreground text-xs">
                            ({formatPrice(sub.plan.price, sub.plan.currency)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(sub?.expires_at ?? null)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/members/${member.id}`}>Ver perfil</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
