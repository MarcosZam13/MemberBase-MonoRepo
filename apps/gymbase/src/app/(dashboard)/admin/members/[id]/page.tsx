// page.tsx — Perfil detallado de un miembro con header de avatar, stats y tabs

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail, Phone, Calendar, Shield,
  CreditCard, Clock, Dumbbell, User, CheckCircle2,
  AlertTriangle, Receipt,
} from "lucide-react";
import { getMemberById } from "@core/actions/admin.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import { getHealthProfile, getHealthHistory, getProgressPhotos } from "@/actions/health.actions";
import { getRoutines, getMemberActiveRoutine, getRoutineById } from "@/actions/routine.actions";
import { getMemberAttendanceLogs } from "@/actions/checkin.actions";
import { HealthMetricsForm } from "@/components/gym/health/HealthMetricsForm";
import { SnapshotForm } from "@/components/gym/health/SnapshotForm";
import { HealthChartCard } from "@/components/gym/health/HealthChartCard";
import { ProgressPhotoUpload } from "@/components/gym/health/ProgressPhotoUpload";
import { RoutineDayAccordion } from "@/components/gym/routines/RoutineDayAccordion";
import { MemberProfileEditForm } from "@/components/gym/members/MemberProfileEditForm";
import { AssignRoutineButton } from "@/components/gym/members/AssignRoutineButton";
import { ManualPaymentButton } from "@/components/gym/members/ManualPaymentButton";
import { getMemberPayments } from "@/actions/payment.actions";
import { getPlans } from "@core/actions/membership.actions";
import { themeConfig } from "@/lib/theme";
import type { SubscriptionStatus } from "@/types/database";

