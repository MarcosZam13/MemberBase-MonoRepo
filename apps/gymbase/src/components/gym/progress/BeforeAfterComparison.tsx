// BeforeAfterComparison.tsx — Comparativa lado a lado de dos fechas de fotos de progreso

"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import type { ProgressPhoto } from "@/types/gym-health";

interface BeforeAfterComparisonProps {
  photosByDate: Record<string, ProgressPhoto[]>;
}

const PHOTO_TYPES = ["front", "side", "back"] as const;
const TYPE_LABELS: Record<string, string> = { front: "Frente", side: "Lado", back: "Espalda" };

export function BeforeAfterComparison({ photosByDate }: BeforeAfterComparisonProps): React.ReactNode {
  const dates = Object.keys(photosByDate).sort((a, b) => b.localeCompare(a));

  const [dateA, setDateA] = useState<string>(dates[dates.length - 1] ?? "");
  const [dateB, setDateB] = useState<string>(dates[0] ?? "");

  if (dates.length < 2) return null;

  const photosA = photosByDate[dateA] ?? [];
  const photosB = photosByDate[dateB] ?? [];

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
    >
      {/* Header con selectores de fecha */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "var(--gym-border)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--gym-text-ghost)" }}>
          Comparar fechas
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Selector fecha A */}
          <div>
            <label className="text-[9px] uppercase tracking-widest block mb-1" style={{ color: "var(--gym-text-ghost)" }}>
              Fecha A (antes)
            </label>
            <select
              value={dateA}
              onChange={(e) => setDateA(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[11px] cursor-pointer"
              style={{
                backgroundColor: "var(--gym-bg-elevated, #161616)",
                border: "1px solid var(--gym-border)",
                color: "var(--gym-text-primary)",
              }}
            >
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
          </div>

          {/* Selector fecha B */}
          <div>
            <label className="text-[9px] uppercase tracking-widest block mb-1" style={{ color: "var(--gym-text-ghost)" }}>
              Fecha B (después)
            </label>
            <select
              value={dateB}
              onChange={(e) => setDateB(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[11px] cursor-pointer"
              style={{
                backgroundColor: "var(--gym-bg-elevated, #161616)",
                border: "1px solid var(--gym-border)",
                color: "var(--gym-text-primary)",
              }}
            >
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de comparación — frente/lado/espalda de cada fecha */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Columna A */}
          <div className="space-y-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest text-center"
              style={{ color: "#FF5E14" }}
            >
              {formatDate(dateA)}
            </p>
            {PHOTO_TYPES.map((type) => {
              const photo = photosA.find((p) => p.photo_type === type);
              return (
                <div
                  key={type}
                  className="relative rounded-xl overflow-hidden"
                  style={{ aspectRatio: "3/4" }}
                >
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.photo_url}
                        alt={TYPE_LABELS[type]}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 text-center py-1 px-2"
                        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                      >
                        <p className="text-[9px]" style={{ color: "var(--gym-text-muted)" }}>
                          {TYPE_LABELS[type]}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-1"
                      style={{ backgroundColor: "#0d0d0d", border: "1px dashed #1e1e1e" }}
                    >
                      <Camera className="w-5 h-5" style={{ color: "#222" }} />
                      <p className="text-[9px]" style={{ color: "#333" }}>{TYPE_LABELS[type]}</p>
                      <p className="text-[8px]" style={{ color: "#272727" }}>Sin foto</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Columna B */}
          <div className="space-y-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest text-center"
              style={{ color: "#22C55E" }}
            >
              {formatDate(dateB)}
            </p>
            {PHOTO_TYPES.map((type) => {
              const photo = photosB.find((p) => p.photo_type === type);
              return (
                <div
                  key={type}
                  className="relative rounded-xl overflow-hidden"
                  style={{ aspectRatio: "3/4" }}
                >
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.photo_url}
                        alt={TYPE_LABELS[type]}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 text-center py-1 px-2"
                        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                      >
                        <p className="text-[9px]" style={{ color: "var(--gym-text-muted)" }}>
                          {TYPE_LABELS[type]}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-1"
                      style={{ backgroundColor: "#0d0d0d", border: "1px dashed #1e1e1e" }}
                    >
                      <Camera className="w-5 h-5" style={{ color: "#222" }} />
                      <p className="text-[9px]" style={{ color: "#333" }}>{TYPE_LABELS[type]}</p>
                      <p className="text-[8px]" style={{ color: "#272727" }}>Sin foto</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
