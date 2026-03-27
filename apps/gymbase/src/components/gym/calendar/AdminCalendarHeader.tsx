// AdminCalendarHeader.tsx — Encabezado del calendario admin con navegación de semana

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClassType } from "@/types/gym-calendar";
import type { AdminProfile } from "@/actions/settings.actions";

interface AdminCalendarHeaderProps {
  weekLabel: string;
  classTypes: ClassType[];
  instructors: AdminProfile[];
}

export function AdminCalendarHeader({ weekLabel }: AdminCalendarHeaderProps): React.ReactNode {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
        <p className="text-sm text-[#555] mt-0.5">{weekLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Navegación entre semanas — placeholder para futura navegación con estado */}
        <button className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex items-center justify-center hover:border-[#333] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[#888]" />
        </button>
        <button className="h-8 px-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:border-[#333] transition-colors">
          Hoy
        </button>
        <button className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex items-center justify-center hover:border-[#333] transition-colors">
          <ChevronRight className="w-4 h-4 text-[#888]" />
        </button>
      </div>
    </div>
  );
}
