// RoutineSelector.tsx — Selector de rutina cuando el miembro tiene múltiples activas

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Dumbbell, Plus, Loader2, ChevronRight } from "lucide-react";
import { setFeaturedRoutineAction } from "@/actions/routine.actions";
import { PortalWorkoutView } from "@/components/gym/routines/PortalWorkoutView";
import type { MemberRoutine, RoutineWithDays } from "@/types/gym-routines";

interface RoutineSelectorProps {
  memberRoutines: MemberRoutine[];
  routineDetailsMap: Record<string, RoutineWithDays>;
  canCreate: boolean;
}

export function RoutineSelector({
  memberRoutines,
  routineDetailsMap,
  canCreate,
}: RoutineSelectorProps): React.ReactNode {
  const router = useRouter();
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  // Mostrar workout view de la rutina seleccionada
  if (selectedRoutineId) {
    const detail = routineDetailsMap[selectedRoutineId];
    if (!detail) {
      setSelectedRoutineId(null);
      return null;
    }
    return (
      <PortalWorkoutView
        routine={detail}
        onBack={() => setSelectedRoutineId(null)}
      />
    );
  }

  async function handleSetFeatured(e: React.MouseEvent, mr: MemberRoutine): Promise<void> {
    e.stopPropagation();
    setFeaturingId(mr.id);
    const result = await setFeaturedRoutineAction({ member_routine_id: mr.id });
    setFeaturingId(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error");
      return;
    }
    toast.success("Rutina destacada actualizada");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 120px" }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)",
          fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4,
        }}>
          Mis Rutinas
        </h1>
        <p style={{ fontSize: 12, color: "#555" }}>
          {memberRoutines.length} rutinas activas · Seleccioná la de hoy
        </p>
      </div>

      {/* Grid de cards — 2 columnas en mobile */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
      }}>
        {memberRoutines.map((mr) => {
          const detail = routineDetailsMap[mr.routine_id];
          const totalExercises = detail
            ? detail.days.reduce((acc, d) => acc + d.exercises.length, 0)
            : null;
          const daysCount = detail?.days?.length ?? mr.routine?.days_per_week ?? null;
          const routineName = mr.routine?.name ?? "Rutina";
          const isMemberCreated = mr.routine?.is_member_created ?? false;
          const isFeaturing = featuringId === mr.id;
          const hasDetail = !!detail;

          return (
            <div
              key={mr.id}
              style={{
                background: mr.is_featured ? "rgba(255,94,20,0.04)" : "#111",
                border: `0.5px solid ${mr.is_featured ? "rgba(255,94,20,0.35)" : "#1e1e1e"}`,
                borderRadius: 14,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Strip "Destacada" */}
              {mr.is_featured && (
                <div style={{
                  background: "rgba(255,94,20,0.12)",
                  borderBottom: "0.5px solid rgba(255,94,20,0.2)",
                  padding: "5px 12px",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <Star style={{ width: 10, height: 10, fill: "#FF5E14", color: "#FF5E14" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#FF5E14", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Destacada
                  </span>
                </div>
              )}

              {/* Contenido */}
              <div style={{ padding: "12px 12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>

                {/* Nombre */}
                <p style={{
                  fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)",
                  fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}>
                  {routineName}
                </p>

                {/* Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {mr.label && (
                    <span style={{
                      padding: "2px 7px", borderRadius: 100, fontSize: 9, fontWeight: 600,
                      background: "#1a1a1a", color: "#888", border: "0.5px solid #252525",
                    }}>
                      {mr.label}
                    </span>
                  )}
                  {isMemberCreated && (
                    <span style={{
                      padding: "2px 7px", borderRadius: 100, fontSize: 9, fontWeight: 600,
                      background: "rgba(56,189,248,0.1)", color: "#38BDF8",
                      border: "0.5px solid rgba(56,189,248,0.2)",
                    }}>
                      Tuya
                    </span>
                  )}
                </div>

                {/* Stats */}
                <p style={{ fontSize: 10, color: "#444" }}>
                  {daysCount ? `${daysCount} días` : "—"}
                  {totalExercises != null ? ` · ${totalExercises} ejercicios` : ""}
                </p>

              </div>

              {/* Acciones */}
              <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Botón Entrenar */}
                <button
                  onClick={() => hasDetail && setSelectedRoutineId(mr.routine_id)}
                  disabled={!hasDetail}
                  style={{
                    width: "100%", padding: "8px 0",
                    background: "#FF5E14", color: "#fff",
                    border: "none", borderRadius: 10,
                    fontSize: 12, fontWeight: 700, cursor: hasDetail ? "pointer" : "not-allowed",
                    opacity: hasDetail ? 1 : 0.4,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <Dumbbell style={{ width: 13, height: 13 }} />
                  Entrenar
                  <ChevronRight style={{ width: 12, height: 12 }} />
                </button>

                {/* Botón Destacar — solo si no es la featured */}
                {!mr.is_featured && (
                  <button
                    onClick={(e) => handleSetFeatured(e, mr)}
                    disabled={isFeaturing}
                    style={{
                      width: "100%", padding: "6px 0",
                      background: "transparent", color: "#555",
                      border: "0.5px solid #222", borderRadius: 10,
                      fontSize: 11, fontWeight: 500, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      fontFamily: "inherit",
                    }}
                  >
                    {isFeaturing
                      ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                      : <Star style={{ width: 11, height: 11 }} />
                    }
                    Destacar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB "Nueva rutina" — solo si el feature flag está activo */}
      {canCreate && (
        <a
          href="/portal/routines/new"
          style={{
            position: "fixed", bottom: 90, right: 20,
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 18px",
            background: "#FF5E14", color: "#fff",
            borderRadius: 100, fontSize: 13, fontWeight: 700,
            textDecoration: "none", zIndex: 40,
            boxShadow: "0 4px 20px rgba(255,94,20,0.4)",
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Nueva rutina
        </a>
      )}
    </div>
  );
}
