// AttendanceHeatmap.tsx — Heatmap estilo GitHub de asistencia diaria (SVG nativo)

"use client";

import { useState } from "react";
import type { AttendanceReport } from "@core/types/owner";

interface AttendanceHeatmapProps {
  data: AttendanceReport[];
}

interface TooltipState {
  x: number;
  y: number;
  date: string;
  visits: number;
}

const CELL = 13;
const GAP = 2;
const STEP = CELL + GAP;
const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Intensidad de color según visitas relativas al máximo
function getCellColor(visits: number, max: number): string {
  if (visits === 0) return "#1E1E1E";
  const ratio = visits / max;
  if (ratio >= 0.75) return "#FF5E14";
  if (ratio >= 0.5) return "#FF7A3D";
  if (ratio >= 0.25) return "#FF9666";
  return "#FFB899";
}

export function AttendanceHeatmap({ data }: AttendanceHeatmapProps): React.ReactElement {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (!data.length) {
    return (
      <div className="text-center py-8 text-[#737373] text-sm">
        Sin datos de asistencia para el período
      </div>
    );
  }

  // Construir mapa fecha→visitas para lookup rápido
  const visitMap = new Map<string, number>(data.map((d) => [d.date, d.total_visits]));
  const maxVisits = Math.max(...data.map((d) => d.total_visits), 1);

  // Calcular el rango de fechas del heatmap (últimas 52 semanas o los datos disponibles)
  const sortedDates = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = new Date(sortedDates[0].date);
  const endDate = new Date(sortedDates[sortedDates.length - 1].date);

  // Ajustar inicio al domingo de la semana del primer dato
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay());

  // Generar celdas por semana y día
  const weeks: Array<Array<{ date: string; visits: number } | null>> = [];
  const cursor = new Date(start);

  while (cursor <= endDate) {
    const week: Array<{ date: string; visits: number } | null> = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (cursor < startDate || cursor > endDate) {
        week.push(null);
      } else {
        week.push({ date: dateStr, visits: visitMap.get(dateStr) ?? 0 });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Etiquetas de mes
  const monthLabels: Array<{ label: string; weekIdx: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d !== null);
    if (firstDay) {
      const m = new Date(firstDay.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          label: new Date(firstDay.date).toLocaleDateString("es-CR", { month: "short" }),
          weekIdx: wi,
        });
        lastMonth = m;
      }
    }
  });

  const svgWidth = weeks.length * STEP + 36;
  const svgHeight = 7 * STEP + 24;

  return (
    <div className="relative overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* Etiquetas días */}
        {DAYS_OF_WEEK.map((day, i) => (
          <text
            key={day}
            x={0}
            y={24 + i * STEP + CELL / 2 + 4}
            fill="#737373"
            fontSize="10"
            textAnchor="start"
          >
            {i % 2 === 0 ? day : ""}
          </text>
        ))}

        {/* Etiquetas meses */}
        {monthLabels.map(({ label, weekIdx }) => (
          <text
            key={`${label}-${weekIdx}`}
            x={36 + weekIdx * STEP}
            y={12}
            fill="#737373"
            fontSize="10"
          >
            {label}
          </text>
        ))}

        {/* Celdas del heatmap */}
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            if (!cell) return null;
            const cx = 36 + wi * STEP;
            const cy = 24 + di * STEP;
            return (
              <rect
                key={`${wi}-${di}`}
                x={cx}
                y={cy}
                width={CELL}
                height={CELL}
                rx={2}
                fill={getCellColor(cell.visits, maxVisits)}
                onMouseEnter={() =>
                  setTooltip({ x: cx + CELL / 2, y: cy, visits: cell.visits, date: cell.date })
                }
                onMouseLeave={() => setTooltip(null)}
                className="cursor-default"
              />
            );
          })
        )}
      </svg>

      {/* Leyenda escala */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-xs text-[#737373]">Menos</span>
        {["#1E1E1E", "#FFB899", "#FF9666", "#FF7A3D", "#FF5E14"].map((color) => (
          <span key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span className="text-xs text-[#737373]">Más</span>
      </div>

      {/* Tooltip HTML */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs shadow-xl z-10 whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -120%)",
          }}
        >
          <p className="font-semibold text-white">
            {new Date(tooltip.date + "T12:00:00").toLocaleDateString("es-CR", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-[#FF5E14]">{tooltip.visits} visitas</p>
        </div>
      )}
    </div>
  );
}
