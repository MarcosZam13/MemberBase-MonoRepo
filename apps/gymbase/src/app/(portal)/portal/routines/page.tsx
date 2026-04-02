// page.tsx — Página de rutina activa del miembro con vista interactiva de entrenamiento

import { getMyRoutine, getRoutineById } from "@/actions/routine.actions";
import { PortalWorkoutView } from "@/components/gym/routines/PortalWorkoutView";
import { themeConfig } from "@/lib/theme";

export default async function PortalRoutinesPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_routines) return null;

  const memberRoutine = await getMyRoutine();

  if (!memberRoutine) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,94,20,0.08)", border: "0.5px solid rgba(255,94,20,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 12h3M19 12h3M5 12h3v-3h3v6h3v-4h3v4" stroke="#FF5E14" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>Sin rutina asignada</p>
        <p style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 280 }}>
          Contactá a tu entrenador para que te asigne una rutina personalizada.
        </p>
      </div>
    );
  }

  const routineDetail = await getRoutineById(memberRoutine.routine_id);

  if (!routineDetail) {
    return (
      <p style={{ color: "#555", textAlign: "center", padding: "48px 0" }}>
        No se pudo cargar el detalle de la rutina.
      </p>
    );
  }

  return <PortalWorkoutView routine={routineDetail} />;
}
