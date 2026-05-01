// AdminChallengeCard.tsx — Card de reto para vista admin con stats, barra y nuevos tipos

import Link from "next/link";
import Image from "next/image";
import type { Challenge } from "@/types/gym-challenges";

// Iconos, colores y labels para cada tipo (incluyendo los nuevos)
const TYPE_META: Record<string, { icon: string; accent: string; bg: string; border: string; label: string }> = {
  attendance:      { icon: "🏃", accent: "#38BDF8", bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.2)",  label: "Asistencia"     },
  workout:         { icon: "💪", accent: "#FF5E14", bg: "rgba(255,94,20,0.1)",   border: "rgba(255,94,20,0.25)",  label: "Workout"        },
  weight:          { icon: "⚖️", accent: "#22C55E", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)",   label: "Peso"           },
  weight_loss:     { icon: "⚖️", accent: "#22C55E", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)",   label: "Pérdida Peso"   },
  personal_record: { icon: "🏋️", accent: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)",   label: "Récord Personal"},
  custom:          { icon: "⭐", accent: "#A855F7",  bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)",  label: "Personalizado"  },
};

const DEFAULT_META = TYPE_META.custom;

interface AdminChallengeCardProps {
  challenge: Challenge;
}

export function AdminChallengeCard({ challenge }: AdminChallengeCardProps): React.ReactNode {
  const now = new Date();
  const startsAt = new Date(challenge.starts_at);
  const endsAt = new Date(challenge.ends_at);
  const isActive = now >= startsAt && now <= endsAt;
  const isUpcoming = now < startsAt;

  const daysLeft = isActive
    ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : isUpcoming
      ? Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const meta = TYPE_META[challenge.type] ?? DEFAULT_META;
  const participants = challenge.participants_count ?? 0;
  const maxPart = challenge.max_participants;

  // Barra de progreso del reto (tiempo transcurrido)
  const totalDays = Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, totalDays - daysLeft);
  const timePct = isActive ? Math.round((elapsedDays / totalDays) * 100) : 0;

  // Barra de participantes vs máximo
  const participantPct = maxPart ? Math.min(100, Math.round((participants / maxPart) * 100)) : null;

  return (
    <div
      className={`bg-[#111] border rounded-[16px] overflow-hidden transition-all hover:border-[#2a2a2a] ${
        isActive ? "border-[rgba(255,94,20,0.25)]" : isUpcoming ? "border-[rgba(56,189,248,0.15)]" : "border-[#1e1e1e] opacity-60"
      }`}
    >
      {/* Banner: imagen real o placeholder por tipo */}
      {challenge.banner_url ? (
        <div className="h-[90px] relative overflow-hidden">
          <Image src={challenge.banner_url} alt={challenge.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 400px" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />
          {/* Badge tipo sobre banner */}
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold"
            style={{ backgroundColor: `${meta.accent}28`, color: meta.accent, border: `1px solid ${meta.accent}40` }}
          >
            {meta.label.toUpperCase()}
          </span>
        </div>
      ) : (
        <div
          className="h-[70px] flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${meta.bg}, transparent)`, borderBottom: `1px solid ${meta.border}` }}
        >
          <span className="text-3xl opacity-50">{meta.icon}</span>
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold"
            style={{ backgroundColor: `${meta.accent}20`, color: meta.accent, border: `1px solid ${meta.accent}35` }}
          >
            {meta.label.toUpperCase()}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Título + badge estado */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link
            href={`/admin/challenges/${challenge.id}`}
            className="text-[14px] font-semibold text-white hover:text-[#FF5E14] transition-colors leading-tight"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            {challenge.title}
          </Link>
          {isActive && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] text-[#22C55E] flex-shrink-0">
              ACTIVO
            </span>
          )}
          {isUpcoming && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.25)] text-[#38BDF8] flex-shrink-0">
              PRÓXIMO
            </span>
          )}
          {!isActive && !isUpcoming && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] flex-shrink-0">
              CERRADO
            </span>
          )}
        </div>

        <p className="text-[11px] text-[#555] mb-3">
          Meta: {challenge.goal_value} {challenge.goal_unit}
          {isActive && ` · ${daysLeft}d restantes`}
          {isUpcoming && ` · Inicia en ${daysLeft}d`}
          {challenge.prize_description && (
            <span className="ml-2 text-[#FF5E14]">🎁 {challenge.prize_description}</span>
          )}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#161616] rounded-[10px] p-2 text-center">
            <div className="text-[18px] font-bold font-barlow leading-none" style={{ color: meta.accent }}>
              {participants}
            </div>
            <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">Inscritos</div>
          </div>
          <div className="bg-[#161616] rounded-[10px] p-2 text-center">
            <div className="text-[18px] font-bold font-barlow leading-none text-[#FACC15]">
              {maxPart ?? "∞"}
            </div>
            <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">Máx</div>
          </div>
          <div className="bg-[#161616] rounded-[10px] p-2 text-center">
            <div className="text-[18px] font-bold font-barlow leading-none text-white">
              {isActive ? `${timePct}%` : isUpcoming ? `${daysLeft}d` : "—"}
            </div>
            <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">
              {isActive ? "Tiempo" : isUpcoming ? "Para inicio" : "Terminó"}
            </div>
          </div>
        </div>

        {/* Barra de tiempo (solo activos) */}
        {isActive && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] mb-1 text-[#555]">
              <span>Progreso del período</span>
              <span style={{ color: meta.accent }}>{timePct}%</span>
            </div>
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${timePct}%`, backgroundColor: meta.accent }} />
            </div>
          </div>
        )}

        {/* Barra de participantes (si hay máximo) */}
        {participantPct !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1 text-[#555]">
              <span>Cupo</span>
              <span className={participantPct >= 90 ? "text-[#EF4444]" : "text-[#555]"}>
                {participants}/{maxPart}
              </span>
            </div>
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${participantPct}%`,
                  backgroundColor: participantPct >= 90 ? "#EF4444" : "#22C55E",
                }}
              />
            </div>
          </div>
        )}

        {/* Footer: fechas + acciones */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[#555]">
            {new Date(challenge.starts_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
            {" – "}
            {new Date(challenge.ends_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <div className="flex gap-1.5">
            <Link
              href={`/admin/challenges/${challenge.id}`}
              className="h-6 px-2.5 text-[11px] font-medium bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] rounded-lg hover:text-white transition-colors flex items-center"
            >
              Ranking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
