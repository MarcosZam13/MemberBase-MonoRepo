// page.tsx — Gestión de pagos con paginación server-side y filtros por URL params

import { getAllPaymentsAdmin, getPendingPaymentsCount } from "@/actions/payment.actions";
import { getPlans } from "@core/actions/membership.actions";
import { getMembers } from "@core/actions/admin.actions";
import { GymPaymentsClient } from "@/components/gym/payments/GymPaymentsClient";
import { ManualPaymentDialog } from "@/components/gym/payments/ManualPaymentDialog";
import type { PaymentStatusFilter } from "@/actions/payment.actions";

const PAGE_SIZE = 25;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const status = (["all", "pending", "approved", "rejected"].includes(params.status ?? "")
    ? params.status
    : "all") as PaymentStatusFilter;

  // Cargar pagos paginados, planes, miembros y conteo de pendientes en paralelo
  const [result, plans, members, pendingCount] = await Promise.all([
    getAllPaymentsAdmin({ page, pageSize: PAGE_SIZE, status }),
    getPlans(true),
    getMembers(),
    getPendingPaymentsCount(),
  ]);

  const memberList = members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
  }));

  return (
    <div className="p-6 space-y-0">
      <GymPaymentsClient
        result={result}
        pendingCount={pendingCount}
        currentStatus={status}
        manualPaymentSlot={
          <ManualPaymentDialog members={memberList} plans={plans} />
        }
      />
    </div>
  );
}
