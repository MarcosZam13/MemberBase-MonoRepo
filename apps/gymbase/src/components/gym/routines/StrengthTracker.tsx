// StrengthTracker.tsx — Vista unificada "Mi Rendimiento": PRs de sesión, tests 1RM y progresión por ejercicio

"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OneRepMaxLogger } from "@/components/gym/routines/OneRepMaxLogger";
import { MiniLineChart } from "@/components/gym/health/MiniLineChart";
import { getMyExerciseProgress } from "@/actions/workout.actions";
import { createClient } from "@/lib/supabase/client";
import type { OneRepMaxTest, PersonalRecord, ExerciseProgressPoint } from "@/types/gym-routines";

/* ── Constantes ─────────────────────────────────────────────────────────────── */

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
  core: "Core", cardio: "Cardio", full_body: "Cuerpo completo",
  quads: "Cuádriceps", hamstrings: "Femorales", glutes: "Glúteos",
  calves: "Pantorrillas", forearms: "Antebrazos",
};

const MUSCLE_COLOR: Record<string, string> = {
  chest: "#FF5E14", back: "#38BDF8", shoulders: "#A855F7",
  biceps: "#FACC15", triceps: "#FACC15", legs: "#EF4444",
  core: "#22C55E", cardio: "#38BDF8", full_body: "#FF5E14",
  quads: "#EF4444", hamstrings: "#EF4444", glutes: "#F97316",
  calves: "#EF4444", forearms: "#FACC15",
};

/* ── Tipos internos ─────────────────────────────────────────────────────────── */

interface ExerciseEntry {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  pr: PersonalRecord | null;
  best1rm: OneRepMaxTest | null;
  oneRepMaxTests: OneRepMaxTest[];
}

type ProgressState = ExerciseProgressPoint[] | "loading";
type ChartTab = "sessions" | "1rm";

interface StrengthTrackerProps {
  initialTests: OneRepMaxTest[];
  initialPRs: PersonalRecord[];
}

/* ── Helpers puros ──────────────────────────────────────────────────────────── */

