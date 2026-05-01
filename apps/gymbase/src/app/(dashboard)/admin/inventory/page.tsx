// page.tsx — Dashboard de inventario con paginación server-side y filtros por URL params

import { Package, AlertTriangle } from "lucide-react";
import { getProductsPaginated, getProducts, getLowStockCount } from "@/actions/inventory.actions";
import { ProductTable } from "@/components/gym/inventory/ProductTable";
import type { ProductCategory } from "@/types/gym-inventory";

const PAGE_SIZE = 25;

const VALID_CATEGORIES = ["supplement", "apparel", "equipment", "food_drink", "other"];

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    onlyLowStock?: string;
  }>;
}

export default async function AdminInventoryPage({ searchParams }: PageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";
  const category = (VALID_CATEGORIES.includes(params.category ?? "") ? params.category : "all") as ProductCategory | "all";
  const onlyLowStock = params.onlyLowStock === "1";

  // Carga paginada para la tabla + todos los productos para el QuickStockModal y stats + conteo de stock bajo
  const [result, allProductsResult, lowStockCount] = await Promise.all([
    getProductsPaginated({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      category: category !== "all" ? category : undefined,
      onlyLowStock,
    }),
    getProducts(), // para el modal de ajuste rápido y el banner de alertas
    getLowStockCount(),
  ]);

  const allProducts = allProductsResult.success ? (allProductsResult.data ?? []) : [];
  const lowStockProducts = allProducts.filter((p) => p.current_stock <= p.min_stock_alert);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">
            Inventario
          </h1>
          <p className="text-xs text-[#555] mt-1">
            {allProducts.length} producto{allProducts.length !== 1 ? "s" : ""} activo{allProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total productos */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,94,20,0.12)" }}>
              <Package className="w-4 h-4" style={{ color: "#FF5E14" }} />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Total Productos</p>
          </div>
          <p className="text-3xl font-bold font-barlow text-white">{allProducts.length}</p>
        </div>

        {/* Stock bajo */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: lowStockCount > 0 ? "rgba(239,68,68,0.12)" : "rgba(100,100,100,0.08)" }}
            >
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: lowStockCount > 0 ? "#ef4444" : "#444" }}
              />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Stock Bajo</p>
          </div>
          <p
            className="text-3xl font-bold font-barlow"
            style={{ color: lowStockCount > 0 ? "#ef4444" : "#555" }}
          >
            {lowStockCount}
          </p>
          <p className="text-xs mt-1" style={{ color: lowStockCount > 0 ? "#ef4444" : "#444" }}>
            {lowStockCount > 0 ? "producto(s) con alerta activa" : "Sin alertas"}
          </p>
        </div>
      </div>

      {/* Banner de alertas */}
      {lowStockCount > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {lowStockCount} producto{lowStockCount !== 1 ? "s" : ""} con stock bajo
              </p>
              <div className="mt-2 space-y-1">
                {lowStockProducts.slice(0, 5).map((p) => (
                  <p key={p.id} className="text-xs text-amber-400/70">
                    • {p.name} — {p.current_stock}/{p.min_stock_alert} (mín.)
                  </p>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-xs text-amber-400/50">
                    + {lowStockProducts.length - 5} más…
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de productos */}
      <ProductTable
        result={result}
        allProducts={allProducts}
        currentSearch={search}
        currentCategory={category}
        currentOnlyLowStock={onlyLowStock}
      />
    </div>
  );
}
