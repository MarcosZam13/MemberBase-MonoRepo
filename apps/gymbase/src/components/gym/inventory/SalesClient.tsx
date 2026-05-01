// SalesClient.tsx — Tabla interactiva de ventas con paginación URL-driven y expandir detalle de items

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { RegisterSaleModal } from "./RegisterSaleModal";
import { Pagination } from "@/components/shared/Pagination";
import type { Sale, SalePaymentMethod, InventoryProduct } from "@/types/gym-inventory";
import type { PaginatedResult } from "@core/types/pagination";

const METHOD_LABELS: Record<SalePaymentMethod, string> = {
  cash:  "Efectivo",
  card:  "Tarjeta",
  sinpe: "SINPE",
  other: "Otro",
};

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SalesClientProps {
  result: PaginatedResult<Sale>;
  products: InventoryProduct[];
  members: Member[];
}

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SalesClient({ result, products, members }: SalesClientProps): React.ReactNode {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: sales, total, page, pageSize, totalPages } = result;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const handleModalClose = () => {
    setModalOpen(false);
    router.refresh();
  };

  return (
    <>
      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#555]">{total} venta{total !== 1 ? "s" : ""}</p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer"
          style={{ backgroundColor: "#FF5E14" }}
        >
          <ShoppingCart className="w-4 h-4" />
          Registrar Venta
        </button>
      </div>

      {/* Tabla de ventas */}
      {total === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: "#0D0D0D", border: "1px solid #1e1e1e" }}>
          <ShoppingCart className="w-10 h-10 text-[#333] mx-auto mb-3" />
          <p className="text-[#444] text-sm mb-3">No hay ventas en este período.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#FF5E14" }}
          >
            Registrar primera venta
          </button>
        </div>
      ) : (
        <>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#0D0D0D", borderBottom: "1px solid #1e1e1e" }}>
                {["Fecha", "Vendedor", "Cliente", "Productos", "Total", "Método", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#555]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const isExpanded = expandedId === sale.id;
                const itemCount = sale.items?.length ?? 0;

                return (
                  <React.Fragment key={sale.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid #1a1a1a",
                        backgroundColor: "#111111",
                      }}
                      className="hover:bg-[#161616] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-[#A0A0A0]">{formatDate(sale.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-white">{sale.seller?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#737373]">{sale.member?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#737373]">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{formatPrice(sale.total_amount)}</td>
                      <td className="px-4 py-3 text-sm text-[#737373]">{METHOD_LABELS[sale.payment_method]}</td>
                      <td className="px-4 py-3">
                        {itemCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                            className="text-[#737373] hover:text-white transition-colors cursor-pointer p-1"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Detalle expandido de items */}
                    {isExpanded && sale.items && (
                      <tr key={`${sale.id}-detail`} style={{ backgroundColor: "#0D0D0D", borderBottom: "1px solid #1a1a1a" }}>
                        <td colSpan={7} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                {["Producto", "Cantidad", "Precio unit.", "Subtotal"].map((h) => (
                                  <th key={h} className="py-1 text-left text-[#444] font-normal pr-4">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1 text-[#A0A0A0] pr-4">{item.product?.name ?? "—"}</td>
                                  <td className="py-1 text-[#737373] pr-4">{item.quantity}</td>
                                  <td className="py-1 text-[#737373] pr-4">{formatPrice(item.unit_price)}</td>
                                  <td className="py-1 text-white font-medium">{formatPrice(item.unit_price * item.quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {sale.notes && (
                            <p className="text-xs text-[#444] mt-2">Nota: {sale.notes}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer con conteo */}
          <div className="px-4 py-2.5 border-t border-[#1a1a1a] bg-[#0a0a0a]">
            <p className="text-[10px] text-[#444]">
              Mostrando {from}–{to} de {total} venta{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Pagination totalPages={totalPages} currentPage={page} />
        </>
      )}

      <RegisterSaleModal
        open={modalOpen}
        onClose={handleModalClose}
        products={products}
        members={members}
      />
    </>
  );
}
