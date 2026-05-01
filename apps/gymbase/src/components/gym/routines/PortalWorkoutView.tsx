// PortalWorkoutView.tsx — Vista interactiva de entrenamiento para el portal del cliente

"use client";

import { useState, useEffect, useCallback } from "react";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { startWorkoutSession, completeWorkoutSession } from "@/actions/workout.actions";
import { ExerciseProgressModal } from "@/components/gym/routines/ExerciseProgressModal";
import type { RoutineWithDays, RoutineExercise, WorkoutExercisesDone, PRResult } from "@/types/gym-routines";

/* ── Constantes ──────────────────────────────────────────────────────────────── */

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
  core: "Core", cardio: "Cardio", full_body: "Cuerpo completo",
};

const MUSCLE_COLOR: Record<string, string> = {
  chest: "#FF5E14", back: "#38BDF8", shoulders: "#A855F7",
  biceps: "#FACC15", triceps: "#FACC15", legs: "#EF4444",
  core: "#22C55E", cardio: "#38BDF8", full_body: "#FF5E14",
};

const MUSCLE_SVG_IDS: Record<string, string[]> = {
  chest: ["mc"], back: ["mb"],
  shoulders: ["msl", "msr"],
  biceps: ["mal", "mar"], triceps: ["mal", "mar"],
  legs: ["mql", "mqr"], core: ["mco"],
};

const DIFF_LABEL: Record<string, string> = {
  beginner: "Principiante", intermediate: "Intermedio",
  advanced: "Avanzado", expert: "Experto",
};

