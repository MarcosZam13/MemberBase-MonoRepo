// inventory/page.tsx — Reporte de ventas de inventario y alertas de stock bajo

import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { getSalesReport } from "@/actions/owner.actions";
import { getProducts } from "@/actions/inventory.actions";
import { SalesReportTable } from "@/components/owner/SalesReportTable";
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

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OwnerInventoryPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const period: OwnerPeriod =
    params.period === "week" || params.period === "year" ? params.period : "month";

  const [salesResult, productsResult] = await Promise.all([
    getSalesReport(period),
    getProducts(),
  ]);

  const sales = salesResult.success ? salesResult.data! : [];
  const products = productsResult.success ? productsResult.data! : [];
  const lowStockProducts = products.filter(
    (p) => p.is_active && p.current_stock <= p.min_stock_alert
  );

  const totalRevenue = sales.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = sales.reduce((s, r) => s + r.profit, 0);
  const totalUnits = sales.reduce((s, r) => s + r.units_sold, 0);
  const avgMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-barlow font-bold text-3xl text-white tracking-wide uppercase">
            Inventario
          </h1>
          <p className="text-[#737373] text-sm mt-1">Reporte de ventas y alertas de stock</p>
        </div>
        <Suspense>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Ingresos ventas</p>
          <p className="font-barlow font-bold text-3xl text-[#FF5E14]">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Ganancia neta</p>
          <p className="font-barlow font-bold text-3xl text-green-400">
            {formatCurrency(totalProfit)}
          </p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Unidades vendidas</p>
          <p className="font-barlow font-bold text-3xl text-white">{totalUnits}</p>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-sm text-[#737373] mb-2">Margen promedio</p>
          <p className="font-barlow font-bold text-3xl text-white">
            {avgMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">
              {lowStockProducts.length} producto{lowStockProducts.length > 1 ? "s" : ""} con stock bajo
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300"
              >
                {p.name}
                <span className="font-bold">{p.current_stock}/{p.min_stock_alert}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de ventas */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6">
        <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
          Ventas por producto
        </h2>
        <SalesReportTable data={sales} />
      </div>
    </div>
  );
}
