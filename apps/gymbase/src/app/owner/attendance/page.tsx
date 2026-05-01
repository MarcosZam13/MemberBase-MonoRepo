// attendance/page.tsx — Reporte de asistencia con heatmap y tabla diaria

import { Suspense } from "react";
import { getAttendanceReport } from "@/actions/owner.actions";
import { AttendanceHeatmap } from "@/components/owner/AttendanceHeatmap";
import { PeriodSelector } from "@/components/owner/PeriodSelector";
import { ExportCSVButton } from "@/components/owner/ExportCSVButton";
import type { OwnerPeriod } from "@core/types/owner";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OwnerAttendancePage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const period: OwnerPeriod =
    params.period === "week" || params.period === "year" ? params.period : "month";

  const result = await getAttendanceReport(period);
  const data = result.success ? result.data! : [];

  const totalVisits = data.reduce((s, d) => s + d.total_visits, 0);
  const uniqueMembers = data.length > 0 ? Math.max(...data.map((d) => d.unique_members)) : 0;
  const avgDaily =
    data.length > 0
      ? (totalVisits / data.length).toFixed(1)
      : "0";
  const peakDay = data.reduce(
    (max, d) => (d.total_visits > (max?.total_visits ?? 0) ? d : max),
    data[0] ?? null
  );

  const csvRows = [...data]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({
      "Fecha": d.date,
      "Visitas totales": d.total_visits,
      "Miembros únicos": d.unique_members,
      "Hora pico": `${d.peak_hour}:00`,
    }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-barlow font-bold text-3xl text-white tracking-wide uppercase">
            Asistencia
          </h1>
          <p className="text-[#737373] text-sm mt-1">Análisis de visitas y patrones de uso</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportCSVButton filename={`asistencia-${period}.csv`} rows={csvRows} />
          <Suspense>
            <PeriodSelector current={period} />
          </Suspense>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Total de visitas</p>
          <p className="font-barlow font-bold text-3xl text-white">{totalVisits}</p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Promedio diario</p>
          <p className="font-barlow font-bold text-3xl text-white">{avgDaily}</p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Días con datos</p>
          <p className="font-barlow font-bold text-3xl text-white">{data.length}</p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Día pico</p>
          <p className="font-barlow font-bold text-3xl text-[#FF5E14]">
            {peakDay
              ? peakDay.total_visits
              : "—"}
          </p>
          {peakDay && (
            <p className="text-xs text-[#737373] mt-1">
              {new Date(peakDay.date + "T12:00:00").toLocaleDateString("es-CR", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 mb-6">
        <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
          Mapa de calor de asistencia
        </h2>
        <AttendanceHeatmap data={data} />
      </div>

      {/* Tabla diaria */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6">
        <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
          Detalle diario
        </h2>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="text-left py-3 px-4 text-[#737373] font-medium">Fecha</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">Visitas totales</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">Miembros únicos</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">Hora pico</th>
                  <th className="py-3 px-4 text-[#737373] font-medium">Actividad</th>
                </tr>
              </thead>
              <tbody>
                {[...data]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 30)
                  .map((row) => {
                    const barPct =
                      peakDay && peakDay.total_visits > 0
                        ? (row.total_visits / peakDay.total_visits) * 100
                        : 0;
                    return (
                      <tr
                        key={row.date}
                        className="border-b border-[#1E1E1E] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-4 text-white">
                          {new Date(row.date + "T12:00:00").toLocaleDateString("es-CR", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-barlow font-bold text-white text-base">
                          {row.total_visits}
                        </td>
                        <td className="py-3 px-4 text-right text-[#737373]">
                          {row.unique_members}
                        </td>
                        <td className="py-3 px-4 text-right text-[#737373]">
                          {row.peak_hour}:00
                        </td>
                        <td className="py-3 px-4 w-32">
                          <div className="h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#FF5E14] rounded-full"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-8 text-[#737373] text-sm">
            Sin registros de asistencia en el período seleccionado
          </p>
        )}
      </div>
    </div>
  );
}
