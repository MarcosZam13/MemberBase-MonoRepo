// members/page.tsx — Reporte de membresías por plan con tabla y donut chart SVG

import { Suspense } from "react";
import { getMembershipReport } from "@/actions/owner.actions";
import { MembershipTable } from "@/components/owner/MembershipTable";
import { PeriodSelector } from "@/components/owner/PeriodSelector";
import { themeConfig } from "@/lib/theme";
import type { OwnerPeriod } from "@core/types/owner";

// Donut chart SVG nativo — distribución de miembros activos por plan
function DonutChart({
  data,
}: {
  data: Array<{ plan_name: string; active_count: number }>;
}): React.ReactElement {
  const total = data.reduce((s, d) => s + d.active_count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#737373] text-sm">
        Sin datos
      </div>
    );
  }

  const COLORS = ["#FF5E14", "#22C55E", "#FACC15", "#3B82F6", "#8B5CF6", "#EC4899"];
  const R = 70;
  const CX = 90;
  const CY = 90;
  const strokeWidth = 28;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = d.active_count / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;

    return {
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: COLORS[i % COLORS.length],
      name: d.plan_name,
      count: d.active_count,
      pct: (pct * 100).toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={180} height={180} className="flex-shrink-0">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        ))}
        <text x={CX} y={CY - 8} textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">
          {total}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill="#737373" fontSize="11">
          activos
        </text>
      </svg>

      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[#737373]">{seg.name}</span>
            <span className="text-white font-medium ml-auto pl-4">{seg.count}</span>
            <span className="text-[#737373] text-xs w-12 text-right">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: themeConfig.payment.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OwnerMembersPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const period: OwnerPeriod =
    params.period === "week" || params.period === "year" ? params.period : "month";

  const result = await getMembershipReport(period);
  const data = result.success ? result.data! : [];

  const totalActive = data.reduce((s, d) => s + d.active_count, 0);
  const totalRevenue = data.reduce((s, d) => s + d.revenue_this_month, 0);
  const totalNew = data.reduce((s, d) => s + d.new_this_month, 0);
  const totalCancelled = data.reduce((s, d) => s + d.cancelled_this_month, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-barlow font-bold text-3xl text-white tracking-wide uppercase">
            Membresías
          </h1>
          <p className="text-[#737373] text-sm mt-1">Distribución y retención por plan</p>
        </div>
        <Suspense>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Total activos</p>
          <p className="font-barlow font-bold text-3xl text-white">{totalActive}</p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Ingresos del mes</p>
          <p className="font-barlow font-bold text-3xl text-[#FF5E14]">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Nuevos este período</p>
          <p className="font-barlow font-bold text-3xl text-green-400">+{totalNew}</p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Cancelaciones</p>
          <p className="font-barlow font-bold text-3xl text-red-400">{totalCancelled}</p>
        </div>
      </div>

      {/* Donut + tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut chart */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 flex flex-col">
          <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
            Distribución por plan
          </h2>
          <div className="flex-1 flex items-center">
            <DonutChart
              data={data.map((d) => ({ plan_name: d.plan_name, active_count: d.active_count }))}
            />
          </div>
        </div>

        {/* Tabla detallada */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#1E1E1E] rounded-xl p-6">
          <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
            Detalle por plan
          </h2>
          <MembershipTable data={data} />
        </div>
      </div>
    </div>
  );
}
