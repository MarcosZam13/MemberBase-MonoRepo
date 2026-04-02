// page.tsx — Listado de miembros con estado de membresía y búsqueda en tiempo real

import { getMembers } from "@core/actions/admin.actions";
import { getMonthlyAttendanceCounts } from "@/actions/checkin.actions";
import { MembersClient } from "./MembersClient";

export default async function MembersPage(): Promise<React.ReactNode> {
  // Cargar miembros y asistencias del mes actual en paralelo
  const [members, attendanceCounts] = await Promise.all([
    getMembers(),
    getMonthlyAttendanceCounts(),
  ]);

  return (
    <div className="p-6 space-y-4">
      <MembersClient members={members} attendanceCounts={attendanceCounts} />
    </div>
  );
}