// Genera color de avatar basado en hash del userId
function avatarColor(id: string): { bg: string; text: string; border: string } {
  const PALETTES = [
    { bg: "#1e0f06", text: "#FF5E14", border: "#FF5E1430" },
    { bg: "#0d1a0d", text: "#22C55E", border: "#22C55E30" },
    { bg: "#0d0d2a", text: "#818CF8", border: "#818CF830" },
    { bg: "#1a0d1a", text: "#E879F9", border: "#E879F930" },
    { bg: "#0d1a1a", text: "#38BDF8", border: "#38BDF830" },
    { bg: "#1a1a0d", text: "#FACC15", border: "#FACC1530" },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}


const STATUS_CONFIG: Record<SubscriptionStatus | "none", { label: string; cls: string }> = {
  active:    { label: "Activo",        cls: "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.2)] text-[#22C55E]" },
  pending:   { label: "Pendiente",     cls: "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.2)] text-[#FACC15]" },
  expired:   { label: "Vencido",       cls: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[#EF4444]" },
  cancelled: { label: "Cancelado",     cls: "bg-[#161616] border-[#222] text-[#555]" },
  rejected:  { label: "Rechazado",     cls: "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.15)] text-[#EF4444]" },
  none:      { label: "Sin membresía", cls: "bg-[#161616] border-[#222] text-[#555]" },
};

interface MemberDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function MemberDetailPage({ params, searchParams }: MemberDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;
  const { tab = "info" } = await searchParams;

  const member = await getMemberById(id);
  if (!member) notFound();

  const subs = member.active_subscription as unknown as Array<{
    id: string;
    status: SubscriptionStatus;
    starts_at: string | null;
    expires_at: string | null;
    plan?: { id: string; name: string; price: number; currency: string; duration_days: number };
  }> | undefined;

  // Priorizar suscripción activa; si no hay, tomar la más reciente por expires_at
  // La query de Supabase no garantiza orden en relaciones embebidas
  const sub = Array.isArray(subs) && subs.length > 0
    ? (subs.find((s) => s.status === "active") ??
       [...subs].sort((a, b) =>
         new Date(b.expires_at ?? 0).getTime() - new Date(a.expires_at ?? 0).getTime()
       )[0])
    : undefined;
  const status = (sub?.status ?? "none") as SubscriptionStatus | "none";
  const statusCfg = STATUS_CONFIG[status];

  // Cargar todos los datos en paralelo según módulos activos y pestaña
  const [healthProfile, healthSnapshots, routines, memberActiveRoutine, memberLogs, memberPayments, membershipPlans, progressPhotos] =
    await Promise.all([
      themeConfig.features.gym_health_metrics ? getHealthProfile(id) : Promise.resolve(null),
      themeConfig.features.gym_health_metrics ? getHealthHistory(id, 50) : Promise.resolve([]),
      themeConfig.features.gym_routines ? getRoutines() : Promise.resolve([]),
      themeConfig.features.gym_routines ? getMemberActiveRoutine(id) : Promise.resolve(null),
      getMemberAttendanceLogs(id),
      getMemberPayments(id),
      getPlans(true),
      themeConfig.features.gym_progress ? getProgressPhotos(id) : Promise.resolve([]),
    ]);

  // Cargar detalle completo de la rutina activa — query serial porque depende de memberActiveRoutine
  const activeRoutineDetail = memberActiveRoutine?.routine_id
    ? await getRoutineById(memberActiveRoutine.routine_id)
    : null;

  // Stats derivados de la rutina activa para el resumen visual
  const routineStats = activeRoutineDetail ? (() => {
    const days = activeRoutineDetail.days ?? [];
    const totalExercises = days.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0);
    const totalSets = days.reduce(
      (sum, d) => sum + d.exercises.reduce((s, e) => s + (e.sets ?? 0), 0),
      0
    );
    const muscleGroups = Array.from(new Set(
      days.flatMap((d) =>
        d.exercises.map((e) => e.exercise?.muscle_group).filter(Boolean) as string[]
      )
    ));
    return { totalDays: days.length, totalExercises, totalSets, muscleGroups };
  })() : null;

  const MUSCLE_LABELS: Record<string, string> = {
    chest: "Pecho", back: "Espalda", shoulders: "Hombros",
    biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
    quads: "Cuádriceps", hamstrings: "Femorales", glutes: "Glúteos",
    calves: "Gemelos", core: "Core", full_body: "Cuerpo completo",
  };

  // Calcular asistencias del mes actual
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthAttendance = memberLogs.filter(
    (l) => new Date(l.check_in_at) >= startOfMonth
  ).length;

  // Calcular racha actual (días consecutivos con check-in hasta hoy)
  let streak = 0;
  if (memberLogs.length > 0) {
    const uniqueDays = Array.from(
      new Set(memberLogs.map((l) => new Date(l.check_in_at).toDateString()))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const today = new Date().toDateString();
    if (uniqueDays[0] === today || uniqueDays[0] === new Date(Date.now() - 86400000).toDateString()) {
      streak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) streak++;
        else break;
      }
    }
  }

  // Peso actual del perfil de salud
  const currentWeight = healthProfile?.weight_kg ?? null;

  // Pre-calcular progreso de membresía para la barra visual del tab Resumen
  const membershipTotalDays = sub?.plan?.duration_days ?? 0;
  const membershipStartDate = sub?.starts_at ? new Date(sub.starts_at) : null;
  const membershipDaysUsed = membershipStartDate
    ? Math.max(0, Math.floor((Date.now() - membershipStartDate.getTime()) / 86400000))
    : 0;
  const membershipDaysLeft = Math.max(0, membershipTotalDays - membershipDaysUsed);
  const membershipProgressPct = membershipTotalDays > 0
    ? Math.min(100, (membershipDaysUsed / membershipTotalDays) * 100)
    : 0;
  const membershipRemainingRatio = membershipTotalDays > 0 ? membershipDaysLeft / membershipTotalDays : 0;
  // El color refleja urgencia: naranja normal, amarillo si queda <30%, rojo si <10%
  const membershipBarColor =
    membershipRemainingRatio <= 0.1 ? "#EF4444" :
    membershipRemainingRatio <= 0.3 ? "#F59E0B" :
    "#FF5E14";

  // Días hasta vencimiento para la alerta en el tab de pagos
  const daysUntilExpiry = sub?.expires_at
    ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)
    : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  // --- Datos para Tab Asistencias ---

  // Racha máxima histórica — calculada desde los logs del último año
  const longestStreak: number = (() => {
    if (memberLogs.length === 0) return 0;
    const uniqueDays = Array.from(
      new Set(memberLogs.map((l) => new Date(l.check_in_at).toDateString()))
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let max = 1, current = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) { current++; max = Math.max(max, current); }
      else current = 1;
    }
    return max;
  })();

  // Asistencias por mes — últimos 6 meses para la gráfica de barras
  const monthlyAttendance: { month: string; count: number }[] = (() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("es-CR", { month: "short" });
      const count = memberLogs.filter((l) => {
        const ld = new Date(l.check_in_at);
        return ld.getFullYear() === year && ld.getMonth() === month;
      }).length;
      months.push({ month: label, count });
    }
    return months;
  })();

  // Set de días asistidos en formato "YYYY-MM-DD" para el heatmap anual
  const attendedDaysSet = new Set(
    memberLogs.map((l) => {
      const d = new Date(l.check_in_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );

  // Día y hora más frecuente para las estadísticas de hábito
  const dayFreq: Record<string, number> = {};
  const hourFreq: Record<number, number> = {};
  memberLogs.forEach((l) => {
    const d = new Date(l.check_in_at);
    const dayName = d.toLocaleDateString("es-CR", { weekday: "long" });
    dayFreq[dayName] = (dayFreq[dayName] ?? 0) + 1;
    hourFreq[d.getHours()] = (hourFreq[d.getHours()] ?? 0) + 1;
  });
  const favDay = Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favHourRaw = Object.entries(hourFreq).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? null;
  const favHourLabel = favHourRaw !== null
    ? `${favHourRaw}:00 - ${Number(favHourRaw) + 1}:00`
    : null;

  // Duración promedio de sesión calculada desde logs con checkout registrado
  const logsWithDuration = memberLogs.filter((l) => l.duration_minutes);
  const avgDuration = logsWithDuration.length > 0
    ? Math.round(logsWithDuration.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0) / logsWithDuration.length)
    : null;

  // --- Datos para gráficas de salud ---
  // Los snapshots vienen ordenados desc (más reciente primero).
  // Para las gráficas necesitamos orden ascendente (más antiguo primero).
  const snapshotsAsc = [...healthSnapshots].reverse();

  const weightPoints = snapshotsAsc
    .filter((s) => s.weight_kg != null)
    .map((s) => ({
      date: new Date(s.recorded_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" }),
      value: s.weight_kg as number,
    }));

  const fatPoints = snapshotsAsc
    .filter((s) => s.body_fat_pct != null)
    .map((s) => ({
      date: new Date(s.recorded_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" }),
      value: s.body_fat_pct as number,
    }));

  const musclePoints = snapshotsAsc
    .filter((s) => s.muscle_mass_kg != null)
    .map((s) => ({
      date: new Date(s.recorded_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" }),
      value: s.muscle_mass_kg as number,
    }));

  // Cambio desde el primer snapshot hasta el más reciente (para el delta en los pills)
  const weightDelta = weightPoints.length >= 2
    ? weightPoints[weightPoints.length - 1].value - weightPoints[0].value
    : null;
  const fatDelta = fatPoints.length >= 2
    ? fatPoints[fatPoints.length - 1].value - fatPoints[0].value
    : null;
  const muscleDelta = musclePoints.length >= 2
    ? musclePoints[musclePoints.length - 1].value - musclePoints[0].value
    : null;

  const TABS = [
    { key: "info", label: "Resumen" },
    { key: "attendance", label: "Asistencias" },
    ...(themeConfig.features.gym_health_metrics ? [{ key: "health", label: "Salud" }] : []),
    ...(themeConfig.features.gym_routines ? [{ key: "routine", label: "Rutina" }] : []),
    { key: "payments", label: "Pagos" },
  ];

  const colors = avatarColor(member.id);

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Navegación */}
      <Link
        href="/admin/members"
        className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#888] transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a miembros
      </Link>

      {/* Header del perfil */}
      <div
        className="flex items-start gap-4 p-4 bg-[#111] border border-[#1e1e1e] rounded-[14px]"
      >
        {/* Avatar grande */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold font-barlow flex-shrink-0"
          style={{ background: colors.bg, color: colors.text, border: `1.5px solid ${colors.border}` }}
        >
          {initials(member.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-white tracking-tight">{member.full_name ?? "Sin nombre"}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-[#666]">{member.email}</span>
            {member.phone && (
              <span className="text-xs text-[#666]">{member.phone}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
          {sub?.expires_at && (
            <p className="text-[10px] text-[#555] mt-1.5">
              Vence {formatDate(sub.expires_at)}
            </p>
          )}
        </div>
      </div>

      {/* 4-stat mini-grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { val: monthAttendance, lbl: "Asistencias", color: "#FF5E14" },
          { val: streak, lbl: "Racha actual", color: "#fff" },
          { val: 0, lbl: "Retos", color: "#fff" },
          { val: currentWeight ? `${currentWeight}kg` : "—", lbl: "Peso", color: "#FF5E14" },
        ].map(({ val, lbl, color }) => (
          <div key={lbl} className="bg-[#111] border border-[#1a1a1a] rounded-[12px] p-3 text-center">
            <p className="text-[22px] font-bold font-barlow leading-none tracking-tight" style={{ color }}>
              {val}
            </p>
            <p className="text-[9px] text-[#444] uppercase tracking-[0.06em] mt-1">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Tabs de navegación */}
      <div className="flex gap-0.5 bg-[#111] border border-[#1a1a1a] rounded-[12px] p-1">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/members/${id}?tab=${key}`}
            className={`flex-1 h-8 rounded-[8px] flex items-center justify-center text-[11px] font-medium transition-colors ${
              tab === key
                ? "bg-[#1e1e1e] text-white"
                : "text-[#555] hover:text-[#888]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab: Resumen — mini-dashboard con Membresía, Asistencias, Rutina e Info */}
      {tab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* ── Columna izquierda (2/3) ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">

            {/* Card: Membresía */}
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#FF5E14]" />
                  <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                    Membresía
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              </div>

              {sub ? (
                <div className="space-y-3">
                  {/* Nombre del plan y precio */}
                  <div>
                    <p className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-barlow)" }}>
                      {sub.plan?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-[#666] mt-0.5">
                      {sub.plan ? formatPrice(sub.plan.price, sub.plan.currency) : ""}
                    </p>
                  </div>

                  {/* Barra de progreso de días consumidos */}
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${membershipProgressPct}%`, backgroundColor: membershipBarColor }}
                      />
                    </div>
                    <p className="text-[10px] text-[#555]">
                      {membershipDaysLeft} días restantes de {membershipTotalDays}
                    </p>
                  </div>

                  {/* Fechas de inicio y vencimiento */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                      <p className="text-[9px] text-[#444] uppercase tracking-[0.07em] mb-0.5">Inicio</p>
                      <p className="text-[13px] text-[#ccc] font-medium">{formatDate(sub.starts_at ?? null)}</p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                      <p className="text-[9px] text-[#444] uppercase tracking-[0.07em] mb-0.5">Vencimiento</p>
                      <p className="text-[13px] text-[#ccc] font-medium">{formatDate(sub.expires_at ?? null)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#555] py-4 text-center">Sin membresía activa</p>
              )}
            </div>

            {/* Card: Últimas asistencias */}
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5 text-[#FF5E14]" />
                <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                  Últimas asistencias
                </p>
              </div>

              {memberLogs.length === 0 ? (
                <p className="text-[13px] text-[#444] text-center py-6">Sin asistencias registradas</p>
              ) : (
                <div className="space-y-0">
                  {memberLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-[#161616] last:border-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                        <p className="text-[12px] text-[#ccc]">{formatDate(log.check_in_at)}</p>
                      </div>
                      <span className="text-[11px] font-medium text-[#666]">
                        {log.duration_minutes ? `${log.duration_minutes} min` : "En curso"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-[#161616]">
                <Link
                  href={`/admin/members/${id}?tab=attendance`}
                  className="text-[11px] text-[#555] hover:text-[#FF5E14] transition-colors"
                >
                  Ver todas →
                </Link>
              </div>
            </div>
          </div>

          {/* ── Columna derecha (1/3) ─────────────────────────────────────── */}
          <div className="space-y-3">

            {/* Card: Rutina activa */}
            {themeConfig.features.gym_routines && (
              <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Dumbbell className="w-3.5 h-3.5 text-[#FF5E14]" />
                  <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                    Rutina activa
                  </p>
                </div>

                {memberActiveRoutine ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[13px] font-semibold text-white">
                        {memberActiveRoutine.routine?.name}
                      </p>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22C55E]">
                          Activa
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/routines/${memberActiveRoutine.routine_id}`}
                      className="flex items-center justify-center h-7 w-full text-[11px] font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-lg hover:text-white transition-colors"
                    >
                      Ver rutina →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[#555]">Sin rutina asignada</p>
                    <Link
                      href={`/admin/members/${id}?tab=routine`}
                      className="flex items-center justify-center h-7 w-full text-[11px] font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-lg hover:text-white transition-colors"
                    >
                      Asignar rutina →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Card: Información personal */}
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <User className="w-3.5 h-3.5 text-[#FF5E14]" />
                <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                  Información
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Mail className="w-3 h-3 text-[#444]" />
                    <p className="text-[9px] text-[#444] uppercase tracking-[0.07em]">Email</p>
                  </div>
                  <p className="text-[12px] text-[#ccc] font-medium truncate">{member.email}</p>
                </div>

                <div className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Phone className="w-3 h-3 text-[#444]" />
                    <p className="text-[9px] text-[#444] uppercase tracking-[0.07em]">Teléfono</p>
                  </div>
                  <p className="text-[12px] text-[#ccc] font-medium">{member.phone ?? "Sin teléfono"}</p>
                </div>

                <div className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Calendar className="w-3 h-3 text-[#444]" />
                    <p className="text-[9px] text-[#444] uppercase tracking-[0.07em]">Miembro desde</p>
                  </div>
                  <p className="text-[12px] text-[#ccc] font-medium">{formatDate(member.created_at)}</p>
                </div>

                <div className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                  <p className="text-[9px] text-[#444] uppercase tracking-[0.07em] mb-1">Rol</p>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: "#FF5E1420", color: "#FF5E14", border: "1px solid #FF5E1440" }}
                  >
                    <Shield className="w-3 h-3" />
                    {member.role === "admin" ? "Administrador" : "Miembro"}
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#161616]">
                <MemberProfileEditForm
                  memberId={member.id}
                  initialName={member.full_name ?? null}
                  initialPhone={member.phone ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Asistencias — dashboard visual con rachas, gráfica y heatmap */}
      {tab === "attendance" && (
        <div className="space-y-3">

          {/* Sección 1 — 4 pills: racha actual, racha máxima, día favorito, hora favorita */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Racha actual",  value: `${streak} días`,       accent: streak > 0 },
              { label: "Racha máxima",  value: `${longestStreak} días`, accent: false },
              { label: "Día favorito",  value: favDay ? favDay.charAt(0).toUpperCase() + favDay.slice(1) : "—", accent: false },
              { label: "Hora favorita", value: favHourLabel ?? "—",     accent: false },
            ].map(({ label, value, accent }) => (
              <div key={label} className="bg-[#111] border border-[#1a1a1a] rounded-[12px] px-3 py-3 text-center">
                <p className="text-[10px] text-[#444] uppercase tracking-[0.07em] mb-1">{label}</p>
                <p className={`text-[16px] font-bold font-barlow ${accent ? "text-[#FF5E14]" : "text-[#ccc]"}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Sección 2 — Gráfica de barras: asistencias por mes (últimos 6 meses) */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-4">
              Asistencias por mes
            </p>
            <div className="flex items-end gap-2 h-24">
              {(() => {
                const maxCount = Math.max(...monthlyAttendance.map((m) => m.count), 1);
                return monthlyAttendance.map(({ month, count }, idx) => {
                  const heightPct = count === 0 ? 4 : Math.max(8, (count / maxCount) * 100);
                  const isCurrentMonth = idx === monthlyAttendance.length - 1;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                      {count > 0 && (
                        <span className="text-[9px] text-[#555]">{count}</span>
                      )}
                      <div
                        className="w-full rounded-[4px] transition-all"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: isCurrentMonth ? "#FF5E14" : "#1e1e1e",
                          border: isCurrentMonth ? "1px solid #FF5E1460" : "1px solid #222",
                        }}
                      />
                      <span className="text-[9px] text-[#444] capitalize">{month}</span>
                    </div>
                  );
                });
              })()}
            </div>
            {avgDuration && (
              <p className="text-[10px] text-[#444] mt-3 text-center">
                Duración promedio de sesión:{" "}
                <span className="text-[#888]">{avgDuration} min</span>
              </p>
            )}
          </div>

          {/* Sección 3 — Heatmap anual estilo GitHub (52 semanas × 7 días) */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                Actividad del último año
              </p>
              <p className="text-[10px] text-[#444]">
                {attendedDaysSet.size} días asistidos
              </p>
            </div>

            {(() => {
              // Construir grid de 52 semanas hacia atrás desde el domingo de la semana actual
              const today = new Date();
              const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

              const startDay = new Date(today);
              startDay.setDate(today.getDate() - today.getDay() - 51 * 7);

              const weeks: string[][] = [];
              for (let w = 0; w < 52; w++) {
                const week: string[] = [];
                for (let d = 0; d < 7; d++) {
                  const day = new Date(startDay);
                  day.setDate(startDay.getDate() + w * 7 + d);
                  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                  week.push(key);
                }
                weeks.push(week);
              }

              // Detectar cambios de mes entre semanas para los labels
              const monthLabels: { label: string; weekIndex: number }[] = [];
              weeks.forEach((week, wi) => {
                const firstDay = new Date(week[0]);
                if (wi === 0 || new Date(weeks[wi - 1][0]).getMonth() !== firstDay.getMonth()) {
                  monthLabels.push({
                    label: firstDay.toLocaleDateString("es-CR", { month: "short" }),
                    weekIndex: wi,
                  });
                }
              });

              return (
                <div className="overflow-x-auto">
                  {/* Labels de meses */}
                  <div className="flex mb-1" style={{ gap: "2px" }}>
                    {weeks.map((_, wi) => {
                      const label = monthLabels.find((m) => m.weekIndex === wi);
                      return (
                        <div key={wi} style={{ width: "10px", minWidth: "10px" }}>
                          {label && (
                            <span className="text-[8px] text-[#444] capitalize whitespace-nowrap">
                              {label.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid de días */}
                  <div className="flex" style={{ gap: "2px" }}>
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col" style={{ gap: "2px" }}>
                        {week.map((dayKey) => {
                          const attended = attendedDaysSet.has(dayKey);
                          const isToday = dayKey === todayKey;
                          const isFuture = dayKey > todayKey;
                          return (
                            <div
                              key={dayKey}
                              title={dayKey}
                              style={{
                                width: "10px",
                                height: "10px",
                                minWidth: "10px",
                                borderRadius: "2px",
                                backgroundColor: isFuture
                                  ? "transparent"
                                  : attended
                                  ? "#FF5E14"
                                  : "#1a1a1a",
                                border: isToday ? "1px solid #FF5E14" : "none",
                                opacity: isFuture ? 0 : 1,
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Leyenda */}
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <span className="text-[8px] text-[#444]">Menos</span>
                    {["#1a1a1a", "#FF5E1440", "#FF5E1480", "#FF5E14"].map((color) => (
                      <div
                        key={color}
                        style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: color }}
                      />
                    ))}
                    <span className="text-[8px] text-[#444]">Más</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sección 4 — Tabla de logs recientes (últimos 15) */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                Registros recientes
              </p>
              <span className="text-[10px] text-[#444]">{memberLogs.length} total</span>
            </div>
            <div className="divide-y divide-[#0d0d0d]">
              {memberLogs.length === 0 ? (
                <p className="text-center text-[#444] text-[12px] py-8">Sin asistencias registradas</p>
              ) : (
                memberLogs.slice(0, 15).map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#0f0f0f]">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E14] shrink-0" />
                      <div>
                        <p className="text-[12px] font-medium text-[#ccc] capitalize">
                          {new Date(log.check_in_at).toLocaleDateString("es-CR", {
                            weekday: "short", day: "numeric", month: "short",
                          })}
                        </p>
                        <p className="text-[10px] text-[#555]">
                          {new Date(log.check_in_at).toLocaleTimeString("es-CR", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                          {log.check_out_at &&
                            ` → ${new Date(log.check_out_at).toLocaleTimeString("es-CR", {
                              hour: "2-digit", minute: "2-digit",
                            })}`
                          }
                        </p>
                      </div>
                    </div>
                    {log.duration_minutes ? (
                      <span className="text-[11px] font-semibold font-barlow text-[#FF5E14]">
                        {log.duration_minutes} min
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#444]">En curso</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Salud — pills de métricas actuales, gráficas SVG y formularios */}
      {tab === "health" && themeConfig.features.gym_health_metrics && (
        <div className="space-y-4">

          {/* Sección 1 — Pills de métricas actuales */}
          {healthProfile && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: "Peso actual",
                  value: healthProfile.weight_kg ? `${healthProfile.weight_kg} kg` : "—",
                  delta: weightDelta,
                  deltaUnit: "kg",
                  accentColor: "#FF5E14",
                },
                {
                  label: "Grasa corporal",
                  value: healthProfile.body_fat_pct ? `${healthProfile.body_fat_pct}%` : "—",
                  delta: fatDelta,
                  deltaUnit: "%",
                  accentColor: "#FF5E14",
                },
                {
                  label: "Masa muscular",
                  value: healthProfile.muscle_mass_kg ? `${healthProfile.muscle_mass_kg} kg` : "—",
                  delta: muscleDelta,
                  deltaUnit: "kg",
                  accentColor: "#22C55E",
                },
                {
                  label: "IMC",
                  value: healthProfile.bmi ? `${healthProfile.bmi}` : "—",
                  delta: null,
                  deltaUnit: "",
                  accentColor: "#FF5E14",
                },
              ].map(({ label, value, delta, deltaUnit, accentColor }) => (
                <div key={label} className="bg-[#111] border border-[#1a1a1a] rounded-[12px] px-3 py-3">
                  <p className="text-[9px] text-[#444] uppercase tracking-[0.07em] mb-1">{label}</p>
                  <p className="text-[18px] font-bold font-barlow leading-none" style={{ color: accentColor }}>
                    {value}
                  </p>
                  {delta !== null && (
                    <p className={`text-[9px] mt-1 ${delta > 0 ? "text-[#F87171]" : delta < 0 ? "text-[#4ADE80]" : "text-[#555]"}`}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)} {deltaUnit} desde inicio
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sección 2 — Gráficas de evolución (solo si hay al menos 1 snapshot en alguna métrica) */}
          {(weightPoints.length >= 1 || fatPoints.length >= 1 || musclePoints.length >= 1) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {weightPoints.length >= 1 && (
                <HealthChartCard
                  points={weightPoints}
                  color="#FF5E14"
                  unit="kg"
                  label="weight"
                  title="Peso (kg)"
                />
              )}
              {fatPoints.length >= 1 && (
                <HealthChartCard
                  points={fatPoints}
                  color="#F59E0B"
                  unit="%"
                  label="fat"
                  title="Grasa corporal (%)"
                />
              )}
              {musclePoints.length >= 1 && (
                <HealthChartCard
                  points={musclePoints}
                  color="#22C55E"
                  unit="kg"
                  label="muscle"
                  title="Masa muscular (kg)"
                />
              )}
            </div>
          )}

          {/* Estado vacío si no hay ningún snapshot registrado */}
          {healthSnapshots.length === 0 && (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-8 text-center">
              <p className="text-[12px] text-[#444]">
                Sin mediciones registradas — las gráficas aparecerán aquí
              </p>
            </div>
          )}

          {/* Sección 3 — Formularios: perfil base y nuevo snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 space-y-3">
              <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                Perfil de salud
              </p>
              <HealthMetricsForm userId={id} profile={healthProfile} />
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 space-y-3">
              <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                Registrar medición
              </p>
              <SnapshotForm userId={id} />
            </div>
          </div>

          {/* Sección 4 — Timeline de snapshots */}
          {healthSnapshots.length > 0 && (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                  Historial de mediciones
                </p>
                <span className="text-[10px] text-[#444]">{healthSnapshots.length} registros</span>
              </div>

              <div className="divide-y divide-[#0d0d0d]">
                {healthSnapshots.map((snap, i) => {
                  // Los snapshots vienen desc; el siguiente índice es la medición anterior
                  const prev = healthSnapshots[i + 1];
                  const weightChange = prev?.weight_kg != null
                    ? snap.weight_kg - prev.weight_kg : null;
                  const fatChange = (prev?.body_fat_pct != null && snap.body_fat_pct != null)
                    ? snap.body_fat_pct - prev.body_fat_pct : null;
                  const muscleChange = (prev?.muscle_mass_kg != null && snap.muscle_mass_kg != null)
                    ? snap.muscle_mass_kg - prev.muscle_mass_kg : null;

                  return (
                    <div key={snap.id} className="px-4 py-3 hover:bg-[#0f0f0f]">
                      <div className="flex items-start justify-between gap-4">
                        {/* Fecha y notas del snapshot */}
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E14] mt-1.5 shrink-0" />
                          <div>
                            <p className="text-[12px] font-medium text-[#ccc]">
                              {new Date(snap.recorded_at).toLocaleDateString("es-CR", {
                                day: "numeric", month: "long", year: "numeric",
                              })}
                            </p>
                            {snap.notes && (
                              <p className="text-[10px] text-[#555] mt-0.5">{snap.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Métricas con delta vs snapshot anterior */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-[13px] font-semibold font-barlow text-[#FF5E14]">
                              {snap.weight_kg} kg
                            </p>
                            {weightChange !== null && (
                              <p className={`text-[9px] ${weightChange > 0 ? "text-[#F87171]" : weightChange < 0 ? "text-[#4ADE80]" : "text-[#555]"}`}>
                                {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
                              </p>
                            )}
                          </div>

                          {snap.body_fat_pct != null && (
                            <div className="text-right">
                              <p className="text-[12px] font-medium text-[#F59E0B]">
                                {snap.body_fat_pct}%
                              </p>
                              {fatChange !== null && (
                                <p className={`text-[9px] ${fatChange > 0 ? "text-[#F87171]" : fatChange < 0 ? "text-[#4ADE80]" : "text-[#555]"}`}>
                                  {fatChange > 0 ? "+" : ""}{fatChange.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          )}

                          {snap.muscle_mass_kg != null && (
                            <div className="text-right">
                              <p className="text-[12px] font-medium text-[#22C55E]">
                                {snap.muscle_mass_kg} kg
                              </p>
                              {muscleChange !== null && (
                                // Para músculo: subir es positivo (verde), bajar es negativo (rojo)
                                <p className={`text-[9px] ${muscleChange < 0 ? "text-[#F87171]" : muscleChange > 0 ? "text-[#4ADE80]" : "text-[#555]"}`}>
                                  {muscleChange > 0 ? "+" : ""}{muscleChange.toFixed(1)} kg
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección 5 — Fotos de progreso (condicionada al feature flag gym_progress) */}
          {themeConfig.features.gym_progress && (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                  Fotos de progreso
                </p>
                <ProgressPhotoUpload memberId={id} />
              </div>

              {progressPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-[12px] text-[#444]">Sin fotos registradas</p>
                  <p className="text-[10px] text-[#333] mt-1">
                    Agrega fotos front / side / back para comparar la evolución
                  </p>
                </div>
              ) : (
                // Agrupar fotos por fecha (taken_at)
                (() => {
                  const grouped = progressPhotos.reduce<Record<string, typeof progressPhotos>>(
                    (acc, p) => {
                      const key = new Date(p.taken_at).toLocaleDateString("es-CR", {
                        day: "numeric", month: "long", year: "numeric",
                      });
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(p);
                      return acc;
                    },
                    {}
                  );

                  return Object.entries(grouped).map(([dateLabel, photos]) => (
                    <div key={dateLabel} className="space-y-2">
                      <p className="text-[10px] text-[#555] uppercase tracking-[0.06em]">{dateLabel}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["front", "side", "back"] as const).map((type) => {
                          const photo = photos.find((p) => p.photo_type === type);
                          const typeLabel = { front: "Frente", side: "Lado", back: "Espalda" }[type];
                          return (
                            <div
                              key={type}
                              className="aspect-[3/4] relative rounded-[10px] overflow-hidden"
                              style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a" }}
                            >
                              {photo ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.photo_url}
                                    alt={`${typeLabel} — ${dateLabel}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div
                                    className="absolute bottom-0 left-0 right-0 px-2 py-1"
                                    style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}
                                  >
                                    <p className="text-[9px] text-white font-medium">{typeLabel}</p>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                  <p className="text-[9px] text-[#333]">{typeLabel}</p>
                                  <p className="text-[8px] text-[#272727]">Sin foto</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          )}

        </div>
      )}

      {/* Tab: Rutina — col izquierda (detalle activa) + col derecha (lista para asignar) */}
      {tab === "routine" && themeConfig.features.gym_routines && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* ── Columna izquierda: detalle de la rutina activa (2/3) ── */}
          <div className="lg:col-span-2 space-y-3">
            {memberActiveRoutine && activeRoutineDetail ? (
              <>
                {/* Card: header, stats y grupos musculares */}
                <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-1">
                        Rutina activa
                      </p>
                      <p className="text-[17px] font-bold font-barlow text-white leading-tight">
                        {activeRoutineDetail.name}
                      </p>
                      {activeRoutineDetail.description && (
                        <p className="text-[11px] text-[#555] mt-1">{activeRoutineDetail.description}</p>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                      style={{ backgroundColor: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E30" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      Activa
                    </span>
                  </div>

                  {/* Stats: días, ejercicios, series */}
                  {routineStats && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Días",        value: routineStats.totalDays },
                        { label: "Ejercicios",  value: routineStats.totalExercises },
                        { label: "Series tot.", value: routineStats.totalSets },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2 text-center">
                          <p className="text-[16px] font-bold font-barlow text-[#FF5E14]">{value}</p>
                          <p className="text-[9px] text-[#444] uppercase tracking-[0.06em]">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pills de grupos musculares trabajados */}
                  {routineStats && routineStats.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {routineStats.muscleGroups.slice(0, 6).map((mg) => (
                        <span
                          key={mg}
                          className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                          style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1425" }}
                        >
                          {MUSCLE_LABELS[mg] ?? mg}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Link a rutina completa + fecha de asignación */}
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center gap-3">
                    <Link
                      href={`/admin/routines/${memberActiveRoutine.routine_id}`}
                      className="text-[11px] text-[#FF5E14] hover:underline"
                    >
                      Ver rutina completa →
                    </Link>
                    <span className="text-[10px] text-[#444]">
                      Asignada {formatDate(memberActiveRoutine.starts_at)}
                    </span>
                  </div>
                </div>

                {/* Acordeón de días con ejercicios */}
                <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1a1a1a]">
                    <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                      Días de la rutina
                    </p>
                  </div>
                  <div className="divide-y divide-[#0d0d0d]">
                    {(activeRoutineDetail.days ?? [])
                      .sort((a, b) => a.day_number - b.day_number)
                      .map((day) => (
                        <RoutineDayAccordion key={day.id} day={day} />
                      ))}
                  </div>
                </div>
              </>
            ) : (
              /* Estado vacío: el miembro no tiene rutina asignada */
              <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-8 text-center">
                <p className="text-[13px] text-[#555] mb-1">Sin rutina activa</p>
                <p className="text-[11px] text-[#333]">Asigna una rutina desde el panel derecho</p>
              </div>
            )}
          </div>

          {/* ── Columna derecha: lista compacta para asignar/reasignar (1/3) ── */}
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                  Cambiar rutina
                </p>
              </div>
              <div className="divide-y divide-[#0d0d0d]">
                {routines.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[11px] text-[#444]">Sin rutinas creadas</p>
                    <Link
                      href="/admin/routines/new"
                      className="text-[10px] text-[#FF5E14] hover:underline mt-1 block"
                    >
                      Crear rutina →
                    </Link>
                  </div>
                ) : (
                  routines.map((routine) => {
                    const isActive = memberActiveRoutine?.routine_id === routine.id;
                    return (
                      <div
                        key={routine.id}
                        className={`flex items-center justify-between px-4 py-3 transition-colors ${
                          isActive ? "bg-[#0d1a10]" : "hover:bg-[#0f0f0f]"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-medium truncate ${isActive ? "text-[#22C55E]" : "text-[#ccc]"}`}>
                            {routine.name}
                          </p>
                          {routine.days_per_week && (
                            <p className="text-[10px] text-[#444]">{routine.days_per_week} días/semana</p>
                          )}
                        </div>
                        <div className="ml-2 shrink-0">
                          {isActive ? (
                            <span className="text-[9px] text-[#22C55E] font-medium">Activa</span>
                          ) : (
                            <AssignRoutineButton memberId={id} routineId={routine.id} isActive={false} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab: Pagos — estado actual + historial inline + registro de pago manual */}
      {tab === "payments" && (
        <div className="space-y-3">

          {/* Card: estado actual de membresía */}
          {sub ? (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
                  Membresía actual
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.cls}`}
                >
                  {statusCfg.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-[12px]">
                <p className="text-[#ccc] font-medium">{sub.plan?.name ?? "—"}</p>
                <p className="text-[#666]">
                  {sub.expires_at ? `Vence ${formatDate(sub.expires_at)}` : "Sin vencimiento"}
                </p>
              </div>

              {/* Barra de progreso: días consumidos vs duración total del plan */}
              {membershipTotalDays > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${membershipProgressPct}%`, backgroundColor: membershipBarColor }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#555]">
                    <span>{membershipDaysUsed} días consumidos</span>
                    <span>{membershipDaysLeft} días restantes</span>
                  </div>
                </div>
              )}

              {/* Alerta de vencimiento */}
              {(isExpiringSoon || isExpired) && (
                <div className={`flex items-center gap-2 rounded-[10px] px-3 py-2 border ${
                  isExpired
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-[11px] font-medium">
                    {isExpired
                      ? "Membresía vencida — el miembro no puede acceder al gym"
                      : `Vence en ${daysUntilExpiry} día${daysUntilExpiry === 1 ? "" : "s"}`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
              <p className="text-[12px] text-[#555]">Sin membresía registrada</p>
            </div>
          )}

          {/* Header con botón de pago manual */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
              Historial de pagos
            </p>
            {sub && membershipPlans.length > 0 && (
              <ManualPaymentButton
                memberId={id}
                subscriptionId={sub.id}
                currentPlanId={sub.plan?.id ?? membershipPlans[0].id}
                plans={membershipPlans}
              />
            )}
          </div>

          {/* Tabla de pagos: Fecha / Plan / Monto / Método / Estado / Comprobante */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
            {memberPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Receipt className="w-8 h-8 text-[#333] mb-2" />
                <p className="text-[12px] text-[#555]">Sin pagos registrados</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {["Fecha", "Plan", "Monto", "Método", "Estado", "Comprobante"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[9px] text-[#444] uppercase tracking-[0.07em] font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberPayments.map((payment) => {
                    const pStatus = payment.status as "approved" | "pending" | "rejected";
                    const statusMap = {
                      approved: { bg: "#16A34A20", text: "#4ADE80", label: "Aprobado" },
                      pending:  { bg: "#F59E0B20", text: "#FCD34D", label: "Pendiente" },
                      rejected: { bg: "#EF444420", text: "#F87171", label: "Rechazado" },
                    };
                    const sc = statusMap[pStatus] ?? statusMap.pending;
                    const planInfo = (payment.subscription as { plan?: { name?: string; currency?: string } } | null)?.plan;
                    const currency = planInfo?.currency ?? "CRC";
                    const hasFile = !!payment.file_url && payment.file_url !== "";
                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-[#0f0f0f] last:border-0 hover:bg-[#0f0f0f] transition-colors"
                      >
                        <td className="px-4 py-3 text-[12px] text-[#888]">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] bg-[#161616] border border-[#222] rounded px-1.5 py-0.5 text-[#777]">
                            {planInfo?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#ccc] font-medium">
                          {payment.amount ? formatPrice(payment.amount, currency) : "—"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[#666] capitalize">
                          {payment.payment_method ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ backgroundColor: sc.bg, color: sc.text }}
                            >
                              {sc.label}
                            </span>
                            {/* Motivo de rechazo bajo el badge */}
                            {pStatus === "rejected" && payment.rejection_reason && (
                              <p className="text-[9px] text-[#555] leading-tight max-w-[140px]">
                                {payment.rejection_reason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasFile ? (
                            <a
                              href={payment.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#FF5E14] hover:underline"
                            >
                              Ver
                            </a>
                          ) : (
                            <span className="text-[10px] text-[#444]">Presencial</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
