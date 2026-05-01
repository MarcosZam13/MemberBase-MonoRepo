// page.tsx — Tienda del portal: vitrina de productos activos del gym para miembros

import { redirect } from "next/navigation";
import { ShoppingBag, Store } from "lucide-react";
import { themeConfig } from "@/lib/theme";
import { getPublishedProducts } from "@/actions/inventory.actions";
import { StoreGrid } from "@/components/gym/inventory/StoreGrid";

export default async function PortalStorePage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_marketplace) {
    redirect("/portal/dashboard");
  }

  const products = await getPublishedProducts();
  const currency = themeConfig.payment.currency;

  return (
    <div className="space-y-6">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(255,94,20,0.12)" }}
        >
          <Store className="w-5 h-5" style={{ color: "#FF5E14" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            Tienda
          </h1>
          <p className="text-xs" style={{ color: "var(--gym-text-muted)" }}>
            {products.length} producto{products.length !== 1 ? "s" : ""} disponible{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Grid con búsqueda y filtros ────────────────────────────────────── */}
      <StoreGrid products={products} currency={currency} />

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <div
          className="flex items-start gap-4 p-5 rounded-2xl"
          style={{
            backgroundColor: "rgba(255,94,20,0.06)",
            border: "1px solid rgba(255,94,20,0.2)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,94,20,0.12)" }}
          >
            <ShoppingBag className="w-5 h-5" style={{ color: "#FF5E14" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
              ¿Te interesa algún producto?
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--gym-text-muted)" }}>
              Visita nuestra recepción para realizar tu compra. Aceptamos efectivo, tarjeta y SINPE Móvil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
