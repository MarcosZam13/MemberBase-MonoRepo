// AdminCalendarHeader.tsx — Encabezado del calendario admin con navegación de semana

"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminCalendarHeaderProps {
  weekLabel: string;
  weekOffset: number;
}

export function AdminCalendarHeader({ weekLabel, weekOffset }: AdminCalendarHeaderProps): React.ReactNode {
  const router = useRouter();

  function navigate(delta: number): void {
    const next = weekOffset + delta;
    router.push(next === 0 ? "/admin/calendar" : `/admin/calendar?w=${next}`);
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
        <p className="text-sm text-[#555] mt-0.5">{weekLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex items-center justify-center hover:border-[#333] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[#888]" />
        </button>
        <button
          onClick={() => navigate(-weekOffset)}
          disabled={weekOffset === 0}
          className="h-8 px-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-default hover:border-[#333] text-[#666]"
        >
          Hoy
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex items-center justify-center hover:border-[#333] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[#888]" />
        </button>
      </div>
    </div>
  );
}
