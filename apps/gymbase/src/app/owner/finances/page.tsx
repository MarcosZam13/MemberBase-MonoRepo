// finances/page.tsx — Página de finanzas del owner con gráfica de barras y comparativa

import { Suspense } from "react";
import { getCashFlow, getRevenueComparison } from "@/actions/owner.actions";
import { getExpenses, getExpenseStats } from "@/actions/expense.actions";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { PeriodSelector } from "@/components/owner/PeriodSelector";
import { ExportCSVButton } from "@/components/owner/ExportCSVButton";
import { AddExpenseDialog } from "@/components/owner/AddExpenseDialog";
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

  // Calcular rango de fechas del período para la sección de gastos
  const now = new Date();
  let startDate: string, endDate: string;
  if (period === "week") {
    const from = new Date(now); from.setDate(from.getDate() - 6);
    startDate = from.toISOString().split("T")[0];
  } else if (period === "year") {
    startDate = `${now.getFullYear()}-01-01`;
  } else {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  endDate = now.toISOString().split("T")[0];

  const [cashFlowResult, comparisonResult, expenses, expenseStats] = await Promise.all([
    getCashFlow(period),
    getRevenueComparison(),
    getExpenses({ startDate, endDate }),
    getExpenseStats({ startDate, endDate }),
  ]);

  const cashFlow = cashFlowResult.success ? cashFlowResult.data! : [];
  const comparison = comparisonResult.success ? comparisonResult.data! : null;

  // Datos serializados para exportar CSV desde el cliente
  const csvRows = cashFlow.map((row) => ({
    "Período": row.period_label,
    "Membresías (CRC)": row.membership_revenue,
    "Ventas (CRC)": row.sales_revenue,
    "Total (CRC)": row.total_revenue,
  }));

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
        <div className="flex items-center gap-3">
          <ExportCSVButton filename={`finanzas-${period}.csv`} rows={csvRows} />
          <Suspense>
            <PeriodSelector current={period} />
          </Suspense>
        </div>
      </div>

      {/* Gráfica de barras agrupadas */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 mb-8">
        <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
          Ingresos por período
        </h2>
        <RevenueChart data={cashFlow} currency={themeConfig.payment.currency} />
      </div>

      {/* ── SECCIÓN DE GASTOS ──────────────────────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide">
              Gastos del período
            </h2>
            <p className="text-[#737373] text-sm mt-0.5">
              Total: <span className="text-red-400 font-semibold">{formatCurrency(expenseStats.total)}</span>
            </p>
          </div>
          <AddExpenseDialog />
        </div>

        {/* Desglose por categoría */}
        {expenseStats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {(Object.entries(expenseStats.byCategory) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => {
                const labels: Record<string, string> = {
                  equipamiento: "Equipamiento", renta: "Renta", salarios: "Salarios",
                  servicios: "Servicios", marketing: "Marketing", otro: "Otro",
                };
                return (
                  <div key={cat} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg p-3">
                    <p className="text-[10px] text-[#737373] uppercase tracking-wider mb-1">{labels[cat] ?? cat}</p>
                    <p className="text-sm font-semibold text-red-400">{formatCurrency(amount)}</p>
                    <p className="text-[9px] text-[#555] mt-0.5">
                      {expenseStats.total > 0 ? `${((amount / expenseStats.total) * 100).toFixed(0)}%` : "—"}
                    </p>
                  </div>
                );
              })}
          </div>
        )}

        {/* Tabla de gastos */}
        {expenses.length === 0 ? (
          <p className="text-center text-[#737373] text-sm py-6">
            Sin gastos registrados en este período
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="text-left py-2.5 px-4 text-[#737373] font-medium text-xs">Fecha</th>
                  <th className="text-left py-2.5 px-4 text-[#737373] font-medium text-xs">Categoría</th>
                  <th className="text-left py-2.5 px-4 text-[#737373] font-medium text-xs">Descripción</th>
                  <th className="text-right py-2.5 px-4 text-[#737373] font-medium text-xs">Monto</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const catLabels: Record<string, string> = {
                    equipamiento: "Equipamiento", renta: "Renta", salarios: "Salarios",
                    servicios: "Servicios", marketing: "Marketing", otro: "Otro",
                  };
                  return (
                    <tr key={expense.id} className="border-b border-[#1E1E1E] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-[#737373]">
                        {new Date(expense.expense_date + "T12:00:00").toLocaleDateString("es-CR", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          {catLabels[expense.category] ?? expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#737373] text-xs">
                        {expense.description ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-red-400">
                        {formatCurrency(expense.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
