// PortalWorkoutView.tsx — Vista interactiva de entrenamiento para el portal del cliente

"use client";

import { useState, useEffect } from "react";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import type { RoutineWithDays, RoutineExercise } from "@/types/gym-routines";

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

// IDs de los elementos SVG del cuerpo humano que se iluminan por grupo muscular
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

interface PortalWorkoutViewProps {
  routine: RoutineWithDays;
}

/* ── Componente principal ────────────────────────────────────────────────────── */

export function PortalWorkoutView({ routine }: PortalWorkoutViewProps): React.ReactNode {
  const sortedDays = [...routine.days].sort((a, b) => a.day_number - b.day_number);

  const [activeDayIndex, setActiveDayIndex]   = useState(0);
  const [activeExIndex,  setActiveExIndex]    = useState(0);
  const [completedExIds, setCompletedExIds]   = useState<Set<string>>(new Set());
  const [currentSet,     setCurrentSet]       = useState(1);
  const [timerValue,     setTimerValue]       = useState(60);
  const [timerMax,       setTimerMax]         = useState(60);
  const [isResting,      setIsResting]        = useState(false);
  const [timerDone,      setTimerDone]        = useState(false);
  const [sessionSecs,    setSessionSecs]      = useState(0);

  // Temporizador de sesión acumulativo
  useEffect(() => {
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Cuenta regresiva de descanso
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

  const activeDay    = sortedDays[activeDayIndex];
  const dayExercises = activeDay
    ? [...activeDay.exercises].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const currentEx = dayExercises[activeExIndex] ?? null;
  const nextEx    = dayExercises[activeExIndex + 1] ?? null;

  // Al cambiar de ejercicio se reinicia el estado local de sets y timer
  useEffect(() => {
    if (!currentEx) return;
    setCurrentSet(1);
    const rest = currentEx.rest_seconds ?? 60;
    setTimerValue(rest);
    setTimerMax(rest);
    setIsResting(false);
    setTimerDone(false);
  }, [activeExIndex, activeDayIndex]);

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

  function handleCompleteSet(): void {
    if (!currentEx) return;
    if (isResting) { skipRest(); return; }
    const totalSets = currentEx.sets ?? 3;
    if (currentSet < totalSets) {
      setCurrentSet(s => s + 1);
      startRest();
    } else {
      setCompletedExIds(prev => new Set([...prev, currentEx.id]));
      setTimerDone(true);
    }
  }

  function selectDay(i: number): void {
    setActiveDayIndex(i);
    setActiveExIndex(0);
    setCompletedExIds(new Set());
    setCurrentSet(1);
    setIsResting(false);
    setTimerDone(false);
  }

  const completedInDay = dayExercises.filter(ex => completedExIds.has(ex.id)).length;
  const progressPct    = dayExercises.length > 0 ? Math.round(completedInDay / dayExercises.length * 100) : 0;
  const isExDone       = currentEx ? completedExIds.has(currentEx.id) : false;

  // Día de la semana actual (0=Lun … 6=Dom)
  const todayDow     = new Date().getDay();
  const todayIdx     = todayDow === 0 ? 6 : todayDow - 1;
  const trainingDays = routine.days_per_week ?? sortedDays.length;

  // Círculo SVG del timer
  const circumference = 188;
  const arcOffset     = timerMax > 0 ? circumference * (1 - timerValue / timerMax) : circumference;
  const timerColor    = timerMax > 0
    ? timerValue / timerMax > 0.5 ? "#FF5E14" : timerValue / timerMax > 0.2 ? "#FACC15" : "#EF4444"
    : "#22C55E";

  // Músculo activo del ejercicio actual
  const muscleGroup    = currentEx?.exercise?.muscle_group ?? null;
  const activeMuscIds  = muscleGroup ? (MUSCLE_SVG_IDS[muscleGroup] ?? []) : [];
  const muscleColor    = muscleGroup ? (MUSCLE_COLOR[muscleGroup] ?? "#FF5E14") : "#FF5E14";
  const videoUrl       = currentEx?.exercise?.video_url ? getYouTubeEmbedUrl(currentEx.exercise.video_url) : null;

  return (
    // Ocupa todo el ancho cancelando el padding horizontal y el padding inferior del layout del portal
    <div style={{ display: "flex", height: "calc(100vh - 96px)", overflow: "hidden", margin: "0 -24px -32px" }}>

      {/* ═══════════════════════════════════
          PANEL IZQUIERDO — Rutina
      ═══════════════════════════════════ */}
      <div style={{
        width: 310, flexShrink: 0, overflowY: "auto",
        backgroundColor: "#0D0D0D", borderRight: "0.5px solid #1a1a1a",
        display: "flex", flexDirection: "column",
      }}>
        {/* Encabezado */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 2 }}>
            Mi Rutina
          </p>
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
            {/* Columna izquierda: visual + info */}
            <div>
              <ExerciseZone
                exerciseName={currentEx.exercise?.name ?? "Ejercicio"}
                videoUrl={videoUrl}
                muscleGroup={muscleGroup}
                activeMuscleIds={activeMuscIds}
                muscleColor={muscleColor}
              />
              <ExerciseInfoCard exercise={currentEx} muscleColor={muscleColor} />
            </div>

            {/* Columna derecha: controles */}
            <div>
              <SetsCard
                currentSet={currentSet}
                totalSets={currentEx.sets ?? 3}
                reps={currentEx.reps ?? "—"}
                isTimed={currentEx.exercise?.is_timed ?? false}
                weight={null}
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
                currentSet={currentSet}
                totalSets={currentEx.sets ?? 3}
                onComplete={handleCompleteSet}
                onSkipRest={skipRest}
                onNextEx={() => setActiveExIndex(i => i + 1)}
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
      {/* Grid de fondo */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Video si existe, si no el diagrama corporal */}
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

      {/* Tags de músculo (solo cuando no hay video) */}
      {!videoUrl && (
        <div style={{ position: "absolute", bottom: 12, left: 16, display: "flex", gap: 5, zIndex: 3 }}>
          {muscleGroup && (
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: `${muscleColor}25`, border: `0.5px solid ${muscleColor}60`, color: muscleColor }}>
              {MUSCLE_LABEL[muscleGroup] ?? muscleGroup}
            </span>
          )}
        </div>
      )}

      {/* Etiqueta Demo / Video */}
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
      {/* Pecho */}
      <rect id="mc"  x="34" y="34" width="32" height="20" rx="5" fill={fill("mc")}  opacity={opacity("mc")}  style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      {/* Espalda */}
      <rect id="mb"  x="34" y="34" width="32" height="36" rx="5" fill={fill("mb")}  opacity={opacity("mb")}  style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      {/* Hombros */}
      <ellipse id="msl" cx="28" cy="38" rx="6" ry="5" fill={fill("msl")} opacity={opacity("msl")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <ellipse id="msr" cx="72" cy="38" rx="6" ry="5" fill={fill("msr")} opacity={opacity("msr")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      {/* Brazos */}
      <rect id="mal" x="16" y="33" width="17" height="12" rx="5" fill={fill("mal")} opacity={opacity("mal")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="14" y="43" width="13" height="22" rx="6" fill="#1a1a1a" />
      <rect x="13" y="63" width="11" height="16" rx="5" fill="#1a1a1a" />
      <rect id="mar" x="67" y="33" width="17" height="12" rx="5" fill={fill("mar")} opacity={opacity("mar")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="73" y="43" width="13" height="22" rx="6" fill="#1a1a1a" />
      <rect x="76" y="63" width="11" height="16" rx="5" fill="#1a1a1a" />
      {/* Core */}
      <rect id="mco" x="38" y="52" width="24" height="20" rx="4" fill={fill("mco")} opacity={opacity("mco")} style={{ transition: "opacity 0.4s, fill 0.4s" }} />
      <rect x="36" y="73" width="28" height="10" rx="4" fill="#1a1a1a" />
      {/* Piernas */}
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
}

function ExerciseInfoCard({ exercise, muscleColor }: ExerciseInfoCardProps): React.ReactNode {
  const ex       = exercise.exercise;
  const diffKey  = ex?.difficulty ?? "beginner";
  const diffStyle = DIFF_STYLE[diffKey] ?? DIFF_STYLE.beginner;

  return (
    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 16, padding: "18px 20px" }}>
      <p style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>
        <span style={{ color: muscleColor }}>{ex?.muscle_group ? (MUSCLE_LABEL[ex.muscle_group] ?? ex.muscle_group) : "Ejercicio"}</span>
        {ex?.equipment && <> › <span style={{ color: "#555" }}>{ex.equipment}</span></>}
      </p>
      <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
        {ex?.name ?? "Ejercicio"}
      </p>
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

/* ── SetsCard ────────────────────────────────────────────────────────────────── */

interface SetsCardProps {
  currentSet: number;
  totalSets: number;
  reps: string;
  isTimed: boolean;
  weight: string | null;
}

function SetsCard({ currentSet, totalSets, reps, isTimed, weight }: SetsCardProps): React.ReactNode {
  return (
    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 16, padding: "18px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        {/* Serie actual */}
        <div>
          <p style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Serie actual</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 72, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.04em" }}>{currentSet}</span>
            <span style={{ fontSize: 32, color: "#222", margin: "0 3px" }}>/</span>
            <span style={{ fontSize: 32, color: "#2a2a2a", fontWeight: 600, fontFamily: "var(--font-barlow, 'Barlow Condensed')" }}>{totalSets}</span>
          </div>
          {/* Puntos de progreso */}
          <div style={{ display: "flex", gap: 7 }}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: i < currentSet - 1 ? "#FF5E14" : i === currentSet - 1 ? "#fff" : "#1a1a1a",
                border: `1px solid ${i < currentSet - 1 ? "#FF5E14" : i === currentSet - 1 ? "#fff" : "#2a2a2a"}`,
                boxShadow: i === currentSet - 1 ? "0 0 8px rgba(255,255,255,0.2)" : "none",
                transition: "all 0.3s cubic-bezier(.22,1,.36,1)",
              }} />
            ))}
          </div>
        </div>

        {/* Reps / Tiempo */}
        <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 14, padding: "14px 18px", textAlign: "center", minWidth: 110, flexShrink: 0, position: "relative", overflow: "hidden" }}>
          <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
            {isTimed ? "Tiempo" : "Reps"}
          </p>
          <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 52, fontWeight: 700, color: "#FF5E14", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {reps}
          </p>
          <p style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{isTimed ? "segundos" : "repeticiones"}</p>
        </div>
      </div>

      {/* Peso si aplica */}
      {weight && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#080808", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 9, padding: "7px 12px", fontSize: 12, color: "#FF5E14" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7h3M8 7h3M5 7v2M8 7v2M5 8h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-barlow, 'Barlow Condensed')" }}>{weight}</span>
          </div>
        </div>
      )}
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
        {/* Anillo SVG */}
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

        {/* Info del timer */}
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
  currentSet: number;
  totalSets: number;
  onComplete: () => void;
  onSkipRest: () => void;
  onNextEx: () => void;
}

function ActionRow({ isResting, isExDone, hasNext, currentSet, totalSets, onComplete, onSkipRest, onNextEx }: ActionRowProps): React.ReactNode {
  const isLastSet = currentSet >= totalSets;

  let mainBg    = "#FF5E14";
  let mainText  = "Completar serie";
  let mainAction = onComplete;

  if (isResting)  { mainBg = "#0a1e2e"; mainText = "Saltar descanso"; mainAction = onSkipRest; }
  else if (isExDone && hasNext)  { mainText = "Siguiente ejercicio →"; mainAction = onNextEx; }
  else if (isExDone && !hasNext) { mainBg = "#22C55E"; mainText = "¡Sesión completada! 🎉"; mainAction = () => {}; }
  else if (isLastSet) { mainText = "Completar última serie"; }

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
      {/* Botón saltar descanso (solo visible cuando no está descansando) */}
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
