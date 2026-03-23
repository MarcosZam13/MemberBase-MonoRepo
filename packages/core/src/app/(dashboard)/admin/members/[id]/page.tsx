// page.tsx — Perfil detallado de un miembro individual (vista admin)

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberById } from "@/actions/admin.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/database";

const STATUS_CONFIG: Record<SubscriptionStatus | "none", { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activo",        variant: "default" },
  pending:   { label: "Pendiente",     variant: "secondary" },
  expired:   { label: "Expirado",      variant: "destructive" },
  cancelled: { label: "Cancelado",     variant: "outline" },
  rejected:  { label: "Rechazado",     variant: "destructive" },
  none:      { label: "Sin membresía", variant: "outline" },
};

interface MemberDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params;
  const member = await getMemberById(id);

  if (!member) notFound();

  const subscriptions = member.active_subscription as unknown as Array<{
    status: SubscriptionStatus;
    starts_at: string | null;
    expires_at: string | null;
    plan?: { name: string; price: number; currency: string; duration_days: number };
  }> | undefined;
  const sub = Array.isArray(subscriptions) ? subscriptions[0] : undefined;
  const status = (sub?.status ?? "none") as SubscriptionStatus | "none";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Navegación */}
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin/members">
          <ArrowLeft className="w-4 h-4" />
          Volver a miembros
        </Link>
      </Button>

      {/* Header del perfil */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{member.full_name ?? "Sin nombre"}</h1>
          <p className="text-muted-foreground text-sm">ID: {member.id}</p>
        </div>
        <Badge variant={STATUS_CONFIG[status].variant}>{STATUS_CONFIG[status].label}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Información de contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              {member.email}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              {member.phone ?? "Sin teléfono"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              Miembro desde {formatDate(member.created_at)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 shrink-0" />
              Rol: {member.role}
            </div>
          </CardContent>
        </Card>

        {/* Membresía actual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membresía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sub ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{sub.plan?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio</span>
                  <span>{sub.plan ? formatPrice(sub.plan.price, sub.plan.currency) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inicio</span>
                  <span>{formatDate(sub.starts_at ?? null)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span>{formatDate(sub.expires_at ?? null)}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Sin membresía activa</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TODO: Agregar módulos de métricas físicas (peso, altura, IMC) — módulo futuro */}
      {/* TODO: Agregar módulo de rutinas asignadas — módulo futuro */}
    </div>
  );
}
