// page.tsx — Listado de miembros con paginación server-side y filtros por URL params

import { getMembersPaginated } from "@core/actions/admin.actions";
import { getMonthlyAttendanceCountsForUsers } from "@/actions/checkin.actions";
import { getPlans } from "@core/actions/membership.actions";
import { MembersClient } from "./MembersClient";
import type { MemberStatusFilter } from "@core/services/admin.service";

const PAGE_SIZE = 25;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    planId?: string;
  }>;
}

export default async function MembersPage({ searchParams }: PageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";
  const status = (["all", "active", "expiring", "expired"].includes(params.status ?? "")
    ? params.status
    : "all") as MemberStatusFilter;
  const planId = params.planId;

  // Cargar miembros paginados, planes (para chips de filtro) y asistencias del mes en paralelo
  const [result, plans] = await Promise.all([
    getMembersPaginated({ page, pageSize: PAGE_SIZE, search: search || undefined, status, planId }),
    getPlans(true),
  ]);

  // Asistencias solo para los user_ids de la página actual — no todos los miembros
  const userIds = result.data.map((m) => m.id);
  const attendanceCounts = await getMonthlyAttendanceCountsForUsers(userIds);

  return (
    <div className="p-6 space-y-4">
      <MembersClient
        result={result}
        attendanceCounts={attendanceCounts}
        plans={plans}
        currentSearch={search}
        currentStatus={status}
        currentPlanId={planId ?? ""}
      />
    </div>
  );
}
