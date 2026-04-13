// CreateMyRoutineFlow.tsx — Flujo multi-paso para que el miembro cree su propia rutina

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Loader2, Check, Search, Lock, Dumbbell, X,
} from "lucide-react";
import { createMyRoutine, addDayToMyRoutine, addExerciseToMyDay } from "@/actions/routine.actions";
import { createMyPrivateExercise } from "@/actions/exercise.actions";
import type { Exercise, RoutineDay, RoutineExercise } from "@/types/gym-routines";

/* ── Tipos de estado interno ──────────────────────────────────────────────── */

type FlowStep = "info" | "days" | "exercises";

interface DayState extends RoutineDay {
  exerciseCount: number;
}

interface ExerciseParams {
  sets: string;
  reps: string;
  rest_seconds: string;
  notes: string;
}

interface Props {
  exercises: Exercise[];
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", quads: "Cuádriceps",
  hamstrings: "Isquiotibiales", glutes: "Glúteos", calves: "Pantorrillas",
  core: "Core", full_body: "Cuerpo completo", cardio: "Cardio",
};

/* ── Componente principal ─────────────────────────────────────────────────── */

export function CreateMyRoutineFlow({ exercises }: Props): React.ReactNode {
  const router = useRouter();

  /* ── Estado del flujo ── */
  const [step, setStep]               = useState<FlowStep>("info");
  const [routineId, setRoutineId]     = useState<string | null>(null);
  const [days, setDays]               = useState<DayState[]>([]);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  /* ── Estado paso 1 ── */
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic]     = useState(false);
  const [creating, setCreating]     = useState(false);

  /* ── Estado paso 2 ── */
  const [newDayName, setNewDayName]   = useState("");
  const [addingDay, setAddingDay]     = useState(false);
  const [showDayInput, setShowDayInput] = useState(false);

  /* ── Estado paso 3 ── */
  const [exerciseList, setExerciseList] = useState<Exercise[]>(exercises);
  const [search, setSearch]             = useState("");
  const [selectedEx, setSelectedEx]     = useState<Exercise | null>(null);
  const [params, setParams]             = useState<ExerciseParams>({ sets: "3", reps: "10", rest_seconds: "60", notes: "" });
  const [addingExercise, setAddingExercise] = useState(false);
  const [showPrivateForm, setShowPrivateForm] = useState(false);
  const [privateExName, setPrivateExName]   = useState("");
  const [privateExMuscle, setPrivateExMuscle] = useState("");
  const [creatingPrivate, setCreatingPrivate] = useState(false);

  /* ── Ejercicios filtrados por búsqueda ── */
  const filteredExercises = useMemo(() => {
    if (!search.trim()) return exerciseList;
    const q = search.toLowerCase();
    return exerciseList.filter((e) => e.name.toLowerCase().includes(q));
  }, [exerciseList, search]);

  const activeDayName = days.find((d) => d.id === activeDayId)?.name ?? "Día";

  /* ── Paso 1: crear rutina ── */
  async function handleCreateRoutine(): Promise<void> {
    if (!name.trim()) { toast.error("El nombre es requerido"); return; }
    setCreating(true);
    const result = await createMyRoutine({ name: name.trim(), description: description.trim() || undefined, is_public: isPublic });
    setCreating(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al crear");
      return;
    }
    setRoutineId(result.data!.routineId);
    setStep("days");
  }

  /* ── Paso 2: agregar día ── */
  async function handleAddDay(): Promise<void> {
    if (!newDayName.trim() || !routineId) return;
    setAddingDay(true);
    const result = await addDayToMyRoutine({ routine_id: routineId, name: newDayName.trim() });
    setAddingDay(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al agregar");
      return;
    }
    setDays((prev) => [...prev, { ...result.data!, exerciseCount: 0 }]);
    setNewDayName("");
    setShowDayInput(false);
  }

  /* ── Paso 3: agregar ejercicio al día ── */
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
      toast.error(typeof result.error === "string" ? result.error : "Error");
      return;
    }
    // Actualizar contador del día
    setDays((prev) => prev.map((d) =>
      d.id === activeDayId ? { ...d, exerciseCount: d.exerciseCount + 1 } : d
    ));
    toast.success("Ejercicio agregado");
    setSelectedEx(null);
    setParams({ sets: "3", reps: "10", rest_seconds: "60", notes: "" });
  }

  /* ── Crear ejercicio privado ── */
  async function handleCreatePrivate(): Promise<void> {
    if (!privateExName.trim()) return;
    setCreatingPrivate(true);
    const result = await createMyPrivateExercise({
      name: privateExName.trim(),
      muscle_group: privateExMuscle || undefined,
    });
    setCreatingPrivate(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error");
      return;
    }
    const newEx = result.data!;
    setExerciseList((prev) => [newEx, ...prev]);
    setSelectedEx(newEx);
    setPrivateExName("");
    setPrivateExMuscle("");
    setShowPrivateForm(false);
    toast.success("Ejercicio creado");
  }

  /* ── Estilos compartidos ── */
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: "#0d0d0d",
    border: "0.5px solid #1e1e1e", borderRadius: 10, color: "#ddd",
    fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "#555",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block",
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER PASO 1 — Info básica
  ══════════════════════════════════════════════════════════════════ */
  if (step === "info") {
    return (
      <div style={{ paddingTop: 4 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <a href="/portal/routines" style={{ color: "#555", display: "flex", alignItems: "center" }}>
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </a>
          <div>
            <h1 style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              Nueva Rutina
            </h1>
            <p style={{ fontSize: 11, color: "#555" }}>Paso 1 de 3 — Información básica</p>
          </div>
        </div>

        <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre de la rutina *</label>
            <input
              type="text"
              placeholder="Ej: Push Pull Legs, Fuerza 5×5…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              style={inputStyle}
            />
          </div>

          {/* Descripción */}
          <div>
            <label style={labelStyle}>Descripción (opcional)</label>
            <textarea
              placeholder="Describe el objetivo o enfoque de esta rutina…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
            />
          </div>

          {/* Toggle is_public */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: "#ccc", fontWeight: 500, marginBottom: 3 }}>
                Compartir con mi entrenador
              </p>
              <p style={{ fontSize: 11, color: "#555" }}>
                Tu entrenador podrá ver esta rutina para ayudarte
              </p>
            </div>
            <button
              onClick={() => setIsPublic((v) => !v)}
              style={{
                width: 44, height: 24, borderRadius: 100, border: "none", cursor: "pointer", flexShrink: 0,
                background: isPublic ? "#FF5E14" : "#1e1e1e",
                transition: "background 0.2s", position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 3,
                left: isPublic ? 22 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s",
              }} />
            </button>
          </div>

          {/* Botón crear */}
          <button
            onClick={handleCreateRoutine}
            disabled={creating || !name.trim()}
            style={{
              width: "100%", padding: "12px 0", background: "#FF5E14", color: "#fff",
              border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: creating || !name.trim() ? "not-allowed" : "pointer",
              opacity: creating || !name.trim() ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
            }}
          >
            {creating ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : null}
            Crear y agregar días
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER PASO 2 — Agregar días
  ══════════════════════════════════════════════════════════════════ */
  if (step === "days") {
    return (
      <div style={{ paddingTop: 4 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => setStep("info")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
          <div>
            <h1 style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {name}
            </h1>
            <p style={{ fontSize: 11, color: "#555" }}>Paso 2 de 3 — Días de entrenamiento</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {/* Lista de días creados */}
          {days.length === 0 ? (
            <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#444" }}>Aún no hay días. Agregá el primero.</p>
            </div>
          ) : (
            days.map((day) => (
              <div key={day.id} style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Dumbbell style={{ width: 14, height: 14, color: "#555" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>{day.name}</p>
                  <p style={{ fontSize: 10, color: "#444" }}>
                    {day.exerciseCount > 0 ? `${day.exerciseCount} ejercicio${day.exerciseCount !== 1 ? "s" : ""}` : "Sin ejercicios aún"}
                  </p>
                </div>
                <button
                  onClick={() => { setActiveDayId(day.id); setStep("exercises"); }}
                  style={{
                    padding: "6px 12px", background: "transparent",
                    border: "0.5px solid #252525", borderRadius: 8,
                    color: "#888", fontSize: 11, fontWeight: 500, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit",
                  }}
                >
                  <Plus style={{ width: 11, height: 11 }} />
                  Agregar ejercicios
                </button>
              </div>
            ))
          )}

          {/* Input para nuevo día */}
          {showDayInput && (
            <div style={{ background: "#111", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 12, padding: 14, display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Ej: Pecho y Tríceps, Pierna…"
                value={newDayName}
                onChange={(e) => setNewDayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDay()}
                maxLength={60}
                autoFocus
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleAddDay}
                disabled={addingDay || !newDayName.trim()}
                style={{ padding: "8px 14px", background: "#FF5E14", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit", opacity: addingDay || !newDayName.trim() ? 0.5 : 1 }}
              >
                {addingDay ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Check style={{ width: 14, height: 14 }} />}
              </button>
              <button
                onClick={() => { setShowDayInput(false); setNewDayName(""); }}
                style={{ padding: "8px", background: "transparent", border: "0.5px solid #1e1e1e", borderRadius: 8, color: "#555", cursor: "pointer" }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}
        </div>

        {/* Botón agregar día */}
        {!showDayInput && (
          <button
            onClick={() => setShowDayInput(true)}
            style={{
              width: "100%", padding: "10px 0",
              background: "transparent", color: "#888",
              border: "0.5px dashed #252525", borderRadius: 12,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "inherit", marginBottom: 16,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Agregar día
          </button>
        )}

        {/* Botón Listo */}
        <button
          onClick={() => router.push("/portal/routines")}
          style={{
            width: "100%", padding: "13px 0", background: days.length > 0 ? "#FF5E14" : "#1a1a1a",
            color: days.length > 0 ? "#fff" : "#555",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {days.length > 0 ? "Listo, ver mis rutinas →" : "Guardar sin días"}
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER PASO 3 — Agregar ejercicios al día activo
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ paddingTop: 4 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => { setStep("days"); setActiveDayId(null); setSelectedEx(null); setSearch(""); }}
          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>
        <div>
          <h1 style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            {activeDayName}
          </h1>
          <p style={{ fontSize: 11, color: "#555" }}>Paso 3 — Agregar ejercicios</p>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#444" }} />
        <input
          type="text"
          placeholder="Buscar ejercicio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
      </div>

      {/* Form de parámetros — aparece cuando se selecciona un ejercicio */}
      {selectedEx && (
        <div style={{ background: "rgba(255,94,20,0.06)", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#FF5E14" }}>{selectedEx.name}</p>
            <button onClick={() => setSelectedEx(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            {(["sets", "reps", "rest_seconds"] as const).map((field) => (
              <div key={field}>
                <label style={{ ...labelStyle, marginBottom: 4 }}>
                  {field === "sets" ? "Series" : field === "reps" ? "Reps" : "Descanso (s)"}
                </label>
                <input
                  type={field === "reps" ? "text" : "number"}
                  value={params[field]}
                  onChange={(e) => setParams((p) => ({ ...p, [field]: e.target.value }))}
                  style={{ ...inputStyle, textAlign: "center" }}
                  placeholder={field === "reps" ? "10" : undefined}
                />
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Notas opcionales (Ej: Pausa en el pecho)"
            value={params.notes}
            onChange={(e) => setParams((p) => ({ ...p, notes: e.target.value }))}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <button
            onClick={handleAddExercise}
            disabled={addingExercise}
            style={{
              width: "100%", padding: "9px 0", background: "#FF5E14", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "inherit", opacity: addingExercise ? 0.6 : 1,
            }}
          >
            {addingExercise ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Plus style={{ width: 14, height: 14 }} />}
            Agregar al día
          </button>
        </div>
      )}

      {/* Lista de ejercicios */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto", marginBottom: 14 }}>
        {filteredExercises.length === 0 ? (
          <p style={{ fontSize: 12, color: "#444", textAlign: "center", padding: "24px 0" }}>
            No se encontraron ejercicios
          </p>
        ) : (
          filteredExercises.map((ex) => {
            const isSelected = selectedEx?.id === ex.id;
            const isPrivate  = !!ex.is_private_to_user;
            return (
              <button
                key={ex.id}
                onClick={() => {
                  setSelectedEx(isSelected ? null : ex);
                  setParams({ sets: "3", reps: "10", rest_seconds: "60", notes: "" });
                }}
                style={{
                  textAlign: "left", padding: "10px 12px",
                  background: isSelected ? "rgba(255,94,20,0.08)" : "#111",
                  border: `0.5px solid ${isSelected ? "rgba(255,94,20,0.4)" : "#1a1a1a"}`,
                  borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  fontFamily: "inherit",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "#FF5E14" : "#ccc" }}>
                      {ex.name}
                    </span>
                    {isPrivate && (
                      <Lock style={{ width: 10, height: 10, color: "#555", flexShrink: 0 }} />
                    )}
                  </div>
                  {ex.muscle_group && (
                    <span style={{ fontSize: 10, color: "#444" }}>
                      {MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group}
                    </span>
                  )}
                </div>
                {isSelected && <Check style={{ width: 14, height: 14, color: "#FF5E14", flexShrink: 0 }} />}
              </button>
            );
          })
        )}
      </div>

      {/* Formulario crear ejercicio propio */}
      {showPrivateForm ? (
        <div style={{ background: "#111", border: "0.5px solid #252525", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>Crear ejercicio propio</p>
            <button onClick={() => setShowPrivateForm(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Nombre del ejercicio *"
            value={privateExName}
            onChange={(e) => setPrivateExName(e.target.value)}
            maxLength={100}
            style={inputStyle}
          />
          <select
            value={privateExMuscle}
            onChange={(e) => setPrivateExMuscle(e.target.value)}
            style={{ ...inputStyle, color: privateExMuscle ? "#ddd" : "#555" }}
          >
            <option value="">Grupo muscular (opcional)</option>
            {Object.entries(MUSCLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleCreatePrivate}
            disabled={creatingPrivate || !privateExName.trim()}
            style={{
              padding: "9px", background: "#1a1a1a", color: "#888",
              border: "0.5px solid #252525", borderRadius: 10,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "inherit", opacity: creatingPrivate || !privateExName.trim() ? 0.5 : 1,
            }}
          >
            {creatingPrivate ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Plus style={{ width: 13, height: 13 }} />}
            Crear ejercicio
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPrivateForm(true)}
          style={{
            width: "100%", padding: "9px 0", background: "transparent", color: "#555",
            border: "0.5px dashed #252525", borderRadius: 10,
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "inherit",
          }}
        >
          <Lock style={{ width: 11, height: 11 }} />
          Crear ejercicio propio (privado)
        </button>
      )}
    </div>
  );
}