// Fusiona PRs de sesión y tests de 1RM en una lista unificada por ejercicio
function buildExerciseEntries(
  prs: PersonalRecord[],
  tests: OneRepMaxTest[],
): ExerciseEntry[] {
  const map = new Map<string, ExerciseEntry>();

  for (const pr of prs) {
    if (!pr.exercise?.name) continue;
    map.set(pr.exercise_id, {
      exercise_id:    pr.exercise_id,
      exercise_name:  pr.exercise.name,
      muscle_group:   pr.exercise.muscle_group ?? null,
      pr,
      best1rm:        null,
      oneRepMaxTests: [],
    });
  }

  // Mergear tests — vienen ordenados desc por fecha, rastreamos el mayor peso
  for (const test of tests) {
    if (!test.exercise?.name) continue;
    let entry = map.get(test.exercise_id);
    if (!entry) {
      entry = {
        exercise_id:    test.exercise_id,
        exercise_name:  test.exercise.name,
        muscle_group:   test.exercise.muscle_group ?? null,
        pr:             null,
        best1rm:        null,
        oneRepMaxTests: [],
      };
      map.set(test.exercise_id, entry);
    }
    entry.oneRepMaxTests.push(test);
    if (entry.best1rm === null || test.weight_kg > entry.best1rm.weight_kg) {
      entry.best1rm = test;
    }
  }

  return [...map.values()];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(2)}`;
}

// Elimina entradas consecutivas con el mismo peso — muestra solo cuando el peso cambia
// Ej: [10, 10, 10, 12, 12, 15] → [10, 12, 15]
function deduplicateByWeight(points: ExerciseProgressPoint[]): ExerciseProgressPoint[] {
  const result: ExerciseProgressPoint[] = [];
  let lastWeight: number | null = null;
  for (const p of points) {
    if (p.max_weight !== lastWeight) {
      result.push(p);
      lastWeight = p.max_weight;
    }
  }
  return result;
}

/* ── Subcomponente: card de un ejercicio ────────────────────────────────────── */

interface ExerciseCardProps {
  entry: ExerciseEntry;
  isExpanded: boolean;
  progressState: ProgressState | null;
  deletingTestId: string | null;
  onToggle: () => void;
  onDeleteTest: (testId: string) => void;
  onLogRm: (exerciseId: string, exerciseName: string) => void;
}

function ExerciseCard({
  entry,
  isExpanded,
  progressState,
  deletingTestId,
  onToggle,
  onDeleteTest,
  onLogRm,
}: ExerciseCardProps): React.ReactNode {
  const { exercise_id, exercise_name, muscle_group, pr, best1rm, oneRepMaxTests } = entry;
  const color = muscle_group ? (MUSCLE_COLOR[muscle_group] ?? "#FF5E14") : "#FF5E14";

  // Tab activa en el panel expandido — default a 1RM si hay tests, si no a sesiones
  const [chartTab, setChartTab] = useState<ChartTab>(
    oneRepMaxTests.length > 0 ? "1rm" : "sessions"
  );

  // Puntos de la gráfica de tests 1RM (ascendente para visualizar tendencia)
  const oneRmChartPoints = [...oneRepMaxTests]
    .reverse()
    .map((t) => {
      const d  = new Date(t.tested_at);
      const dd = d.getDate().toString().padStart(2, "0");
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      return { date: `${dd}/${mm}`, value: t.weight_kg };
    });

  const progressPoints        = Array.isArray(progressState) ? progressState : [];
  const progressChartPoints   = progressPoints.map((p) => ({ date: p.date, value: p.max_weight }));

  // Lista deduplicada: solo entradas donde el peso cambia respecto a la sesión anterior
  const deduplicatedSessions  = deduplicateByWeight(progressPoints);

  const hasOneRmData      = oneRepMaxTests.length > 0;
  const hasSessionData    = progressPoints.length > 0;

  return (
    <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>

      {/* Cabecera: nombre + botón registrar 1RM */}
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {muscle_group && (
              <p style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                {MUSCLE_LABEL[muscle_group] ?? muscle_group}
              </p>
            )}
            <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {exercise_name}
            </p>
          </div>
          <button
            onClick={() => onLogRm(exercise_id, exercise_name)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 10px", background: "rgba(255,94,20,0.08)",
              border: "0.5px solid rgba(255,94,20,0.25)", borderRadius: 8,
              fontSize: 11, fontWeight: 700, color: "#FF5E14",
              cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            1RM
          </button>
        </div>

        {/* Stats: PR de sesión y mejor 1RM */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
              🏆 PR Sesión
            </p>
            {pr ? (
              <>
                <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {pr.max_weight}<span style={{ fontSize: 12, color: "#444", fontWeight: 400 }}> kg</span>
                </p>
                <p style={{ fontSize: 9, color: "#444", marginTop: 3 }}>{formatDate(pr.achieved_at)}</p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>—</p>
            )}
          </div>
          <div style={{ background: "#0d0d0d", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
              ⚡ Test 1RM
            </p>
            {best1rm ? (
              <>
                <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {best1rm.weight_kg}<span style={{ fontSize: 12, color: "#444", fontWeight: 400 }}> kg</span>
                </p>
                <p style={{ fontSize: 9, color: "#444", marginTop: 3 }}>{formatDate(best1rm.tested_at)}</p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>—</p>
            )}
          </div>
        </div>

      </div>

      {/* Botón para expandir el detalle */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", background: "transparent", border: "none",
          borderTop: "0.5px solid #1a1a1a", cursor: "pointer",
          fontSize: 10, fontWeight: 600, color: "#555",
          textTransform: "uppercase", letterSpacing: "0.07em",
          fontFamily: "inherit",
        }}
      >
        <span>Ver progresión y tests</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M2 4l4 4 4-4" stroke="#555" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Panel expandible: gráfica con toggle + lista */}
      {isExpanded && (
        <div style={{ padding: "12px 12px 16px" }}>

          {/* Toggle de tab: Progresión en sesiones / Tests 1RM */}
          <div style={{ display: "flex", background: "#0a0a0a", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: 3, marginBottom: 12 }}>
            {(["sessions", "1rm"] as ChartTab[]).map((tab) => {
              const isActive = chartTab === tab;
              const label    = tab === "sessions" ? "Progresión" : "Tests 1RM";
              return (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  style={{
                    flex: 1, padding: "7px 0", border: "none", borderRadius: 8,
                    background: isActive ? "#1a1a1a" : "transparent",
                    fontSize: 11, fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#fff" : "#444",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Tab: Progresión en sesiones ── */}
          {chartTab === "sessions" && (
            <>
              {progressState === "loading" ? (
                <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #222", borderTopColor: "#FF5E14", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : !hasSessionData ? (
                <p style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "20px 0" }}>
                  Sin sesiones de entrenamiento registradas
                </p>
              ) : (
                <>
                  {/* Gráfica de progresión en sesiones */}
                  {progressChartPoints.length >= 2 && (
                    <div style={{ background: "#080808", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: "10px 10px 6px", marginBottom: 10 }}>
                      <MiniLineChart points={progressChartPoints} color="#FF5E14" label={`${exercise_id}-sessions`} />
                    </div>
                  )}

                  {/* Lista deduplicada — solo muestra cuando el peso cambia */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {[...deduplicatedSessions].reverse().map((p, i) => {
                      // Calcular el delta respecto al punto anterior en la lista deduplicada ascendente
                      const ascIdx = deduplicatedSessions.length - 1 - i;
                      const prev   = deduplicatedSessions[ascIdx - 1];
                      const delta  = prev ? p.max_weight - prev.max_weight : null;

                      return (
                        <div key={p.full_date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 8, padding: "7px 10px" }}>
                          <span style={{ fontSize: 11, color: "#555" }}>{p.date}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {delta !== null && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: delta > 0 ? "#22C55E" : delta < 0 ? "#EF4444" : "#444" }}>
                                {delta > 0 ? `+${delta}` : delta} kg
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: "#333" }}>{p.sets_count} series</span>
                            <span style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 16, fontWeight: 700, color: i === 0 ? "#FF5E14" : "#ccc" }}>
                              {p.max_weight} kg
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Tab: Tests de 1RM ── */}
          {chartTab === "1rm" && (
            <>
              {!hasOneRmData ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 12, color: "#333", marginBottom: 12 }}>Sin tests de 1RM registrados</p>
                  <button
                    onClick={() => onLogRm(exercise_id, exercise_name)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(255,94,20,0.1)", border: "0.5px solid rgba(255,94,20,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#FF5E14", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Registrar primer test
                  </button>
                </div>
              ) : (
                <>
                  {/* Gráfica de tests 1RM */}
                  {oneRmChartPoints.length >= 2 && (
                    <div style={{ background: "#080808", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: "10px 10px 6px", marginBottom: 10 }}>
                      <MiniLineChart points={oneRmChartPoints} color={color} label={`${exercise_id}-1rm`} />
                    </div>
                  )}

                  {/* Lista completa de tests — no se deduplica porque son tests deliberados */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {oneRepMaxTests.map((t) => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 8, padding: "8px 10px" }}>
                        <span style={{ fontSize: 10, color: "#555", minWidth: 48 }}>{formatDate(t.tested_at)}</span>
                        <span style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 17, fontWeight: 700, color: t.id === best1rm?.id ? color : "#fff", letterSpacing: "-0.01em" }}>
                          {t.weight_kg} kg
                        </span>
                        {t.id === best1rm?.id && (
                          <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `0.5px solid ${color}40`, borderRadius: 4, padding: "1px 5px" }}>
                            MÁXIMO
                          </span>
                        )}
                        {t.notes && (
                          <span style={{ flex: 1, fontSize: 10, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.notes}
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteTest(t.id)}
                          disabled={deletingTestId === t.id}
                          style={{
                            marginLeft: "auto", width: 24, height: 24, borderRadius: 6,
                            background: "transparent", border: "0.5px solid #222",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: deletingTestId === t.id ? 0.4 : 1, flexShrink: 0,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M2 3h7M4 3V2h3v1M4.5 5v3M6.5 5v3M2.5 3l.5 6h5l.5-6" stroke="#444" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────────────────────── */

export function StrengthTracker({ initialTests, initialPRs }: StrengthTrackerProps): React.ReactNode {
  const router                                      = useRouter();
  const [tests, setTests]                           = useState<OneRepMaxTest[]>(initialTests);
  const [prs]                                       = useState<PersonalRecord[]>(initialPRs);
  const [expandedId, setExpandedId]                 = useState<string | null>(null);
  const [progressMap, setProgressMap]               = useState<Map<string, ProgressState>>(new Map());
  const [deletingId, setDeletingId]                 = useState<string | null>(null);
  const [loggerTarget, setLoggerTarget]             = useState<{ id: string; name: string } | null>(null);
  const [showGlobalLogger, setShowGlobalLogger]     = useState(false);
  const [, startTransition]                         = useTransition();

  // Sincronizar estado local cuando el servidor manda datos frescos tras router.refresh()
  useEffect(() => { setTests(initialTests); }, [initialTests]);

  const entries = buildExerciseEntries(prs, tests);

  // Expande o colapsa el detalle del ejercicio y precarga la progresión de sesiones
  async function handleToggle(exerciseId: string): Promise<void> {
    if (expandedId === exerciseId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(exerciseId);
    // Cargar progresión solo si no está cacheada — evita refetch en cada expansión
    if (!progressMap.has(exerciseId)) {
      setProgressMap((prev) => new Map(prev).set(exerciseId, "loading"));
      const data = await getMyExerciseProgress(exerciseId);
      setProgressMap((prev) => new Map(prev).set(exerciseId, data));
    }
  }

  async function handleDeleteTest(testId: string): Promise<void> {
    if (deletingId) return;
    setDeletingId(testId);
    const supabase = createClient();
    const { error } = await supabase
      .from("gym_one_rep_max_tests")
      .delete()
      .eq("id", testId);
    setDeletingId(null);
    if (error) { toast.error("Error al eliminar el test"); return; }
    setTests((prev) => prev.filter((t) => t.id !== testId));
    toast.success("Test eliminado");
  }

  function handleSaved(): void {
    // Refrescar datos del servidor para que los nuevos tests y PRs aparezcan
    startTransition(() => router.refresh());
  }

  const isEmpty = entries.length === 0;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 120px" }}>

      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)", fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 }}>
            Mi Rendimiento
          </h1>
          <p style={{ fontSize: 12, color: "#555" }}>
            {entries.length} ejercicio{entries.length !== 1 ? "s" : ""} · PRs, tests 1RM y progresión
          </p>
        </div>
        <button
          onClick={() => setShowGlobalLogger(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 16px", background: "#FF5E14",
            border: "none", borderRadius: 12,
            fontSize: 13, fontWeight: 700, color: "#fff",
            cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Nuevo 1RM
        </button>
      </div>

      {/* Leyenda explicativa */}
      <div style={{ background: "rgba(255,94,20,0.04)", border: "0.5px solid rgba(255,94,20,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="9" cy="9" r="7.5" stroke="#FF5E14" strokeWidth="1.5" />
          <path d="M9 8v5M9 6.5v-.5" stroke="#FF5E14" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
          <strong style={{ color: "#FF5E14" }}>PR Sesión</strong> = mejor peso alcanzado en entrenamiento regular.{" "}
          <strong style={{ color: "#FF5E14" }}>Test 1RM</strong> = repetición máxima deliberada registrada manualmente.
        </p>
      </div>

      {/* Estado vacío */}
      {isEmpty ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,94,20,0.08)", border: "0.5px solid rgba(255,94,20,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M2 14h4M22 14h4M6 14h3V9h4v10h4v-7h4v7" stroke="#FF5E14" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#888", marginBottom: 6 }}>Sin datos de rendimiento aún</p>
          <p style={{ fontSize: 13, color: "#444", maxWidth: 300, margin: "0 auto 24px", lineHeight: 1.5 }}>
            Completá sesiones de entrenamiento o registrá tu primer test de 1RM.
          </p>
          <button
            onClick={() => setShowGlobalLogger(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#FF5E14", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            Registrar primer test 1RM
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((entry) => (
            <ExerciseCard
              key={entry.exercise_id}
              entry={entry}
              isExpanded={expandedId === entry.exercise_id}
              progressState={progressMap.get(entry.exercise_id) ?? null}
              deletingTestId={deletingId}
              onToggle={() => handleToggle(entry.exercise_id)}
              onDeleteTest={handleDeleteTest}
              onLogRm={(id, name) => setLoggerTarget({ id, name })}
            />
          ))}
        </div>
      )}

      {/* Logger de 1RM: global (sin pre-selección) o por ejercicio específico */}
      {(showGlobalLogger || loggerTarget) && (
        <OneRepMaxLogger
          preselectedExerciseId={loggerTarget?.id}
          preselectedExerciseName={loggerTarget?.name}
          onClose={() => { setShowGlobalLogger(false); setLoggerTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
