// page.tsx — Dashboard de progreso personal: métricas, gráficas, PRs, fotos y comparativa

import { getMySnapshots, getMyProgressPhotos } from "@/actions/progress.actions";
import { getProgressChartData } from "@/actions/progress.actions";
import { getMyTopPRs } from "@/actions/workout.actions";
import { HealthChartCard } from "@/components/gym/health/HealthChartCard";
import { MemberProgressPhotoUpload } from "@/components/gym/health/MemberProgressPhotoUpload";
import { BeforeAfterComparison } from "@/components/gym/progress/BeforeAfterComparison";
import { TrendingUp, TrendingDown, Camera, Minus, Dumbbell } from "lucide-react";
import Link from "next/link";
import { themeConfig } from "@/lib/theme";

export default async function PortalProgressPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_health_metrics && !themeConfig.features.gym_progress) return null;

  const [snapshots, chartData, photos, topPRs] = await Promise.all([
    themeConfig.features.gym_health_metrics ? getMySnapshots(50) : Promise.resolve([]),
    themeConfig.features.gym_health_metrics ? getProgressChartData(50) : Promise.resolve([]),
    themeConfig.features.gym_progress ? getMyProgressPhotos() : Promise.resolve([]),
    themeConfig.features.gym_routines ? getMyTopPRs(6) : Promise.resolve([]),
  ]);

  // snapshots viene desc (más reciente primero)
  const latestSnapshot = snapshots[0] ?? null;
  const firstSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 1] : null;

  // Deltas totales desde la primera medición
  const weightDelta = latestSnapshot?.weight_kg != null && firstSnapshot?.weight_kg != null
    ? +(latestSnapshot.weight_kg - firstSnapshot.weight_kg).toFixed(1)
    : null;
  const fatDelta = latestSnapshot?.body_fat_pct != null && firstSnapshot?.body_fat_pct != null
    ? +(latestSnapshot.body_fat_pct - firstSnapshot.body_fat_pct).toFixed(1)
    : null;
  const muscleDelta = latestSnapshot?.muscle_mass_kg != null && firstSnapshot?.muscle_mass_kg != null
    ? +(latestSnapshot.muscle_mass_kg - firstSnapshot.muscle_mass_kg).toFixed(1)
    : null;

  // Puntos para cada gráfica — cronológico (asc)
  const weightPoints = chartData
    .filter((d) => d.weight_kg != null)
    .map((d) => ({ date: d.date, value: d.weight_kg! }));
  const fatPoints = chartData
    .filter((d) => d.body_fat_pct != null)
    .map((d) => ({ date: d.date, value: d.body_fat_pct! }));
  const musclePoints = chartData
    .filter((d) => d.muscle_mass_kg != null)
    .map((d) => ({ date: d.date, value: d.muscle_mass_kg! }));

  // Agrupar fotos por fecha (taken_at → string YYYY-MM-DD)
  const photosByDate = photos.reduce<Record<string, typeof photos>>((acc, photo) => {
    const key = photo.taken_at.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});
  const photoGroups = Object.entries(photosByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6); // últimos 6 grupos

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-4">

      {/* ── ENCABEZADO ──────────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-extrabold"
          style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
        >
          Mi Progreso
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
          {snapshots.length > 0
            ? `${snapshots.length} medición${snapshots.length !== 1 ? "es" : ""} registrada${snapshots.length !== 1 ? "s" : ""}`
            : "Aún no hay mediciones registradas"}
        </p>
      </div>

      {/* ── SECCIÓN 1: PILLS DE MÉTRICAS ACTUALES ───────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && latestSnapshot && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Peso",    value: latestSnapshot.weight_kg,      unit: "kg", delta: weightDelta, positiveIsGood: false },
            { label: "Grasa",   value: latestSnapshot.body_fat_pct,   unit: "%",  delta: fatDelta,    positiveIsGood: false },
            { label: "Músculo", value: latestSnapshot.muscle_mass_kg, unit: "kg", delta: muscleDelta, positiveIsGood: true },
          ]
            .filter((m) => m.value != null)
            .map((m) => {
              const deltaColor =
                m.delta == null
                  ? "var(--gym-text-ghost)"
                  : m.positiveIsGood
                  ? m.delta > 0 ? "#22C55E" : "#EF4444"
                  : m.delta < 0 ? "#22C55E" : "#EF4444";

              return (
                <div
                  key={m.label}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
                >
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--gym-text-ghost)" }}>
                    {m.label}
                  </p>
                  <p
                    className="text-2xl font-extrabold leading-none"
                    style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
                  >
                    {m.value!.toFixed(m.unit === "%" ? 1 : 1)}
                    {m.unit && (
                      <span className="text-sm font-normal ml-0.5" style={{ color: "var(--gym-text-ghost)" }}>
                        {m.unit}
                      </span>
                    )}
                  </p>
                  {m.delta != null ? (
                    <div className="flex items-center gap-0.5 mt-1.5" style={{ color: deltaColor }}>
                      {m.delta > 0
                        ? <TrendingUp className="w-3 h-3" />
                        : m.delta < 0
                        ? <TrendingDown className="w-3 h-3" />
                        : <Minus className="w-3 h-3" />}
                      <span className="text-[10px]">
                        {m.delta > 0 ? "+" : ""}{m.delta} {m.unit}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[9px] mt-1.5" style={{ color: "var(--gym-text-ghost)" }}>
                      sin cambio
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ── SECCIÓN 2: GRÁFICAS EXPANDIBLES ─────────────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && (
        weightPoints.length >= 2 || fatPoints.length >= 2 || musclePoints.length >= 2
      ) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {weightPoints.length >= 2 && (
            <HealthChartCard
              points={weightPoints}
              color="#FF5E14"
              unit="kg"
              label="peso"
              title="Peso"
            />
          )}
          {fatPoints.length >= 2 && (
            <HealthChartCard
              points={fatPoints}
              color="#EAB308"
              unit="%"
              label="grasa"
              title="Grasa corporal"
            />
          )}
          {musclePoints.length >= 2 && (
            <HealthChartCard
              points={musclePoints}
              color="#22C55E"
              unit="kg"
              label="musculo"
              title="Masa muscular"
            />
          )}
        </div>
      )}

      {/* ── SECCIÓN 3: TIMELINE DE SNAPSHOTS ─────────────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && snapshots.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--gym-border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
              Historial de mediciones
            </p>
          </div>

          {/* Cabecera de la tabla */}
          <div
            className="grid px-5 py-2 text-[9px] uppercase tracking-wider"
            style={{
              gridTemplateColumns: "1fr 80px 80px 80px",
              color: "var(--gym-text-ghost)",
              borderBottom: "1px solid #111",
            }}
          >
            <span>Fecha</span>
            <span className="text-right">Peso</span>
            <span className="text-right">Grasa</span>
            <span className="text-right">Músculo</span>
          </div>

          {/* Filas — máx 15 snapshots, más reciente primero */}
          <div className="divide-y" style={{ borderColor: "#111" }}>
            {snapshots.slice(0, 15).map((snap, idx) => {
              const prev = snapshots[idx + 1] ?? null;

              const wDelta = snap.weight_kg != null && prev?.weight_kg != null
                ? +(snap.weight_kg - prev.weight_kg).toFixed(1) : null;
              const fDelta = snap.body_fat_pct != null && prev?.body_fat_pct != null
                ? +(snap.body_fat_pct - prev.body_fat_pct).toFixed(1) : null;
              const mDelta = snap.muscle_mass_kg != null && prev?.muscle_mass_kg != null
                ? +(snap.muscle_mass_kg - prev.muscle_mass_kg).toFixed(1) : null;

              return (
                <div
                  key={snap.id}
                  className="grid px-5 py-3"
                  style={{ gridTemplateColumns: "1fr 80px 80px 80px" }}
                >
                  {/* Fecha */}
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: "var(--gym-text-primary)" }}>
                      {new Date(snap.recorded_at).toLocaleDateString("es-CR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {snap.notes && (
                      <p className="text-[9px] mt-0.5 line-clamp-1" style={{ color: "var(--gym-text-ghost)" }}>
                        {snap.notes}
                      </p>
                    )}
                  </div>

                  {/* Peso */}
                  <MetricCell value={snap.weight_kg} unit="kg" delta={wDelta} positiveIsGood={false} />

                  {/* Grasa */}
                  <MetricCell value={snap.body_fat_pct} unit="%" delta={fDelta} positiveIsGood={false} />

                  {/* Músculo */}
                  <MetricCell value={snap.muscle_mass_kg} unit="kg" delta={mDelta} positiveIsGood={true} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 4: MIS MEJORES MARCAS (PRs por peso máximo) ──────────────────── */}
      {themeConfig.features.gym_routines && topPRs.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--gym-border)" }}
          >
            <div className="flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5" style={{ color: "#FF5E14" }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
                Mis mejores marcas
              </p>
            </div>
            <Link
              href="/portal/routines/strength"
              className="text-[10px] transition-colors"
              style={{ color: "var(--gym-text-ghost)" }}
            >
              Ver todos mis PRs →
            </Link>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {topPRs.map((pr) => {
              const exercise = pr.exercise as { name: string; muscle_group: string | null } | undefined;
              const MUSCLE_LABELS: Record<string, string> = {
                chest: "Pecho", back: "Espalda", shoulders: "Hombros",
                biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
                quads: "Cuádriceps", hamstrings: "Femorales", glutes: "Glúteos",
                calves: "Gemelos", core: "Core", full_body: "Cuerpo completo",
              };
              return (
                <div
                  key={pr.id}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "var(--gym-bg-elevated, #161616)", border: "1px solid var(--gym-border)" }}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: "var(--gym-text-primary)" }}>
                      {exercise?.name ?? "Ejercicio"}
                    </p>
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1425" }}
                    >
                      PR
                    </span>
                  </div>
                  {exercise?.muscle_group && (
                    <p className="text-[9px] mb-1.5" style={{ color: "var(--gym-text-ghost)" }}>
                      {MUSCLE_LABELS[exercise.muscle_group] ?? exercise.muscle_group}
                    </p>
                  )}
                  <p className="text-[20px] font-extrabold leading-none" style={{ color: "#FF5E14", fontFamily: "var(--font-barlow)" }}>
                    {pr.max_weight} <span className="text-[12px] font-normal" style={{ color: "var(--gym-text-ghost)" }}>kg</span>
                  </p>
                  <p className="text-[9px] mt-1" style={{ color: "var(--gym-text-ghost)" }}>
                    {new Date(pr.achieved_at).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 5: GALERÍA DE FOTOS ─────────────────────────────────────────── */}
      {themeConfig.features.gym_progress && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--gym-border)" }}
          >
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" style={{ color: "#FF5E14" }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
                Fotos de progreso
              </p>
            </div>
            <MemberProgressPhotoUpload />
          </div>

          {photoGroups.length > 0 ? (
            <div className="p-5 space-y-6">
              {photoGroups.map(([date, groupPhotos]) => {
                const front  = groupPhotos.find((p) => p.photo_type === "front");
                const side   = groupPhotos.find((p) => p.photo_type === "side");
                const back   = groupPhotos.find((p) => p.photo_type === "back");
                const slots  = [
                  { key: "front", label: "Frente", photo: front },
                  { key: "side",  label: "Lado",   photo: side },
                  { key: "back",  label: "Espalda", photo: back },
                ];

                return (
                  <div key={date}>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--gym-text-ghost)" }}>
                      {new Date(date).toLocaleDateString("es-CR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(({ key, label, photo }) => (
                        <div key={key} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                          {photo ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.photo_url}
                                alt={label}
                                className="w-full h-full object-cover"
                              />
                              <div
                                className="absolute bottom-0 left-0 right-0 text-center py-1 px-2"
                                style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                              >
                                <p className="text-[9px]" style={{ color: "var(--gym-text-muted)" }}>
                                  {label}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center gap-1"
                              style={{ backgroundColor: "#0d0d0d", border: "1px dashed #1e1e1e" }}
                            >
                              <Camera className="w-5 h-5" style={{ color: "#222" }} />
                              <p className="text-[9px]" style={{ color: "#333" }}>{label}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 flex flex-col items-center gap-3">
              <Camera className="w-10 h-10" style={{ color: "#1e1e1e" }} />
              <p className="text-[12px]" style={{ color: "var(--gym-text-ghost)" }}>
                Aún no tienes fotos de progreso
              </p>
              <p className="text-[10px]" style={{ color: "#333" }}>
                Usa el botón de arriba para subir tu primera foto
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SECCIÓN 6: COMPARATIVA ANTES/DESPUÉS ─────────────────────────────────── */}
      {themeConfig.features.gym_progress && Object.keys(photosByDate).length >= 2 && (
        <BeforeAfterComparison photosByDate={photosByDate} />
      )}

    </div>
  );
}

// Celda de métrica individual con delta — reutilizable en la tabla
function MetricCell({
  value,
  unit,
  delta,
  positiveIsGood,
}: {
  value: number | null;
  unit: string;
  delta: number | null;
  positiveIsGood: boolean;
}): React.ReactNode {
  if (value == null) {
    return <div className="text-right text-[11px]" style={{ color: "#2a2a2a" }}>—</div>;
  }

  const deltaColor =
    delta == null ? "var(--gym-text-ghost)"
    : positiveIsGood
    ? delta > 0 ? "#22C55E" : "#EF4444"
    : delta < 0 ? "#22C55E" : "#EF4444";

  return (
    <div className="text-right">
      <p className="text-[12px] font-medium" style={{ color: "var(--gym-text-primary)" }}>
        {value.toFixed(1)}<span className="text-[9px] ml-0.5" style={{ color: "var(--gym-text-ghost)" }}>{unit}</span>
      </p>
      {delta != null && delta !== 0 && (
        <p className="text-[9px]" style={{ color: deltaColor }}>
          {delta > 0 ? "+" : ""}{delta}
        </p>
      )}
    </div>
  );
}
