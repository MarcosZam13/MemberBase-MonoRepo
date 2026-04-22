// CashFlowChart.tsx — Gráfica SVG de líneas (ingresos membresías vs ventas) con área y tooltip

"use client";

import { useState, useRef } from "react";
import type { CashFlowEntry } from "@core/types/owner";

interface TooltipState {
  x: number;
  y: number;
  entry: CashFlowEntry;
}

interface CashFlowChartProps {
  data: CashFlowEntry[];
  currency?: string;
}

const W = 800;
const H = 280;
const PAD = { top: 20, right: 24, bottom: 40, left: 72 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CashFlowChart({
  data,
  currency = "CRC",
}: CashFlowChartProps): React.ReactElement {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-[#737373] text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total_revenue), 1);
  const yTicks = 4;

  // Escala X e Y
  const xScale = (i: number): number =>
    PAD.left + (i / Math.max(data.length - 1, 1)) * CHART_W;
  const yScale = (v: number): number =>
    PAD.top + CHART_H - (v / maxVal) * CHART_H;

  // Construir paths para membership y sales
  function buildPath(key: "membership_revenue" | "sales_revenue"): string {
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d[key])}`)
      .join(" ");
  }

  function buildArea(key: "membership_revenue" | "sales_revenue"): string {
    const line = buildPath(key);
    const lastX = xScale(data.length - 1);
    const baseY = PAD.top + CHART_H;
    return `${line} L ${lastX} ${baseY} L ${PAD.left} ${baseY} Z`;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>): void {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    // Encontrar el punto más cercano
    let closest = 0;
    let minDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(xScale(i) - relX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setTooltip({
      x: xScale(closest),
      y: yScale(data[closest].total_revenue),
      entry: data[closest],
    });
  }

  return (
    <div className="relative">
      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5E14]" />
          <span className="text-xs text-[#737373]">Membresías</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#22C55E]" />
          <span className="text-xs text-[#737373]">Ventas</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="grad-membership" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5E14" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF5E14" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = PAD.top + (CHART_H / yTicks) * i;
          const val = maxVal - (maxVal / yTicks) * i;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + CHART_W}
                y2={y}
                stroke="#1E1E1E"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="#737373"
                fontSize="11"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Áreas */}
        <path d={buildArea("membership_revenue")} fill="url(#grad-membership)" />
        <path d={buildArea("sales_revenue")} fill="url(#grad-sales)" />

        {/* Líneas */}
        <path
          d={buildPath("membership_revenue")}
          fill="none"
          stroke="#FF5E14"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={buildPath("sales_revenue")}
          fill="none"
          stroke="#22C55E"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Etiquetas eje X */}
        {data.map((d, i) => {
          // Mostrar máximo 6 etiquetas para evitar solapamiento
          if (data.length > 6 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) {
            return null;
          }
          return (
            <text
              key={i}
              x={xScale(i)}
              y={H - 8}
              textAnchor="middle"
              fill="#737373"
              fontSize="11"
            >
              {d.period_label}
            </text>
          );
        })}

        {/* Punto hover */}
        {tooltip && (
          <circle
            cx={tooltip.x}
            cy={tooltip.y}
            r="5"
            fill="#FF5E14"
            stroke="#0A0A0A"
            strokeWidth="2"
          />
        )}

        {/* Línea vertical del cursor */}
        {tooltip && (
          <line
            x1={tooltip.x}
            y1={PAD.top}
            x2={tooltip.x}
            y2={PAD.top + CHART_H}
            stroke="#FF5E14"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        )}
      </svg>

      {/* Tooltip HTML */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs shadow-xl z-10"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          <p className="font-semibold text-white mb-1">{tooltip.entry.period_label}</p>
          <p className="text-[#FF5E14]">
            Membresías: {formatCurrency(tooltip.entry.membership_revenue, currency)}
          </p>
          <p className="text-green-400">
            Ventas: {formatCurrency(tooltip.entry.sales_revenue, currency)}
          </p>
          <p className="text-white font-semibold border-t border-[#2E2E2E] mt-1 pt-1">
            Total: {formatCurrency(tooltip.entry.total_revenue, currency)}
          </p>
        </div>
      )}
    </div>
  );
}
