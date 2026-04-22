// RevenueChart.tsx — Gráfica SVG de barras agrupadas (membresías vs ventas por período)

"use client";

import { useState } from "react";
import type { CashFlowEntry } from "@core/types/owner";

interface RevenueChartProps {
  data: CashFlowEntry[];
  currency?: string;
}

interface TooltipState {
  x: number;
  y: number;
  entry: CashFlowEntry;
}

const W = 800;
const H = 300;
const PAD = { top: 20, right: 24, bottom: 44, left: 80 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const BAR_GROUP_RATIO = 0.7;
const BAR_GAP_RATIO = 0.08;

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart({
  data,
  currency = "CRC",
}: RevenueChartProps): React.ReactElement {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-[#737373] text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.membership_revenue, d.sales_revenue)), 1);
  const groupWidth = CHART_W / data.length;
  const barGroupWidth = groupWidth * BAR_GROUP_RATIO;
  const barGap = groupWidth * BAR_GAP_RATIO;
  const barWidth = (barGroupWidth - barGap) / 2;
  const yTicks = 4;

  const yScale = (v: number): number => PAD.top + CHART_H - (v / maxVal) * CHART_H;

  function groupX(i: number): number {
    return PAD.left + i * groupWidth + (groupWidth - barGroupWidth) / 2;
  }

  return (
    <div className="relative">
      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#FF5E14]" />
          <span className="text-xs text-[#737373]">Membresías</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#22C55E]" />
          <span className="text-xs text-[#737373]">Ventas</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
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
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#737373" fontSize="11">
                {val >= 1000000
                  ? `${(val / 1000000).toFixed(1)}M`
                  : val >= 1000
                  ? `${(val / 1000).toFixed(0)}k`
                  : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Barras agrupadas */}
        {data.map((d, i) => {
          const gx = groupX(i);
          const mH = (d.membership_revenue / maxVal) * CHART_H;
          const sH = (d.sales_revenue / maxVal) * CHART_H;
          const baseY = PAD.top + CHART_H;
          const cx = gx + barWidth + barGap / 2;

          return (
            <g
              key={i}
              onMouseEnter={(e) =>
                setTooltip({ x: cx, y: Math.min(baseY - mH, baseY - sH) - 12, entry: d })
              }
              onMouseLeave={() => setTooltip(null)}
              className="cursor-default"
            >
              {/* Barra membresías */}
              <rect
                x={gx}
                y={baseY - mH}
                width={barWidth}
                height={mH}
                fill="#FF5E14"
                rx="2"
                opacity={tooltip?.entry === d ? 1 : 0.85}
              />
              {/* Barra ventas */}
              <rect
                x={gx + barWidth + barGap}
                y={baseY - sH}
                width={barWidth}
                height={sH}
                fill="#22C55E"
                rx="2"
                opacity={tooltip?.entry === d ? 1 : 0.85}
              />
              {/* Etiqueta eje X */}
              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                fill="#737373"
                fontSize="11"
              >
                {d.period_label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip HTML */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs shadow-xl z-10"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
            transform: "translate(-50%, -100%)",
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
