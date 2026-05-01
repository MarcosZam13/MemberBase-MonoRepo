// StoreGrid.tsx — Grid de productos con búsqueda y filtro de categoría para la tienda del portal

"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Search } from "lucide-react";
import type { InventoryProduct, ProductCategory } from "@/types/gym-inventory";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  supplement:  "Suplementos",
  apparel:     "Ropa",
  equipment:   "Equipamiento",
  food_drink:  "Alimentos",
  other:       "Otros",
};

interface StoreGridProps {
  products: InventoryProduct[];
  currency: string;
}

export function StoreGrid({ products, currency }: StoreGridProps): React.ReactNode {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null);

  // Categorías presentes en el catálogo — sin duplicados
  const categories = useMemo<ProductCategory[]>(() => {
    const seen = new Set<ProductCategory>();
    products.forEach((p) => seen.add(p.category));
    return Array.from(seen).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeCategory]);

  const symbol = currency === "CRC" ? "₡" : "$";

  return (
    <div>
      {/* ── Barra de búsqueda y filtros ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--gym-text-ghost)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full h-9 pl-9 pr-3 rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: "var(--gym-bg-elevated)",
              border: "1px solid var(--gym-border)",
              color: "var(--gym-text-primary)",
            }}
          />
        </div>

        {/* Pills de categoría */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
            style={
              activeCategory === null
                ? { backgroundColor: "#FF5E14", color: "#fff" }
                : { backgroundColor: "var(--gym-bg-elevated)", color: "var(--gym-text-muted)", border: "1px solid var(--gym-border)" }
            }
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
              style={
                activeCategory === cat
                  ? { backgroundColor: "#FF5E14", color: "#fff" }
                  : { backgroundColor: "var(--gym-bg-elevated)", color: "var(--gym-text-muted)", border: "1px solid var(--gym-border)" }
              }
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid de productos ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "var(--gym-bg-elevated)" }}
          >
            <ShoppingBag className="w-8 h-8" style={{ color: "var(--gym-text-ghost)" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--gym-text-secondary)" }}>
              {search || activeCategory ? "Sin resultados para tu búsqueda" : "No hay productos disponibles"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--gym-text-ghost)" }}>
              {search || activeCategory ? "Intenta con otros filtros" : "Vuelve pronto para ver las novedades"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const inStock = product.current_stock > 0;
            return (
              <div
                key={product.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  backgroundColor: "var(--gym-bg-card)",
                  border: "1px solid var(--gym-border)",
                }}
              >
                {/* Imagen / placeholder */}
                <div
                  className="h-36 flex items-center justify-center"
                  style={{ backgroundColor: "var(--gym-bg-elevated)" }}
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="w-10 h-10" style={{ color: "var(--gym-text-ghost)" }} />
                  )}
                </div>

                {/* Contenido */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  {/* Categoría */}
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full self-start"
                    style={{ backgroundColor: "rgba(255,94,20,0.1)", color: "#FF5E14" }}
                  >
                    {CATEGORY_LABELS[product.category]}
                  </span>

                  {/* Nombre */}
                  <p
                    className="text-sm font-semibold leading-snug line-clamp-2"
                    style={{ color: "var(--gym-text-primary)" }}
                  >
                    {product.name}
                  </p>

                  {/* Descripción */}
                  {product.description && (
                    <p
                      className="text-[11px] line-clamp-2 leading-relaxed"
                      style={{ color: "var(--gym-text-muted)" }}
                    >
                      {product.description}
                    </p>
                  )}

                  {/* Precio y badge de stock */}
                  <div className="flex items-end justify-between mt-auto pt-1">
                    <p
                      className="text-xl font-black tracking-tight"
                      style={{ fontFamily: "var(--font-barlow)", color: "var(--gym-text-primary)" }}
                    >
                      {symbol}{product.sale_price.toLocaleString("es-CR")}
                    </p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={
                        inStock
                          ? { backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }
                          : { backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" }
                      }
                    >
                      {inStock ? "Disponible" : "Agotado"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
