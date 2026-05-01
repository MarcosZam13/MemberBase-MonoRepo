// page.tsx — Ventas: admin puede registrar y ver historial; owner ve además los stats de ingresos

import { ShoppingCart, TrendingUp, CreditCard } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSalesPaginated, getProducts, getInventoryStats } from "@/actions/inventory.actions";
import { getMembers } from "@core/actions/admin.actions";
import { SalesClient } from "@/components/gym/inventory/SalesClient";
import type { SalePaymentMethod } from "@/types/gym-inventory";

const PAGE_SIZE = 25;

const METHOD_LABELS: Record<SalePaymentMethod, string> = {
  cash:  "Efectivo",
  card:  "Tarjeta",
  sinpe: "SINPE",
  other: "Otro",
};

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminSalesPage({ searchParams }: PageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === "owner";

  // getInventoryStats solo funciona para owner — admin no obtiene stats de ingresos
  const [result, productsResult, statsResult, allMembers] = await Promise.all([
    getSalesPaginated({ page, pageSize: PAGE_SIZE }),
    getProducts(),
    isOwner ? getInventoryStats() : Promise.resolve({ success: false as const, error: "" }),
    getMembers(),
  ]);

  const products = productsResult.success ? (productsResult.data ?? []) : [];
  const stats = statsResult.success ? statsResult.data : null;

  const memberList = allMembers.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
  }));

  // topMethod calculado sobre la página actual — solo informativo para el owner
  const methodCounts = result.data.reduce<Record<SalePaymentMethod, number>>((acc, s) => {
    acc[s.payment_method] = (acc[s.payment_method] ?? 0) + 1;
    return acc;
  }, {} as Record<SalePaymentMethod, number>);

  const topMethod = Object.entries(methodCounts).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Ventas</h1>
        <p className="text-xs text-[#555] mt-1">
          {isOwner ? "Historial de ventas y caja" : "Registrar y consultar ventas"}
        </p>
      </div>

      {/* Stats de ingresos — solo visibles para el owner */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,94,20,0.12)" }}>
                <ShoppingCart className="w-4 h-4" style={{ color: "#FF5E14" }} />
              </div>
              <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Ventas del mes</p>
            </div>
            <p className="text-3xl font-bold font-barlow text-white">
              {stats?.total_sales_this_month ?? result.total}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Ingresos del mes</p>
            </div>
            <p className="text-2xl font-bold font-barlow text-white">
              {stats ? formatPrice(stats.total_revenue_this_month) : "₡0"}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Método más usado</p>
            </div>
            <p className="text-2xl font-bold font-barlow text-white">
              {topMethod ? METHOD_LABELS[topMethod[0] as SalePaymentMethod] : "—"}
            </p>
            {topMethod && (
              <p className="text-xs text-[#555] mt-1">{topMethod[1]} venta{topMethod[1] !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
      )}

      {/* Tabla de ventas + modal de nueva venta (accesible para admin y owner) */}
      <SalesClient result={result} products={products} members={memberList} />
    </div>
  );
}
