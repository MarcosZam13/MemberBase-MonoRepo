// ClassBlock.tsx — Bloque de clase posicionado absolutamente en el grid semanal

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { bookClass, cancelMyBooking } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";
import { utcToLocalDate } from "@/lib/time";

interface ClassBlockProps {
  scheduledClass: ScheduledClass;
  myBooking?: ClassBooking;
  top: number;
  height: number;
  // Columna y total de columnas para distribuir bloques solapados lado a lado
  col: number;
  totalCols: number;
}

// Gap en px entre bloques solapados para que se distingan visualmente
const BLOCK_GAP = 2;

export function ClassBlock({ scheduledClass, myBooking, top, height, col, totalCols }: ClassBlockProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  const color = scheduledClass.class_type?.color ?? "#FF5E14";
  // Convertir UTC a hora local del gym para mostrar la hora correcta independiente del navegador
  const localStart = utcToLocalDate(scheduledClass.starts_at);
  const localEnd = utcToLocalDate(scheduledClass.ends_at);
  const pad = (n: number): string => String(n).padStart(2, "0");
  const startTime = `${pad(localStart.getHours())}:${pad(localStart.getMinutes())}`;
  const endTime = `${pad(localEnd.getHours())}:${pad(localEnd.getMinutes())}`;
  const title = scheduledClass.title || scheduledClass.class_type?.name || "Clase";
  const bookingsCount = scheduledClass.bookings_count ?? 0;
  const maxCapacity = scheduledClass.max_capacity ?? 0;

  // Calcula left/width según la columna asignada dentro de los solapados
  const widthPct = 100 / totalCols;
  const leftPct = col * widthPct;
  const blockLeft = `calc(${leftPct}% + ${BLOCK_GAP}px)`;
  const blockWidth = `calc(${widthPct}% - ${BLOCK_GAP * 2}px)`;

  // Convierte color hex a rgba para el fondo translúcido del bloque
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  async function handleBook(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    setIsLoading(true);
    await bookClass({ class_id: scheduledClass.id });
    setIsLoading(false);
  }

  async function handleCancel(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (!myBooking) return;
    setIsLoading(true);
    await cancelMyBooking(myBooking.id);
    setIsLoading(false);
  }

  return (
    <div
      className="absolute rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden transition-all hover:brightness-125 z-10"
      style={{
        top,
        height,
        left: blockLeft,
        width: blockWidth,
        backgroundColor: hexToRgba(color, 0.18),
        // Usar solo propiedades longhand para evitar conflicto shorthand/longhand en React
        borderTopWidth: "0.5px",
        borderRightWidth: "0.5px",
        borderBottomWidth: "0.5px",
        borderLeftWidth: "2.5px",
        borderTopStyle: "solid",
        borderRightStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderTopColor: hexToRgba(color, 0.4),
        borderRightColor: hexToRgba(color, 0.4),
        borderBottomColor: hexToRgba(color, 0.4),
        borderLeftColor: color,
      }}
    >
      {/* Nombre de la clase */}
      <p
        className="text-[10px] font-semibold leading-tight truncate"
        style={{ color }}
      >
        {title}
      </p>

      {/* Horario — solo si hay espacio */}
      {height > 36 && (
        <p className="text-[9px] leading-tight mt-0.5" style={{ color, opacity: 0.7 }}>
          {startTime} – {endTime}
        </p>
      )}

      {/* Cupos — solo si hay espacio suficiente */}
      {height > 52 && maxCapacity > 0 && (
        <p className="text-[9px] leading-tight mt-0.5" style={{ color, opacity: 0.6 }}>
          {bookingsCount}/{maxCapacity}
        </p>
      )}

      {/* Botón reservar/cancelar — solo si hay espacio */}
      {height > 64 && !scheduledClass.is_cancelled && (
        <div className="mt-1">
          {myBooking ? (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-[9px] px-1.5 py-0.5 rounded border leading-none transition-opacity hover:opacity-80"
              style={{ color, borderColor: hexToRgba(color, 0.4), backgroundColor: hexToRgba(color, 0.1) }}
            >
              {isLoading ? <Loader2 className="w-2 h-2 animate-spin inline" /> : "Cancelar"}
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={isLoading}
              className="text-[9px] px-1.5 py-0.5 rounded leading-none text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: color }}
            >
              {isLoading ? <Loader2 className="w-2 h-2 animate-spin inline" /> : "Reservar"}
            </button>
          )}
        </div>
      )}

      {scheduledClass.is_cancelled && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
          <span className="text-[9px] text-[#EF4444] font-semibold">Cancelada</span>
        </div>
      )}
    </div>
  );
}
