// MembersClient.tsx — Tabla de miembros con filtros URL-driven, paginación server-side

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import Link from "next/link";
import { Search, Clock, Pencil } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";
import type { MemberWithSubscription, SubscriptionStatus, MembershipPlan } from "@/types/database";
import type { PaginatedResult } from "@core/types/pagination";
import type { MemberStatusFilter } from "@core/services/admin.service";
import { toOpaqueId } from "@/lib/utils/opaque-id";

function avatarColor(id: string): { bg: string; text: string } {
  const PALETTES: Array<{ bg: string; text: string }> = [
    { bg: "#1e0f06", text: "#FF5E14" },
    { bg: "#0d1a0d", text: "#22C55E" },
    { bg: "#0d0d2a", text: "#818CF8" },
    { bg: "#1a0d1a", text: "#E879F9" },
    { bg: "#0d1a1a", text: "#38BDF8" },
    { bg: "#1a1a0d", text: "#FACC15" },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryLabel({ expiresAt }: { expiresAt: string | null }): React.ReactNode {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return <span className="text-[#444] text-xs">—</span>;
  if (days < 0) return <span className="text-xs font-medium text-[#EF4444]">Venció hace {Math.abs(days)}d</span>;
  if (days <= 7) return <span className="text-xs font-medium text-[#FACC15]">{days} días</span>;
  return (
    <span className="text-xs text-[#777]">
      {new Date(expiresAt!).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
    </span>
  );
}

function StatusBadge({ status, expiresAt }: { status: SubscriptionStatus | "none"; expiresAt: string | null }): React.ReactNode {
  const days = daysUntilExpiry(expiresAt);
  // Si la membresía está marcada como "active" en la DB pero ya venció, mostrar como vencido
  if (status === "active" && days !== null && days < 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444]">Vencido</span>;
  }
  if (status === "active" && days !== null && days <= 7 && days >= 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] text-[#FACC15]">Por vencer</span>;
  }
  const MAP: Record<string, { label: string; cls: string }> = {
    active:    { label: "Activo",        cls: "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.2)] text-[#22C55E]" },
    pending:   { label: "Pendiente",     cls: "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.2)] text-[#FACC15]" },
    expired:   { label: "Vencido",       cls: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[#EF4444]" },
    cancelled: { label: "Cancelado",     cls: "bg-[#161616] border-[#222] text-[#555]" },
    rejected:  { label: "Rechazado",     cls: "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.15)] text-[#EF4444]" },
    none:      { label: "Sin membresía", cls: "bg-[#161616] border-[#222] text-[#555]" },
  };
  const cfg = MAP[status] ?? MAP.none;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>{cfg.label}</span>;
}

const STATUS_CHIP: Record<MemberStatusFilter, string> = {
  all: "Todos", active: "Activos", expiring: "Por vencer", expired: "Vencidos",
};

interface MembersClientProps {
  result: PaginatedResult<MemberWithSubscription>;
  attendanceCounts: Record<string, number>;
  plans: MembershipPlan[];
  currentSearch: string;
  currentStatus: MemberStatusFilter;
  currentPlanId: string;
}

export function MembersClient({
  result,
  attendanceCounts,
  plans,
  currentSearch,
  currentStatus,
  currentPlanId,
}: MembersClientProps): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Navega a una nueva URL con los params actualizados — siempre resetea a página 1 al cambiar filtros
  const navigate = useCallback((updates: Record<string, string>): void => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    p.delete("page"); // resetear a página 1 al cambiar cualquier filtro
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  const { data: members, total, page, pageSize, totalPages } = result;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Miembros</h1>
          <p className="text-xs text-[#555] mt-1">{total} miembros en total</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 h-[34px] bg-[#111] border border-[#222] rounded-lg px-3 w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#444] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar miembro..."
              defaultValue={currentSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate({ search: (e.target as HTMLInputElement).value });
              }}
              onBlur={(e) => {
                if (e.target.value !== currentSearch) navigate({ search: e.target.value });
              }}
              className="bg-transparent text-xs text-[#ccc] placeholder-[#444] outline-none w-full"
            />
          </div>
          <Link
            href="/admin/members/new"
            className="h-[34px] px-3.5 flex items-center gap-1.5 bg-[#FF5E14] hover:bg-[#e5540f] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Agregar
          </Link>
        </div>
      </div>

      {/* Chips de filtro estado */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "expiring", "expired"] as MemberStatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => navigate({ status: f })}
            className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
              currentStatus === f
                ? "bg-[rgba(255,94,20,0.12)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
            }`}
          >
            {currentStatus === f && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E14]" />}
            {STATUS_CHIP[f]}
          </button>
        ))}

        {plans.length > 0 && <div className="w-px bg-[#1e1e1e] mx-1" />}

        {/* Chips de plan */}
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => navigate({ planId: currentPlanId === plan.id ? "" : plan.id })}
            className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              currentPlanId === plan.id
                ? "bg-[rgba(255,94,20,0.12)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
            }`}
          >
            {plan.name}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {["Miembro", "Plan", "Estado", "Asistencias", "Vence", ""].map((h) => (
                <th key={h} className="text-[10px] text-[#444] uppercase tracking-[0.08em] font-semibold px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#444] text-sm">
                  {currentSearch ? "No se encontraron miembros con esa búsqueda" : "No hay miembros con ese filtro"}
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const subs = member.active_subscription as unknown as Array<{
                  status: SubscriptionStatus;
                  expires_at: string | null;
                  plan?: { name: string; price: number; currency: string };
                }> | undefined;
                // Tomar la suscripción con expires_at más reciente para mostrar el estado correcto
                const sub = Array.isArray(subs) && subs.length > 0
                  ? [...subs].sort((a, b) => new Date(b.expires_at ?? 0).getTime() - new Date(a.expires_at ?? 0).getTime())[0]
                  : undefined;
                const status = (sub?.status ?? "none") as SubscriptionStatus | "none";
                const colors = avatarColor(member.id);

                return (
                  <tr key={member.id} className="border-b border-[#111] last:border-b-0 hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-bold font-barlow flex-shrink-0 overflow-hidden"
                          style={member.avatar_url ? {} : { background: colors.bg, color: colors.text }}
                        >
                          {member.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.avatar_url} alt={member.full_name ?? "Avatar"} className="w-full h-full object-cover" />
                          ) : (
                            initials(member.full_name)
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#e5e5e5] leading-tight">{member.full_name ?? "Sin nombre"}</p>
                          <p className="text-[11px] text-[#555]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[#777]">{sub?.plan?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} expiresAt={sub?.expires_at ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#ccc] font-medium">{attendanceCounts[member.id] ?? 0}</span>
                      <span className="text-[10px] text-[#555] ml-1">este mes</span>
                    </td>
                    <td className="px-4 py-3">
                      <ExpiryLabel expiresAt={sub?.expires_at ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/members/${toOpaqueId(member.id)}?tab=attendance`} className="w-7 h-7 flex items-center justify-center rounded-md bg-[#161616] hover:bg-[#1e1e1e] transition-colors" title="Ver historial">
                          <Clock className="w-3 h-3 text-[#555]" />
                        </Link>
                        <Link href={`/admin/members/${toOpaqueId(member.id)}`} className="w-7 h-7 flex items-center justify-center rounded-md bg-[#161616] hover:bg-[#1e1e1e] transition-colors" title="Editar perfil">
                          <Pencil className="w-3 h-3 text-[#555]" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer con conteo */}
        <div className="px-4 py-2.5 border-t border-[#111] bg-[#0a0a0a]">
          <p className="text-[10px] text-[#444]">
            {total > 0
              ? `Mostrando ${from}–${to} de ${total} miembro${total !== 1 ? "s" : ""}`
              : "Sin resultados"}
          </p>
        </div>
      </div>

      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
