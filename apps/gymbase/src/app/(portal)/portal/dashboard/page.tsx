// page.tsx — Dashboard del portal del miembro: layout web en 2 columnas

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Dumbbell,
  CalendarDays,
  Trophy,
  QrCode,
  ChevronRight,
  Zap,
  Activity,
  BookOpen,
  ShoppingBag,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserSubscription } from "@core/actions/payment.actions";
import { getContentForUser } from "@core/actions/content.actions";
import { getMyQR, getOccupancy } from "@/actions/checkin.actions";
import { getMyRoutine, getRoutineById } from "@/actions/routine.actions";
import { getWeekSchedule, getMyBookings } from "@/actions/calendar.actions";
import { getChallenges } from "@/actions/challenge.actions";
import { formatDate, getDaysRemaining } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import type { SubscriptionStatus, ContentType } from "@/types/database";

const TYPE_LABELS: Record<ContentType, string> = {
  article: "Artículo",
  video:   "Video",
  image:   "Imagen",
  file:    "Archivo",
  link:    "Enlace",
};

export default async function PortalDashboardPage(): Promise<React.ReactNode> {
  const now = new Date();
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const [profile, subscription, contentItems, myQR, occupancy, memberRoutine, todayClasses, myBookings, challenges] =
    await Promise.all([
      getCurrentUser(),
      getUserSubscription(),
      getContentForUser(),
      themeConfig.features.gym_qr_checkin ? getMyQR()                                            : Promise.resolve(null),
      themeConfig.features.gym_qr_checkin ? getOccupancy()                                        : Promise.resolve(null),
      themeConfig.features.gym_routines   ? getMyRoutine()                                        : Promise.resolve(null),
      themeConfig.features.gym_calendar   ? getWeekSchedule(now.toISOString(), endOfDay.toISOString()) : Promise.resolve([]),
      themeConfig.features.gym_calendar   ? getMyBookings()                                       : Promise.resolve([]),
      themeConfig.features.gym_challenges ? getChallenges()                                       : Promise.resolve([]),
    ]);

  const routineDetail = memberRoutine
    ? await getRoutineById(memberRoutine.routine_id)
    : null;

  const status = (subscription?.status ?? "none") as SubscriptionStatus | "none";
  const daysRemaining = getDaysRemaining(subscription?.expires_at ?? null);
  const totalDays = (subscription?.plan as { duration_days?: number } | undefined)?.duration_days ?? 30;
  const progressPercent = subscription?.expires_at
    ? Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100))
    : 0;

  const bookingIds = new Set(myBookings.map((b) => b.class_id));
  const availableClasses = todayClasses
    .filter((c) => !c.is_cancelled && new Date(c.starts_at) > now)
    .slice(0, 4);

  const activeChallenges = challenges
    .filter((c) => new Date(c.starts_at) <= now && new Date(c.ends_at) >= now && c.is_public)
    .slice(0, 3);

  const firstName = profile?.full_name?.split(" ")[0] ?? "atleta";

  const statusColor =
    status === "active"   ? "#22C55E" :
    status === "pending"  ? "#FACC15" :
    status === "rejected" ? "#EF4444" :
                            "#737373";

  const occupancyColor =
    occupancy?.level === "full"     ? "#EF4444" :
    occupancy?.level === "busy"     ? "#FACC15" :
    occupancy?.level === "moderate" ? "#FACC15" :
                                      "#22C55E";

  return (
    <div className="space-y-6">

      {/* ── Saludo ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--gym-text-ghost)" }}>
            Bienvenido de vuelta
          </p>
          <h1
            className="text-3xl font-black tracking-tight mt-0.5"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            {firstName}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
          {now.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* ── Layout en 2 columnas — principal (2/3) + lateral (1/3) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══════════════ COLUMNA PRINCIPAL ═══════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Card de membresía */}
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: `1px solid ${statusColor}40`,
            }}
          >
            {/* Glow de fondo */}
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
              style={{ backgroundColor: statusColor, transform: "translate(40%, -40%)" }}
            />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gym-text-ghost)" }}>
                  Estado de membresía
                </p>
                <p className="text-xl font-bold" style={{ color: "var(--gym-text-primary)" }}>
                  {status === "active"
                    ? (subscription?.plan as { name: string } | undefined)?.name ?? "Plan activo"
                    : status === "pending"  ? "En revisión"
                    : status === "rejected" ? "Comprobante rechazado"
                    : status === "expired"  ? "Membresía vencida"
                    : status === "cancelled"? "Membresía cancelada"
                    : "Sin membresía activa"}
                </p>

                {status === "active" && subscription?.expires_at && (
                  <div className="mt-4 space-y-2 max-w-sm">
                    <div className="flex justify-between text-xs" style={{ color: "var(--gym-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {daysRemaining} día{daysRemaining !== 1 ? "s" : ""} restante{daysRemaining !== 1 ? "s" : ""}
                      </span>
                      <span>Vence {formatDate(subscription.expires_at)}</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progressPercent}%`, backgroundColor: statusColor }}
                      />
                    </div>
                  </div>
                )}

                {(status === "none" || status === "expired" || status === "cancelled") && (
                  <Link
                    href="/portal/plans"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold"
                    style={{ color: "#FF5E14" }}
                  >
                    Ver planes disponibles
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                {status === "rejected" && (
                  <Link
                    href="/portal/membership"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold"
                    style={{ color: "#EF4444" }}
                  >
                    Subir nuevo comprobante
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                {status === "pending" && (
                  <p className="text-sm mt-3" style={{ color: "var(--gym-text-muted)" }}>
                    Tu comprobante está siendo revisado. Te notificaremos pronto.
                  </p>
                )}
              </div>

              {/* Badge de estado */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: `${statusColor}15`,
                  color: statusColor,
                  border: `1px solid ${statusColor}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                {status === "active"   ? "Activa" :
                 status === "pending"  ? "Pendiente" :
                 status === "rejected" ? "Rechazada" :
                 status === "expired"  ? "Vencida" :
                 status === "cancelled"? "Cancelada" : "Sin plan"}
              </div>
            </div>
          </div>

          {/* Mi rutina */}
          {themeConfig.features.gym_routines && routineDetail && (
            <Link
              href="/portal/routines"
              className="group flex items-center gap-4 p-5 rounded-2xl transition-all duration-150 hover:border-[#FF5E14]/40"
              style={{
                backgroundColor: "var(--gym-bg-card)",
                border: "1px solid var(--gym-border)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255,94,20,0.12)" }}
              >
                <Dumbbell className="w-6 h-6" style={{ color: "#FF5E14" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "var(--gym-text-ghost)" }}>
                  Mi rutina asignada
                </p>
                <p className="font-semibold truncate" style={{ color: "var(--gym-text-primary)" }}>
                  {routineDetail.name}
                </p>
                {routineDetail.description && (
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--gym-text-muted)" }}>
                    {routineDetail.description}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--gym-text-ghost)" }}>
                  {routineDetail.days?.length ?? 0} días
                  {routineDetail.days_per_week ? ` · ${routineDetail.days_per_week}x por semana` : ""}
                </p>
              </div>
              <ChevronRight
                className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "#FF5E14" }}
              />
            </Link>
          )}

          {/* Clases de hoy */}
          {themeConfig.features.gym_calendar && availableClasses.length > 0 && (
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--gym-bg-card)",
                border: "1px solid var(--gym-border)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" style={{ color: "#38BDF8" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                    Clases de hoy
                  </h2>
                </div>
                <Link href="/portal/calendar" className="text-xs" style={{ color: "#FF5E14" }}>
                  Ver todo →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                  >
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: bookingIds.has(cls.id) ? "#22C55E" : "#38BDF8" }}
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
                    {bookingIds.has(cls.id) ? (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                      >
                        Reservado
                      </span>
                    ) : (
                      <Link
                        href="/portal/calendar"
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0"
                        style={{
                          backgroundColor: "rgba(255,94,20,0.12)",
                          color: "#FF5E14",
                          border: "1px solid rgba(255,94,20,0.2)",
                        }}
                      >
                        Reservar
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retos activos */}
          {themeConfig.features.gym_challenges && activeChallenges.length > 0 && (
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--gym-bg-card)",
                border: "1px solid var(--gym-border)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: "#FACC15" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                    Retos activos
                  </h2>
                </div>
                <Link href="/portal/challenges" className="text-xs" style={{ color: "#FF5E14" }}>
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-2">
                {activeChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/portal/challenges/${challenge.id}`}
                    className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
                    style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(250,204,21,0.1)" }}
                    >
                      <Trophy className="w-4 h-4" style={{ color: "#FACC15" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--gym-text-primary)" }}>
                        {challenge.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--gym-text-muted)" }}>
                        Termina {formatDate(challenge.ends_at)} · {challenge.participants_count ?? 0} participantes
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--gym-text-ghost)" }} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contenido reciente */}
          {status === "active" && contentItems.length > 0 && (
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--gym-bg-card)",
                border: "1px solid var(--gym-border)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: "#A855F7" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                    Contenido reciente
                  </h2>
                </div>
                <Link href="/portal/content" className="text-xs" style={{ color: "#FF5E14" }}>
                  Ver todo →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {contentItems.slice(0, 4).map((item) => {
                  const catColor = (item.category as { color: string } | null)?.color ?? "#A855F7";
                  const catName  = (item.category as { name: string } | null)?.name ?? "";
                  return (
                    <Link
                      key={item.id}
                      href={`/portal/content/${item.id}`}
                      className="flex flex-col gap-1.5 px-3 py-3 rounded-xl transition-colors"
                      style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${catColor}18`, color: catColor }}
                        >
                          {catName || TYPE_LABELS[item.type as ContentType]}
                        </span>
                      </div>
                      <p
                        className="text-sm font-medium line-clamp-2 leading-snug"
                        style={{ color: "var(--gym-text-primary)" }}
                      >
                        {item.title}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════ COLUMNA LATERAL ═══════════════ */}
        <div className="space-y-4">

          {/* QR */}
          {themeConfig.features.gym_qr_checkin && myQR && (
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--gym-bg-card)",
                border: "1px solid var(--gym-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-4 h-4" style={{ color: "#FF5E14" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                  Mi código QR
                </h2>
              </div>
              {/* Importación dinámica para no inflar el layout en SSR */}
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  {/* Placeholder visual — el QR real se muestra en /portal/profile */}
                  <div
                    className="w-28 h-28 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: "#f5f5f5" }}
                  >
                    <QrCode className="w-16 h-16" style={{ color: "#0A0A0A" }} />
                  </div>
                </div>
              </div>
              <Link
                href="/portal/profile"
                className="flex items-center justify-center gap-1 mt-3 text-xs font-medium"
                style={{ color: "var(--gym-text-muted)" }}
              >
                Ver QR completo →
              </Link>
            </div>
          )}

          {/* Ocupación */}
          {themeConfig.features.gym_qr_checkin && occupancy && (
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--gym-bg-card)",
                border: "1px solid var(--gym-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" style={{ color: occupancyColor }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                  Ocupación actual
                </h2>
              </div>
              <p
                className="text-3xl font-black"
                style={{ fontFamily: "var(--font-barlow)", color: "var(--gym-text-primary)" }}
              >
                {occupancy.percentage}%
              </p>
              <div
                className="mt-2 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--gym-bg-elevated)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${occupancy.percentage}%`, backgroundColor: occupancyColor }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--gym-text-muted)" }}>
                {occupancy.current} / {occupancy.capacity} personas
              </p>
              <div
                className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: `${occupancyColor}15`,
                  color: occupancyColor,
                }}
              >
                {occupancy.level === "free"     ? "Libre" :
                 occupancy.level === "moderate" ? "Moderado" :
                 occupancy.level === "busy"     ? "Lleno" :
                 "Completo"}
              </div>
            </div>
          )}

          {/* Acciones rápidas */}
          <div
            className="p-5 rounded-2xl space-y-2"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--gym-text-ghost)" }}>
              Acciones rápidas
            </p>

            <Link
              href="/portal/plans"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium w-full"
              style={{ backgroundColor: "var(--gym-bg-elevated)", color: "var(--gym-text-secondary)" }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: "#FF5E14" }} />
              Ver planes disponibles
            </Link>

            <Link
              href="/portal/membership"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium w-full"
              style={{ backgroundColor: "var(--gym-bg-elevated)", color: "var(--gym-text-secondary)" }}
            >
              <ArrowRight className="w-3.5 h-3.5" style={{ color: "#38BDF8" }} />
              Subir comprobante de pago
            </Link>

            <Link
              href="/portal/content"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium w-full"
              style={{ backgroundColor: "var(--gym-bg-elevated)", color: "var(--gym-text-secondary)" }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: "#A855F7" }} />
              Explorar contenido
            </Link>

            {themeConfig.features.gym_marketplace && (
              <Link
                href="/portal/store"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium w-full"
                style={{ backgroundColor: "var(--gym-bg-elevated)", color: "var(--gym-text-secondary)" }}
              >
                <ShoppingBag className="w-3.5 h-3.5" style={{ color: "#FACC15" }} />
                Tienda
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
