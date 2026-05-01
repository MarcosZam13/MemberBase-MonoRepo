// EditMyRoutineFlow.tsx — Editor de rutinas propias del miembro (add/remove días y ejercicios)

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Loader2, Check, Search, Lock, Dumbbell, X, Trash2, Video, ChevronDown,
} from "lucide-react";
import {
  addDayToMyRoutine, addExerciseToMyDay,
  removeExerciseFromMyDay, removeDayFromMyRoutine,
} from "@/actions/routine.actions";
import { createMyPrivateExercise } from "@/actions/exercise.actions";
import type { Exercise, RoutineWithDays, RoutineExercise } from "@/types/gym-routines";

/* ── Constantes ───────────────────────────────────────────────────────────── */

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", quads: "Cuádriceps",
  hamstrings: "Isquiotibiales", glutes: "Glúteos", calves: "Pantorrillas",
  core: "Core", full_body: "Cuerpo completo", cardio: "Cardio",
  forearms: "Antebrazos", legs: "Piernas",
};

/* ── Tipos internos ───────────────────────────────────────────────────────── */

interface DayWithExercises {
  id: string;
  name: string | null;
  day_number: number;
  exercises: RoutineExercise[];
}

interface ExerciseParams {
  sets: string;
  reps: string;
  rest_seconds: string;
  notes: string;
}

interface Props {
  routine: RoutineWithDays;
  exercises: Exercise[];
}

/* ── Componente principal ─────────────────────────────────────────────────── */

