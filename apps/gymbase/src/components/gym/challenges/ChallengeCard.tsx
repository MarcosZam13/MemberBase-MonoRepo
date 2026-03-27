// ChallengeCard.tsx — Card de reto para la vista miembro con progreso, ranking badge y botón de unirse

"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { joinChallenge } from "@/actions/challenge.actions";
import type { Challenge } from "@/types/gym-challenges";

interface ChallengeCardProps {
  challenge: Challenge;
  isJoined: boolean;
  myProgress?: number;
  myRank?: number;
}

// Colores por tipo de reto
const TYPE_COLORS: Record<string, { accent: string; gradFrom: string; gradTo: string }> = {
  attendance: { accent: "#FF5E14", gradFrom: "#1a0800", gradTo: "#3a1200" },
  workout:    { accent: "#38BDF8", gradFrom: "#001a26", gradTo: "#002a3a" },
  weight:     { accent: "#FACC15", gradFrom: "#1a1500", gradTo: "#2a2000" },
  custom:     { accent: "#A855F7", gradFrom: "#150026", gradTo: "#22003a" },
};

const TYPE_ICONS: Record<string, string> = {
  attendance: "🏃", workout: "💪", weight: "⚖️", custom: "⚙️",
};

export function ChallengeCard({ challenge, isJoined, myProgress = 0, myRank }: ChallengeCardProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const startsAt = new Date(challenge.starts_at);
  const endsAt = new Date(challenge.ends_at);
  const isActive = now >= startsAt && now <= endsAt;
  const isUpcoming = now < startsAt;
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const colors = TYPE_COLORS[challenge.type] ?? TYPE_COLORS.custom;
  const icon = TYPE_ICONS[challenge.type] ?? "⚙️";
  const progressPct = Math.min(100, Math.round((myProgress / (challenge.goal_value || 1)) * 100));

  async function handleJoin(): Promise<void> {
    setIsLoading(true);
    setError(null);
    const result = await joinChallenge(challenge.id);
    if (!result.success) {
      const msg = typeof result.error === "string" ? result.error : "Error al unirse";
      setError(msg);
    }
    setIsLoading(false);
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-[18px] overflow-hidden cursor-pointer hover:border-[#2a2a2a] transition-all">

      {/* Banner con gradiente + icono */}
      <div
        className="h-20 relative flex items-end px-4 pb-2.5"
        style={{ background: `linear-gradient(135deg, ${colors.gradFrom}, ${colors.gradTo})` }}
      >
        {/* Icono centrado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl opacity-60">{icon}</span>
        </div>
        {/* Overlay degradado */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7))" }} />
        {/* Badge estado */}
        <div className="relative z-10">
          {isJoined && isActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/25 backdrop-blur-sm">
              Inscrito
            </span>
          )}
          {!isJoined && (isActive || isUpcoming) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-sm" style={{ background: `${colors.accent}33`, color: colors.accent, borderColor: `${colors.accent}66` }}>
              Unirse
            </span>
          )}
          {!isActive && !isUpcoming && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[rgba(34,197,94,0.15)] text-[#22C55E] border border-[rgba(34,197,94,0.3)] backdrop-blur-sm">
              Finalizado
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <Link href={`/portal/challenges/${challenge.id}`} className="block">
          <h3 className="text-[15px] font-semibold text-white mb-0.5 hover:text-[#FF5E14] transition-colors">
            {challenge.title}
          </h3>
        </Link>
        <p className="text-[11px] text-[#555] mb-3">
          {challenge.type === "attendance" ? "Asistencia" : challenge.type === "workout" ? "Workout" : challenge.type === "weight" ? "Peso/Métrica" : "Personalizado"}
          {isActive && ` · ${daysLeft} días restantes`}
          {!isActive && !isUpcoming && ` · Finalizado`}
        </p>

        {/* Progreso — solo si está inscrito y activo */}
        {isJoined && isActive && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[#888]">Tu progreso</span>
              <span className="font-semibold font-barlow" style={{ color: colors.accent }}>
                {myProgress} / {challenge.goal_value} {challenge.goal_unit}
              </span>
            </div>
            <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, backgroundColor: colors.accent }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Rank badge — si está inscrito */}
          {isJoined && myRank && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full">
              <span className="text-sm font-bold font-barlow text-[#FACC15]">{myRank}°</span>
              <span className="text-[10px] text-[#555]">posición</span>
            </div>
          )}

          {/* Participantes — si no está inscrito */}
          {!isJoined && (
            <div className="text-[11px] text-[#555]">
              {challenge.participants_count ?? 0} participantes
              {challenge.prize_description && ` · 🎁 ${challenge.prize_description}`}
            </div>
          )}

          {/* Countdown */}
          {isActive && (
            <div className="text-[11px] text-[#555]">
              Cierra {endsAt.toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-[#EF4444] mt-2">{error}</p>}

        {/* Botón unirse */}
        {(isActive || isUpcoming) && !isJoined && (
          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full mt-3 h-10 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: colors.accent }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Inscribirme al reto
          </button>
        )}
      </div>
    </div>
  );
}
