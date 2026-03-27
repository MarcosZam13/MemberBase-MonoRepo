// ClassBlock.tsx — Bloque de clase posicionado absolutamente en el grid semanal

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { bookClass, cancelMyBooking } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface ClassBlockProps {
  scheduledClass: ScheduledClass;
  myBooking?: ClassBooking;
  top: number;
  height: number;
}

export function ClassBlock({ scheduledClass, myBooking, top, height }: ClassBlockProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  const color = scheduledClass.class_type?.color ?? "#FF5E14";
  const startTime = new Date(scheduledClass.starts_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(scheduledClass.ends_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const title = scheduledClass.title || scheduledClass.class_type?.name || "Clase";
  const bookingsCount = scheduledClass.bookings_count ?? 0;
  const maxCapacity = scheduledClass.max_capacity ?? 0;

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
      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden transition-all hover:brightness-125 z-10"
      style={{
        top,
        height,
        backgroundColor: hexToRgba(color, 0.18),
        borderLeft: `2.5px solid ${color}`,
        border: `0.5px solid ${hexToRgba(color, 0.4)}`,
        borderLeftWidth: "2.5px",
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
