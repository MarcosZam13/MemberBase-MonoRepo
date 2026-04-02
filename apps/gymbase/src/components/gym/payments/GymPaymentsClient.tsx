// GymPaymentsClient.tsx — Tabla de comprobantes de pago con tema oscuro y filtros de estado

"use client";

import { useState, useDeferredValue } from "react";
import Image from "next/image";
import { Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { approvePayment, rejectPayment } from "@/actions/payment.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import type { PaymentProofWithDetails } from "@/types/database";

type PaymentStatus = "pending" | "approved" | "rejected";

// Genera iniciales y color de avatar a partir del ID
function avatarColor(id: string): { bg: string; text: string } {
  const P = [
    { bg: "#1e0f06", text: "#FF5E14" },
    { bg: "#0d1a0d", text: "#22C55E" },
    { bg: "#0d0d2a", text: "#818CF8" },
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return P[Math.abs(h) % P.length];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

const STATUS_LABEL: Record<FilterStatus, string> = {
  all: "Todos",
  pending: "Pendientes",
  approved: "Aprobados",
  rejected: "Rechazados",
};

const STATUS_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  pending:  { label: "Pendiente",  cls: "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.2)] text-[#FACC15]" },
  approved: { label: "Aprobado",   cls: "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.2)] text-[#22C55E]" },
  rejected: { label: "Rechazado",  cls: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[#EF4444]" },
};

interface GymPaymentsClientProps {
  initialPayments: PaymentProofWithDetails[];
}

export function GymPaymentsClient({ initialPayments }: GymPaymentsClientProps): React.ReactNode {
  const [payments, setPayments] = useState<PaymentProofWithDetails[]>(initialPayments);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [query, setQuery] = useState("");
  const [viewingProof, setViewingProof] = useState<PaymentProofWithDetails | null>(null);
  const [rejectingProof, setRejectingProof] = useState<PaymentProofWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const filtered = payments.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase();
      return (
        p.profile?.full_name?.toLowerCase().includes(q) ||
        p.profile?.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  async function handleApprove(proof: PaymentProofWithDetails): Promise<void> {
    setIsPending(true);
    const result = await approvePayment({ payment_id: proof.id, subscription_id: proof.subscription_id });
    setIsPending(false);
    if (result.success) {
      toast.success("Pago aprobado — membresía activada");
      // Actualizar estado localmente en lugar de remover (para que aparezca en "Aprobados")
      setPayments((prev) => prev.map((p) => p.id === proof.id ? { ...p, status: "approved" as PaymentStatus } : p));
      setViewingProof(null);
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al aprobar");
    }
  }

  async function handleReject(): Promise<void> {
    if (!rejectingProof || rejectionReason.trim().length < 5) {
      toast.error("El motivo debe tener al menos 5 caracteres");
      return;
    }
    setIsPending(true);
    const result = await rejectPayment({
      payment_id: rejectingProof.id,
      subscription_id: rejectingProof.subscription_id,
      rejection_reason: rejectionReason.trim(),
    });
    setIsPending(false);
    if (result.success) {
      toast.success("Pago rechazado");
      setPayments((prev) => prev.map((p) => p.id === rejectingProof.id ? { ...p, status: "rejected" as PaymentStatus } : p));
      setRejectingProof(null);
      setRejectionReason("");
      setViewingProof(null);
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al rechazar");
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Pagos</h1>
            <p className="text-xs text-[#555] mt-1">
              {pendingCount > 0 ? `${pendingCount} comprobantes pendientes de revisión` : "Sin comprobantes pendientes"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 h-[34px] bg-[#111] border border-[#222] rounded-lg px-3 w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#444] flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent text-xs text-[#ccc] placeholder-[#444] outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Chips de filtro */}
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all ${
                filter === f
                  ? "bg-[rgba(255,94,20,0.12)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                  : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
              }`}
            >
              {STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {["Miembro", "Plan", "Monto", "Fecha", "Estado", "Comprobante", "Acción"].map((h) => (
                  <th key={h} className="text-[10px] text-[#444] uppercase tracking-[0.08em] font-semibold px-4 py-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#444] text-sm">
                    No hay comprobantes con este filtro
                  </td>
                </tr>
              ) : (
                filtered.map((proof) => {
                  const colors = avatarColor(proof.user_id);
                  const statusBadge = STATUS_BADGE[proof.status as PaymentStatus] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={proof.id} className="border-b border-[#0f0f0f] last:border-b-0 hover:bg-[#111] transition-colors">
                      {/* Miembro */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-barlow flex-shrink-0"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            {initials(proof.profile?.full_name)}
                          </div>
                          <p className="text-[13px] font-semibold text-[#e5e5e5]">
                            {proof.profile?.full_name ?? "—"}
                          </p>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-[#161616] border border-[#222] rounded text-[#888] px-1.5 py-0.5">
                          {proof.subscription?.plan?.name ?? "—"}
                        </span>
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3">
                        <p className="text-[16px] font-bold font-barlow text-white leading-none">
                          {proof.amount
                            ? formatPrice(proof.amount, proof.subscription?.plan?.currency ?? "CRC")
                            : "—"}
                        </p>
                        <p className="text-[10px] text-[#555] mt-0.5">
                          {proof.subscription?.plan?.duration_days
                            ? proof.subscription.plan.duration_days <= 31 ? "Mensual" : "Anual"
                            : "—"}
                        </p>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-[#777]">{formatDate(proof.created_at)}</span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Comprobante */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewingProof(proof)}
                          className="h-6 px-2 flex items-center gap-1 bg-[#161616] border border-[#222] rounded text-[10px] text-[#666] hover:text-[#ccc] transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Ver
                        </button>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3">
                        {proof.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApprove(proof)}
                              disabled={isPending}
                              className="h-6 px-2.5 text-[10px] font-semibold rounded bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22C55E] hover:opacity-80 transition-opacity disabled:opacity-40"
                            >
                              ✓ Aprobar
                            </button>
                            <button
                              onClick={() => setRejectingProof(proof)}
                              className="h-6 px-2.5 text-[10px] font-semibold rounded bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#EF4444] hover:opacity-80 transition-opacity"
                            >
                              ✗ Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#444]">
                            {proof.status === "approved" ? "Aprobado" : `Rechazado`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: ver comprobante */}
      {viewingProof && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingProof(null)}
        >
          <div
            className="bg-[#111] border border-[#1e1e1e] rounded-[18px] w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <p className="text-sm font-semibold text-white">Comprobante de pago</p>
              <p className="text-xs text-[#555] mt-0.5">
                {viewingProof.profile?.full_name} — {viewingProof.subscription?.plan?.name}
              </p>
            </div>

            <div className="p-5">
              {/* Vista del comprobante */}
              {viewingProof.file_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <div className="relative h-72 bg-[#0d0d0d] rounded-xl overflow-hidden mb-4">
                  <Image
                    src={viewingProof.file_url}
                    alt="Comprobante de pago"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 bg-[#0d0d0d] rounded-xl mb-4">
                  <a
                    href={viewingProof.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#FF5E14] text-sm hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver comprobante PDF
                  </a>
                </div>
              )}

              {viewingProof.notes && (
                <p className="text-xs text-[#666] mb-4">
                  <span className="font-medium text-[#888]">Nota del cliente:</span> {viewingProof.notes}
                </p>
              )}

              {viewingProof.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRejectingProof(viewingProof); setViewingProof(null); }}
                    className="flex-1 h-9 text-sm font-semibold rounded-[10px] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] hover:opacity-80 transition-opacity"
                  >
                    ✗ Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(viewingProof)}
                    disabled={isPending}
                    className="flex-1 h-9 text-sm font-semibold rounded-[10px] bg-[#22C55E] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? "Procesando..." : "✓ Aprobar pago"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: motivo de rechazo */}
      {rejectingProof && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => { setRejectingProof(null); setRejectionReason(""); }}
        >
          <div
            className="bg-[#111] border border-[#1e1e1e] rounded-[18px] w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <p className="text-sm font-semibold text-white">Rechazar comprobante</p>
              <p className="text-xs text-[#555] mt-0.5">
                El cliente verá este motivo en su portal
              </p>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em] block">
                Motivo del rechazo
              </label>
              <textarea
                rows={3}
                placeholder="Ej: El monto no coincide con el plan seleccionado..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#EF4444] resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setRejectingProof(null); setRejectionReason(""); }}
                  className="flex-1 h-9 text-sm font-medium rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] hover:text-[#888] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={isPending || rejectionReason.trim().length < 5}
                  className="flex-1 h-9 text-sm font-semibold rounded-[10px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-[#EF4444] hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {isPending ? "Rechazando..." : "Confirmar rechazo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
