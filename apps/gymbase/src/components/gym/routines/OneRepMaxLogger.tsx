// OneRepMaxLogger.tsx — Dialog para registrar un test de 1RM (repetición máxima)

"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getExercisesForMember } from "@/actions/exercise.actions";
import { logMyOneRepMax } from "@/actions/workout.actions";
import type { Exercise } from "@/types/gym-routines";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
  core: "Core", cardio: "Cardio", full_body: "Cuerpo completo",
};

interface OneRepMaxLoggerProps {
  // Si se abre desde el workout view, se puede pre-seleccionar el ejercicio actual
  preselectedExerciseId?: string;
  preselectedExerciseName?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function OneRepMaxLogger({
  preselectedExerciseId,
  preselectedExerciseName,
  onClose,
  onSaved,
}: OneRepMaxLoggerProps): React.ReactNode {
  const [exercises, setExercises]       = useState<Exercise[]>([]);
  const [search, setSearch]             = useState("");
  const [loadingEx, setLoadingEx]       = useState(true);
  const [selectedEx, setSelectedEx]     = useState<Exercise | null>(null);
  const [weight, setWeight]             = useState("");
  const [notes, setNotes]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [step, setStep]                 = useState<"pick" | "log">(
    preselectedExerciseId ? "log" : "pick"
  );
  const weightRef = useRef<HTMLInputElement>(null);

  // Cargar ejercicios al abrir — incluye privados del miembro
  useEffect(() => {
    getExercisesForMember().then((data) => {
      setExercises(data);
      setLoadingEx(false);
      // Si hay ejercicio pre-seleccionado, buscarlo en la lista
      if (preselectedExerciseId) {
        const found = data.find((e) => e.id === preselectedExerciseId);
        if (found) setSelectedEx(found);
      }
    });
  }, [preselectedExerciseId]);

  // Enfocar el input de peso cuando llega al paso de log
  useEffect(() => {
    if (step === "log") {
      setTimeout(() => weightRef.current?.focus(), 100);
    }
  }, [step]);

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.muscle_group && MUSCLE_LABEL[e.muscle_group]?.toLowerCase().includes(search.toLowerCase()))
  );

  function selectExercise(ex: Exercise): void {
    setSelectedEx(ex);
    setStep("log");
  }

  async function handleSave(): Promise<void> {
    if (!selectedEx || saving) return;
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      toast.error("Ingresá un peso válido");
      return;
    }

    setSaving(true);
    const result = await logMyOneRepMax({
      exercise_id: selectedEx.id,
      weight_kg:   weightNum,
      notes:       notes.trim() || undefined,
    });
    setSaving(false);

    if (!result.success) {
      const msg = typeof result.error === "string" ? result.error : "Error al guardar el test";
      toast.error(msg);
      return;
    }

    toast.success(`1RM registrado: ${weightNum} kg en ${selectedEx.name}`);
    onSaved?.();
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(460px, calc(100vw - 32px))",
        background: "#0d0d0d", border: "0.5px solid #1e1e1e",
        borderRadius: 20, zIndex: 101, overflow: "hidden",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              {step === "pick" ? "Elegir ejercicio" : "Registrar 1RM"}
            </p>
            <p style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
              {step === "pick"
                ? "Seleccioná el ejercicio que vas a testear"
                : `Peso máximo para 1 repetición`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: "#161616", border: "0.5px solid #222", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="#555" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Paso 1: Selector de ejercicio ── */}
        {step === "pick" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* Buscador */}
            <div style={{ padding: "0 20px 12px", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="6" cy="6" r="4.5" stroke="#444" strokeWidth="1.6" />
                  <path d="M9.5 9.5l2.5 2.5" stroke="#444" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", height: 38, paddingLeft: 34, paddingRight: 12,
                    background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10,
                    fontSize: 13, color: "#fff", outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Lista de ejercicios */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              {loadingEx ? (
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #222", borderTopColor: "#FF5E14", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : filteredExercises.length === 0 ? (
                <p style={{ textAlign: "center", fontSize: 13, color: "#444", paddingTop: 24 }}>
                  No se encontraron ejercicios
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => selectExercise(ex)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 10,
                        padding: "10px 12px", cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s", fontFamily: "inherit",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ex.name}
                        </p>
                        {ex.muscle_group && (
                          <p style={{ fontSize: 10, color: "#555", marginTop: 1 }}>
                            {MUSCLE_LABEL[ex.muscle_group] ?? ex.muscle_group}
                          </p>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5 3l4 4-4 4" stroke="#333" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Paso 2: Registro del peso ── */}
        {step === "log" && (
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Ejercicio seleccionado */}
            <div style={{ background: "#111", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,94,20,0.1)", border: "0.5px solid rgba(255,94,20,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8h2M12 8h2M4 8h2V5h2v6h2V7h2v4" stroke="#FF5E14" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedEx?.name ?? preselectedExerciseName}
                </p>
                {selectedEx?.muscle_group && (
                  <p style={{ fontSize: 10, color: "#555" }}>
                    {MUSCLE_LABEL[selectedEx.muscle_group] ?? selectedEx.muscle_group}
                  </p>
                )}
              </div>
              {!preselectedExerciseId && (
                <button
                  onClick={() => setStep("pick")}
                  style={{ fontSize: 11, color: "#444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Cambiar
                </button>
              )}
            </div>

            {/* Input de peso */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Peso máximo (kg)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  ref={weightRef}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="500"
                  step="0.5"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  style={{
                    width: "100%", height: 56, paddingLeft: 20, paddingRight: 50,
                    background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12,
                    fontSize: 32, fontWeight: 700, color: "#fff", outline: "none",
                    fontFamily: "var(--font-barlow, 'Barlow Condensed')",
                    letterSpacing: "-0.02em", boxSizing: "border-box",
                  }}
                />
                <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#333", fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontWeight: 700 }}>kg</span>
              </div>
            </div>

            {/* Notas opcionales */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Notas <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Con cinturón, buena técnica..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10,
                  fontSize: 13, color: "#fff", outline: "none", resize: "none",
                  fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5,
                }}
              />
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleSave}
              disabled={saving || !weight}
              style={{
                width: "100%", height: 46,
                background: saving || !weight ? "#1a1a1a" : "#FF5E14",
                border: "none", borderRadius: 12,
                fontSize: 14, fontWeight: 700, color: saving || !weight ? "#444" : "#fff",
                cursor: saving || !weight ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s", fontFamily: "inherit",
              }}
            >
              {saving ? (
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #333", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Guardar test
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
