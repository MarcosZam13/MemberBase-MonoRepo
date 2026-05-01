// ChallengeRanking.tsx — Tabla de posiciones dark theme con badges de podio y otorgamiento admin

"use client";

import { useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { awardBadge } from "@/actions/challenge.actions";
import { toast } from "sonner";
import type { ChallengeParticipant, Challenge, BadgeType } from "@/types/gym-challenges";

interface ChallengeRankingProps {
  participants: ChallengeParticipant[];
  challenge: Challenge;
  myUserId?: string;      // Para resaltar la fila del miembro actual
  isAdmin?: boolean;       // Muestra botones de badge solo en vista admin
}

// Emojis y colores de podio
const PODIUM: Record<number, { emoji: string; color: string; bg: string }> = {
  0: { emoji: "🥇", color: "#FACC15", bg: "rgba(250,204,21,0.12)" },
  1: { emoji: "🥈", color: "#9CA3AF", bg: "rgba(156,163,175,0.1)" },
  2: { emoji: "🥉", color: "#CD7C2F", bg: "rgba(205,124,47,0.1)"  },
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Retorna el label de progreso según el tipo del reto
function formatProgress(value: number, challenge: Challenge): string {
  const v = Number.isInteger(value) ? value : value.toFixed(1);
  if (challenge.type === "weight_loss" || challenge.type === "weight") {
    return `${v} ${challenge.goal_unit} bajados`;
  }
  return `${v} / ${challenge.goal_value} ${challenge.goal_unit}`;
}

export function ChallengeRanking({
  participants,
  challenge,
  myUserId,
  isAdmin = false,
}: ChallengeRankingProps): React.ReactNode {
  const [loadingBadge, setLoadingBadge] = useState<string | null>(null);

  const sorted = [...participants].sort((a, b) => (b.total_progress ?? 0) - (a.total_progress ?? 0));
  const goalValue = challenge.goal_value || 1;

  // No mostrar ranking si el reto es privado y no es admin
  if (!challenge.is_public && !isAdmin) return null;

  async function handleAwardBadge(userId: string, type: BadgeType): Promise<void> {
    setLoadingBadge(`${userId}-${type}`);
    const result = await awardBadge(userId, challenge.id, type);
    if (result.success) {
      toast.success("Badge otorgado correctamente");
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al otorgar badge";
      toast.error(msg);
    }
    setLoadingBadge(null);
  }

  return (
    <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FACC15]" />
          <span className="text-xs font-semibold text-[#666] uppercase tracking-[0.08em]">
            Ranking
          </span>
        </div>
        <span className="text-[11px] text-[#444]">{sorted.length} participantes</span>
      </div>

      {/* Lista */}
      <div className="divide-y divide-[#111]">
        {sorted.length === 0 ? (
          <p className="text-center py-12 text-[#444] text-sm">Sin participantes aún</p>
        ) : (
          sorted.map((p, i) => {
            const progress = p.total_progress ?? 0;
            const pct = Math.min(100, Math.round((progress / goalValue) * 100));
            const podium = PODIUM[i];
            const isMe = p.user_id === myUserId;
            const isWeightType = challenge.type === "weight_loss" || challenge.type === "weight";
            const hasNoPesaje = isWeightType && p.baseline_weight_kg === null;

            return (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center gap-3 transition-colors"
                style={{
                  backgroundColor: isMe ? "rgba(255,94,20,0.04)" : undefined,
                  borderLeft: isMe ? "2px solid #FF5E14" : "2px solid transparent",
                }}
              >
                {/* Posición / emoji podio */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold font-barlow"
                  style={
                    podium
                      ? { backgroundColor: podium.bg, color: podium.color }
                      : { backgroundColor: "#1a1a1a", color: "#555" }
                  }
                >
                  {podium ? podium.emoji : i + 1}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-barlow flex-shrink-0"
                  style={{ backgroundColor: "#1e1e1e", color: "#888" }}
                >
                  {p.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.profile.avatar_url}
                      alt={p.profile.full_name ?? ""}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(p.profile?.full_name)
                  )}
                </div>

                {/* Nombre + progreso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white truncate">
                      {p.profile?.full_name ?? "Participante"}
                    </p>
                    {isMe && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,94,20,0.15)] text-[#FF5E14] font-semibold flex-shrink-0">
                        TÚ
                      </span>
                    )}
                    {i === 0 && pct >= 100 && (
                      <span className="text-[9px] text-[#22C55E] font-semibold flex-shrink-0">✓ Completó</span>
                    )}
                  </div>
                  {hasNoPesaje ? (
                    <p className="text-[10px] text-[#555] mt-0.5">Pesaje pendiente</p>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: podium?.color ?? "#555",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#666]">{formatProgress(progress, challenge)}</span>
                    </div>
                  )}
                </div>

                {/* Botones de badge para admin */}
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(
                      [
                        { type: "winner" as BadgeType, emoji: "🏆", tip: "Ganador" },
                        { type: "top3" as BadgeType, emoji: "⚡", tip: "Top 3" },
                        { type: "completed" as BadgeType, emoji: "🎖️", tip: "Completó" },
                      ]
                    ).map(({ type, emoji, tip }) => {
                      const key = `${p.user_id}-${type}`;
                      const busy = loadingBadge === key;
                      return (
                        <button
                          key={type}
                          title={tip}
                          disabled={busy}
                          onClick={() => handleAwardBadge(p.user_id, type)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#FF5E14] transition-colors text-sm disabled:opacity-40"
                        >
                          {busy ? <Loader2 className="w-3 h-3 animate-spin text-[#555]" /> : emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mensaje motivacional si el miembro está en top 3 */}
      {myUserId && sorted.slice(0, 3).some((p) => p.user_id === myUserId) && (
        <div className="px-4 py-2.5 border-t border-[#1a1a1a] bg-[rgba(255,94,20,0.03)]">
          <p className="text-[11px] text-[#FF5E14] font-medium text-center">
            🔥 Estás en el top 3 — ¡seguí así!
          </p>
        </div>
      )}
    </div>
  );
}