const DIFF_STYLE: Record<string, React.CSSProperties> = {
  beginner:     { background: "rgba(34,197,94,0.1)", border: "0.5px solid rgba(34,197,94,0.25)", color: "#22C55E" },
  intermediate: { background: "rgba(250,204,21,0.1)", border: "0.5px solid rgba(250,204,21,0.25)", color: "#FACC15" },
  advanced:     { background: "rgba(239,68,68,0.1)",  border: "0.5px solid rgba(239,68,68,0.25)",  color: "#EF4444" },
  expert:       { background: "rgba(168,85,247,0.1)", border: "0.5px solid rgba(168,85,247,0.25)", color: "#A855F7" },
};

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function pad(n: number): string { return n.toString().padStart(2, "0"); }
function fmtTime(secs: number): string { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`; }

/* ── Tipos internos ──────────────────────────────────────────────────────────── */

// Estado de pesos/reps por set — indexado por "routineExerciseId-setIndex"
type SetData = { weight: string; reps: string; completed: boolean };
type SetsState = Record<string, SetData[]>;

interface PortalWorkoutViewProps {
  routine: RoutineWithDays;
  // onBack: si se provee, muestra botón "← Mis rutinas" en la cabecera del panel izquierdo
  onBack?: () => void;
}

/* ── Componente principal ────────────────────────────────────────────────────── */

export function PortalWorkoutView({ routine, onBack }: PortalWorkoutViewProps): React.ReactNode {
  const sortedDays = [...routine.days].sort((a, b) => a.day_number - b.day_number);

  /* ── Estado de navegación ── */
  const [activeDayIndex, setActiveDayIndex]   = useState(0);
  const [activeExIndex,  setActiveExIndex]    = useState(0);
  const [completedExIds, setCompletedExIds]   = useState<Set<string>>(new Set());
  const [currentSet,     setCurrentSet]       = useState(1);
  const [timerValue,     setTimerValue]       = useState(60);
  const [timerMax,       setTimerMax]         = useState(60);
  const [isResting,      setIsResting]        = useState(false);
  const [timerDone,      setTimerDone]        = useState(false);
  const [sessionSecs,    setSessionSecs]      = useState(0);

  /* ── Estado de pesos y PRs ── */
  // setsState: { [routineExerciseId]: SetData[] } — persiste durante toda la sesión
  const [setsState,      setSetsState]        = useState<SetsState>({});
  // memberPRs: { [exerciseId]: maxWeightKg } — cargado al montar
  const [memberPRs,      setMemberPRs]        = useState<Record<string, number>>({});
  // lastSession: exercises_done de la última sesión para pre-cargar pesos
  const [lastSession,    setLastSession]      = useState<WorkoutExercisesDone | null>(null);
  // sessionLoaded: evita re-inicializar setsState cuando cambia el día
  const [sessionLoaded,  setSessionLoaded]    = useState(false);

  /* ── Estado de finalización y PRs nuevos ── */
  const [workoutDone,    setWorkoutDone]      = useState(false);
  const [newPRs,         setNewPRs]           = useState<PRResult[]>([]);
  const [showPRModal,    setShowPRModal]      = useState(false);
  const [saving,         setSaving]           = useState(false);

  /* ── Estado del historial colapsable por ejercicio ── */
  const [showHistory,    setShowHistory]      = useState<Record<string, boolean>>({});

  /* ── Estado para el modal de progresión de peso por ejercicio ── */
  const [progressModal,  setProgressModal]    = useState<{ id: string; name: string; muscleGroup?: string | null } | null>(null);

  const activeDay    = sortedDays[activeDayIndex];
  const dayExercises = activeDay
    ? [...activeDay.exercises].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const currentEx = dayExercises[activeExIndex] ?? null;
  const nextEx    = dayExercises[activeExIndex + 1] ?? null;

  /* ── Cargar última sesión y PRs al montar ── */
  useEffect(() => {
    if (!activeDay || sessionLoaded) return;

    // Solo cargar si hay un día activo con ejercicios
    const firstDayWithExercises = sortedDays.find((d) => d.exercises.length > 0);
    if (!firstDayWithExercises) return;

    startWorkoutSession(firstDayWithExercises.id).then((result) => {
      if (result.success) {
        const { lastSession: ls, memberPRs: prs } = result.data!;
        setMemberPRs(prs);
        if (ls?.exercises_done) setLastSession(ls.exercises_done);
      }
      // Marcar siempre como cargado — si falla el fetch los inputs igual deben mostrarse vacíos
      setSessionLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay]);

  /* ── Inicializar setsState cuando cambia el ejercicio actual ── */
  // Espera a que cargue la sesión anterior antes de inicializar.
  // Sin este guard, los sets se crean con campos vacíos antes de que lleguen los pesos
  // históricos, y el `if (setsState[exId]) return` bloquea la re-inicialización posterior.
  useEffect(() => {
    if (!currentEx || !sessionLoaded) return;
    const totalSets = currentEx.sets ?? 3;
    const exId      = currentEx.id;

    // Si ya hay datos para este ejercicio (el usuario ya interactuó), no reinicializar
    if (setsState[exId]) return;

    // Prioridad de pre-carga: última sesión > default_sets configurados por el admin > vacío
    const lastEx = lastSession?.exercises?.find(
      (e) => e.routine_exercise_id === exId
    );

    const initialSets: SetData[] = Array.from({ length: totalSets }, (_, i) => {
      // 1. Usar el peso real de la última sesión (lo que el miembro levantó)
      const lastSet = lastEx?.sets?.[i];
      if (lastSet) {
        return {
          weight: lastSet.weight_kg != null ? String(lastSet.weight_kg) : "",
          reps:   lastSet.reps != null ? String(lastSet.reps) : (currentEx.reps ?? ""),
          completed: false,
        };
      }
      // 2. Si no hay sesión previa, usar la plantilla de pirámide configurada en la rutina
      const defaultSet = currentEx.default_sets?.find((s) => s.set_number === i + 1);
      return {
        weight: defaultSet?.weight_kg != null ? String(defaultSet.weight_kg) : "",
        reps:   defaultSet?.reps ?? (currentEx.reps ?? ""),
        completed: false,
      };
    });

    setSetsState((prev) => ({ ...prev, [exId]: initialSets }));
  }, [currentEx, lastSession, sessionLoaded, setsState]);

  /* ── Temporizadores ── */
  useEffect(() => {
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isResting) return;
    const id = setInterval(() => {
      setTimerValue(v => {
        if (v <= 1) { setIsResting(false); setTimerDone(true); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isResting]);

  /* ── Reset timer al cambiar ejercicio ── */
  useEffect(() => {
    if (!currentEx) return;
    setCurrentSet(1);
    const rest = currentEx.rest_seconds ?? 60;
    setTimerValue(rest);
    setTimerMax(rest);
    setIsResting(false);
    setTimerDone(false);
  }, [activeExIndex, activeDayIndex]);

  /* ── Handlers ── */
  function startRest(): void {
    const rest = currentEx?.rest_seconds ?? 60;
    setTimerMax(rest);
    setTimerValue(rest);
    setIsResting(true);
    setTimerDone(false);
  }

  function skipRest(): void {
    setIsResting(false);
    setTimerDone(true);
    setTimerValue(0);
  }

  // Marca el set actual como completado y avanza
  function handleCompleteSet(): void {
    if (!currentEx) return;
    if (isResting) { skipRest(); return; }

    const exId     = currentEx.id;
    const totalSets = currentEx.sets ?? 3;
    const setIdx   = currentSet - 1;

    // Marcar el set actual como completado en el estado
    setSetsState((prev) => {
      const exSets = [...(prev[exId] ?? [])];
      if (exSets[setIdx]) {
        exSets[setIdx] = { ...exSets[setIdx], completed: true };
      }
      return { ...prev, [exId]: exSets };
    });

    if (currentSet < totalSets) {
      setCurrentSet(s => s + 1);
      startRest();
    } else {
      setCompletedExIds(prev => new Set([...prev, currentEx.id]));
      setTimerDone(true);
    }
  }

  // Actualiza el peso de un set específico
  function updateSetWeight(exId: string, setIdx: number, value: string): void {
    setSetsState((prev) => {
      const exSets = [...(prev[exId] ?? [])];
      if (exSets[setIdx]) {
        exSets[setIdx] = { ...exSets[setIdx], weight: value };
      }
      return { ...prev, [exId]: exSets };
    });
  }

  // Actualiza las reps de un set específico
  function updateSetReps(exId: string, setIdx: number, value: string): void {
    setSetsState((prev) => {
      const exSets = [...(prev[exId] ?? [])];
      if (exSets[setIdx]) {
        exSets[setIdx] = { ...exSets[setIdx], reps: value };
      }
      return { ...prev, [exId]: exSets };
    });
  }

  function selectDay(i: number): void {
    setActiveDayIndex(i);
    setActiveExIndex(0);
    setCompletedExIds(new Set());
    setCurrentSet(1);
    setIsResting(false);
    setTimerDone(false);
    setWorkoutDone(false);
  }

  // Construye y guarda la sesión completa al terminar todos los ejercicios
  const handleFinishWorkout = useCallback(async (): Promise<void> => {
    if (saving || !activeDay) return;
    setSaving(true);

    const exercises = dayExercises.map((re) => {
      const exSets = setsState[re.id] ?? [];
      return {
        routine_exercise_id: re.id,
        exercise_id: re.exercise_id,
        exercise_name: re.exercise?.name ?? "Ejercicio",
        sets: exSets.map((s, idx) => {
          const weightNum = parseFloat(s.weight);
          const repsNum   = parseInt(s.reps, 10);
          const weightKg  = isNaN(weightNum) ? null : weightNum;
          const currentPR = memberPRs[re.exercise_id] ?? null;
          const isPR      = weightKg !== null && currentPR !== null && weightKg > currentPR;
          return {
            set_number: idx + 1,
            weight_kg:  weightKg,
            reps:       isNaN(repsNum) ? 0 : repsNum,
            completed:  s.completed,
            is_pr:      isPR,
          };
        }),
      };
    });

    const result = await completeWorkoutSession({
      routine_day_id: activeDay.id,
      exercises,
      duration_minutes: Math.max(1, Math.round(sessionSecs / 60)),
    });

    setSaving(false);
    setWorkoutDone(true);

    if (result.success && result.data!.newPRs.length > 0) {
      setNewPRs(result.data!.newPRs);
      setShowPRModal(true);
    }
  }, [saving, activeDay, dayExercises, setsState, memberPRs, sessionSecs]);

  /* ── Cálculos derivados ── */
  const completedInDay = dayExercises.filter(ex => completedExIds.has(ex.id)).length;
  const progressPct    = dayExercises.length > 0 ? Math.round(completedInDay / dayExercises.length * 100) : 0;
  const isExDone       = currentEx ? completedExIds.has(currentEx.id) : false;
  const allDone        = dayExercises.length > 0 && completedInDay === dayExercises.length;

  const todayDow     = new Date().getDay();
  const todayIdx     = todayDow === 0 ? 6 : todayDow - 1;
  const trainingDays = routine.days_per_week ?? sortedDays.length;

  const circumference = 188;
  const arcOffset     = timerMax > 0 ? circumference * (1 - timerValue / timerMax) : circumference;
  const timerColor    = timerMax > 0
    ? timerValue / timerMax > 0.5 ? "#FF5E14" : timerValue / timerMax > 0.2 ? "#FACC15" : "#EF4444"
    : "#22C55E";

  const muscleGroup    = currentEx?.exercise?.muscle_group ?? null;
  const activeMuscIds  = muscleGroup ? (MUSCLE_SVG_IDS[muscleGroup] ?? []) : [];
  const muscleColor    = muscleGroup ? (MUSCLE_COLOR[muscleGroup] ?? "#FF5E14") : "#FF5E14";
  const videoUrl       = currentEx?.exercise?.video_url ? getYouTubeEmbedUrl(currentEx.exercise.video_url) : null;

  // Datos de la última sesión para el ejercicio actual (historial inline)
  const lastExData = currentEx
    ? lastSession?.exercises?.find((e) => e.routine_exercise_id === currentEx.id)
    : null;

  // Sets actuales del ejercicio activo
  const currentExSets = currentEx ? (setsState[currentEx.id] ?? []) : [];

  // Verificar si el peso actual del set activo supera el PR (para badge visual)
  const currentSetData    = currentExSets[currentSet - 1];
  const currentWeightNum  = parseFloat(currentSetData?.weight ?? "");
  const currentExPR       = currentEx ? (memberPRs[currentEx.exercise_id] ?? null) : null;
  const isPotentialPR     = !isNaN(currentWeightNum) && currentExPR !== null && currentWeightNum > currentExPR;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 96px)", overflow: "hidden", margin: "0 -24px -32px" }}>

      {/* ═══════════════════════════════════
          PANEL IZQUIERDO — Rutina
      ═══════════════════════════════════ */}
      <div style={{
        width: 310, flexShrink: 0, overflowY: "auto",
        backgroundColor: "#0D0D0D", borderRight: "0.5px solid #1a1a1a",
        display: "flex", flexDirection: "column",
      }}>
        {/* Encabezado — incluye back button cuando hay múltiples rutinas activas */}
        <div style={{ padding: onBack ? "14px 20px 0" : "20px 20px 0", flexShrink: 0 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", padding: "0 0 10px",
                cursor: "pointer", color: "#555", fontSize: 11, fontFamily: "inherit",
              }}
            >
              ← Mis rutinas
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              Mi Rutina
            </p>
            <a
              href="/portal/routines/strength"
              title="Test de fuerza 1RM"
              style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: "rgba(255,94,20,0.06)", border: "0.5px solid rgba(255,94,20,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 10l2.5-3.5 2.5 2 2.5-4.5 2 2" stroke="#FF5E14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
          <p style={{ fontSize: 11, color: "#444" }}>
            {routine.name}{routine.duration_weeks ? ` · ${routine.duration_weeks} semanas` : ""}
          </p>
        </div>

        {/* Tarjeta de rutina activa */}
        <RoutineCard
          routine={routine}
          todayIdx={todayIdx}
          trainingDays={trainingDays}
          todayDayName={activeDay?.name ?? `Día ${activeDay?.day_number ?? 1}`}
          todayExCount={dayExercises.length}
          onStart={() => setActiveExIndex(0)}
        />

        {/* Estadísticas */}
        <div style={{ padding: "14px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Estadísticas</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "0 16px", flexShrink: 0 }}>
          {[
            { val: sortedDays.length, lbl: "Días" },
            { val: completedInDay, lbl: "Completados" },
            { val: progressPct + "%", lbl: "Progreso" },
          ].map(({ val, lbl }) => (
            <div key={lbl} style={{ background: "#080808", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 22, fontWeight: 700, color: lbl === "Progreso" ? "#FF5E14" : "#fff", letterSpacing: "-0.02em" }}>{val}</p>
              <p style={{ fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 1 }}>{lbl}</p>
            </div>
          ))}
        </div>

        {/* Lista de días */}
        <div style={{ padding: "14px 20px 8px", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Días de la rutina</span>
        </div>
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, paddingBottom: 24 }}>
          {sortedDays.map((day, i) => {
            const isActive = i === activeDayIndex;
            const exCount  = day.exercises.length;
            const isDone   = i < activeDayIndex;
            return (
              <button
                key={day.id}
                onClick={() => selectDay(i)}
                style={{
                  background: isActive ? "rgba(255,94,20,0.04)" : "#080808",
                  border: `0.5px solid ${isActive ? "rgba(255,94,20,0.4)" : "#1a1a1a"}`,
                  borderRadius: 12, padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 14, fontWeight: 700,
                  background: isDone ? "rgba(255,94,20,0.15)" : isActive ? "#FF5E14" : "#161616",
                  color: isDone ? "#FF5E14" : isActive ? "#fff" : "#444",
                }}>
                  {isDone ? "✓" : day.day_number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#fff" : "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {day.name ?? `Día ${day.day_number}`}
                  </p>
                  <p style={{ fontSize: 10, color: "#444" }}>{exCount} ejercicio{exCount !== 1 ? "s" : ""}</p>
                </div>
                <span style={{
                  padding: "2px 7px", borderRadius: 100, fontSize: 9, fontWeight: 700,
                  background: isDone ? "rgba(34,197,94,0.1)" : isActive ? "rgba(255,94,20,0.1)" : "#111",
                  color: isDone ? "#22C55E" : isActive ? "#FF5E14" : "#444",
                  border: `0.5px solid ${isDone ? "rgba(34,197,94,0.2)" : isActive ? "rgba(255,94,20,0.2)" : "#1a1a1a"}`,
                }}>
                  {isDone ? "Hecho" : isActive ? "Hoy" : "🔒"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════
          PANEL DERECHO — Workout
      ═══════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#080808", display: "flex", flexDirection: "column" }}>
        {/* Barra de progreso */}
        <div style={{ height: 2, backgroundColor: "#111", flexShrink: 0, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "#FF5E14", transition: "width 0.7s cubic-bezier(.22,1,.36,1)" }} />
        </div>

        {/* Top bar de sesión */}
        <div style={{ padding: "16px 28px 0", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" }}>
            <span>{activeDay?.name ?? `Día ${activeDay?.day_number}`}</span>
            <span style={{ color: "#333" }}>›</span>
            <span style={{ color: "#888" }}>Entrenando</span>
          </div>
          <span style={{ fontSize: 12, color: "#555", marginLeft: 12 }}>
            <strong style={{ color: "#888" }}>{activeExIndex + 1}</strong> / {dayExercises.length} ejercicios
          </span>
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", background: "#111", border: "0.5px solid #1a1a1a",
            borderRadius: 20, fontSize: 13, fontWeight: 700, color: "#fff",
            fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontVariantNumeric: "tabular-nums",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#FF5E14" strokeWidth="2" />
              <path d="M6 3.5v2.5l1.5 1" stroke="#FF5E14" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {fmtTime(sessionSecs)}
          </div>
        </div>

        {/* Cuerpo principal */}
        {currentEx ? (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, padding: "20px 28px", alignItems: "start" }}>
            {/* Columna izquierda: visual + info + historial */}
            <div>
              <ExerciseZone
                exerciseName={currentEx.exercise?.name ?? "Ejercicio"}
                videoUrl={videoUrl}
                muscleGroup={muscleGroup}
                activeMuscleIds={activeMuscIds}
                muscleColor={muscleColor}
              />
              <ExerciseInfoCard
                exercise={currentEx}
                muscleColor={muscleColor}
                onShowProgress={() => setProgressModal({
                  id: currentEx.exercise_id,
                  name: currentEx.exercise?.name ?? "Ejercicio",
                  muscleGroup: currentEx.exercise?.muscle_group,
                })}
              />

              {/* Historial colapsable de la última sesión */}
              {lastExData && lastExData.sets.length > 0 && (
                <HistoryStrip
                  sets={lastExData.sets}
                  open={showHistory[currentEx.id] ?? false}
                  onToggle={() =>
                    setShowHistory((prev) => ({ ...prev, [currentEx.id]: !prev[currentEx.id] }))
                  }
                />
              )}
            </div>

            {/* Columna derecha: sets con inputs de peso + timer + next + acciones */}
            <div>
              <SetsCard
                exercise={currentEx}
                currentSet={currentSet}
                setsData={currentExSets}
                memberPR={currentExPR}
                isPotentialPR={isPotentialPR}
                onWeightChange={(setIdx, val) => updateSetWeight(currentEx.id, setIdx, val)}
                onRepsChange={(setIdx, val) => updateSetReps(currentEx.id, setIdx, val)}
              />
              <RestTimerCard
                timerValue={timerValue}
                timerMax={timerMax}
                timerColor={timerColor}
                arcOffset={arcOffset}
                circumference={circumference}
                isResting={isResting}
                timerDone={timerDone}
              />
              {nextEx && (
                <NextExerciseStrip exercise={nextEx} />
              )}
              <ActionRow
                isResting={isResting}
                isExDone={isExDone}
                hasNext={!!nextEx}
                allDone={allDone}
                workoutDone={workoutDone}
                saving={saving}
                currentSet={currentSet}
                totalSets={currentEx.sets ?? 3}
                onComplete={handleCompleteSet}
                onSkipRest={skipRest}
                onNextEx={() => setActiveExIndex(i => i + 1)}
                onFinish={handleFinishWorkout}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#444", fontSize: 14 }}>Selecciona un día para empezar</p>
          </div>
        )}

        {/* Lista de ejercicios */}
        {dayExercises.length > 0 && (
          <ExerciseList
            exercises={dayExercises}
            activeIndex={activeExIndex}
            completedIds={completedExIds}
            onSelect={setActiveExIndex}
          />
        )}
      </div>

      {/* Modal de progresión de peso por ejercicio */}
      {progressModal && (
        <ExerciseProgressModal
          exerciseId={progressModal.id}
          exerciseName={progressModal.name}
          muscleGroup={progressModal.muscleGroup}
          onClose={() => setProgressModal(null)}
        />
      )}

      {/* Modal de celebración de PRs */}
      {showPRModal && (
        <PRCelebrationModal
          prs={newPRs}
          onClose={() => setShowPRModal(false)}
        />
      )}
    </div>
  );
}

/* ── RoutineCard ─────────────────────────────────────────────────────────────── */

interface RoutineCardProps {
  routine: RoutineWithDays;
  todayIdx: number;
  trainingDays: number;
  todayDayName: string;
  todayExCount: number;
  onStart: () => void;
}

function RoutineCard({ routine, todayIdx, trainingDays, todayDayName, todayExCount, onStart }: RoutineCardProps): React.ReactNode {
  return (
    <div style={{ margin: "14px 16px 0", background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 2, background: "linear-gradient(90deg, #FF5E14, #FF8C5A)" }} />
      <div style={{ padding: "14px 14px 12px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: "#FF5E14", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF5E14", display: "inline-block" }} />
          Rutina activa
        </div>
        <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 3 }}>
          {routine.name}
        </p>
        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#444", marginBottom: 12 }}>
          {routine.days_per_week && <span>{routine.days_per_week} días/semana</span>}
          {routine.duration_weeks && <span>{routine.duration_weeks} semanas</span>}
        </div>

        {/* Grilla semanal */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 12 }}>
          {WEEK_DAYS.map((d, i) => {
            const isToday    = i === todayIdx;
            const isTraining = i < trainingDays;
            const isPast     = i < todayIdx && isTraining;
            return (
              <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 7, color: "#444", textTransform: "uppercase", fontWeight: 600 }}>{d}</span>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "#FF5E14" : isPast ? "rgba(255,94,20,0.15)" : "#161616",
                  border: `0.5px solid ${isToday ? "#FF5E14" : isPast ? "rgba(255,94,20,0.3)" : "#1e1e1e"}`,
                }}>
                  {isToday ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "var(--font-barlow, 'Barlow Condensed')" }}>H</span>
                  ) : isPast ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 4-4" stroke="#FF5E14" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span style={{ fontSize: 9, color: "#333" }}>{isTraining ? "·" : "—"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Strip de hoy */}
        <div style={{ background: "#111", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,94,20,0.12)", border: "0.5px solid rgba(255,94,20,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 7.5h2M11 7.5h2M4 7.5h2v-2.5h2v5h2v-3.5" stroke="#FF5E14" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{todayDayName}</p>
            <p style={{ fontSize: 10, color: "#444" }}>{todayExCount} ejercicios</p>
          </div>
          <button
            onClick={onStart}
            style={{ marginLeft: "auto", height: 28, padding: "0 12px", background: "#FF5E14", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", flexShrink: 0 }}
          >
            Empezar →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ExerciseZone ────────────────────────────────────────────────────────────── */

interface ExerciseZoneProps {
  exerciseName: string;
  videoUrl: string | null;
  muscleGroup: string | null;
  activeMuscleIds: string[];
  muscleColor: string;
}

function ExerciseZone({ exerciseName, videoUrl, muscleGroup, activeMuscleIds, muscleColor }: ExerciseZoneProps): React.ReactNode {
  const isActive = (id: string): boolean => activeMuscleIds.includes(id);
  const fill = (id: string): string => isActive(id) ? muscleColor : "#1a1a1a";
  const opacity = (id: string): number => isActive(id) ? 0.65 : 1;

  return (
    <div style={{ background: "#0a0a0a", border: "0.5px solid #1a1a1a", borderRadius: 20, overflow: "hidden", position: "relative", height: 260, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {videoUrl ? (
        <iframe
          src={`${videoUrl}?autoplay=0&mute=1&controls=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", zIndex: 2 }}
          title={exerciseName}
        />
      ) : (
        <BodySVG fill={fill} opacity={opacity} />
      )}

      {!videoUrl && (
        <div style={{ position: "absolute", bottom: 12, left: 16, display: "flex", gap: 5, zIndex: 3 }}>
          {muscleGroup && (
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: `${muscleColor}25`, border: `0.5px solid ${muscleColor}60`, color: muscleColor }}>
              {MUSCLE_LABEL[muscleGroup] ?? muscleGroup}
            </span>
          )}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 12, right: 16, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.6)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "#666", zIndex: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: videoUrl ? "#22C55E" : "#FF5E14", display: "inline-block" }} />
        {videoUrl ? "Video" : "Demo"}
      </div>
    </div>
  );
}

