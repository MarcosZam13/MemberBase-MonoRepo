// ChallengeFilterClient.tsx — Wrapper client con chips de filtro para la lista de retos admin

"use client";

import { useState } from "react";
import { AdminChallengeCard } from "./AdminChallengeCard";
import type { Challenge } from "@/types/gym-challenges";

type FilterStatus = "all" | "active" | "upcoming" | "closed";

const FILTER_LABELS: Record<FilterStatus, string> = {
  all: "Todos",
  active: "Activos",
  upcoming: "Próximos",
  closed: "Cerrados",
};

interface ChallengeFilterClientProps {
  challenges: Challenge[];
}

export function ChallengeFilterClient({ challenges }: ChallengeFilterClientProps): React.ReactNode {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const now = new Date();

  function getStatus(c: Challenge): FilterStatus {
    const start = new Date(c.starts_at);
    const end = new Date(c.ends_at);
    if (now >= start && now <= end) return "active";
    if (now < start) return "upcoming";
    return "closed";
  }

  const filtered = challenges.filter((c) => filter === "all" || getStatus(c) === filter);

  const counts: Record<FilterStatus, number> = {
    all: challenges.length,
    active: challenges.filter((c) => getStatus(c) === "active").length,
    upcoming: challenges.filter((c) => getStatus(c) === "upcoming").length,
    closed: challenges.filter((c) => getStatus(c) === "closed").length,
  };

  return (
    <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] overflow-hidden">
      {/* Header con chips de filtro */}
      <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center gap-2 flex-wrap">
        {(["all", "active", "upcoming", "closed"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-6 px-2.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
              filter === f
                ? f === "active"
                  ? "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.25)] text-[#22C55E]"
                  : f === "upcoming"
                    ? "bg-[rgba(56,189,248,0.1)] border-[rgba(56,189,248,0.25)] text-[#38BDF8]"
                    : "bg-[rgba(255,94,20,0.1)] border-[rgba(255,94,20,0.3)] text-[#FF5E14]"
                : "bg-[#1a1a1a] border-[#2a2a2a] text-[#555] hover:border-[#333]"
            }`}
          >
            {FILTER_LABELS[f]}
            {counts[f] > 0 && (
              <span className="font-barlow font-bold">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de cards */}
      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-[#444] text-sm text-center py-6">
            No hay retos con este filtro
          </p>
        ) : (
          filtered.map((challenge) => (
            <AdminChallengeCard key={challenge.id} challenge={challenge} />
          ))
        )}
      </div>
    </div>
  );
}
