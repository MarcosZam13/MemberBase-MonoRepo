// AdminChallengeCard.tsx — Card de reto para la vista admin con stats grid y barra de progreso

import Link from "next/link";
import type { Challenge } from "@/types/gym-challenges";

// Icono por tipo de reto
const TYPE_ICONS: Record<string, string> = {
  attendance: "🏃",
  workout:    "💪",
  weight:     "⚖️",
  custom:     "⚙️",
};

// Colores por tipo para el banner de la card
const TYPE_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  attendance: { bg: "rgba(255,94,20,0.12)",   border: "rgba(255,94,20,0.25)",   accent: "#FF5E14" },
  workout:    { bg: "rgba(56,189,248,0.1)",    border: "rgba(56,189,248,0.2)",   accent: "#38BDF8" },
  weight:     { bg: "rgba(250,204,21,0.08)",   border: "rgba(250,204,21,0.2)",   accent: "#FACC15" },
  custom:     { bg: "rgba(168,85,247,0.1)",    border: "rgba(168,85,247,0.2)",   accent: "#A855F7" },
};

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

  const colors = TYPE_COLORS[challenge.type] ?? TYPE_COLORS.custom;
  const icon = TYPE_ICONS[challenge.type] ?? "⚙️";
  const participants = challenge.participants_count ?? 0;

  // Progreso estimado basado en tiempo transcurrido (solo para activos)
  const totalDays = Math.ceil((endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, totalDays - daysLeft);
  const timePct = isActive && totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0;

  return (
    <div className={`bg-[#111] border rounded-[16px] p-4 cursor-pointer transition-all hover:border-[#2a2a2a] ${isActive ? "border-[rgba(255,94,20,0.3)]" : isUpcoming ? "border-[rgba(56,189,248,0.2)]" : "border-[#1e1e1e] opacity-60"}`}>

      {/* Top: icono + info + badge */}
      <div className="flex gap-3 items-start mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: colors.bg, border: `0.5px solid ${colors.border}` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/admin/challenges/${challenge.id}`} className="text-[15px] font-semibold text-white hover:text-[#FF5E14] transition-colors block truncate">
            {challenge.title}
          </Link>
          <p className="text-[11px] text-[#555] mt-0.5 truncate">
            {challenge.goal_value} {challenge.goal_unit}
            {isActive && ` · ${daysLeft} días restantes`}
            {isUpcoming && ` · Inicia en ${daysLeft} días`}
          </p>
        </div>
        {isActive && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] text-[#22C55E] flex-shrink-0">
            En curso
          </span>
        )}
        {isUpcoming && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.25)] text-[#38BDF8] flex-shrink-0">
            Próximo
          </span>
        )}
        {!isActive && !isUpcoming && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] flex-shrink-0">
            Finalizado
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-[#161616] rounded-[10px] p-2 text-center">
          <div className="text-[20px] font-bold font-barlow leading-none" style={{ color: colors.accent }}>{participants}</div>
          <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">Inscritos</div>
        </div>
        <div className="bg-[#161616] rounded-[10px] p-2 text-center">
          <div className="text-[20px] font-bold font-barlow leading-none text-[#22C55E]">
            {isActive ? Math.floor(participants * 0.3) : isUpcoming ? "–" : participants}
          </div>
          <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">Completaron</div>
        </div>
        <div className="bg-[#161616] rounded-[10px] p-2 text-center">
          <div className="text-[20px] font-bold font-barlow leading-none text-[#FACC15]">
            {isActive ? `${timePct}%` : isUpcoming ? "–" : "100%"}
          </div>
          <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">Progreso avg</div>
        </div>
        <div className="bg-[#161616] rounded-[10px] p-2 text-center">
          <div className="text-[20px] font-bold font-barlow leading-none text-white">{isActive ? daysLeft : isUpcoming ? `${daysLeft}d` : "–"}</div>
          <div className="text-[9px] text-[#555] uppercase tracking-[0.05em] mt-0.5">{isActive ? "Días rest." : isUpcoming ? "Para inicio" : "Terminó"}</div>
        </div>
      </div>

      {/* Barra de progreso (tiempo) */}
      {isActive && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${timePct}%`, backgroundColor: colors.accent }}
            />
          </div>
          <span className="text-xs font-semibold font-barlow" style={{ color: colors.accent }}>{timePct}%</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#555]">
          {new Date(challenge.starts_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })} – {new Date(challenge.ends_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <div className="flex gap-1.5">
          <Link
            href={`/admin/challenges/${challenge.id}`}
            className="h-6 px-2.5 text-[11px] font-medium bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] rounded-lg hover:text-white transition-colors flex items-center"
          >
            Ver ranking
          </Link>
          {isActive && (
            <button className="h-6 px-2.5 text-[11px] font-medium bg-[rgba(239,68,68,0.07)] text-[#EF4444] border border-[rgba(239,68,68,0.2)] rounded-lg hover:opacity-80 transition-opacity">
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
