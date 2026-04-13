// page.tsx — Página de rutinas del portal: selector multi-rutina o workout view directo

import { getMemberRoutineStack, getRoutineById } from "@/actions/routine.actions";
import { PortalWorkoutView } from "@/components/gym/routines/PortalWorkoutView";
import { RoutineSelector } from "@/components/gym/routines/RoutineSelector";
import { themeConfig } from "@/lib/theme";
import type { RoutineWithDays } from "@/types/gym-routines";

export default async function PortalRoutinesPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_routines) return null;

  const { active: memberRoutines } = await getMemberRoutineStack();

  // Estado vacío — sin rutinas asignadas
  if (memberRoutines.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,94,20,0.08)", border: "0.5px solid rgba(255,94,20,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 12h3M19 12h3M5 12h3v-3h3v6h3v-4h3v4" stroke="#FF5E14" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>Sin rutinas asignadas</p>
        <p style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 280 }}>
          Contactá a tu entrenador para que te asigne una rutina personalizada.
        </p>
      </div>
    );
  }

  // Una sola rutina → workout view directo (comportamiento original, sin cambio de UX)
  if (memberRoutines.length === 1) {
    const routineDetail = await getRoutineById(memberRoutines[0].routine_id);
    if (!routineDetail) {
      return (
        <p style={{ color: "#555", textAlign: "center", padding: "48px 0" }}>
          No se pudo cargar el detalle de la rutina.
        </p>
      );
    }
    return <PortalWorkoutView routine={routineDetail} />;
  }

  // Múltiples rutinas → precargar detalles en paralelo y mostrar selector
  const detailResults = await Promise.all(
    memberRoutines.map((mr) => getRoutineById(mr.routine_id))
  );

  const detailsMap: Record<string, RoutineWithDays> = {};
  memberRoutines.forEach((mr, i) => {
    const detail = detailResults[i];
    if (detail) detailsMap[mr.routine_id] = detail;
  });

  return (
    <RoutineSelector
      memberRoutines={memberRoutines}
      routineDetailsMap={detailsMap}
      canCreate={themeConfig.features.gym_member_custom_routines}
    />
  );
}