/* ── BodySVG ─────────────────────────────────────────────────────────────────── */

function BodySVG({ fill, opacity }: { fill: (id: string) => string; opacity: (id: string) => number }): React.ReactNode {
  return (
    <svg width="110" height="180" viewBox="0 0 100 162" fill="none" style={{ position: "relative", zIndex: 2 }}>
      <ellipse cx="50" cy="16" rx="12" ry="12" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="0.5" />
      <rect x="45" y="27" width="10" height="6" rx="3" fill="#1a1a1a" />
      <rect x="33" y="33" width="34" height="40" rx="6" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="0.5" />
      <rect id="mc"  x="34" y="34" width="32" height="20" rx="5" fill={fill("mc")}  opacity={opacity("mc")}  style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect id="mb"  x="34" y="34" width="32" height="36" rx="5" fill={fill("mb")}  opacity={opacity("mb")}  style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <ellipse id="msl" cx="28" cy="38" rx="6" ry="5" fill={fill("msl")} opacity={opacity("msl")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <ellipse id="msr" cx="72" cy="38" rx="6" ry="5" fill={fill("msr")} opacity={opacity("msr")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect id="mal" x="16" y="33" width="17" height="12" rx="5" fill={fill("mal")} opacity={opacity("mal")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="14" y="43" width="13" height="22" rx="6" fill="#1a1a1a" />
      <rect x="13" y="63" width="11" height="16" rx="5" fill="#1a1a1a" />
      <rect id="mar" x="67" y="33" width="17" height="12" rx="5" fill={fill("mar")} opacity={opacity("mar")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="73" y="43" width="13" height="22" rx="6" fill="#1a1a1a" />
      <rect x="76" y="63" width="11" height="16" rx="5" fill="#1a1a1a" />
      <rect id="mco" x="38" y="52" width="24" height="20" rx="4" fill={fill("mco")} opacity={opacity("mco")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="36" y="73" width="28" height="10" rx="4" fill="#1a1a1a" />
      <rect id="mql" x="34" y="83" width="14" height="40" rx="6" fill={fill("mql")} opacity={opacity("mql")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="35" y="83" width="13" height="38" rx="6" fill="#1a1a1a" />
      <rect x="34" y="118" width="14" height="22" rx="6" fill="#1a1a1a" />
      <rect id="mqr" x="52" y="83" width="14" height="40" rx="6" fill={fill("mqr")} opacity={opacity("mqr")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="52" y="83" width="13" height="38" rx="6" fill="#1a1a1a" />
      <rect x="52" y="118" width="14" height="22" rx="6" fill="#1a1a1a" />
      <rect x="34" y="138" width="13" height="18" rx="5" fill="#1a1a1a" />
      <rect x="53" y="138" width="13" height="18" rx="5" fill="#1a1a1a" />
    </svg>
  );
}

/* ── ExerciseInfoCard ────────────────────────────────────────────────────────── */

interface ExerciseInfoCardProps {
  exercise: RoutineExercise;
  muscleColor: string;
  onShowProgress?: () => void;
}

function ExerciseInfoCard({ exercise, muscleColor, onShowProgress }: ExerciseInfoCardProps): React.ReactNode {
  const ex       = exercise.exercise;
  const diffKey  = ex?.difficulty ?? "beginner";
  const diffStyle = DIFF_STYLE[diffKey] ?? DIFF_STYLE.beginner;

  return (
    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 16, padding: "18px 20px" }}>
      <p style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>
        <span style={{ color: muscleColor }}>{ex?.muscle_group ? (MUSCLE_LABEL[ex.muscle_group] ?? ex.muscle_group) : "Ejercicio"}</span>
        {ex?.equipment && <> › <span style={{ color: "#555" }}>{ex.equipment}</span></>}
      </p>
      {/* Nombre + botón de gráfica de progresión */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, flex: 1 }}>
          {ex?.name ?? "Ejercicio"}
        </p>
        {onShowProgress && (
          <button
            onClick={onShowProgress}
            title="Ver progresión de peso"
            style={{
              marginTop: 4, width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "#111", border: "0.5px solid #1e1e1e",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 11l3-4 3 2 3-5 2 2" stroke="#FF5E14" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 13h11" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        {exercise.rest_seconds && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#555" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#555" strokeWidth="1.6" /><path d="M6 3v3l2 1" stroke="#555" strokeWidth="1.6" strokeLinecap="round" /></svg>
            {exercise.rest_seconds}s desc.
          </span>
        )}
        {ex?.equipment && (
          <span style={{ fontSize: 12, color: "#555" }}>{ex.equipment}</span>
        )}
        <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, ...diffStyle }}>
          {DIFF_LABEL[diffKey] ?? diffKey}
        </span>
      </div>
      {exercise.notes && (
        <div style={{ background: "#080808", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><rect x="2" y="2" width="9" height="9" rx="1.5" stroke="#444" strokeWidth="1.6" /><path d="M4 5h5M4 7h3" stroke="#444" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
            <strong style={{ color: "#888" }}>Nota: </strong>{exercise.notes}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── HistoryStrip ────────────────────────────────────────────────────────────── */

interface HistorySet {
  set_number: number;
  weight_kg: number | null;
  reps: number;
  completed: boolean;
}

interface HistoryStripProps {
  sets: HistorySet[];
  open: boolean;
  onToggle: () => void;
}

function HistoryStrip({ sets, open, onToggle }: HistoryStripProps): React.ReactNode {
  const completedSets = sets.filter((s) => s.completed && s.weight_kg != null);
  if (completedSets.length === 0) return null;

  const summary = completedSets
    .map((s) => `${s.weight_kg}kg × ${s.reps}`)
    .join(", ");

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#080808", border: "0.5px solid #1a1a1a", borderRadius: open ? "10px 10px 0 0" : 10,
          padding: "9px 14px", cursor: "pointer", transition: "border-radius 0.15s",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Última sesión
        </span>
        <span style={{ fontSize: 10, color: "#333" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{ background: "#060606", border: "0.5px solid #1a1a1a", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 14px" }}>
          <p style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>{summary}</p>
        </div>
      )}

      {!open && (
        <p style={{ fontSize: 10, color: "#333", marginTop: 4, paddingLeft: 14 }}>{summary}</p>
      )}
    </div>
  );
}

/* ── SetsCard — con inputs de peso y reps por serie ─────────────────────────── */

interface SetsCardProps {
  exercise: RoutineExercise;
  currentSet: number;
  setsData: { weight: string; reps: string; completed: boolean }[];
  memberPR: number | null;
  isPotentialPR: boolean;
  onWeightChange: (setIdx: number, val: string) => void;
  onRepsChange: (setIdx: number, val: string) => void;
}

function SetsCard({
  exercise, currentSet, setsData, memberPR, isPotentialPR,
  onWeightChange, onRepsChange,
}: SetsCardProps): React.ReactNode {
  const totalSets = exercise.sets ?? 3;

  return (
    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 16, padding: "16px 18px", marginBottom: 12 }}>
      {/* Header: serie actual + badge PR potencial */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {currentSet}
          </span>
          <span style={{ fontSize: 20, color: "#222" }}>/</span>
          <span style={{ fontSize: 20, color: "#2a2a2a", fontWeight: 600, fontFamily: "var(--font-barlow, 'Barlow Condensed')" }}>
            {totalSets}
          </span>
          <span style={{ fontSize: 11, color: "#444", marginLeft: 4 }}>series</span>
        </div>

        {/* Badge de PR potencial — solo visual, el real se guarda al terminar */}
        {isPotentialPR && (
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: "rgba(255,94,20,0.15)", border: "0.5px solid rgba(255,94,20,0.4)",
            color: "#FF5E14", letterSpacing: "0.05em",
          }}>
            🏆 PR
          </span>
        )}
      </div>

      {/* Puntos de progreso */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {Array.from({ length: totalSets }).map((_, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: i < currentSet - 1 ? "#FF5E14" : i === currentSet - 1 ? "#fff" : "#1a1a1a",
            border: `1px solid ${i < currentSet - 1 ? "#FF5E14" : i === currentSet - 1 ? "#fff" : "#2a2a2a"}`,
            boxShadow: i === currentSet - 1 ? "0 0 6px rgba(255,255,255,0.2)" : "none",
            transition: "all 0.3s cubic-bezier(.22,1,.36,1)",
          }} />
        ))}
      </div>

      {/* PR actual del ejercicio si existe */}
      {memberPR !== null && (
        <div style={{ fontSize: 10, color: "#444", marginBottom: 12 }}>
          PR actual: <span style={{ color: "#666", fontWeight: 600 }}>{memberPR} kg</span>
        </div>
      )}

      {/* Tabla de sets: peso × reps por fila */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Array.from({ length: totalSets }).map((_, i) => {
          const setData  = setsData[i];
          const isCurrent = i === currentSet - 1;
          const isDone    = setData?.completed ?? false;
          const weightVal = setData?.weight ?? "";
          const repsVal   = setData?.reps ?? "";

          const weightNum  = parseFloat(weightVal);
          const setIsPR    = !isNaN(weightNum) && memberPR !== null && weightNum > memberPR;

          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 10,
                background: isDone ? "rgba(255,94,20,0.04)" : isCurrent ? "#111" : "transparent",
                border: `0.5px solid ${isDone ? "rgba(255,94,20,0.2)" : isCurrent ? "#222" : "transparent"}`,
                opacity: !isCurrent && !isDone ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {/* Número de serie */}
              <span style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isDone ? "rgba(255,94,20,0.15)" : isCurrent ? "#FF5E14" : "#1a1a1a",
                color: isDone ? "#FF5E14" : isCurrent ? "#fff" : "#333",
                fontSize: 9, fontWeight: 700,
                fontFamily: "var(--font-barlow, 'Barlow Condensed')",
              }}>
                {isDone ? "✓" : i + 1}
              </span>

              {/* Input de peso */}
              <input
                type="number"
                inputMode="decimal"
                value={weightVal}
                onChange={(e) => onWeightChange(i, e.target.value)}
                placeholder="—"
                disabled={isDone}
                style={{
                  width: 56, height: 32, background: isDone ? "transparent" : "#0a0a0a",
                  border: `0.5px solid ${setIsPR ? "rgba(255,94,20,0.5)" : isCurrent ? "#2a2a2a" : "#1a1a1a"}`,
                  borderRadius: 7, textAlign: "center",
                  fontSize: 13, fontWeight: 700,
                  color: isDone ? "#555" : setIsPR ? "#FF5E14" : "#fff",
                  outline: "none",
                  fontVariantNumeric: "tabular-nums",
                }}
              />

              <span style={{ fontSize: 10, color: "#333", flexShrink: 0 }}>kg ×</span>

              {/* Input de reps */}
              <input
                type="number"
                inputMode="numeric"
                value={repsVal}
                onChange={(e) => onRepsChange(i, e.target.value)}
                placeholder="—"
                disabled={isDone}
                style={{
                  width: 44, height: 32, background: isDone ? "transparent" : "#0a0a0a",
                  border: `0.5px solid ${isCurrent ? "#2a2a2a" : "#1a1a1a"}`,
                  borderRadius: 7, textAlign: "center",
                  fontSize: 13, fontWeight: 700,
                  color: isDone ? "#555" : "#fff",
                  outline: "none",
                  fontVariantNumeric: "tabular-nums",
                }}
              />

              <span style={{ fontSize: 10, color: "#333", flex: 1, flexShrink: 0 }}>reps</span>

              {/* Badge PR por set */}
              {setIsPR && !isDone && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: "#FF5E14",
                  padding: "1px 5px", borderRadius: 10,
                  background: "rgba(255,94,20,0.12)",
                  border: "0.5px solid rgba(255,94,20,0.3)",
                  flexShrink: 0,
                }}>
                  PR
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── RestTimerCard ───────────────────────────────────────────────────────────── */

interface RestTimerCardProps {
  timerValue: number;
  timerMax: number;
  timerColor: string;
  arcOffset: number;
  circumference: number;
  isResting: boolean;
  timerDone: boolean;
}

function RestTimerCard({ timerValue, timerMax, timerColor, arcOffset, circumference, isResting, timerDone }: RestTimerCardProps): React.ReactNode {
  const stateLabel  = isResting ? "Descansando" : timerDone ? "¡A entrenar!" : "Esperando";
  const stateBg     = isResting ? "rgba(56,189,248,0.08)" : timerDone ? "rgba(34,197,94,0.08)" : "#111";
  const stateColor  = isResting ? "#38BDF8" : timerDone ? "#22C55E" : "#444";
  const stateBorder = isResting ? "rgba(56,189,248,0.25)" : timerDone ? "rgba(34,197,94,0.25)" : "#222";
  const timerTitle  = isResting ? "Descansando" : timerDone ? "¡Listo!" : "Listo para empezar";
  const timerDesc   = isResting ? "Tomátelo con calma" : timerDone ? "Empezá la siguiente serie" : "Completá la serie cuando estés listo";
  const displayVal  = timerDone && !isResting ? "✓" : timerValue.toString();
  const displayColor = timerDone && !isResting ? "#22C55E" : timerMax > 0 ? timerColor : "#fff";

  return (
    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 16, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#1a1a1a" strokeWidth="5" />
            <circle cx="36" cy="36" r="30" fill="none" stroke={timerColor} strokeWidth="5"
              strokeLinecap="round" strokeDasharray={circumference.toString()} strokeDashoffset={arcOffset.toString()}
              transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 24, fontWeight: 700, color: displayColor, lineHeight: 1, fontVariantNumeric: "tabular-nums", transition: "color 0.3s" }}>
              {displayVal}
            </span>
            <span style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 1 }}>seg</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 2 }}>{timerTitle}</p>
          <p style={{ fontSize: 11, color: "#444", lineHeight: 1.4, marginBottom: 7 }}>{timerDesc}</p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: stateBg, color: stateColor, border: `0.5px solid ${stateBorder}`, transition: "all 0.3s" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: stateColor, display: "inline-block" }} />
            {stateLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── NextExerciseStrip ───────────────────────────────────────────────────────── */

function NextExerciseStrip({ exercise }: { exercise: RoutineExercise }): React.ReactNode {
  const name    = exercise.exercise?.name ?? "Ejercicio";
  const detail  = `${exercise.sets ?? 3} series · ${exercise.reps ?? "—"} reps${exercise.rest_seconds ? ` · ${exercise.rest_seconds}s` : ""}`;
  return (
    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 9h3M9 9h3M5 9v2M9 9v2M5 10h4" stroke="#333" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </div>
      <div>
        <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Siguiente ejercicio</p>
        <p style={{ fontSize: 12, fontWeight: 500, color: "#666" }}>{name}</p>
        <p style={{ fontSize: 10, color: "#333", marginTop: 1 }}>{detail}</p>
      </div>
      <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="#333" strokeWidth="1.8" strokeLinecap="round" /></svg>
    </div>
  );
}

/* ── ActionRow ───────────────────────────────────────────────────────────────── */

interface ActionRowProps {
  isResting: boolean;
  isExDone: boolean;
  hasNext: boolean;
  allDone: boolean;
  workoutDone: boolean;
  saving: boolean;
  currentSet: number;
  totalSets: number;
  onComplete: () => void;
  onSkipRest: () => void;
  onNextEx: () => void;
  onFinish: () => void;
}

function ActionRow({
  isResting, isExDone, hasNext, allDone, workoutDone, saving,
  currentSet, totalSets, onComplete, onSkipRest, onNextEx, onFinish,
}: ActionRowProps): React.ReactNode {
  const isLastSet = currentSet >= totalSets;

  // Workout completado y guardado
  if (workoutDone) {
    return (
      <div style={{ height: 52, borderRadius: 14, background: "rgba(34,197,94,0.08)", border: "0.5px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#22C55E" }}>
        ✓ Sesión guardada
      </div>
    );
  }

  // Todos los ejercicios completados — mostrar botón de guardar sesión
  if (allDone && !hasNext) {
    return (
      <button
        onClick={onFinish}
        disabled={saving}
        style={{
          width: "100%", height: 52, border: "none", borderRadius: 14,
          fontSize: 15, fontWeight: 700, color: "#fff",
          background: saving ? "#333" : "#22C55E",
          cursor: saving ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s",
        }}
      >
        {saving ? "Guardando..." : "🏆 Guardar sesión completa"}
      </button>
    );
  }

  let mainBg     = "#FF5E14";
  let mainText   = "Completar serie";
  let mainAction = onComplete;

  if (isResting)                  { mainBg = "#0a1e2e"; mainText = "Saltar descanso"; mainAction = onSkipRest; }
  else if (isExDone && hasNext)   { mainText = "Siguiente ejercicio →"; mainAction = onNextEx; }
  else if (isLastSet)             { mainText = "Completar última serie"; }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={mainAction}
        disabled={isExDone && !hasNext && !isResting}
        style={{
          flex: 1, height: 52, border: isResting ? "0.5px solid rgba(56,189,248,0.2)" : "none",
          borderRadius: 14, fontSize: 15, fontWeight: 700,
          color: isResting ? "#38BDF8" : "#fff",
          background: isResting ? "#0a1e2e" : mainBg,
          cursor: isExDone && !hasNext ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s", opacity: isExDone && !hasNext && !isResting ? 0.7 : 1,
        }}
      >
        {!isResting && !isExDone && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9l4 4 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {mainText}
      </button>
      {!isResting && !isExDone && (
        <button
          onClick={onSkipRest}
          title="Saltar descanso"
          style={{ width: 52, height: 52, flexShrink: 0, background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 4l8 6-8 6V4z" stroke="#444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="4" x2="16" y2="16" stroke="#444" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── ExerciseList ────────────────────────────────────────────────────────────── */

interface ExerciseListProps {
  exercises: RoutineExercise[];
  activeIndex: number;
  completedIds: Set<string>;
  onSelect: (i: number) => void;
}

function ExerciseList({ exercises, activeIndex, completedIds, onSelect }: ExerciseListProps): React.ReactNode {
  return (
    <div style={{ padding: "0 28px 28px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Ejercicios de la sesión
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
        {exercises.map((re, i) => {
          const isDone = completedIds.has(re.id);
          const isCurr = i === activeIndex;
          return (
            <button
              key={re.id}
              onClick={() => onSelect(i)}
              style={{
                background: isCurr ? "rgba(255,94,20,0.04)" : "#0d0d0d",
                border: `0.5px solid ${isCurr ? "rgba(255,94,20,0.4)" : "#1a1a1a"}`,
                borderRadius: 10, padding: "10px 12px",
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                background: isDone ? "rgba(255,94,20,0.15)" : isCurr ? "#FF5E14" : "#161616",
                color: isDone ? "#FF5E14" : isCurr ? "#fff" : "#444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "var(--font-barlow, 'Barlow Condensed')",
              }}>
                {isDone ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, color: isCurr ? "#fff" : "#555", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {re.exercise?.name ?? "Ejercicio"}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#333", flexShrink: 0, fontFamily: "var(--font-barlow, 'Barlow Condensed')" }}>
                {re.sets ?? 3}×{re.reps ?? "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── PRCelebrationModal ──────────────────────────────────────────────────────── */

interface PRCelebrationModalProps {
  prs: PRResult[];
  onClose: () => void;
}

function PRCelebrationModal({ prs, onClose }: PRCelebrationModalProps): React.ReactNode {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "#0d0d0d", border: "0.5px solid rgba(255,94,20,0.3)",
        borderRadius: 24, padding: "36px 32px", maxWidth: 380, width: "90%",
        textAlign: "center",
      }}>
        {/* Ícono de trofeo */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "rgba(255,94,20,0.1)", border: "0.5px solid rgba(255,94,20,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontSize: 36,
        }}>
          🏆
        </div>

        <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 32, fontWeight: 900, color: "#FF5E14", letterSpacing: "-0.02em", marginBottom: 6 }}>
          ¡Nuevo récord!
        </p>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>
          Superaste tu marca personal en {prs.length === 1 ? "este ejercicio" : `${prs.length} ejercicios`}
        </p>

        {/* Lista de PRs nuevos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {prs.map((pr, idx) => (
            <div
              key={`${pr.exercise_id}-${idx}`}
              style={{
                background: "rgba(255,94,20,0.05)", border: "0.5px solid rgba(255,94,20,0.2)",
                borderRadius: 12, padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{pr.exercise_name}</span>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#FF5E14", fontFamily: "var(--font-barlow, 'Barlow Condensed')", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {pr.new_pr} kg
                </p>
                {pr.old_pr !== null && (
                  <p style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                    anterior: {pr.old_pr} kg
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", height: 48, background: "#FF5E14", border: "none",
            borderRadius: 14, fontSize: 15, fontWeight: 700, color: "#fff",
            cursor: "pointer",
          }}
        >
          ¡Listo!
        </button>
      </div>
    </div>
  );
}