export function EditMyRoutineFlow({ routine, exercises }: Props): React.ReactNode {
  const router = useRouter();

  /* ── Estado local de días — se actualiza optimísticamente ── */
  const [days, setDays] = useState<DayWithExercises[]>(
    routine.days.map((d) => ({
      id: d.id,
      name: d.name,
      day_number: d.day_number,
      exercises: d.exercises,
    }))
  );
  const [exerciseList, setExerciseList] = useState<Exercise[]>(exercises);

  /* ── Qué día tiene el picker de ejercicios abierto ── */
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  /* ── Qué días están expandidos (muestran su lista de ejercicios) ── */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(routine.days.map((d) => d.id))
  );

  /* ── Estado del picker de ejercicios ── */
  const [search, setSearch]           = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [selectedEx, setSelectedEx]   = useState<Exercise | null>(null);
  const [params, setParams]           = useState<ExerciseParams>({ sets: "3", reps: "10", rest_seconds: "60", notes: "" });
  const [addingExercise, setAddingExercise] = useState(false);

  /* ── Estado del formulario de ejercicio privado ── */
  const [showPrivateForm, setShowPrivateForm]     = useState(false);
  const [privateExName, setPrivateExName]         = useState("");
  const [privateExMuscle, setPrivateExMuscle]     = useState("");
  const [privateExVideoUrl, setPrivateExVideoUrl] = useState("");
  const [creatingPrivate, setCreatingPrivate]     = useState(false);

  /* ── Estado de eliminación ── */
  const [removingExId, setRemovingExId]   = useState<string | null>(null);
  const [removingDayId, setRemovingDayId] = useState<string | null>(null);
  const [confirmDayId, setConfirmDayId]   = useState<string | null>(null);

  /* ── Estado para agregar nuevo día ── */
  const [showDayInput, setShowDayInput] = useState(false);
  const [newDayName, setNewDayName]     = useState("");
  const [addingDay, setAddingDay]       = useState(false);

  /* ── Grupos musculares disponibles ── */
  const availableMuscles = useMemo(() => {
    const groups = new Set<string>();
    for (const ex of exerciseList) {
      if (ex.muscle_group) groups.add(ex.muscle_group);
    }
    return [...groups].sort();
  }, [exerciseList]);

  /* ── Ejercicios filtrados ── */
  const filteredExercises = useMemo(() => {
    let list = exerciseList;
    if (muscleFilter) list = list.filter((e) => e.muscle_group === muscleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [exerciseList, search, muscleFilter]);

  /* ── Toggle expansión de un día ── */
  function toggleDay(dayId: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  /* ── Abrir/cerrar picker de ejercicios para un día ── */
  function openPicker(dayId: string): void {
    setActiveDayId(dayId);
    setSelectedEx(null);
    setSearch("");
    setMuscleFilter("");
    setShowPrivateForm(false);
    // Asegurar que el día esté expandido
    setExpandedIds((prev) => new Set([...prev, dayId]));
  }

  function closePicker(): void {
    setActiveDayId(null);
    setSelectedEx(null);
    setSearch("");
    setMuscleFilter("");
    setShowPrivateForm(false);
  }

  /* ── Agregar ejercicio al día ── */
  async function handleAddExercise(): Promise<void> {
    if (!selectedEx || !activeDayId) return;
    setAddingExercise(true);
    const result = await addExerciseToMyDay({
      day_id: activeDayId,
      exercise_id: selectedEx.id,
      sets: parseInt(params.sets) || undefined,
      reps: params.reps || undefined,
      rest_seconds: parseInt(params.rest_seconds) || undefined,
      notes: params.notes || undefined,
    });
    setAddingExercise(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al agregar el ejercicio");
      return;
    }
    // Actualizar estado local sin refetch
    setDays((prev) => prev.map((d) => {
      if (d.id !== activeDayId) return d;
      return { ...d, exercises: [...d.exercises, result.data! as RoutineExercise] };
    }));
    toast.success("Ejercicio agregado");
    setSelectedEx(null);
    setParams({ sets: "3", reps: "10", rest_seconds: "60", notes: "" });
  }

  /* ── Eliminar ejercicio de un día ── */
  async function handleRemoveExercise(routineExerciseId: string, dayId: string): Promise<void> {
    setRemovingExId(routineExerciseId);
    const result = await removeExerciseFromMyDay(routineExerciseId);
    setRemovingExId(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al eliminar");
      return;
    }
    setDays((prev) => prev.map((d) =>
      d.id === dayId
        ? { ...d, exercises: d.exercises.filter((e) => e.id !== routineExerciseId) }
        : d
    ));
  }

  /* ── Eliminar día completo ── */
  async function handleRemoveDay(dayId: string): Promise<void> {
    setRemovingDayId(dayId);
    const result = await removeDayFromMyRoutine(dayId);
    setRemovingDayId(null);
    setConfirmDayId(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al eliminar el día");
      return;
    }
    setDays((prev) => prev.filter((d) => d.id !== dayId));
    if (activeDayId === dayId) closePicker();
    toast.success("Día eliminado");
  }

  /* ── Agregar nuevo día ── */
  async function handleAddDay(): Promise<void> {
    if (!newDayName.trim()) return;
    setAddingDay(true);
    const result = await addDayToMyRoutine({ routine_id: routine.id, name: newDayName.trim() });
    setAddingDay(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al agregar");
      return;
    }
    const newDay: DayWithExercises = { ...result.data!, exercises: [] };
    setDays((prev) => [...prev, newDay]);
    setExpandedIds((prev) => new Set([...prev, newDay.id]));
    setNewDayName("");
    setShowDayInput(false);
  }

  /* ── Crear ejercicio privado ── */
  async function handleCreatePrivate(): Promise<void> {
    if (!privateExName.trim()) return;
    setCreatingPrivate(true);
    const result = await createMyPrivateExercise({
      name: privateExName.trim(),
      muscle_group: privateExMuscle || undefined,
      video_url: privateExVideoUrl.trim() || undefined,
    });
    setCreatingPrivate(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al crear el ejercicio");
      return;
    }
    const newEx = result.data!;
    setExerciseList((prev) => [newEx, ...prev]);
    setSelectedEx(newEx);
    setPrivateExName("");
    setPrivateExMuscle("");
    setPrivateExVideoUrl("");
    setShowPrivateForm(false);
    toast.success("Ejercicio creado");
  }

  /* ── Estilos base ── */
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", background: "#0d0d0d",
    border: "0.5px solid #1e1e1e", borderRadius: 10, color: "#ddd",
    fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "#555",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block",
  };

  return (
    <div style={{ paddingTop: 4, paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <a
          href="/portal/routines"
          style={{ color: "#555", display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {routine.name}
          </h1>
          <p style={{ fontSize: 11, color: "#555" }}>Editando rutina · {days.length} día{days.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => router.push("/portal/routines")}
          style={{
            padding: "7px 14px", background: "#FF5E14", color: "#fff",
            border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            fontFamily: "inherit", flexShrink: 0,
          }}
        >
          <Check style={{ width: 12, height: 12 }} />
          Guardar
        </button>
      </div>

      {/* ── Lista de días ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {days.length === 0 && (
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#444" }}>Sin días — agrega el primero abajo.</p>
          </div>
        )}

        {days.map((day) => {
          const isExpanded    = expandedIds.has(day.id);
          const isPickerOpen  = activeDayId === day.id;
          const isConfirming  = confirmDayId === day.id;
          const isDeleting    = removingDayId === day.id;

          return (
            <div
              key={day.id}
              style={{ background: "#111", border: `0.5px solid ${isPickerOpen ? "rgba(255,94,20,0.35)" : "#1e1e1e"}`, borderRadius: 14, overflow: "hidden" }}
            >
              {/* Cabecera del día */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                {/* Toggle expand */}
                <button
                  onClick={() => toggleDay(day.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#555", display: "flex", alignItems: "center", flexShrink: 0 }}
                >
                  <ChevronDown style={{ width: 16, height: 16, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>{day.name ?? `Día ${day.day_number}`}</p>
                  <p style={{ fontSize: 10, color: "#444" }}>
                    {day.exercises.length > 0
                      ? `${day.exercises.length} ejercicio${day.exercises.length !== 1 ? "s" : ""}`
                      : "Sin ejercicios"}
                  </p>
                </div>

                {/* Botón agregar ejercicio */}
                {!isPickerOpen && (
                  <button
                    onClick={() => openPicker(day.id)}
                    style={{
                      padding: "5px 10px", background: "rgba(255,94,20,0.08)",
                      border: "0.5px solid rgba(255,94,20,0.25)", borderRadius: 8,
                      color: "#FF5E14", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit",
                    }}
                  >
                    <Plus style={{ width: 11, height: 11 }} />
                    Ejercicio
                  </button>
                )}

                {/* Botón eliminar día */}
                {!isConfirming ? (
                  <button
                    onClick={() => setConfirmDayId(day.id)}
                    style={{ padding: 6, background: "transparent", border: "0.5px solid #222", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", color: "#444" }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleRemoveDay(day.id)}
                      disabled={isDeleting}
                      style={{ padding: "5px 8px", background: "#EF4444", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}
                    >
                      {isDeleting ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> : "Eliminar"}
                    </button>
                    <button
                      onClick={() => setConfirmDayId(null)}
                      style={{ padding: "5px 8px", background: "transparent", border: "0.5px solid #333", borderRadius: 7, cursor: "pointer", fontSize: 10, color: "#666", fontFamily: "inherit" }}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de ejercicios del día */}
              {isExpanded && day.exercises.length > 0 && (
                <div style={{ borderTop: "0.5px solid #1a1a1a" }}>
                  {day.exercises.map((ex, i) => (
                    <div
                      key={ex.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 14px",
                        borderBottom: i < day.exercises.length - 1 ? "0.5px solid #141414" : "none",
                      }}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Dumbbell style={{ width: 11, height: 11, color: "#444" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ex.exercise?.name ?? "—"}
                        </p>
                        <p style={{ fontSize: 10, color: "#444" }}>
                          {[ex.sets && `${ex.sets} series`, ex.reps && `${ex.reps} reps`, ex.rest_seconds && `${ex.rest_seconds}s descanso`]
                            .filter(Boolean).join(" · ") || "Sin parámetros"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveExercise(ex.id, day.id)}
                        disabled={removingExId === ex.id}
                        style={{ padding: 5, background: "transparent", border: "0.5px solid #1e1e1e", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", color: "#333", flexShrink: 0 }}
                      >
                        {removingExId === ex.id
                          ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                          : <X style={{ width: 11, height: 11 }} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Picker de ejercicios (inline dentro del día activo) ── */}
              {isPickerOpen && (
                <div style={{ borderTop: "0.5px solid rgba(255,94,20,0.2)", padding: "14px 14px 16px", background: "rgba(255,94,20,0.02)" }}>

                  {/* Header del picker */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#FF5E14", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Agregar ejercicio
                    </p>
                    <button onClick={closePicker} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}>
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>

                  {/* Buscador */}
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#444" }} />
                    <input
                      type="text"
                      placeholder="Buscar ejercicio…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 32 }}
                    />
                  </div>

                  {/* Filtros por grupo muscular */}
                  <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, marginBottom: 10, scrollbarWidth: "none" }}>
                    <button
                      onClick={() => setMuscleFilter("")}
                      style={{ flexShrink: 0, padding: "3px 9px", background: !muscleFilter ? "#FF5E14" : "#111", color: !muscleFilter ? "#fff" : "#666", border: `0.5px solid ${!muscleFilter ? "#FF5E14" : "#252525"}`, borderRadius: 100, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Todos
                    </button>
                    {availableMuscles.map((mg) => (
                      <button
                        key={mg}
                        onClick={() => setMuscleFilter(muscleFilter === mg ? "" : mg)}
                        style={{ flexShrink: 0, padding: "3px 9px", background: muscleFilter === mg ? "#FF5E14" : "#111", color: muscleFilter === mg ? "#fff" : "#666", border: `0.5px solid ${muscleFilter === mg ? "#FF5E14" : "#252525"}`, borderRadius: 100, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        {MUSCLE_LABELS[mg] ?? mg}
                      </button>
                    ))}
                  </div>

                  {/* Form de parámetros — aparece al seleccionar un ejercicio */}
                  {selectedEx && (
                    <div style={{ background: "rgba(255,94,20,0.06)", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#FF5E14" }}>{selectedEx.name}</p>
                        <button onClick={() => setSelectedEx(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}>
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                        {(["sets", "reps", "rest_seconds"] as const).map((field) => (
                          <div key={field}>
                            <label style={{ ...labelStyle, marginBottom: 3 }}>
                              {field === "sets" ? "Series" : field === "reps" ? "Reps" : "Desc. (s)"}
                            </label>
                            <input
                              type={field === "reps" ? "text" : "number"}
                              value={params[field]}
                              onChange={(e) => setParams((p) => ({ ...p, [field]: e.target.value }))}
                              style={{ ...inputStyle, textAlign: "center", padding: "7px 6px" }}
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Notas opcionales"
                        value={params.notes}
                        onChange={(e) => setParams((p) => ({ ...p, notes: e.target.value }))}
                        style={{ ...inputStyle, marginBottom: 8 }}
                      />
                      <button
                        onClick={handleAddExercise}
                        disabled={addingExercise}
                        style={{ width: "100%", padding: "8px 0", background: "#FF5E14", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit", opacity: addingExercise ? 0.6 : 1 }}
                      >
                        {addingExercise ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Plus style={{ width: 13, height: 13 }} />}
                        Agregar al día
                      </button>
                    </div>
                  )}

                  {/* Lista de ejercicios */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
                    {filteredExercises.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#444", textAlign: "center", padding: "16px 0" }}>Sin resultados</p>
                    ) : (
                      filteredExercises.map((ex) => {
                        const isSelected = selectedEx?.id === ex.id;
                        return (
                          <button
                            key={ex.id}
                            onClick={() => { setSelectedEx(isSelected ? null : ex); setParams({ sets: "3", reps: "10", rest_seconds: "60", notes: "" }); }}
                            style={{ textAlign: "left", padding: "9px 10px", background: isSelected ? "rgba(255,94,20,0.08)" : "#0d0d0d", border: `0.5px solid ${isSelected ? "rgba(255,94,20,0.4)" : "#1a1a1a"}`, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "#FF5E14" : "#ccc" }}>{ex.name}</span>
                                {ex.is_private_to_user && <Lock style={{ width: 9, height: 9, color: "#555" }} />}
                              </div>
                              {ex.muscle_group && <span style={{ fontSize: 10, color: "#444" }}>{MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group}</span>}
                            </div>
                            {isSelected && <Check style={{ width: 13, height: 13, color: "#FF5E14", flexShrink: 0 }} />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Crear ejercicio privado */}
                  {showPrivateForm ? (
                    <div style={{ background: "#111", border: "0.5px solid rgba(255,94,20,0.2)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#FF5E14" }}>Crear ejercicio propio</p>
                        <button onClick={() => setShowPrivateForm(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}><X style={{ width: 13, height: 13 }} /></button>
                      </div>
                      <input type="text" placeholder="Nombre *" value={privateExName} onChange={(e) => setPrivateExName(e.target.value)} maxLength={100} style={inputStyle} />
                      <select value={privateExMuscle} onChange={(e) => setPrivateExMuscle(e.target.value)} style={{ ...inputStyle, color: privateExMuscle ? "#ddd" : "#555" }}>
                        <option value="">Grupo muscular (opcional)</option>
                        {Object.entries(MUSCLE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                      </select>
                      <div style={{ position: "relative" }}>
                        <Video style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "#444" }} />
                        <input type="url" placeholder="URL de video — opcional" value={privateExVideoUrl} onChange={(e) => setPrivateExVideoUrl(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} />
                      </div>
                      <button onClick={handleCreatePrivate} disabled={creatingPrivate || !privateExName.trim()} style={{ padding: "8px", background: "#FF5E14", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit", opacity: creatingPrivate || !privateExName.trim() ? 0.5 : 1 }}>
                        {creatingPrivate ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Plus style={{ width: 12, height: 12 }} />}
                        Crear
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowPrivateForm(true)} style={{ width: "100%", padding: "8px 0", background: "rgba(255,94,20,0.06)", color: "#FF5E14", border: "0.5px solid rgba(255,94,20,0.25)", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }}>
                      <Lock style={{ width: 11, height: 11 }} />
                      Crear ejercicio propio (privado)
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Agregar nuevo día ── */}
      {showDayInput ? (
        <div style={{ background: "#111", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 12, padding: 12, display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Ej: Pecho y Tríceps…"
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddDay()}
            maxLength={60}
            autoFocus
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleAddDay} disabled={addingDay || !newDayName.trim()} style={{ padding: "8px 12px", background: "#FF5E14", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
            {addingDay ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Check style={{ width: 14, height: 14 }} />}
          </button>
          <button onClick={() => { setShowDayInput(false); setNewDayName(""); }} style={{ padding: "8px", background: "transparent", border: "0.5px solid #1e1e1e", borderRadius: 8, color: "#555", cursor: "pointer" }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDayInput(true)}
          style={{ width: "100%", padding: "10px 0", background: "transparent", color: "#555", border: "0.5px dashed #252525", borderRadius: 12, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", marginBottom: 12 }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Agregar día
        </button>
      )}
    </div>
  );
}
