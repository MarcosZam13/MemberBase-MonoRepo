// SalesReportTable.tsx — Tabla de reporte de ventas con badge de margen por producto

import type { SalesReport } from "@core/types/owner";
import { themeConfig } from "@/lib/theme";

interface SalesReportTableProps {
  data: SalesReport[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: themeConfig.payment.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Badge de margen: verde >40%, amarillo >20%, rojo <=20%
function MarginBadge({ pct }: { pct: number }): React.ReactElement {
  const color =
    pct > 40
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : pct > 20
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function SalesReportTable({ data }: SalesReportTableProps): React.ReactElement {
  if (!data.length) {
    return (
      <div className="text-center py-8 text-[#737373] text-sm">
        Sin ventas en el período seleccionado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1E1E1E]">
            <th className="text-left py-3 px-4 text-[#737373] font-medium">Producto</th>
            <th className="text-left py-3 px-4 text-[#737373] font-medium">Categoría</th>
            <th className="text-right py-3 px-4 text-[#737373] font-medium">Uds.</th>
            <th className="text-right py-3 px-4 text-[#737373] font-medium">Ingresos</th>
            <th className="text-right py-3 px-4 text-[#737373] font-medium">Costo</th>
            <th className="text-right py-3 px-4 text-[#737373] font-medium">Ganancia</th>
            <th className="text-center py-3 px-4 text-[#737373] font-medium">Margen</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.product_id}
              className="border-b border-[#1E1E1E] last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 px-4 font-medium text-white">{row.product_name}</td>
              <td className="py-3 px-4 text-[#737373]">{row.category}</td>
              <td className="py-3 px-4 text-right text-white">{row.units_sold}</td>
              <td className="py-3 px-4 text-right text-[#FF5E14] font-medium">
                {formatCurrency(row.revenue)}
              </td>
              <td className="py-3 px-4 text-right text-[#737373]">
                {formatCurrency(row.cost)}
              </td>
              <td className="py-3 px-4 text-right text-green-400 font-medium">
                {formatCurrency(row.profit)}
              </td>
              <td className="py-3 px-4 text-center">
                <MarginBadge pct={row.profit_margin_pct} />
              </td>
            </tr>
          ))}
        </tbody>
        {/* Totales */}
        <tfoot>
          <tr className="border-t-2 border-[#2E2E2E]">
            <td colSpan={3} className="py-3 px-4 text-[#737373] text-xs">
              {data.length} productos · {data.reduce((s, r) => s + r.units_sold, 0)} unidades
            </td>
            <td className="py-3 px-4 text-right font-bold text-white">
              {formatCurrency(data.reduce((s, r) => s + r.revenue, 0))}
            </td>
            <td className="py-3 px-4 text-right font-bold text-[#737373]">
              {formatCurrency(data.reduce((s, r) => s + r.cost, 0))}
            </td>
            <td className="py-3 px-4 text-right font-bold text-green-400">
              {formatCurrency(data.reduce((s, r) => s + r.profit, 0))}
            </td>
            <td className="py-3 px-4 text-center">
              <MarginBadge
                pct={
                  data.reduce((s, r) => s + r.revenue, 0) > 0
                    ? (data.reduce((s, r) => s + r.profit, 0) /
                        data.reduce((s, r) => s + r.revenue, 0)) *
                      100
                    : 0
                }
              />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
