// MembersClient.tsx — Tabla de miembros con búsqueda, filtros de estado/plan y columna de asistencias

"use client";

import { useState, useDeferredValue } from "react";
import Link from "next/link";
import { Search, Clock, Pencil } from "lucide-react";
import type { MemberWithSubscription, SubscriptionStatus } from "@/types/database";

// Genera un color de avatar basado en hash simple del userId
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

// Extrae iniciales del nombre completo (máx. 2 caracteres)
function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// Calcula días hasta vencimiento (negativo = ya venció)
function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface ExpiryLabelProps {
  expiresAt: string | null;
}

function ExpiryLabel({ expiresAt }: ExpiryLabelProps): React.ReactNode {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return <span className="text-[#444] text-xs">—</span>;

  if (days < 0) {
    return <span className="text-xs font-medium text-[#EF4444]">Venció hace {Math.abs(days)}d</span>;
  }
  if (days <= 7) {
    return <span className="text-xs font-medium text-[#FACC15]">{days} días</span>;
  }
  return (
    <span className="text-xs text-[#777]">
      {new Date(expiresAt!).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
    </span>
  );
}

type FilterStatus = "all" | "active" | "expiring" | "expired";

interface MembersClientProps {
  members: MemberWithSubscription[];
  attendanceCounts: Record<string, number>;
}

export function MembersClient({ members, attendanceCounts }: MembersClientProps): React.ReactNode {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);

  // Extraer nombres únicos de planes para los chips dinámicos
  const planNames = Array.from(
    new Set(
      members
        .flatMap((m) => {
          const subs = m.active_subscription as unknown as Array<{ plan?: { name: string } }> | undefined;
          return Array.isArray(subs) ? [subs[0]?.plan?.name].filter(Boolean) : [];
        })
    )
  ) as string[];

  const filtered = members.filter((m) => {
    const subs = m.active_subscription as unknown as Array<{
      status: SubscriptionStatus;
      expires_at: string | null;
      plan?: { name: string; price: number; currency: string };
    }> | undefined;
    const sub = Array.isArray(subs) ? subs[0] : undefined;
    const status = sub?.status ?? "none";

    // Filtro por texto (nombre o email)
    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase();
      const matchName = m.full_name?.toLowerCase().includes(q) ?? false;
      const matchEmail = m.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    // Filtro por estado
    if (statusFilter !== "all") {
      const days = daysUntilExpiry(sub?.expires_at ?? null);
      if (statusFilter === "active" && !(status === "active" && (days === null || days > 7))) return false;
      if (statusFilter === "expiring" && !(status === "active" && days !== null && days <= 7 && days >= 0)) return false;
      if (statusFilter === "expired" && !(status === "expired" || (days !== null && days < 0))) return false;
    }

    // Filtro por plan
    if (planFilter !== "all") {
      const planName = sub?.plan?.name;
      if (planName !== planFilter) return false;
    }

    return true;
  });

  const STATUS_CHIP: Record<FilterStatus, string> = {
    all: "Todos",
    active: "Activos",
    expiring: "Por vencer",
    expired: "Vencidos",
  };

  // Badge de estado de membresía
  function StatusBadge({ status, expiresAt }: { status: SubscriptionStatus | "none"; expiresAt: string | null }): React.ReactNode {
    const days = daysUntilExpiry(expiresAt);
    if (status === "active" && days !== null && days <= 7 && days >= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] text-[#FACC15]">
          Por vencer
        </span>
      );
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
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Miembros</h1>
          <p className="text-xs text-[#555] mt-1">{members.length} miembros en total</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Buscador */}
          <div className="flex items-center gap-2 h-[34px] bg-[#111] border border-[#222] rounded-lg px-3 w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#444] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar miembro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
        {(["all", "active", "expiring", "expired"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
              statusFilter === f
                ? "bg-[rgba(255,94,20,0.12)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
            }`}
          >
            {statusFilter === f && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E14]" />}
            {STATUS_CHIP[f]}
          </button>
        ))}

        {/* Separador visual */}
        {planNames.length > 0 && <div className="w-px bg-[#1e1e1e] mx-1" />}

        {/* Chips dinámicos de plan */}
        {planNames.map((plan) => (
          <button
            key={plan}
            onClick={() => setPlanFilter(planFilter === plan ? "all" : plan)}
            className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all ${
              planFilter === plan
                ? "bg-[rgba(255,94,20,0.12)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
            }`}
          >
            {plan}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {["Miembro", "Plan", "Estado", "Asistencias", "Vence", ""].map((h) => (
                <th
                  key={h}
                  className="text-[10px] text-[#444] uppercase tracking-[0.08em] font-semibold px-4 py-3 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#444] text-sm">
                  {query ? "No se encontraron miembros con esa búsqueda" : "No hay miembros con ese filtro"}
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const subs = member.active_subscription as unknown as Array<{
                  status: SubscriptionStatus;
                  expires_at: string | null;
                  plan?: { name: string; price: number; currency: string };
                }> | undefined;
                const sub = Array.isArray(subs) ? subs[0] : undefined;
                const status = (sub?.status ?? "none") as SubscriptionStatus | "none";
                const colors = avatarColor(member.id);
                const monthAttendance = attendanceCounts[member.id] ?? 0;

                return (
                  <tr key={member.id} className="border-b border-[#111] last:border-b-0 hover:bg-[#111] transition-colors">
                    {/* Miembro */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-bold font-barlow flex-shrink-0"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {initials(member.full_name)}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#e5e5e5] leading-tight">
                            {member.full_name ?? "Sin nombre"}
                          </p>
                          <p className="text-[11px] text-[#555]">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[#777]">{sub?.plan?.name ?? "—"}</span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <StatusBadge status={status} expiresAt={sub?.expires_at ?? null} />
                    </td>

                    {/* Asistencias este mes */}
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#ccc] font-medium">{monthAttendance}</span>
                      <span className="text-[10px] text-[#555] ml-1">este mes</span>
                    </td>

                    {/* Vence */}
                    <td className="px-4 py-3">
                      <ExpiryLabel expiresAt={sub?.expires_at ?? null} />
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Ver historial */}
                        <Link
                          href={`/admin/members/${member.id}?tab=attendance`}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-[#161616] hover:bg-[#1e1e1e] transition-colors"
                          title="Ver historial"
                        >
                          <Clock className="w-3 h-3 text-[#555]" />
                        </Link>
                        {/* Editar perfil */}
                        <Link
                          href={`/admin/members/${member.id}`}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-[#161616] hover:bg-[#1e1e1e] transition-colors"
                          title="Editar perfil"
                        >
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
            {filtered.length} de {members.length} miembro{members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
