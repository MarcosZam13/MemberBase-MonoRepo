// page.tsx — Dashboard del portal con estado de membresía, contenido reciente y acciones rápidas

import Link from "next/link";
import { ArrowRight, Clock, BookOpen, CreditCard, FileText, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContentCard } from "@/components/shared/ContentCard";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserSubscription } from "@/actions/payment.actions";
import { getContentForUser } from "@/actions/content.actions";
import { formatDate, getDaysRemaining } from "@/lib/utils";
import type { SubscriptionStatus, ContentType } from "@/types/database";

export default async function PortalDashboardPage() {
  const [profile, subscription, contentItems] = await Promise.all([
    getCurrentUser(),
    getUserSubscription(),
    getContentForUser(),
  ]);

  const status = (subscription?.status ?? "none") as SubscriptionStatus | "none";
  const daysRemaining = getDaysRemaining(subscription?.expires_at ?? null);
  const totalDays = (subscription?.plan as { duration_days?: number } | undefined)?.duration_days ?? 30;
  const progressPercent = subscription?.expires_at
    ? Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100))
    : 0;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground mb-8">
        Hola, {profile?.full_name?.split(" ")[0] ?? "bienvenido"} 👋
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de estado de membresía */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Estado de Membresía</h2>
                    <StatusBadge status={status} />
                  </div>
                </div>

                {status === "active" && subscription?.plan && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {(subscription.plan as { name: string }).name}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {daysRemaining} día{daysRemaining !== 1 ? "s" : ""} restante{daysRemaining !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Vence el {formatDate(subscription.expires_at)}
                    </p>
                  </div>
                )}

                {status === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    Tu comprobante de pago está siendo revisado. Te notificaremos pronto.
                  </p>
                )}

                {status === "rejected" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Tu comprobante fue rechazado. Por favor sube uno nuevo.
                    </p>
                    <Button asChild size="sm">
                      <Link href="/portal/membership">Subir nuevo comprobante</Link>
                    </Button>
                  </div>
                )}

                {(status === "none" || status === "expired" || status === "cancelled") && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {status === "expired"
                        ? "Tu membresía venció. Renuévala para seguir accediendo al contenido."
                        : "Elige un plan para comenzar a disfrutar del contenido exclusivo."}
                    </p>
                    <Button asChild size="sm">
                      <Link href="/portal/plans">Ver planes disponibles</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contenido reciente */}
          {status === "active" && contentItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Contenido reciente
                </h2>
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link href="/portal/content">
                    Ver todo <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentItems.slice(0, 4).map((item) => (
                  <ContentCard
                    key={item.id}
                    id={item.id}
                    type={item.type as ContentType}
                    category={(item.category as { name: string } | null)?.name ?? ""}
                    categoryColor={(item.category as { color: string } | null)?.color ?? "#6366f1"}
                    title={item.title}
                    description={item.description ?? ""}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna lateral — 1/3: acciones rápidas */}
        <div>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Acciones rápidas</h2>
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link href="/portal/plans">
                    <CreditCard className="w-4 h-4" />
                    Ver planes
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link href="/portal/membership">
                    <FileText className="w-4 h-4" />
                    Subir comprobante
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link href="/portal/community">
                    <Users className="w-4 h-4" />
                    Ver comunidad
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
