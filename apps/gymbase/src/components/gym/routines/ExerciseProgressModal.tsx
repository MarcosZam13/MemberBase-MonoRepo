// ExerciseProgressModal.tsx — Modal con gráfica de progresión de peso por ejercicio

"use client";

import { useState, useEffect } from "react";
import { getMyExerciseProgress } from "@/actions/workout.actions";
import { MiniLineChart } from "@/components/gym/health/MiniLineChart";
import type { ExerciseProgressPoint } from "@/types/gym-routines";

interface ExerciseProgressModalProps {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  onClose: () => void;
}

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
  core: "Core", cardio: "Cardio", full_body: "Cuerpo completo",
};

export function ExerciseProgressModal({
  exerciseId,
  exerciseName,
  muscleGroup,
  onClose,
}: ExerciseProgressModalProps): React.ReactNode {
  const [points, setPoints]   = useState<ExerciseProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyExerciseProgress(exerciseId).then((data) => {
      setPoints(data);
      setLoading(false);
    });
  }, [exerciseId]);

  // Calcular progreso total si hay al menos 2 puntos
  const firstWeight = points.length >= 2 ? points[0].max_weight : null;
  const lastWeight  = points.length >= 2 ? points[points.length - 1].max_weight : null;
  const delta       = firstWeight !== null && lastWeight !== null ? lastWeight - firstWeight : null;

  const chartPoints = points.map((p) => ({ date: p.date, value: p.max_weight }));

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(480px, calc(100vw - 32px))",
        background: "#0d0d0d", border: "0.5px solid #1e1e1e",
        borderRadius: 20, zIndex: 101, overflow: "hidden",
      }}>
        {/* Barra superior */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "20px 20px 0",
        }}>
          <div>
            {muscleGroup && (
              <p style={{ fontSize: 9, fontWeight: 700, color: "#FF5E14", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                {MUSCLE_LABEL[muscleGroup] ?? muscleGroup}
              </p>
            )}
            <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              {exerciseName}
            </p>
            <p style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Progresión de peso en sesiones</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: "#161616", border: "0.5px solid #222", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="#555" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {loading ? (
            <div style={{ height: 120, background: "#111", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #222", borderTopColor: "#FF5E14", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : points.length === 0 ? (
            /* Estado vacío */
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,94,20,0.08)", border: "0.5px solid rgba(255,94,20,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M3 17l4-5 4 3 4-7 4 4" stroke="#FF5E14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>Sin historial aún</p>
              <p style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
                Completá sesiones con este ejercicio para ver tu progresión.
              </p>
            </div>
          ) : (
            <>
              {/* Stats de resumen */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                {[
                  { val: `${lastWeight} kg`, lbl: "Último máx." },
                  { val: `${points.length}`, lbl: "Sesiones" },
                  {
                    val: delta !== null ? `${delta >= 0 ? "+" : ""}${delta} kg` : "—",
                    lbl: "Progreso total",
                    color: delta !== null && delta > 0 ? "#22C55E" : delta !== null && delta < 0 ? "#EF4444" : "#888",
                  },
                ].map(({ val, lbl, color }) => (
                  <div key={lbl} style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <p style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 20, fontWeight: 700, color: color ?? "#fff", letterSpacing: "-0.01em" }}>{val}</p>
                    <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{lbl}</p>
                  </div>
                ))}
              </div>

              {/* Gráfica */}
              <div style={{ background: "#080808", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "12px 12px 8px" }}>
                <p style={{ fontSize: 9, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Peso máximo por sesión (kg)
                </p>
                <MiniLineChart points={chartPoints} color="#FF5E14" label={exerciseId} />
              </div>

              {/* Últimas sesiones */}
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Últimas sesiones
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[...points].reverse().slice(0, 5).map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 8,
                      padding: "7px 12px",
                    }}>
                      <span style={{ fontSize: 11, color: "#666" }}>{p.date}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 10, color: "#444" }}>{p.sets_count} series</span>
                        <span style={{ fontFamily: "var(--font-barlow, 'Barlow Condensed')", fontSize: 16, fontWeight: 700, color: i === 0 ? "#FF5E14" : "#fff" }}>
                          {p.max_weight} kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Botón de acceso al tracker de fuerza */}
        <div style={{ padding: "0 20px 20px" }}>
          <a
            href="/portal/routines/strength"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "10px 0",
              background: "transparent", border: "0.5px solid #222", borderRadius: 10,
              fontSize: 12, fontWeight: 500, color: "#555", textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 10l3-4 3 2 3-5" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ver tracker de fuerza (1RM)
          </a>
        </div>
      </div>
    </>
  );
}
