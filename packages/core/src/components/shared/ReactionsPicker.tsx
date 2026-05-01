// ReactionsPicker.tsx — Burbuja flotante de emojis estilo WhatsApp para seleccionar reacción

"use client";

import { useEffect, useRef } from "react";
import type { ReactionType } from "@/types/database";

interface ReactionsPickerProps {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  currentReaction?: ReactionType | null;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like",   emoji: "👍", label: "Me gusta" },
  { type: "clap",   emoji: "👏", label: "Aplausos" },
  { type: "fire",   emoji: "🔥", label: "Fuego" },
  { type: "muscle", emoji: "💪", label: "Fuerza" },
  { type: "heart",  emoji: "❤️", label: "Me encanta" },
  { type: "laugh",  emoji: "😂", label: "Gracioso" },
  { type: "sad",    emoji: "😢", label: "Triste" },
];

export function ReactionsPicker({ onSelect, onClose, currentReaction }: ReactionsPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera de la burbuja
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 px-3 py-2 rounded-full shadow-xl"
      style={{ background: "#1E1E1E", border: "1px solid #2a2a2a" }}
      role="toolbar"
      aria-label="Selecciona una reacción"
    >
      {REACTIONS.map(({ type, emoji, label }) => (
        <button
          key={type}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => { onSelect(type); onClose(); }}
          className="text-xl transition-transform duration-150 hover:scale-[1.4] active:scale-110 rounded-full p-0.5 cursor-pointer"
          style={currentReaction === type ? { filter: "drop-shadow(0 0 4px #FF5E14)" } : undefined}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
