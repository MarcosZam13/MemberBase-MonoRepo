// page.tsx — Dashboard del panel de administración con KPIs en tiempo real

import { Users, DollarSign, CreditCard, TrendingUp, FileText, AlertCircle } from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAdminStats } from "@/actions/admin.actions";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu plataforma</p>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          icon={Users}
          iconBg="bg-[#2563EB]/10"
          iconColor="text-[#2563EB]"
          value={stats.activeMembers}
          label="Miembros activos"
          description="Con membresía vigente"
          linkHref="/admin/members"
        />
        <KPICard
          icon={DollarSign}
          iconBg="bg-[#16A34A]/10"
          iconColor="text-[#16A34A]"
          value={formatPrice(stats.monthlyRevenue, "CRC")}
          label="Ingresos del mes"
          description="Últimos 30 días"
          linkHref="/admin/payments"
        />
        <KPICard
          icon={CreditCard}
          iconBg="bg-[#D97706]/10"
          iconColor="text-[#D97706]"
          value={stats.pendingPayments}
          label="Pagos pendientes"
          description="Requieren revisión"
          linkHref="/admin/payments"
        />
        <KPICard
          icon={TrendingUp}
          iconBg="bg-[#8B5CF6]/10"
          iconColor="text-[#8B5CF6]"
          value={stats.newMembersLast30Days}
          label="Nuevos miembros"
          description="Últimos 30 días"
          linkHref="/admin/members"
        />
        <KPICard
          icon={FileText}
          iconBg="bg-[#F97316]/10"
          iconColor="text-[#F97316]"
          value={stats.publishedContent}
          label="Contenido publicado"
          description="Artículos y recursos"
          linkHref="/admin/content"
        />
      </div>

      {/* Banner de pagos pendientes */}
      {stats.pendingPayments > 0 && (
        <AlertBannerServer
          count={stats.pendingPayments}
        />
      )}

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
            <Link href="/admin/members">
              <Users className="w-6 h-6 text-[#2563EB]" />
              <span>Ver miembros</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
            <Link href="/admin/payments">
              <DollarSign className="w-6 h-6 text-[#16A34A]" />
              <span>Revisar pagos</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
            <Link href="/admin/plans">
              <CreditCard className="w-6 h-6 text-[#D97706]" />
              <span>Gestionar planes</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
            <Link href="/admin/content">
              <FileText className="w-6 h-6 text-[#F97316]" />
              <span>Subir contenido</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Componente interno para el banner — necesita ser Server Component para no romper el async page
function AlertBannerServer({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-[#D97706] bg-[#D97706]/5 px-4 py-3">
      <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" />
      <p className="text-sm text-foreground flex-1">
        Tienes{" "}
        <span className="font-bold">{count}</span>{" "}
        comprobante{count > 1 ? "s" : ""} de pago pendiente{count > 1 ? "s" : ""} de revisión.
      </p>
      <Button asChild size="sm" variant="outline" className="shrink-0 border-[#D97706]/30 text-[#D97706] hover:bg-[#D97706]/10">
        <Link href="/admin/payments">Revisar pagos</Link>
      </Button>
    </div>
  );
}
