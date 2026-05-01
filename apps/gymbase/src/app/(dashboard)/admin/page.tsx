// page.tsx — Dashboard admin de GymBase: KPIs oscuros + tabla de pagos + widgets gym

import {
  Users,
  AlertTriangle,
  TrendingUp,
  FileText,
  AlertCircle,
  ScanLine,
  Dumbbell,
  CalendarDays,
  Trophy,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Activity,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { getAdminStats } from "@core/actions/admin.actions";
import { getOccupancy, getAttendanceLogs, getWeeklyAttendanceTrend } from "@/actions/checkin.actions";
import { getExpiringMembershipsCount } from "@/actions/member.actions";
import { getWeekSchedule } from "@/actions/calendar.actions";
import { getChallenges } from "@/actions/challenge.actions";
import { themeConfig } from "@/lib/theme";

export default async function AdminDashboardPage(): Promise<React.ReactNode> {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const [stats, occupancy, todayAttendance, todayClasses, challenges, expiringCount, weeklyTrend] = await Promise.all([
    getAdminStats(),
    themeConfig.features.gym_qr_checkin ? getOccupancy()                                                    : Promise.resolve(null),
    themeConfig.features.gym_qr_checkin ? getAttendanceLogs({ today: true })                                : Promise.resolve([]),
    themeConfig.features.gym_calendar   ? getWeekSchedule(startOfDay.toISOString(), endOfDay.toISOString()) : Promise.resolve([]),
    themeConfig.features.gym_challenges ? getChallenges()                                                    : Promise.resolve([]),
    getExpiringMembershipsCount(),
    themeConfig.features.gym_qr_checkin ? getWeeklyAttendanceTrend()                                        : Promise.resolve([]),
  ]);

  const activeChallenges = challenges.filter(
    (c) => new Date(c.starts_at) <= now && new Date(c.ends_at) >= now
  );

  const upcomingToday = todayClasses.filter(
    (c) => !c.is_cancelled && new Date(c.starts_at) > now
  );

  // Porcentaje de ocupación con color según nivel
  const occupancyColor =
    occupancy?.level === "full"     ? "#EF4444" :
    occupancy?.level === "busy"     ? "#FACC15" :
    occupancy?.level === "moderate" ? "#22C55E" :
                                      "#38BDF8";

  return (
    <div className="p-8 space-y-8" style={{ minHeight: "100vh" }}>

      {/* ── Encabezado ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
            {now.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Link rápido al escáner QR */}
        {themeConfig.features.gym_qr_checkin && (
          <Link
            href="/qr/scan"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              backgroundColor: "#FF5E14",
              color: "#FFFFFF",
            }}
          >
            <ScanLine className="w-4 h-4" />
            Escanear QR
          </Link>
        )}
      </div>

      {/* ── Banner de pagos pendientes ─────────────────────────────────────────── */}
      {stats.pendingPayments > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "rgba(250, 204, 21, 0.08)",
            border: "1px solid rgba(250, 204, 21, 0.2)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#FACC15" }} />
          <p className="text-sm flex-1" style={{ color: "var(--gym-text-primary)" }}>
            Tienes{" "}
            <span className="font-bold" style={{ color: "#FACC15" }}>
              {stats.pendingPayments}
            </span>{" "}
            comprobante{stats.pendingPayments > 1 ? "s" : ""} de pago pendiente{stats.pendingPayments > 1 ? "s" : ""} de revisión.
          </p>
          <Link
            href="/admin/payments"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: "rgba(250, 204, 21, 0.15)",
              color: "#FACC15",
              border: "1px solid rgba(250, 204, 21, 0.3)",
            }}
          >
            Revisar
          </Link>
        </div>
      )}

      {/* ── KPIs de membresía ──────────────────────────────────────────────────── */}
      <section>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--gym-text-ghost)" }}
        >
          Membresías
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            iconColor="#38BDF8"
            gradientClass="stat-gradient-blue"
            value={stats.activeMembers}
            label="Miembros activos"
            sub="Con membresía vigente"
            href="/admin/members"
          />
          <StatCard
            icon={AlertTriangle}
            iconColor={expiringCount === 0 ? "#555" : expiringCount <= 3 ? "#FACC15" : "#EF4444"}
            gradientClass="stat-gradient-yellow"
            value={expiringCount}
            label="Por vencer"
            sub="Próximos 7 días"
            href="/admin/members?status=expiring"
          />
          <StatCard
            icon={TrendingUp}
            iconColor="#FF5E14"
            gradientClass="stat-gradient-orange"
            value={stats.newMembersLast30Days}
            label="Nuevos miembros"
            sub="Últimos 30 días"
            href="/admin/members"
          />
          <StatCard
            icon={FileText}
            iconColor="#A855F7"
            gradientClass="stat-gradient-purple"
            value={stats.publishedContent}
            label="Contenido"
            sub="Artículos publicados"
            href="/admin/content"
          />
        </div>
      </section>

      {/* ── KPIs de gym (hoy) ─────────────────────────────────────────────────── */}
      {(themeConfig.features.gym_qr_checkin || themeConfig.features.gym_calendar || themeConfig.features.gym_challenges) && (
        <section>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--gym-text-ghost)" }}
          >
            Gym — hoy
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Ocupación actual */}
            {themeConfig.features.gym_qr_checkin && occupancy && (
              <Link
                href="/admin/occupancy"
                className="p-5 rounded-xl transition-all duration-150 hover:scale-[1.02]"
                style={{
                  backgroundColor: "var(--gym-bg-card)",
                  border: "1px solid var(--gym-border)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${occupancyColor}20` }}
                  >
                    <Activity className="w-5 h-5" style={{ color: occupancyColor }} />
                  </div>
                  <ArrowUpRight className="w-4 h-4" style={{ color: "var(--gym-text-ghost)" }} />
                </div>
                <p
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-barlow)", color: "var(--gym-text-primary)" }}
                >
                  {occupancy.current}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--gym-text-muted)" }}>
                    / {occupancy.capacity}
                  </span>
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--gym-text-muted)" }}>En el gym ahora</p>
                {/* Barra de ocupación */}
                <div
                  className="mt-3 h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${occupancy.percentage}%`, backgroundColor: occupancyColor }}
                  />
                </div>
              </Link>
            )}

            {/* Asistencias hoy */}
            {themeConfig.features.gym_qr_checkin && (
              <StatCard
                icon={ScanLine}
                iconColor="#38BDF8"
                gradientClass="stat-gradient-blue"
                value={todayAttendance.length}
                label="Asistencias hoy"
                sub="Check-ins del día"
                href="/admin/occupancy"
              />
            )}

            {/* Clases hoy */}
            {themeConfig.features.gym_calendar && (
              <StatCard
                icon={CalendarDays}
                iconColor="#22C55E"
                gradientClass="stat-gradient-green"
                value={upcomingToday.length}
                label="Clases hoy"
                sub="Próximas a comenzar"
                href="/admin/calendar"
              />
            )}

            {/* Retos activos */}
            {themeConfig.features.gym_challenges && (
              <StatCard
                icon={Trophy}
                iconColor="#FACC15"
                gradientClass="stat-gradient-yellow"
                value={activeChallenges.length}
                label="Retos activos"
                sub="En curso ahora"
                href="/admin/challenges"
              />
            )}
          </div>
        </section>
      )}

      {/* ── Tendencia de asistencia semanal ───────────────────────────────────── */}
      {themeConfig.features.gym_qr_checkin && weeklyTrend.length > 0 && (
        <AttendanceTrendWidget data={weeklyTrend} />
      )}

      {/* ── Grid inferior: clases de hoy + check-ins recientes ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximas clases del día */}
        {themeConfig.features.gym_calendar && upcomingToday.length > 0 && (
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" style={{ color: "#22C55E" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                  Clases de hoy
                </h3>
              </div>
              <Link
                href="/admin/calendar"
                className="text-xs font-medium"
                style={{ color: "#FF5E14" }}
              >
                Ver todo →
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingToday.slice(0, 4).map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: "#22C55E" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--gym-text-primary)" }}>
                      {cls.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--gym-text-muted)" }}>
                      {new Date(cls.starts_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                      {cls.location ? ` · ${cls.location}` : ""}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                  >
                    {cls.capacity_limit ? `${cls.capacity_limit} cupos` : "Abierta"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check-ins recientes del día */}
        {themeConfig.features.gym_qr_checkin && todayAttendance.length > 0 && (
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4" style={{ color: "#38BDF8" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                  Check-ins recientes
                </h3>
              </div>
              <Link
                href="/admin/occupancy"
                className="text-xs font-medium"
                style={{ color: "#FF5E14" }}
              >
                Ver todo →
              </Link>
            </div>
            <div className="space-y-2">
              {todayAttendance.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                >
                  {/* Avatar inicial */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: "rgba(56,189,248,0.15)", color: "#38BDF8" }}
                  >
                    {(log.profile as { full_name?: string } | null)?.full_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--gym-text-primary)" }}>
                      {(log.profile as { full_name?: string } | null)?.full_name ?? "Miembro"}
                    </p>
                    <p className="text-xs flex items-center gap-1" style={{ color: "var(--gym-text-muted)" }}>
                      <Clock className="w-3 h-3" />
                      {new Date(log.check_in_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {/* Indicador check-in / check-out */}
                  {log.check_out_at ? (
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#22C55E" }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: "#22C55E" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Acciones rápidas ─────────────────────────────────────────────────── */}
      <section>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--gym-text-ghost)" }}
        >
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickAction href="/admin/members"    icon={Users}       label="Miembros"      color="#38BDF8" />
          <QuickAction href="/admin/payments"   icon={FileCheck}   label="Revisar pagos" color="#22C55E" />
          {themeConfig.features.gym_routines && (
            <QuickAction href="/admin/routines/new"  icon={Dumbbell}    label="Nueva rutina"  color="#FF5E14" />
          )}
          {themeConfig.features.gym_calendar && (
            <QuickAction href="/admin/calendar"      icon={CalendarDays} label="Calendario"   color="#A855F7" />
          )}
          {themeConfig.features.gym_challenges && (
            <QuickAction href="/admin/challenges/new" icon={Trophy}     label="Crear reto"   color="#FACC15" />
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Componentes auxiliares de esta página ─────────────────────────────────── */

interface AttendanceTrendWidgetProps {
  data: { date: string; label: string; count: number }[];
}

function AttendanceTrendWidget({ data }: AttendanceTrendWidgetProps) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const today = new Date().toISOString().split("T")[0];
  const BAR_MAX_PX = 52;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--gym-text-ghost)" }}
        >
          Asistencia — últimos 7 días
        </p>
        <Link href="/admin/occupancy" className="text-xs font-medium" style={{ color: "#FF5E14" }}>
          Ver historial →
        </Link>
      </div>
      <div
        className="px-6 py-5 rounded-xl flex items-center gap-8"
        style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
      >
        {/* Resumen numérico */}
        <div className="shrink-0 pr-8 border-r" style={{ borderColor: "var(--gym-border)" }}>
          <p
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-barlow)", color: "var(--gym-text-primary)" }}
          >
            {total}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--gym-text-secondary)" }}>
            check-ins
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--gym-text-ghost)" }}>
            esta semana
          </p>
        </div>

        {/* Barras */}
        <div className="flex-1">
          {/* Contenedor de barras con altura fija — las barras crecen desde abajo */}
          <div className="flex items-end gap-2" style={{ height: `${BAR_MAX_PX}px` }}>
            {data.map((day) => {
              const isToday = day.date === today;
              const barH =
                day.count === 0
                  ? 3
                  : Math.max(Math.round((day.count / max) * BAR_MAX_PX), 6);
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col justify-end"
                  style={{ height: `${BAR_MAX_PX}px` }}
                >
                  {day.count > 0 && (
                    <p
                      className="text-[9px] text-center font-semibold mb-1"
                      style={{ color: isToday ? "#FF5E14" : "#555" }}
                    >
                      {day.count}
                    </p>
                  )}
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${barH}px`,
                      backgroundColor: isToday
                        ? "#FF5E14"
                        : day.count > 0
                        ? "rgba(255,94,20,0.3)"
                        : "#1a1a1a",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Etiquetas de día */}
          <div className="flex gap-2 mt-2">
            {data.map((day) => {
              const isToday = day.date === today;
              return (
                <div key={day.date} className="flex-1 text-center">
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: isToday ? "#FF5E14" : "#333" }}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="shrink-0 hidden lg:flex flex-col gap-2 text-[10px]" style={{ color: "var(--gym-text-ghost)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#FF5E14" }} />
            <span>Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "rgba(255,94,20,0.3)" }} />
            <span>Días anteriores</span>
          </div>
          {max > 0 && (
            <p className="mt-1" style={{ color: "var(--gym-text-ghost)" }}>
              Pico: {max} asist.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  gradientClass: string;
  value: string | number;
  label: string;
  sub: string;
  href: string;
}

function StatCard({ icon: Icon, iconColor, gradientClass, value, label, sub, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`p-5 rounded-xl transition-all duration-150 hover:scale-[1.02] group ${gradientClass}`}
      style={{
        backgroundColor: "var(--gym-bg-card)",
        border: "1px solid var(--gym-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--gym-text-ghost)" }} />
      </div>
      <p
        className="text-2xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-barlow)", color: "var(--gym-text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--gym-text-secondary)" }}>{label}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--gym-text-muted)" }}>{sub}</p>
    </Link>
  );
}

interface QuickActionProps {
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
}

function QuickAction({ href, icon: Icon, label, color }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-all duration-150 hover:scale-[1.03]"
      style={{
        backgroundColor: "var(--gym-bg-card)",
        border: "1px solid var(--gym-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-xs font-medium text-center" style={{ color: "var(--gym-text-secondary)" }}>
        {label}
      </span>
    </Link>
  );
}
