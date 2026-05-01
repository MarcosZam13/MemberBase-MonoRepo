// ReactionsBar.tsx — Muestra los conteos de reacciones activas en el footer de un post

"use client";

import { useState, useTransition, useOptimistic } from "react";
import { Smile } from "lucide-react";
import { toggleReaction } from "@/actions/community.actions";
import { ReactionsPicker } from "./ReactionsPicker";
import type { ReactionType } from "@/types/database";
import { toast } from "sonner";

interface ReactionsBarProps {
  postId: string;
  initialCounts: Partial<Record<ReactionType, number>>;
  initialMyReaction: ReactionType | null;
  currentUserId: string | null;
}

const EMOJI_MAP: Record<ReactionType, string> = {
  like:   "👍",
  clap:   "👏",
  fire:   "🔥",
  muscle: "💪",
  heart:  "❤️",
  laugh:  "😂",
  sad:    "😢",
};

const REACTION_ORDER: ReactionType[] = ["like", "clap", "fire", "muscle", "heart", "laugh", "sad"];

export function ReactionsBar({
  postId,
  initialCounts,
  initialMyReaction,
  currentUserId,
}: ReactionsBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [, startTransition] = useTransition();

  // Estado optimista: refleja cambios locales inmediatamente antes de que el server responda
  const [optimisticState, addOptimistic] = useOptimistic(
    { counts: initialCounts, myReaction: initialMyReaction },
    (state, newReaction: ReactionType | null) => {
      const counts = { ...state.counts };
      const prev = state.myReaction;

      // Quitar reacción anterior si existía
      if (prev) {
        counts[prev] = Math.max((counts[prev] ?? 1) - 1, 0);
        if (counts[prev] === 0) delete counts[prev];
      }

      // Agregar nueva reacción si no es toggle-off
      if (newReaction !== null) {
        counts[newReaction] = (counts[newReaction] ?? 0) + 1;
      }

      return { counts, myReaction: newReaction };
    }
  );

  // Reacciones con al menos 1 voto, en orden definido
  const activeReactions = REACTION_ORDER.filter(
    (t) => (optimisticState.counts[t] ?? 0) > 0
  );

  function handleSelectReaction(type: ReactionType) {
    if (!currentUserId) {
      toast.error("Inicia sesión para reaccionar");
      return;
    }

    // Determinar si es toggle-off o nuevo tipo
    const isSame = optimisticState.myReaction === type;
    const nextReaction = isSame ? null : type;

    startTransition(async () => {
      addOptimistic(nextReaction);
      const result = await toggleReaction({ post_id: postId, type });
      if (!result.success) {
        toast.error("No se pudo guardar la reacción. Intenta de nuevo.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Reacciones activas */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1.5">
          {activeReactions.map((type) => (
            <button
              key={type}
              type="button"
              title={type}
              onClick={() => handleSelectReaction(type)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer"
              style={{
                background: optimisticState.myReaction === type
                  ? "rgba(255,94,20,0.15)"
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${optimisticState.myReaction === type ? "rgba(255,94,20,0.4)" : "#2a2a2a"}`,
                color: optimisticState.myReaction === type ? "#FF5E14" : "#737373",
              }}
            >
              <span>{EMOJI_MAP[type]}</span>
              <span>{optimisticState.counts[type]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Botón de agregar reacción */}
      <div className="relative">
        <button
          type="button"
          title="Reaccionar"
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-1 h-7 px-2 rounded-full text-xs transition-all cursor-pointer hover:bg-white/5"
          style={{ color: "#555", border: "1px solid #2a2a2a" }}
        >
          <Smile className="w-3.5 h-3.5" />
          {activeReactions.length === 0 && (
            <span>Reaccionar</span>
          )}
        </button>

        {showPicker && (
          <ReactionsPicker
            onSelect={handleSelectReaction}
            onClose={() => setShowPicker(false)}
            currentReaction={optimisticState.myReaction}
          />
        )}
      </div>
    </div>
  );
}
