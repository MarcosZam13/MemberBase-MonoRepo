// finances/page.tsx — Página de finanzas del owner con gráfica de barras y comparativa

import { Suspense } from "react";
import { getCashFlow, getRevenueComparison } from "@/actions/owner.actions";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { PeriodSelector } from "@/components/owner/PeriodSelector";
import { themeConfig } from "@/lib/theme";
import type { OwnerPeriod } from "@core/types/owner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: themeConfig.payment.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function DeltaBadge({ current, previous }: { current: number; previous: number }): React.ReactElement {
  if (previous === 0) return <span className="text-[#737373] text-xs">—</span>;
  const delta = ((current - previous) / previous) * 100;
  const positive = delta >= 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
      {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OwnerFinancesPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const period: OwnerPeriod =
    params.period === "week" || params.period === "year" ? params.period : "month";

  const [cashFlowResult, comparisonResult] = await Promise.all([
    getCashFlow(period),
    getRevenueComparison(),
  ]);

  const cashFlow = cashFlowResult.success ? cashFlowResult.data! : [];
  const comparison = comparisonResult.success ? comparisonResult.data! : null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-barlow font-bold text-3xl text-white tracking-wide uppercase">
            Finanzas
          </h1>
          <p className="text-[#737373] text-sm mt-1">Análisis de ingresos por período</p>
        </div>
        <Suspense>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      {/* Gráfica de barras agrupadas */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 mb-8">
        <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
          Ingresos por período
        </h2>
        <RevenueChart data={cashFlow} currency={themeConfig.payment.currency} />
      </div>

      {/* Tabla comparativa */}
      {comparison && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6">
          <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
            Comparativa de ingresos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="text-left py-3 px-4 text-[#737373] font-medium">Período</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">Membresías</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">Ventas</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-[#737373] font-medium">vs Anterior</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1E1E1E] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-medium text-white">Mes actual</td>
                  <td className="py-3 px-4 text-right text-[#FF5E14] font-medium">
                    {formatCurrency(comparison.membership_breakdown)}
                  </td>
                  <td className="py-3 px-4 text-right text-green-400 font-medium">
                    {formatCurrency(comparison.sales_breakdown)}
                  </td>
                  <td className="py-3 px-4 text-right text-white font-bold">
                    {formatCurrency(comparison.current_month)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DeltaBadge current={comparison.current_month} previous={comparison.previous_month} />
                  </td>
                </tr>
                <tr className="border-b border-[#1E1E1E] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-[#737373]">Mes anterior</td>
                  <td colSpan={2} className="py-3 px-4 text-right text-[#737373]">—</td>
                  <td className="py-3 px-4 text-right text-[#737373]">
                    {formatCurrency(comparison.previous_month)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DeltaBadge current={comparison.previous_month} previous={comparison.same_month_last_year} />
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-[#737373]">Mismo mes año anterior</td>
                  <td colSpan={2} className="py-3 px-4 text-right text-[#737373]">—</td>
                  <td className="py-3 px-4 text-right text-[#737373]">
                    {formatCurrency(comparison.same_month_last_year)}
                  </td>
                  <td className="py-3 px-4 text-right text-[#737373]">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
