// page.tsx — Perfil detallado de un miembro con header de avatar, stats y tabs

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMemberById } from "@core/actions/admin.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import { getHealthProfile, getHealthHistory } from "@/actions/health.actions";
import { getRoutines, getMemberActiveRoutine } from "@/actions/routine.actions";
import { getAttendanceLogs } from "@/actions/checkin.actions";
import { HealthProfileCard } from "@/components/gym/health/HealthProfileCard";
import { HealthSnapshotList } from "@/components/gym/health/HealthSnapshotList";
import { HealthMetricsForm } from "@/components/gym/health/HealthMetricsForm";
import { SnapshotForm } from "@/components/gym/health/SnapshotForm";
import { MemberProfileEditForm } from "@/components/gym/members/MemberProfileEditForm";
import { AssignRoutineButton } from "@/components/gym/members/AssignRoutineButton";
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
    status: SubscriptionStatus;
    starts_at: string | null;
    expires_at: string | null;
    plan?: { name: string; price: number; currency: string; duration_days: number };
  }> | undefined;
  const sub = Array.isArray(subs) ? subs[0] : undefined;
  const status = (sub?.status ?? "none") as SubscriptionStatus | "none";
  const statusCfg = STATUS_CONFIG[status];

  // Cargar todos los datos en paralelo según módulos activos y pestaña
  const [healthProfile, healthSnapshots, routines, memberActiveRoutine, attendanceLogs] = await Promise.all([
    themeConfig.features.gym_health_metrics ? getHealthProfile(id) : Promise.resolve(null),
    themeConfig.features.gym_health_metrics ? getHealthHistory(id, 10) : Promise.resolve([]),
    themeConfig.features.gym_routines ? getRoutines() : Promise.resolve([]),
    themeConfig.features.gym_routines ? getMemberActiveRoutine(id) : Promise.resolve(null),
    getAttendanceLogs({ limit: 30 }),
  ]);

  // Filtrar logs solo de este miembro
  const memberLogs = attendanceLogs.filter((l) => l.user_id === id);

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

      {/* Tab: Resumen */}
      {tab === "info" && (
        <div className="grid grid-cols-2 gap-3">
          {/* Info personal */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 space-y-2">
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
              Información personal
            </p>
            {[
              { lbl: "Email", val: member.email },
              { lbl: "Teléfono", val: member.phone ?? "Sin teléfono" },
              { lbl: "Miembro desde", val: formatDate(member.created_at) },
              { lbl: "Rol", val: member.role },
            ].map(({ lbl, val }) => (
              <div key={lbl} className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                <p className="text-[9px] text-[#444] uppercase tracking-[0.07em] mb-0.5">{lbl}</p>
                <p className="text-[13px] text-[#ccc] font-medium">{val}</p>
              </div>
            ))}
            <div className="pt-2">
              <MemberProfileEditForm
                memberId={member.id}
                initialName={member.full_name ?? null}
                initialPhone={member.phone ?? null}
              />
            </div>
          </div>

          {/* Membresía */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4 space-y-2">
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
              Membresía
            </p>
            {sub ? (
              <>
                {[
                  { lbl: "Plan", val: `${sub.plan?.name ?? "—"} · ${sub.plan ? formatPrice(sub.plan.price, sub.plan.currency) : ""}` },
                  { lbl: "Miembro desde", val: formatDate(sub.starts_at ?? null) },
                  { lbl: "Vencimiento", val: formatDate(sub.expires_at ?? null) },
                  { lbl: "Último check-in", val: memberLogs[0] ? formatDate(memberLogs[0].check_in_at) : "—" },
                ].map(({ lbl, val }) => (
                  <div key={lbl} className="bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5">
                    <p className="text-[9px] text-[#444] uppercase tracking-[0.07em] mb-0.5">{lbl}</p>
                    <p className="text-[13px] text-[#ccc] font-medium">{val}</p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-[#555] py-4 text-center">Sin membresía activa</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Asistencias */}
      {tab === "attendance" && (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em]">
              Historial de asistencias
            </span>
            <span className="text-[10px] text-[#555]">{memberLogs.length} registros</span>
          </div>
          <div className="divide-y divide-[#0f0f0f]">
            {memberLogs.length === 0 ? (
              <p className="text-center text-[#444] text-sm py-10">Sin asistencias registradas</p>
            ) : (
              memberLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-[#ddd]">
                      {new Date(log.check_in_at).toLocaleDateString("es-CR", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </p>
                    <p className="text-[11px] text-[#555] mt-0.5">
                      {new Date(log.check_in_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                      {log.check_out_at && ` → ${new Date(log.check_out_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  {log.duration_minutes && (
                    <span className="text-[11px] font-semibold font-barlow text-[#FF5E14]">
                      {log.duration_minutes} min
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Salud */}
      {tab === "health" && themeConfig.features.gym_health_metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <HealthProfileCard profile={healthProfile} />
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
              <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
                Actualizar perfil
              </p>
              <HealthMetricsForm userId={id} profile={healthProfile} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
              <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
                Nuevo snapshot
              </p>
              <SnapshotForm userId={id} />
            </div>
            <HealthSnapshotList snapshots={healthSnapshots} />
          </div>
        </div>
      )}

      {/* Tab: Rutina */}
      {tab === "routine" && themeConfig.features.gym_routines && (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
              Rutinas disponibles
            </p>
            {memberActiveRoutine && (
              <span className="text-[10px] text-[#555]">
                Activa: <span className="text-[#22C55E]">{memberActiveRoutine.routine?.name}</span>
              </span>
            )}
          </div>
          {routines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#555] text-sm mb-4">No hay rutinas creadas aún.</p>
              <Link
                href="/admin/routines/new"
                className="h-8 px-4 bg-[#FF5E14] text-white text-xs font-semibold rounded-lg inline-flex items-center"
              >
                Crear rutina
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => {
                const isActive = memberActiveRoutine?.routine_id === routine.id;
                return (
                  <div
                    key={routine.id}
                    className={`flex items-center justify-between p-3 border rounded-[10px] transition-colors ${
                      isActive
                        ? "bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]"
                        : "bg-[#111] border-[#1a1a1a]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold truncate ${isActive ? "text-[#22C55E]" : "text-[#ddd]"}`}>
                        {routine.name}
                      </p>
                      {routine.description && (
                        <p className="text-[11px] text-[#555] mt-0.5 truncate">{routine.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <AssignRoutineButton memberId={id} routineId={routine.id} isActive={isActive} />
                      <Link
                        href={`/admin/routines/${routine.id}`}
                        className="h-7 px-3 text-[11px] font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-lg hover:text-white transition-colors flex items-center"
                      >
                        Ver
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === "payments" && (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-5">
          <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-4">
            Historial de pagos
          </p>
          <p className="text-[#555] text-sm text-center py-6">
            Historial de pagos disponible en{" "}
            <Link href="/admin/payments" className="text-[#FF5E14] hover:underline">
              Gestión de pagos
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
