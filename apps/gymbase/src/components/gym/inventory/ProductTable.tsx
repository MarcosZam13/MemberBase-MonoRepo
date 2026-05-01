// ProductTable.tsx — Tabla de inventario con filtros URL-driven, paginación server-side y acciones

"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, SlidersHorizontal, ChevronRight, BarChart2 } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import { QuickStockModal } from "./QuickStockModal";
import { Pagination } from "@/components/shared/Pagination";
import type { InventoryProduct, ProductCategory } from "@/types/gym-inventory";
import type { PaginatedResult } from "@core/types/pagination";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  supplement: "Suplementos",
  apparel:    "Ropa",
  equipment:  "Equipamiento",
  food_drink: "Bebidas/Snacks",
  other:      "Otro",
};

interface ProductTableProps {
  result: PaginatedResult<InventoryProduct>;
  allProducts: InventoryProduct[];
  currentSearch: string;
  currentCategory: ProductCategory | "all";
  currentOnlyLowStock: boolean;
}

function StockBadge({ current, min }: { current: number; min: number }): React.ReactNode {
  if (current <= min) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/50 text-red-400 border border-red-900/40 animate-pulse">
        {current} ⚠️
      </span>
    );
  }
  if (current <= min * 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-950/40 text-yellow-400 border border-yellow-900/30">
        {current}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-950/40 text-green-400 border border-green-900/30">
      {current}
    </span>
  );
}

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

export function ProductTable({
  result,
  allProducts,
  currentSearch,
  currentCategory,
  currentOnlyLowStock,
}: ProductTableProps): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryProduct | null>(null);
  const [quickStockOpen, setQuickStockOpen] = useState(false);

  // Navega a nueva URL con params actualizados — resetea a página 1 al cambiar filtros
  const navigate = useCallback((updates: Record<string, string>): void => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  const { data: products, total, page, pageSize, totalPages } = result;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasFilters = !!currentSearch || currentCategory !== "all" || currentOnlyLowStock;

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: InventoryProduct) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingProduct(null);
    router.refresh();
  };

  const handleAdjustClose = () => {
    setAdjustingProduct(null);
    router.refresh();
  };

  return (
    <>
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          defaultValue={currentSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate({ search: (e.target as HTMLInputElement).value });
          }}
          onBlur={(e) => {
            if (e.target.value !== currentSearch) navigate({ search: e.target.value });
          }}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14]"
          style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
        />

        <select
          value={currentCategory}
          onChange={(e) => navigate({ category: e.target.value })}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
          style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
        >
          <option value="all">Todas las categorías</option>
          {(Object.entries(CATEGORY_LABELS) as [ProductCategory, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => navigate({ onlyLowStock: currentOnlyLowStock ? "" : "1" })}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: currentOnlyLowStock ? "rgba(239,68,68,0.15)" : "#111111",
            border: `1px solid ${currentOnlyLowStock ? "rgba(239,68,68,0.4)" : "#2a2a2a"}`,
            color: currentOnlyLowStock ? "#ef4444" : "#737373",
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Solo alertas
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setQuickStockOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#F5F5F5" }}
          >
            <BarChart2 className="w-4 h-4" />
            Ajustar Stock
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer"
            style={{ backgroundColor: "#FF5E14" }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tabla */}
      {total === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: "#0D0D0D", border: "1px solid #1e1e1e" }}>
          <p className="text-[#444] text-sm mb-3">
            {hasFilters ? "No hay productos que coincidan." : "No hay productos aún."}
          </p>
          {!hasFilters && (
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "#FF5E14" }}
            >
              Crear primer producto
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#0D0D0D", borderBottom: "1px solid #1e1e1e" }}>
                {["Producto", "Categoría", "Stock", "Costo", "Venta", "Margen", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#555]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const margin = p.sale_price > 0
                  ? ((p.sale_price - p.cost_price) / p.sale_price) * 100
                  : 0;
                const marginColor = margin > 30 ? "#22c55e" : margin >= 10 ? "#facc15" : "#ef4444";

                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: "1px solid #1a1a1a", backgroundColor: "#111111" }}
                    className="hover:bg-[#161616] transition-colors last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        {p.sku && <p className="text-[11px] text-[#444]">SKU: {p.sku}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#737373]">{CATEGORY_LABELS[p.category]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge current={p.current_stock} min={p.min_stock_alert} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#737373]">{formatPrice(p.cost_price)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white font-medium">{formatPrice(p.sale_price)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: marginColor }}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setAdjustingProduct(p)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium text-[#737373] hover:text-white hover:bg-[#1e1e1e] transition-colors cursor-pointer"
                          style={{ border: "1px solid #2a2a2a" }}
                        >
                          Ajustar stock
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium text-[#737373] hover:text-white hover:bg-[#1e1e1e] transition-colors cursor-pointer"
                          style={{ border: "1px solid #2a2a2a" }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/inventory/${p.id}`)}
                          className="text-[#737373] hover:text-white transition-colors cursor-pointer p-1"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer con conteo */}
          <div className="px-4 py-2.5 border-t border-[#1a1a1a] bg-[#0a0a0a]">
            <p className="text-[10px] text-[#444]">
              Mostrando {from}–{to} de {total} producto{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Pagination totalPages={totalPages} currentPage={page} />
        </>
      )}

      {/* Formulario de producto (sheet lateral) */}
      <ProductForm
        open={formOpen}
        onClose={handleFormClose}
        product={editingProduct}
      />

      {/* Ajuste de stock por fila */}
      {adjustingProduct && (
        <StockAdjustmentForm
          open={!!adjustingProduct}
          onClose={handleAdjustClose}
          product={adjustingProduct}
        />
      )}

      {/* Ajuste de stock rápido con selector de producto */}
      <QuickStockModal
        open={quickStockOpen}
        onClose={() => {
          setQuickStockOpen(false);
          router.refresh();
        }}
        products={allProducts}
      />
    </>
  );
}
