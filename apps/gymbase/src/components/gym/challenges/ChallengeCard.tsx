// ChallengeCard.tsx — Card de reto para el portal del miembro con progreso, ranking y alertas de pesaje

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, AlertTriangle } from "lucide-react";
import { joinChallenge } from "@/actions/challenge.actions";
import type { Challenge } from "@/types/gym-challenges";

interface ChallengeCardProps {
  challenge: Challenge;
  isJoined: boolean;
  myProgress?: number;
  myRank?: number;
  baselineSet?: boolean; // Para weight_loss: si el miembro tiene peso base registrado
}

// Paleta visual completa para los 6 tipos
const TYPE_META: Record<string, { accent: string; gradFrom: string; gradTo: string; icon: string; label: string }> = {
  attendance:      { accent: "#38BDF8", gradFrom: "#001624", gradTo: "#002a3a", icon: "🏃", label: "Asistencia"      },
  workout:         { accent: "#FF5E14", gradFrom: "#1a0800", gradTo: "#3a1200", icon: "💪", label: "Workout"         },
  weight:          { accent: "#22C55E", gradFrom: "#001a0d", gradTo: "#002a14", icon: "⚖️", label: "Peso"            },
  weight_loss:     { accent: "#22C55E", gradFrom: "#001a0d", gradTo: "#002a14", icon: "⚖️", label: "Pérdida de Peso" },
  personal_record: { accent: "#EF4444", gradFrom: "#1a0000", gradTo: "#2a0000", icon: "🏋️", label: "Récord Personal" },
  custom:          { accent: "#A855F7", gradFrom: "#100020", gradTo: "#1c0030", icon: "⭐", label: "Personalizado"   },
};

const DEFAULT_META = TYPE_META.custom;

export function ChallengeCard({
  challenge,
  isJoined,
  myProgress = 0,
  myRank,
  baselineSet = true,
}: ChallengeCardProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const startsAt = new Date(challenge.starts_at);
  const endsAt = new Date(challenge.ends_at);
  const isActive = now >= startsAt && now <= endsAt;
  const isUpcoming = now < startsAt;
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Alertas de pesaje para weight_loss
  const isWeightType = challenge.type === "weight_loss" || challenge.type === "weight";
  const daysUntilStart = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysAfterEnd = Math.ceil((now.getTime() - endsAt.getTime()) / (1000 * 60 * 60 * 24));
  const showBaselineAlert =
    isJoined &&
    isWeightType &&
    !baselineSet &&
    isUpcoming &&
    daysUntilStart <= 2;
  const showFinalAlert =
    isJoined &&
    isWeightType &&
    !isActive &&
    !isUpcoming &&
    daysAfterEnd <= 2;

  const meta = TYPE_META[challenge.type] ?? DEFAULT_META;
  const goalValue = challenge.goal_value || 1;
  const progressPct = Math.min(100, Math.round((myProgress / goalValue) * 100));

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
    <div className="bg-[#111] border border-[#1e1e1e] rounded-[18px] overflow-hidden hover:border-[#2a2a2a] transition-all">

      {/* Banner: imagen o gradiente con ícono */}
      {challenge.banner_url ? (
        <div className="h-24 relative overflow-hidden">
          <Image src={challenge.banner_url} alt={challenge.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 400px" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)" }} />
          {/* Badge tipo */}
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold"
            style={{ backgroundColor: `${meta.accent}28`, color: meta.accent, border: `1px solid ${meta.accent}40` }}
          >
            {meta.label.toUpperCase()}
          </span>
        </div>
      ) : (
        <div
          className="h-20 relative flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${meta.gradFrom}, ${meta.gradTo})` }}
        >
          <span className="text-3xl opacity-60">{meta.icon}</span>
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))" }}
          />
          {/* Badge estado */}
          <div className="absolute bottom-2 left-3 z-10">
            {isJoined && isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                Inscrito
              </span>
            )}
            {!isJoined && (isActive || isUpcoming) && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-sm"
                style={{ background: `${meta.accent}33`, color: meta.accent, borderColor: `${meta.accent}66` }}
              >
                Unirse
              </span>
            )}
            {!isActive && !isUpcoming && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(34,197,94,0.15)] text-[#22C55E] border border-[rgba(34,197,94,0.3)] backdrop-blur-sm">
                Finalizado
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alertas de pesaje para weight_loss */}
      {showBaselineAlert && (
        <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#FACC15] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FACC15] leading-relaxed">
            Coordiná tu pesaje inicial con un admin antes del{" "}
            {startsAt.toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
          </p>
        </div>
      )}
      {showFinalAlert && (
        <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#FACC15] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FACC15] leading-relaxed">
            El reto terminó. Coordiná tu pesaje final con un admin antes del{" "}
            {new Date(endsAt.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("es-CR", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      )}

      {/* Contenido */}
      <div className="p-4">
        <Link href={`/portal/challenges/${challenge.id}`} className="block">
          <h3
            className="text-[15px] font-semibold text-white mb-0.5 hover:text-[#FF5E14] transition-colors"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            {challenge.title}
          </h3>
        </Link>
        <p className="text-[11px] text-[#555] mb-3">
          {meta.label}
          {isActive && ` · ${daysLeft} días restantes`}
          {!isActive && !isUpcoming && " · Finalizado"}
          {isUpcoming && ` · Inicia en ${daysUntilStart} días`}
          {challenge.prize_description && (
            <span className="ml-2 text-[#FF5E14]">🎁 {challenge.prize_description}</span>
          )}
        </p>

        {/* Barra de progreso — si está inscrito y activo */}
        {isJoined && isActive && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[#888]">Tu progreso</span>
              <span className="font-semibold font-barlow" style={{ color: meta.accent }}>
                {isWeightType && !baselineSet
                  ? "Pesaje pendiente"
                  : `${Number.isInteger(myProgress) ? myProgress : myProgress.toFixed(1)} / ${challenge.goal_value} ${challenge.goal_unit}`}
              </span>
            </div>
            {(!isWeightType || baselineSet) && (
              <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%`, backgroundColor: meta.accent }}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {isJoined && myRank ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full">
              <span className="text-sm font-bold font-barlow text-[#FACC15]">{myRank}°</span>
              <span className="text-[10px] text-[#555]">posición</span>
            </div>
          ) : (
            !isJoined && (
              <div className="text-[11px] text-[#555]">
                {challenge.participants_count ?? 0} participantes
              </div>
            )
          )}
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
            className="w-full mt-3 h-10 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: meta.accent }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Inscribirme al reto
          </button>
        )}
      </div>
    </div>
  );
}
