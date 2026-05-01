// AttendancePaginatedTable.tsx — Tabla paginada de logs de asistencia con estado local (no URL)

"use client";

import { useState } from "react";
import { getMemberAttendanceLogsPaginated } from "@/actions/checkin.actions";
import type { AttendanceLog } from "@/types/gym-checkin";

const PAGE_SIZE = 20;

interface AttendancePaginatedTableProps {
  memberId: string;
  initialData: AttendanceLog[];
  initialTotal: number;
}

export function AttendancePaginatedTable({
  memberId,
  initialData,
  initialTotal,
}: AttendancePaginatedTableProps): React.ReactNode {
  const [logs, setLogs] = useState<AttendanceLog[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function goToPage(page: number): Promise<void> {
    if (page === currentPage || isLoading) return;
    setIsLoading(true);
    const { data, total: newTotal } = await getMemberAttendanceLogsPaginated(memberId, page, PAGE_SIZE);
    setLogs(data);
    setTotal(newTotal);
    setCurrentPage(page);
    setIsLoading(false);
  }

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
          Registros recientes
        </p>
        <span className="text-[10px] text-[#444]">{total} total</span>
      </div>

      {/* Filas de logs */}
      <div className={`divide-y divide-[#0d0d0d] transition-opacity ${isLoading ? "opacity-40" : ""}`}>
        {logs.length === 0 ? (
          <p className="text-center text-[#444] text-[12px] py-8">Sin asistencias registradas</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#0f0f0f]">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E14] shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[#ccc] capitalize">
                    {new Date(log.check_in_at).toLocaleDateString("es-CR", {
                      weekday: "short", day: "numeric", month: "short",
                    })}
                  </p>
                  <p className="text-[10px] text-[#555]">
                    {new Date(log.check_in_at).toLocaleTimeString("es-CR", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {log.check_out_at &&
                      ` → ${new Date(log.check_out_at).toLocaleTimeString("es-CR", {
                        hour: "2-digit", minute: "2-digit",
                      })}`
                    }
                  </p>
                </div>
              </div>
              {log.duration_minutes ? (
                <span className="text-[11px] font-semibold font-barlow text-[#FF5E14]">
                  {log.duration_minutes} min
                </span>
              ) : (
                <span className="text-[10px] text-[#444]">En curso</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Paginación local */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
          <p className="text-[10px] text-[#444]">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="h-6 w-6 flex items-center justify-center rounded text-[11px] text-[#666] bg-[#161616] border border-[#222] disabled:opacity-30 hover:text-[#ccc] transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="h-6 w-6 flex items-center justify-center rounded text-[11px] text-[#666] bg-[#161616] border border-[#222] disabled:opacity-30 hover:text-[#ccc] transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
