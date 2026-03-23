// StatusBadge.tsx — Badge reutilizable con color semántico por estado de suscripción

import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/types/database";

type Status = SubscriptionStatus | "none" | "visible" | "hidden" | "pinned";

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const STATUS_CONFIG: Record<Status, { bg: string; text: string; border?: string; label: string }> = {
  active:    { bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", label: "Activo" },
  pending:   { bg: "bg-[#D97706]/10", text: "text-[#D97706]", label: "Pendiente" },
  expired:   { bg: "bg-[#DC2626]/10", text: "text-[#DC2626]", label: "Vencido" },
  rejected:  { bg: "bg-[#DC2626]/10", text: "text-[#DC2626]", label: "Rechazado" },
  cancelled: { bg: "bg-[#6B7280]/10", text: "text-[#6B7280]", border: "border border-[#E5E7EB]", label: "Cancelado" },
  none:      { bg: "bg-transparent",  text: "text-[#6B7280]", border: "border border-[#E5E7EB]", label: "Sin membresía" },
  visible:   { bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", label: "Visible" },
  hidden:    { bg: "bg-[#6B7280]/10", text: "text-[#6B7280]", label: "Oculto" },
  pinned:    { bg: "bg-[#2563EB]/10", text: "text-[#2563EB]", label: "Fijado" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="secondary"
      className={`${config.bg} ${config.text} ${config.border ?? ""} px-2.5 py-0.5 text-xs font-medium`}
    >
      {label ?? config.label}
    </Badge>
  );
}
