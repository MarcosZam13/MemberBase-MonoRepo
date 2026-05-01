// RoutineSelector.tsx — Selector de rutina cuando el miembro tiene múltiples activas

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Dumbbell, Plus, Loader2, ChevronRight, MoreHorizontal, Pencil, Trash2, Check, X, Settings2 } from "lucide-react";
import { setFeaturedRoutineAction, updateMyRoutine, deleteMyRoutine } from "@/actions/routine.actions";
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
  // Estado para el menú de opciones de rutinas propias
  const [openMenuId, setOpenMenuId]         = useState<string | null>(null);
  const [renamingId, setRenamingId]         = useState<string | null>(null);
  const [renameValue, setRenameValue]       = useState("");
  const [renamePending, setRenamePending]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Foco automático al abrir el input de renombrar — debe estar ANTES de cualquier return condicional
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // Mostrar workout view de la rutina seleccionada — return condicional DESPUÉS de todos los hooks
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
      toast.error(typeof result.error === "string" ? result.error : "Error al destacar la rutina");
      return;
    }
    toast.success("Rutina destacada actualizada");
    router.refresh();
  }

  function startRename(mr: MemberRoutine): void {
    setOpenMenuId(null);
    setRenamingId(mr.routine_id);
    setRenameValue(mr.routine?.name ?? "");
  }

  async function handleRename(routineId: string): Promise<void> {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setRenamePending(true);
    const result = await updateMyRoutine(routineId, { name: trimmed });
    setRenamePending(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al renombrar");
      return;
    }
    toast.success("Rutina renombrada");
    setRenamingId(null);
    router.refresh();
  }

  function startConfirmDelete(routineId: string): void {
    setOpenMenuId(null);
    setConfirmDeleteId(routineId);
  }

  async function handleDelete(routineId: string): Promise<void> {
    setDeletingId(routineId);
    const result = await deleteMyRoutine(routineId);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al eliminar");
      return;
    }
    toast.success("Rutina eliminada");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 120px" }}>

      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
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
        {/* Acceso rápido al tracker de fuerza (1RM) */}
        <a
          href="/portal/routines/strength"
          style={{
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            padding: "8px 14px",
            background: "rgba(255,94,20,0.06)", border: "0.5px solid rgba(255,94,20,0.2)",
            borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#FF5E14",
            textDecoration: "none", transition: "all 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 10l3-4 3 2 3-5" stroke="#FF5E14" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mi Fuerza
        </a>
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

                {/* Nombre + menú opciones (rutinas propias) */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {renamingId === mr.routine_id ? (
                    /* Input de renombrar inline */
                    <div style={{ flex: 1, display: "flex", gap: 4 }}>
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(mr.routine_id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        style={{
                          flex: 1, background: "#1a1a1a", border: "0.5px solid #FF5E14",
                          borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600,
                          padding: "4px 8px", fontFamily: "inherit", outline: "none",
                        }}
                      />
                      <button
                        onClick={() => handleRename(mr.routine_id)}
                        disabled={renamePending}
                        style={{ padding: "4px 6px", background: "rgba(34,197,94,0.15)", border: "0.5px solid rgba(34,197,94,0.3)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        {renamePending
                          ? <Loader2 style={{ width: 11, height: 11, color: "#22C55E" }} className="animate-spin" />
                          : <Check style={{ width: 11, height: 11, color: "#22C55E" }} />
                        }
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        style={{ padding: "4px 6px", background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <X style={{ width: 11, height: 11, color: "#EF4444" }} />
                      </button>
                    </div>
                  ) : (
                    <p style={{
                      flex: 1,
                      fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)",
                      fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                    }}>
                      {routineName}
                    </p>
                  )}

                  {/* Menú "..." solo en rutinas propias (no en modo renombrar) */}
                  {isMemberCreated && renamingId !== mr.routine_id && (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === mr.routine_id ? null : mr.routine_id); }}
                        style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#555", display: "flex", alignItems: "center", borderRadius: 6 }}
                      >
                        <MoreHorizontal style={{ width: 15, height: 15 }} />
                      </button>
                      {openMenuId === mr.routine_id && (
                        <div style={{
                          position: "absolute", right: 0, top: "100%", zIndex: 50,
                          background: "#1a1a1a", border: "0.5px solid #2a2a2a",
                          borderRadius: 10, overflow: "hidden", minWidth: 130,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        }}>
                          <a
                            href={`/portal/routines/${mr.routine_id}/edit`}
                            style={{ width: "100%", padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "#ccc", textDecoration: "none" }}
                          >
                            <Settings2 style={{ width: 12, height: 12 }} />
                            Editar rutina
                          </a>
                          <button
                            onClick={() => startRename(mr)}
                            style={{ width: "100%", padding: "9px 14px", background: "transparent", border: "none", borderTop: "0.5px solid #181818", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "#ccc", fontFamily: "inherit", textAlign: "left" }}
                          >
                            <Pencil style={{ width: 12, height: 12 }} />
                            Renombrar
                          </button>
                          <button
                            onClick={() => startConfirmDelete(mr.routine_id)}
                            style={{ width: "100%", padding: "9px 14px", background: "transparent", border: "none", borderTop: "0.5px solid #252525", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "#EF4444", fontFamily: "inherit", textAlign: "left" }}
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

              {/* Confirmación de eliminación — reemplaza las acciones normales */}
              {confirmDeleteId === mr.routine_id && (
                <div style={{ margin: "0 10px 10px", background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, marginBottom: 8 }}>
                    ¿Eliminar esta rutina?
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleDelete(mr.routine_id)}
                      disabled={!!deletingId}
                      style={{ flex: 1, padding: "7px 0", background: "#EF4444", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }}
                    >
                      {deletingId === mr.routine_id
                        ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                        : <Trash2 style={{ width: 11, height: 11 }} />
                      }
                      Eliminar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={!!deletingId}
                      style={{ flex: 1, padding: "7px 0", background: "transparent", border: "0.5px solid #333", borderRadius: 8, fontSize: 11, fontWeight: 500, color: "#666", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Acciones */}
              {confirmDeleteId !== mr.routine_id && (
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
              )}
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
